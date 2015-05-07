package models

import java.util.UUID

import org.joda.time.DateTime
import play.api.Play.current
import play.api.libs.json.Reads._
import play.api.libs.json._
import play.api.libs.functional.syntax._
import core.cypher.{Neo4jConnection, Cypher}

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

case class Hypergraph(
  id: UUID,
  updatedAt: DateTime,
  createdAt: DateTime,
  data: Option[JsObject]
)

object Hypergraph {
  val dbHost = "localhost"
  val dbPort = current.configuration.getInt("neo4j.port").get
  val dbUsername = current.configuration.getString("neo4j.username").get
  val dbPassword = current.configuration.getString("neo4j.password").get

  implicit val neo4jConnection = Neo4jConnection(dbHost, dbPort, dbUsername, dbPassword)

  implicit val hypergraphReads: Reads[Hypergraph] = (
    (JsPath \ "id").read[UUID] and
    (JsPath \ "createdAt").read[DateTime] and
    (JsPath \ "updatedAt").read[DateTime] and
    (JsPath \ "data").read[String].map(Json.parse(_).asOpt[JsObject])
  )(Hypergraph.apply _)

  implicit val hypergraphWrites = new Writes[Hypergraph] {
    def writes(hypergraph: Hypergraph) = Json.obj(
      "id" -> hypergraph.id,
      "updatedAt" -> hypergraph.updatedAt,
      "createdAt" -> hypergraph.createdAt,
      "data" -> hypergraph.data
    )
  }

  def create(userEmail: String, hypergraph: Hypergraph): Future[Hypergraph] = {
    val cypherCreate =
      """
        | MATCH   (u:User { email: {userEmail} })
        | CREATE  (u)-[:OWNS_HYPERGRAPH]->(hg:Hypergraph {hypergraphData})
        | RETURN  hg;
      """.stripMargin

    Cypher(cypherCreate)
        .apply(Json.obj(
          "userEmail" -> userEmail,
          "hypergraphData" -> Json.obj(
            "id" -> hypergraph.id,
            "createdAt" -> hypergraph.createdAt.getMillis,
            "updatedAt" -> hypergraph.updatedAt.getMillis,
            "data" -> Json.stringify(hypergraph.data.getOrElse(JsNull))
          )
        ))
        .map(_.rows.head(0).as[Hypergraph])
  }

  def read(userEmail: String, hypergraphID: UUID): Future[Option[Hypergraph]] = {
    val cypherRead =
      """
        | MATCH   (:User {email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph { id: {hypergraphID} })
        | RETURN  hg;
      """.stripMargin

    Cypher(cypherRead)
        .apply(Json.obj(
          "userEmail" -> userEmail,
          "hypergraphID" -> hypergraphID
        ))
        .map(_.rows.headOption.map(row => row(0).as[Hypergraph]))
  }

  def readAll(userEmail: String): Future[Seq[Hypergraph]] = {
    val cypherReadAll =
      """
        | MATCH   (:User { email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph)
        | RETURN  hg;
      """.stripMargin

    Cypher(cypherReadAll)
        .apply(Json.obj(
          "userEmail" -> userEmail
        ))
        .map(_.rows.map(row => row(0).as[Hypergraph]))
  }

  def update(userEmail: String, hypergraph: Hypergraph): Future[Hypergraph] = {
    val cypherUpdate =
      """
        | MATCH   (:User { email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph { id: {hypergraphID} })
        | SET     hg.data = {data}, hg.updatedAt = {updatedAt}
        | RETURN  hg;
      """.stripMargin

    Cypher(cypherUpdate)
        .apply(Json.obj(
          "userEmail" -> userEmail,
          "hypergraphID" -> hypergraph.id,
          "data" -> Json.stringify(hypergraph.data.getOrElse(JsNull)),
          "updatedAt" -> hypergraph.updatedAt.getMillis
        ))
        .map(_.rows.head(0).as[Hypergraph])
  }

  def delete(userEmail: String, hypergraphID: UUID): Future[Boolean] = {
    val cypherDelete =
      """
        | MATCH           (:User { email: {userEmail} })-[OWNS_HG:OWNS_HYPERGRAPH]->(hg:Hypergraph { id: {hypergraphID} })
        | OPTIONAL MATCH  (hg)-[OWNS_HN:OWNS_HYPERNODE]->(hn:Hypernode)
        | DELETE          OWNS_HG, OWNS_HN, hn, hg;
      """.stripMargin

    Cypher(cypherDelete)
        .apply(Json.obj(
          "userEmail" -> userEmail,
          "hypergraphID" -> hypergraphID
        ))
        .map(_.stats.nodesDeleted > 0)
  }

}