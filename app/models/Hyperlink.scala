package models

import java.util.UUID

import play.api.Play.current
import play.api.libs.json.Reads._
import play.api.libs.json._
import play.api.libs.ws.WS
import play.api.libs.ws.WSAuthScheme
import play.api.libs.functional.syntax._

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

import org.joda.time._

case class Hyperlink(
  id: UUID,
  sourceID: UUID,
  targetID: UUID,
  updatedAt: DateTime,
  createdAt: DateTime,
  data: Option[JsObject]
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

  // TODO: hyperlink queries do not use hypergraphID or userEmail currently, use them!

  val dbTxUrl = current.configuration.getString("neo4j.host").map(_ + "/db/data/transaction/commit").get
  val dbUsername = current.configuration.getString("neo4j.username").get
  val dbPassword = current.configuration.getString("neo4j.password").get

  val neo4jHeaders = Seq(
    "Content-Type" -> "application/json",
    "Accept" -> "application/json; charset=UTF-8"
  )

  // TODO: reads can be made more efficient by not re-indexing down "(__ \ row)(0)"

  implicit val hyperlinkReads: Reads[Hyperlink] = (
    ((__ \ "row")(0) \ "id").read[UUID] and
    ((__ \ "row")(0) \ "sourceId").read[UUID] and
    ((__ \ "row")(0) \ "targetId").read[UUID] and
    ((__ \ "row")(0) \ "updatedAt").read[DateTime] and
    ((__ \ "row")(0) \ "createdAt").read[DateTime] and
    ((__ \ "row")(0) \ "data").read[String].map(Json.parse(_).asOpt[JsObject])
  )(Hyperlink.apply _)


  // NOTE: if we want to add the constraint of single one directional links between nodes,
  // we'll have to manually query against the db to make sure it doesn't exist

  val cypherCreate =
    """
      | MATCH (source:Hypernode { id: {sourceId} }), (target:Hypernode { id: {targetId} })
      | CREATE (source)-[HL:HYPERLINK {hyperlinkData}]->(target)
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
              "id" -> hyperlink.id,
              "createdAt" -> hyperlink.createdAt.getMillis,
              "updatedAt" -> hyperlink.updatedAt.getMillis,
              "sourceId" -> hyperlink.sourceID,
              "targetId" -> hyperlink.targetID,
              "data" -> Json.stringify(hyperlink.data.getOrElse(JsNull))
            )
          )
        )
      )
    )

    val holder = WS
        .url(dbTxUrl)
        .withAuth(dbUsername, dbPassword, WSAuthScheme.BASIC)
        .withHeaders(neo4jHeaders:_*)

    holder.post(neo4jReqJson).map { neo4jRes =>
      val hyperlink = ((neo4jRes.json \ "results")(0) \ "data")(0).validate[Hyperlink]

      hyperlink match {
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
           hypergraphID: UUID,
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
        .url(dbTxUrl)
        .withAuth(dbUsername, dbPassword, WSAuthScheme.BASIC)
        .withHeaders(neo4jHeaders:_*)

    holder.post(neo4jReqJson).map { neo4jRes =>
      val hyperlink = ((neo4jRes.json \ "results")(0) \ "data")(0).validate[Hyperlink]

      hyperlink match {
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
        .url(dbTxUrl)
        .withAuth(dbUsername, dbPassword, WSAuthScheme.BASIC)
        .withHeaders(neo4jHeaders:_*)

    // TODO: need to sanitize the response before returning it to client
    holder.post(neo4jReqJson).map { neo4jRes =>

      val hyperlinks = ((neo4jRes.json \ "results")(0) \ "data").validate[Seq[Hyperlink]]

      hyperlinks match {
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
            "hyperlinkID" -> hyperlink.id,
            "data" -> Json.stringify(hyperlink.data.getOrElse(JsNull)),
            "updatedAt" -> hyperlink.updatedAt.getMillis
          )
        )
      )
    )

    val holder = WS
        .url(dbTxUrl)
        .withAuth(dbUsername, dbPassword, WSAuthScheme.BASIC)
        .withHeaders(neo4jHeaders:_*)

    // TODO: need to sanitize the response before returning it to client
    holder.post(neo4jReqJson).map { neo4jRes =>
      val hyperlink = ((neo4jRes.json \ "results")(0) \ "data")(0).validate[Hyperlink]

      hyperlink match {
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
        .url(dbTxUrl)
        .withAuth(dbUsername, dbPassword, WSAuthScheme.BASIC)
        .withHeaders(neo4jHeaders:_*)

    holder.post(neo4jReqJson).map { _ => true }
  }
}
