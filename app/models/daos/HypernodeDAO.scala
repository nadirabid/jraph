package models.daos

import java.util.UUID

import com.google.inject.Inject
import org.joda.time.DateTime

import play.api.Play.current
import play.api.Configuration
import play.api.libs.json.Reads._
import play.api.libs.json._
import play.api.libs.ws.{WSClient, WSAuthScheme}
import play.api.libs.ws._
import play.api.libs.functional.syntax._
import play.api.libs.concurrent.Execution.Implicits._

import core.cypher.{Cypher, Neo4jConnection}

import scala.concurrent.Future

import models.{HypernodeData, Hypernode}

class HypernodeDAO @Inject() (ws: WSClient,
                              configuration: Configuration,
                              implicit val neo4jConnection: Neo4jConnection) {

  implicit val hypernodeReads = new Reads[Hypernode] {
    def reads(hypernodeJson: JsValue) = JsSuccess(Hypernode(
      (hypernodeJson \ "id").as[UUID],
      (hypernodeJson \ "updatedAt").as[DateTime],
      (hypernodeJson \ "createdAt").as[DateTime],
      Json.parse((hypernodeJson \ "data").as[String]).as[HypernodeData]
    ))
  }

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
          "data" -> Json.stringify(Json.toJson(hypernode.data))
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
      .map(_.rows.map { row =>
        val hypernodeJson = row(0)

        Hypernode(
          (hypernodeJson \ "id").as[UUID],
          (hypernodeJson \ "updatedAt").as[DateTime],
          (hypernodeJson \ "createdAt").as[DateTime],
          Json.parse((hypernodeJson \ "data").as[String]).as[HypernodeData]
        )
      })
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
        "data" -> Json.stringify(Json.toJson(hypernode.data)),
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

    val dbUsername = configuration.getString("neo4j.username").get
    val dbPassword = configuration.getString("neo4j.password").get
    val dbHost = configuration.getString("neo4j.host").get
    val dbPort = configuration.getInt("neo4j.port").get
    val dbTxUrl = s"http://$dbHost:$dbPort/db/data/transaction/commit"

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
            "data" -> Json.stringify(Json.toJson(node.data)),
            "updatedAt" -> node.updatedAt.getMillis
          )
        )
      }
    )

    val holder = ws
      .url(dbTxUrl)
      .withAuth(dbUsername, dbPassword, WSAuthScheme.BASIC)
      .withHeaders(neo4jHeaders:_*)

    // TODO: need to sanitize the response before returning it to client
    holder.post(neo4jReqJson).map { neo4jRes =>
      ((neo4jRes.json \ "results")(0) \ "data").as[Seq[JsObject]].map { result =>
        (result \ "row")(0).as[Hypernode]
      }
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
        | OPTIONAL MATCH (hn)-[E:EDGE]-(:Hypernode)
        | DELETE OWNS_HN, E, hn;
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
