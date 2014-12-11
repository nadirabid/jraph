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

case class Hypernode(
  hypernodeID: UUID,
  updatedAt: DateTime,
  createdAt: DateTime,
  data: String // TODO: store as JsObject instead of serialized string, makes for clearer and safer api
)

object Hypernode {

  val dbUrl = "http://localhost:7474/db/data/transaction/commit"

  implicit val hypergraphReads: Reads[Hypernode] = (
    ((JsPath \ "row")(0) \ "id").read[UUID] and
    ((JsPath \ "row")(0) \ "createdAt").read[DateTime] and
    ((JsPath \ "row")(0) \ "updatedAt").read[DateTime] and
    ((JsPath \ "row")(0) \ "data").read[String]
  )(Hypernode.apply _)

  val cypherCreate =
    """
      | MATCH (user:User { email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph { id: {hypergraphID} })
      | CREATE (hn:Hypernode {hn}), (hg)-[:OWNS_HYPERNODE]->(hn)
      | RETURN hn;
    """.stripMargin

  def create(userEmail: String,
             hypergraphID: UUID,
             hypernode: Hypernode): Future[Option[Hypernode]] = {

    val neo4jReqJson = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherCreate,
          "parameters" -> Json.obj(
            "userEmail" -> userEmail,
            "hypergraphID" -> hypergraphID,
            "hn" -> Json.obj(
              "id" -> hypernode.hypernodeID,
              "createdAt" -> hypernode.createdAt.getMillis,
              "updatedAt" -> hypernode.updatedAt.getMillis,
              "data" -> hypernode.data
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
      val hypernode = ((neo4jRes.json \ "results")(0) \ "data")(0).validate[Hypernode]

      hypernode match {
        case s: JsSuccess[Hypernode] => Some(s.get)
        case e: JsError => None
      }
    }
  }

  val cypherRead =
    """
      | MATCH (hn:Hypernode { id: {hypernodeID} })
      | RETURN hn;
    """.stripMargin

  def read(userEmail: String,
           hypergraphID: UUID,
           hypernodeID: UUID): Future[Option[Hypernode]] = {

    val neo4jReqJson = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherRead,
          "parameters" -> Json.obj(
            "hypernodeID" -> hypernodeID
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


    // TODO: need to sanitize the response before returning it to client
    holder.post(neo4jReqJson).map { neo4jRes =>
      val hypernode = ((neo4jRes.json \ "results")(0) \ "data")(0).validate[Hypernode]

      hypernode match {
        case s: JsSuccess[Hypernode] => Some(s.get)
        case e: JsError => None
      }
    }
  }

  val cypherReadAll =
    """
      | MATCH (:User { email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph { id: {hypergraphID} })
      | MATCH (hg)-[:OWNS_HYPERNODE]->(hn:Hypernode)
      | RETURN hn;
    """.stripMargin

  def readAll(userEmail: String,
              hypergraphID: UUID): Future[Option[Seq[Hypernode]]] = {

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
      .url(dbUrl)
      .withHeaders(
        "Content-Type" -> "application/json",
        "Accept" -> "application/json; charset=UTF-8"
      )

    // TODO: need to sanitize the response before returning it to client
    holder.post(neo4jReqJson).map { neo4jRes =>
      val hypernodes = ((neo4jRes.json \ "results")(0) \ "data").validate[Seq[Hypernode]]

      hypernodes match {
        case s: JsSuccess[Seq[Hypernode]] => Some(s.get)
        case e: JsError => None
      }
    }
  }

  val cypherUpdate =
    """
      | MATCH (hn { id: {hypernodeID} })
      | SET hn.data = {data}, hn.updatedAt = {updatedAt}
      | RETURN hn;
    """.stripMargin

  def update(userEmail: String,
             hypergraphID: UUID,
             hypernode: Hypernode): Future[Option[Hypernode]] = {

    val neo4jReqJson = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherUpdate,
          "parameters" -> Json.obj(
            "hypernodeID" -> hypernode.hypernodeID,
            "data" -> hypernode.data,
            "updatedAt" -> hypernode.updatedAt.getMillis
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

    // TODO: need to sanitize the response before returning it to client
    holder.post(neo4jReqJson).map { neo4jRes =>
      val hypernode = ((neo4jRes.json \ "results")(0) \ "data")(0).validate[Hypernode]

      hypernode match {
        case s: JsSuccess[Hypernode] => Some(s.get)
        case e: JsError => None
      }
    }
  }

  def batchUpdate(userEmail: String,
                  hypergraphID: UUID,
                  hypernodes: Seq[Hypernode]): Future[Option[Seq[Hypernode]]] = {

    val neo4jReqJson = Json.obj(
      "statements" -> hypernodes.map{ node =>
        Json.obj(
          "statement" -> cypherUpdate,
          "parameters" -> Json.obj(
            "hypernodeID" -> node.hypernodeID,
            "data" -> node.data,
            "updatedAt" -> node.updatedAt.getMillis
          )
        )
      }
    )

    val holder = WS
      .url(dbUrl)
      .withHeaders(
        "Content-Type" -> "application/json",
        "Accept" -> "application/json; charset=UTF-8"
      )

    // TODO: need to sanitize the response before returning it to client
    holder.post(neo4jReqJson).map { neo4jRes =>
      val hypernodes = ((neo4jRes.json \ "results")(0) \ "data").validate[Seq[Hypernode]]

      hypernodes match {
        case s: JsSuccess[Seq[Hypernode]] => Some(s.get)
        case e: JsError => None
      }
    }
  }

  val cypherDelete =
    """
      | MATCH (hn:Hypernode { id: {hypernodeID} }),
      |       (:User { email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph { id: {hypergraphID} }),
      |       (hg)-[OWNS_HN:OWNS_HYPERNODE]->(hn)
      | OPTIONAL MATCH (hn)-[HL:HYPERLINK]-(:Hypernode)
      | DELETE OWNS_HN, HL, hn;
    """.stripMargin

  def delete(userEmail: String,
             hypergraphID: UUID,
             hypernodeID: UUID): Future[Boolean] = {

    val neo4jReqJson = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherDelete,
          "parameters" -> Json.obj(
            "hypernodeID" -> hypernodeID,
            "hypergraphID" -> hypergraphID,
            "userEmail" -> userEmail
          ),
          "includeStats" -> true
        )
      )
    )

    val holder = WS
      .url(dbUrl)
      .withHeaders(
        "Content-Type" -> "application/json",
        "Accept" -> "application/json; charset=UTF-8"
      )

    holder.post(neo4jReqJson).map { _ => true }
  }

}