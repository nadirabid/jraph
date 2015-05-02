package models

import java.util.UUID

import play.api.Play.current
import play.api.libs.json.Reads._
import play.api.libs.json._
import play.api.libs.ws.WS
import play.api.libs.ws.WSAuthScheme
import play.api.libs.functional.syntax._
import utils.cypher.{Cypher, Neo4jConnection}

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

import org.joda.time._

case class Hypernode(
  id: UUID,
  updatedAt: DateTime,
  createdAt: DateTime,
  data: Option[JsObject]
)

object Hypernode {
  val dbHost = "localhost"
  val dbPort = current.configuration.getInt("neo4j.port").get
  val dbUsername = current.configuration.getString("neo4j.username").get
  val dbPassword = current.configuration.getString("neo4j.password").get

  implicit val neo4jConnection = Neo4jConnection(dbHost, dbPort, dbUsername, dbPassword)

  implicit val hypernodeReads: Reads[Hypernode] = (
    (JsPath \ "id").read[UUID] and
    (JsPath \ "createdAt").read[DateTime] and
    (JsPath \ "updatedAt").read[DateTime] and
    (JsPath \ "data").read[String].map(Json.parse(_).asOpt[JsObject])
  )(Hypernode.apply _)

  def create(userEmail: String,
             hypergraphID: UUID,
             hypernode: Hypernode): Future[Hypernode] = {

    val cypherCreate =
      """
        | MATCH (user:User { email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph { id: {hypergraphID} })
        | CREATE (hn:Hypernode {hn}), (hg)-[:OWNS_HYPERNODE]->(hn)
        | RETURN hn;
      """.stripMargin

    Cypher(cypherCreate)
        .apply(Json.obj(
          "userEmail" -> userEmail,
          "hypergraphID" -> hypergraphID,
          "hn" -> Json.obj(
            "id" -> hypernode.id,
            "createdAt" -> hypernode.createdAt.getMillis,
            "updatedAt" -> hypernode.updatedAt.getMillis,
            "data" -> Json.stringify(hypernode.data.getOrElse(JsNull))
          )
        ))
        .map(_.rows.head(0).as[Hypernode])
  }

  def read(userEmail: String,
           hypergraphID: UUID,
           hypernodeID: UUID): Future[Option[Hypernode]] = {

    val cypherRead =
      """
        | MATCH (hn:Hypernode { id: {hypernodeID} })
        | RETURN hn;
      """.stripMargin

    Cypher(cypherRead)
        .apply(Json.obj(
          "hypernodeID" -> hypernodeID
        ))
        .map { cypherResult =>
          cypherResult.rows.headOption.map(row => row(0).validate[Hypernode])
        }
        .map {
          case Some(s: JsSuccess[Hypernode]) => Some(s.get)
          case Some(e: JsError) => None
          case None => None
        }
  }

  def readAll(userEmail: String,
              hypergraphID: UUID): Future[Seq[Hypernode]] = {

    val cypherReadAll =
      """
        | MATCH (:User { email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph { id: {hypergraphID} })
        | MATCH (hg)-[:OWNS_HYPERNODE]->(hn:Hypernode)
        | RETURN hn;
      """.stripMargin

    Cypher(cypherReadAll)
        .apply(Json.obj(
          "hypergraphID" -> hypergraphID,
          "userEmail" -> userEmail
        ))
        .map(_.rows.map(row => row(0).as[Hypernode]))
  }

  def update(userEmail: String,
             hypergraphID: UUID,
             hypernode: Hypernode): Future[Hypernode] = {

    val cypherUpdate =
      """
        | MATCH (hn { id: {hypernodeID} })
        | SET hn.data = {data}, hn.updatedAt = {updatedAt}
        | RETURN hn;
      """.stripMargin

    Cypher(cypherUpdate)
        .apply(Json.obj(
          "hypernodeID" -> hypernode.id,
          "data" -> Json.stringify(hypernode.data.getOrElse(JsNull)),
          "updatedAt" -> hypernode.updatedAt.getMillis
        ))
        .map(_.rows.head(0).as[Hypernode])
  }

  def batchUpdate(userEmail: String,
                  hypergraphID: UUID,
                  hypernodes: Seq[Hypernode]): Future[Seq[Hypernode]] = {

    val cypherUpdate =
      """
        | MATCH (hn { id: {hypernodeID} })
        | SET hn.data = {data}, hn.updatedAt = {updatedAt}
        | RETURN hn;
      """.stripMargin

    val dbTxUrl = current.configuration.getString("neo4j.host").map(_ + "/db/data/transaction/commit").get

    implicit val hypernodeReads: Reads[Hypernode] = (
      ((JsPath \ "row")(0) \ "id").read[UUID] and
      ((JsPath \ "row")(0) \ "createdAt").read[DateTime] and
      ((JsPath \ "row")(0) \ "updatedAt").read[DateTime] and
      ((JsPath \ "row")(0) \ "data").read[String].map(Json.parse(_).asOpt[JsObject])
    )(Hypernode.apply _)

    val neo4jHeaders = Seq(
      "Content-Type" -> "application/json",
      "Accept" -> "application/json; charset=UTF-8"
    )

    val neo4jReqJson = Json.obj(
      "statements" -> hypernodes.map{ node =>
        Json.obj(
          "statement" -> cypherUpdate,
          "parameters" -> Json.obj(
            "hypernodeID" -> node.id,
            "data" -> Json.stringify(node.data.getOrElse(JsNull)),
            "updatedAt" -> node.updatedAt.getMillis
          )
        )
      }
    )

    val holder = WS
        .url(dbTxUrl)
        .withAuth(dbUsername, dbPassword, WSAuthScheme.BASIC)
        .withHeaders(neo4jHeaders:_*)

    // TODO: need to sanitize the response before returning it to client
    holder.post(neo4jReqJson).map { neo4jRes =>
      ((neo4jRes.json \ "results")(0) \ "data").as[Seq[Hypernode]]
    }
  }

  def delete(userEmail: String,
             hypergraphID: UUID,
             hypernodeID: UUID): Future[Boolean] = {

    val cypherDelete =
      """
        | MATCH (hn:Hypernode { id: {hypernodeID} }),
        |       (:User { email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph { id: {hypergraphID} }),
        |       (hg)-[OWNS_HN:OWNS_HYPERNODE]->(hn)
        | OPTIONAL MATCH (hn)-[HL:HYPERLINK]-(:Hypernode)
        | DELETE OWNS_HN, HL, hn;
      """.stripMargin

    Cypher(cypherDelete)
        .apply(Json.obj(
          "hypernodeID" -> hypernodeID,
          "hypergraphID" -> hypergraphID,
          "userEmail" -> userEmail
        ))
        .map(_.stats.nodesDeleted > 0) //TODO: throw exception if nodesDeleted == 0
  }

}