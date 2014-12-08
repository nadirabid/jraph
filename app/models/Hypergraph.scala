package models

import java.util.UUID

import play.api.Play.current
import play.api.libs.json.Reads._
import play.api.libs.json._
import play.api.libs.ws.WS
import play.api.libs.functional.syntax._

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

case class Hypergraph(
  hypergraphID: UUID,
  name: String
)

object Hypergraph {

  val dbUrl = "http://localhost:7474/db/data/transaction/commit"

  implicit val hypergraphReads: Reads[Hypergraph] = (
    ((JsPath \ "row")(0) \ "id").read[UUID] and
    ((JsPath \ "row")(0)\ "name").read[String]
  )(Hypergraph.apply _)

  val cypherCreate =
    """
      | MATCH   (u:User { email: {userEmail} })
      | CREATE  (u)-[:OWNS_HYPERGRAPH]->(hg:Hypergraph {hypergraphData})
      | RETURN  hg;
    """.stripMargin

  def create(userEmail: String, hypergraph: Hypergraph): Future[Option[Hypergraph]] = {
    val neo4jReqJson = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherCreate,
          "parameters" -> Json.obj(
            "userEmail" -> userEmail,
            "hypergraphData" -> Json.obj(
              "id" -> hypergraph.hypergraphID,
              "name" -> hypergraph.name
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

    // TODO: need to sanitize the response before returning it to client
    holder.post(neo4jReqJson).map { neo4jRes =>
      val hypergraph = ((neo4jRes.json \ "results")(0) \ "data")(0).validate[Hypergraph]

      hypergraph match {
        case s: JsSuccess[Hypergraph] => Some(s.get)
        case e: JsError => None
      }
    }
  }

  val cypherRead =
    """
      | MATCH   (:User {email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph { id: {hypergraphID} })
      | RETURN  hg;
    """.stripMargin

  def read(userEmail: String, hypergraphID: UUID): Future[Option[Hypergraph]] = {
    val neo4jReqJson = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherRead,
          "parameters" -> Json.obj(
            "userEmail" -> userEmail,
            "hypergraphID" -> hypergraphID
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
      val hypergraph = ((neo4jRes.json \ "results")(0) \ "data")(0).validate[Hypergraph]

      hypergraph match {
        case s: JsSuccess[Hypergraph] => Some(s.get)
        case e: JsError => None
      }
    }
  }

  val cypherReadAll =
    """
      | MATCH   (:User { email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph)
      | RETURN  hg;
    """.stripMargin

  def readAll(userEmail: String): Future[Option[Seq[Hypergraph]]] = {
    val neo4jReqJson = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherReadAll,
          "parameters" -> Json.obj(
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
      val hypergraphs = ((neo4jRes.json \ "results")(0) \ "data").validate[Seq[Hypergraph]]

      hypergraphs match {
        case s: JsSuccess[Seq[Hypergraph]] => Some(s.get)
        case e: JsError => None
      }
    }
  }

  val cypherDelete =
    """
      | MATCH           (:User { email: {userEmail} })-[OWNS_HG:OWNS_HYPERGRAPH]->(hg:Hypergraph { id: {hypergraphID} })
      | OPTIONAL MATCH  (hg)-[OWNS_HN:OWNS_HYPERNODE]->(hn:Hypernode)
      | DELETE          OWNS_HG, OWNS_HN, hn, hg;
    """.stripMargin

  def delete(userEmail: String, hypergraphID: UUID): Future[Boolean] = {
    val neo4jReqJson = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherDelete,
          "parameters" -> Json.obj(
            "userEmail" -> userEmail,
            "hypergraphID" -> hypergraphID
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

    // TODO: check if there was any error and the stats confirm at least one deleted node
    holder.post(neo4jReqJson).map { _ => true }
  }

}