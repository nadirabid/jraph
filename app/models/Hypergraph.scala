package models

import java.util.UUID

import org.joda.time.DateTime
import play.api.Play.current
import play.api.libs.json.Reads._
import play.api.libs.json._
import play.api.libs.ws.WS
import play.api.libs.ws.WSAuthScheme
import play.api.libs.functional.syntax._

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

case class Hypergraph(
  id: UUID,
  updatedAt: DateTime,
  createdAt: DateTime,
  data: Option[JsObject]
)

object Hypergraph {

  val dbTxUrl = current.configuration.getString("neo4j.host").map(_ + "/db/data/transaction/commit").get
  val dbUsername = current.configuration.getString("neo4j.username").get
  val dbPassword = current.configuration.getString("neo4j.password").get

  val neo4jHeaders = Map(
    "Content-Type" -> "application/json",
    "Accept" -> "application/json; charset=UTF-8"
  )

  implicit val hypergraphReads: Reads[Hypergraph] = (
    ((__ \ "row")(0) \ "id").read[UUID] and
    ((__ \ "row")(0) \ "createdAt").read[DateTime] and
    ((__ \ "row")(0) \ "updatedAt").read[DateTime] and
    ((__ \ "row")(0) \ "data").read[String].map(Json.parse(_).asOpt[JsObject])
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
              "id" -> hypergraph.id,
              "createdAt" -> hypergraph.createdAt.getMillis,
              "updatedAt" -> hypergraph.updatedAt.getMillis,
              "data" -> Json.stringify(hypergraph.data.getOrElse(JsNull))
            )
          )
        )
      )
    )

    val holder = WS
        .url(dbTxUrl)
        .withAuth(dbUsername, dbPassword, WSAuthScheme.BASIC)
        .withHeaders(neo4jHeaders)

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
        .url(dbTxUrl)
        .withAuth(dbUsername, dbPassword, WSAuthScheme.BASIC)
        .withHeaders(neo4jHeaders)

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
        .url(dbTxUrl)
        .withAuth(dbUsername, dbPassword, WSAuthScheme.BASIC)
        .withHeaders(neo4jHeaders)

    // TODO: need to sanitize the response before returning it to client
    holder.post(neo4jReqJson).map { neo4jRes =>
      val hypergraphs = ((neo4jRes.json \ "results")(0) \ "data").validate[Seq[Hypergraph]]

      hypergraphs match {
        case s: JsSuccess[Seq[Hypergraph]] => Some(s.get)
        case e: JsError => None
      }
    }
  }

  val cypherUpdate =
    """
      | MATCH   (:User { email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph { id: {hypergraphID} })
      | SET     hg.data = {data}, hg.updatedAt = {updatedAt}
      | RETURN  hg;
    """.stripMargin

  def update(userEmail: String, hypergraph: Hypergraph): Future[Option[Hypergraph]] = {
    val neo4jReqJson = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherUpdate,
          "parameters" -> Json.obj(
            "userEmail" -> userEmail,
            "hypergraphID" -> hypergraph.id,
            "data" -> Json.stringify(hypergraph.data.getOrElse(JsNull)),
            "updatedAt" -> hypergraph.updatedAt.getMillis
          )
        )
      )
    )

    val holder = WS
        .url(dbTxUrl)
        .withAuth(dbUsername, dbPassword, WSAuthScheme.BASIC)
        .withHeaders(neo4jHeaders)

    // TODO: need to sanitize the response before returning it to client
    holder.post(neo4jReqJson).map { neo4jRes =>
      val hypergraph = ((neo4jRes.json \ "results")(0) \ "data")(0).validate[Hypergraph]

      hypergraph match {
        case s: JsSuccess[Hypergraph] => Some(s.get)
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
        .url(dbTxUrl)
        .withAuth(dbUsername, dbPassword, WSAuthScheme.BASIC)
        .withHeaders(neo4jHeaders)

    // TODO: check if there was any error and the stats confirm at least one deleted node
    holder.post(neo4jReqJson).map { _ => true }
  }

}