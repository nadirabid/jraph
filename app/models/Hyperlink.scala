package models

import java.util.UUID

import play.api.Play.current
import play.api.libs.json.Reads._
import play.api.libs.json._
import play.api.libs.ws.WS
import play.api.libs.functional.syntax._

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

import org.joda.time._

case class Hyperlink(
  hyperlinkID: UUID,
  sourceID: UUID,
  targetID: UUID,
  updatedAt: DateTime,
  createdAt: DateTime,
  data: JsObject
)

/**
 * Example JSON result of Transactional Cypher HTTP endpoint
 * ie. /db/data/transaction/commit
 *
 * {
 *  results : [{
 *    columns: [ 'id(n)' ],
 *    data: [{
 *      row: [ 15 ]
 *    }]
 *  }],
 *  errors: [ ]
 * }
 */

object Hyperlink {

  val dbUrl = "http://localhost:7474/db/data/transaction/commit"

  implicit val hyperlinkReads: Reads[Hyperlink] = (
    ((JsPath \ "row")(0) \ "id").read[UUID] and
    ((JsPath \ "row")(0) \ "sourceId").read[UUID] and
    ((JsPath \ "row")(0) \ "targetId").read[UUID] and
    ((JsPath \ "row")(0) \ "updatedAt").read[DateTime] and
    ((JsPath \ "row")(0) \ "createdAt").read[DateTime] and
    ((JsPath \ "row")(0) \ "data").read[JsObject]
  )(Hyperlink.apply _)

  val cypherCreate =
    """
      | MATCH (source:Hypernode { id: {sourceId} }), (target:Hypernode { id: {targetId} })
      | CREATE UNIQUE (source)-[HL:HYPERLINK {hyperlinkData}]->(target)
      | RETURN HL;
    """.stripMargin

  def create(userEmail: String,
             hypergraphID: UUID,
             hyperlink: Hyperlink): Future[Option[Hyperlink]] = {

    val neo4jReqJson = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherCreate,
          "parameters" -> Json.obj(
            "sourceId" -> hyperlink.sourceID,
            "targetId" -> hyperlink.targetID,
            "hyperlinkData" -> Json.obj(
              "id" -> UUID.randomUUID(),
              "createdAt" -> hyperlink.createdAt,
              "updatedAt" -> hyperlink.updatedAt,
              "sourceId" -> hyperlink.sourceID,
              "targetId" -> hyperlink.targetID,
              "data" -> Json.stringify(hyperlink.data)
            )
          )
        )
      )
    )

    val holder = WS
      .url(dbUrl)
      .withHeaders(
        "Content-Type" -> "application/json",
        "Accept" -> "application/json; charset=UTF-8"
      )

    holder.post(neo4jReqJson).map { neo4jRes =>
      val hypernode = ((neo4jRes.json \ "results")(0) \ "data")(0).validate[Hyperlink]

      hypernode match {
        case s: JsSuccess[Hyperlink] => Some(s.get)
        case e: JsError => None
      }
    }
  }

  val cypherRead =
    """
      | MATCH (:Hypernode)-[HL:HYPERLINK { id: {hyperlinkID} }]->(:Hypernode)
      | RETURN HL;
    """.stripMargin

  def read(userEmail: String,
           hypernodeID: UUID,
           hyperlinkID: UUID): Future[Option[Hyperlink]] = {

    val neo4jReqJson = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherRead,
          "parameters" -> Json.obj(
            "hyperlinkID" -> hyperlinkID
          )
        )
      )
    )

    val holder = WS
      .url(dbUrl)
      .withHeaders(
        "Content-Type" -> "application/json",
        "Accept" -> "application/json; charset=UTF-8"
      )

    holder.post(neo4jReqJson).map { neo4jRes =>
      val hypernode = ((neo4jRes.json \ "results")(0) \ "data")(0).validate[Hyperlink]

      hypernode match {
        case s: JsSuccess[Hyperlink] => Some(s.get)
        case e: JsError => None
      }
    }
  }

  val cypherReadAll =
    """
      | MATCH (:User { email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph { id: {hypergraphID} })
      | MATCH (hg)-[:OWNS_HYPERNODE]->(:Hypernode)-[HL:HYPERLINK]->(:Hypernode)
      | RETURN HL;
    """.stripMargin

  def readAll(userEmail: String,
              hypergraphID: UUID): Future[Option[Seq[Hyperlink]]] = {

    val neo4jReqJson = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherReadAll,
          "parameters" -> Json.obj(
            "hypergraphID" -> hypergraphID,
            "userEmail" -> userEmail
          )
        )
      )
    )

    val holder = WS
      .url("http://localhost:7474/db/data/transaction/commit")
      .withHeaders(
        "Content-Type" -> "application/json",
        "Accept" -> "application/json; charset=UTF-8"
      )

    // TODO: need to sanitize the response before returning it to client
    holder.post(neo4jReqJson).map { neo4jRes =>
      val hypernodes = ((neo4jRes.json \ "results")(0) \ "data").validate[Seq[Hyperlink]]

      hypernodes match {
        case s: JsSuccess[Seq[Hyperlink]] => Some(s.get)
        case e: JsError => None
      }
    }
  }

  val cypherUpdate =
    """
      | MATCH (:Hypernode)-[HL:HYPERLINK { id: {hyperlinkID} }]->(:Hypernode)
      | SET HL.data = {data}, HL.updatedAt = {updatedAt}
      | RETURN HL;
    """.stripMargin

  def update(userEmail: String,
             hypergraphID: UUID,
             hyperlink: Hyperlink): Future[Option[Hyperlink]] = {

    val neo4jReqJson = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherUpdate,
          "parameters" -> Json.obj(
            "hyperlinkID" -> hyperlink.hyperlinkID,
            "data" -> Json.stringify(hyperlink.data),
            "updatedAt" -> hyperlink.updatedAt
          )
        )
      )
    )

    val holder = WS
      .url("http://localhost:7474/db/data/transaction/commit")
      .withHeaders(
        "Content-Type" -> "application/json",
        "Accept" -> "application/json; charset=UTF-8"
      )

    // TODO: need to sanitize the response before returning it to client
    holder.post(neo4jReqJson).map { neo4jRes =>
      val hypernode = ((neo4jRes.json \ "results")(0) \ "data")(0).validate[Hyperlink]

      hypernode match {
        case s: JsSuccess[Hyperlink] => Some(s.get)
        case e: JsError => None
      }
    }
  }

  val cypherDelete =
    """
      | MATCH (:Hypernode)-[HL:HYPERLINK { id: {hyperlinkID} }]-(:Hypernode)
      | DELETE HL;
    """.stripMargin

  def delete(userEmail: String,
             hypergraphID: UUID,
             hyperlinkID: UUID): Future[Boolean] = {

    val neo4jReqJson = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherDelete,
          "parameters" -> Json.obj(
            "hyperlinkID" -> hyperlinkID
          )
        )
      )
    )

    val holder = WS
      .url("http://localhost:7474/db/data/transaction/commit")
      .withHeaders(
        "Content-Type" -> "application/json",
        "Accept" -> "application/json; charset=UTF-8"
      )

    holder.post(neo4jReqJson).map { _ => true }
  }
}
