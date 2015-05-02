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

case class Hyperlink(
  id: UUID,
  sourceID: UUID,
  targetID: UUID,
  updatedAt: DateTime,
  createdAt: DateTime,
  data: Option[JsObject]
)

object Hyperlink {
  // TODO: security issue - hyperlink queries do not use hypergraphID or userEmail currently, use them!

  val dbHost = "localhost"
  val dbPort = current.configuration.getInt("neo4j.port").get
  val dbUsername = current.configuration.getString("neo4j.username").get
  val dbPassword = current.configuration.getString("neo4j.password").get

  implicit val neo4jConnection = Neo4jConnection(dbHost, dbPort, dbUsername, dbPassword)

  val neo4jHeaders = Seq(
    "Content-Type" -> "application/json",
    "Accept" -> "application/json; charset=UTF-8"
  )

  // TODO: reads can be made more efficient by not re-indexing down "(__ \ row)(0)"

  implicit val hyperlinkReads: Reads[Hyperlink] = (
    (JsPath \ "id").read[UUID] and
    (JsPath \ "sourceId").read[UUID] and
    (JsPath \ "targetId").read[UUID] and
    (JsPath \ "updatedAt").read[DateTime] and
    (JsPath \ "createdAt").read[DateTime] and
    (JsPath \ "data").read[String].map(Json.parse(_).asOpt[JsObject])
  )(Hyperlink.apply _)


  // NOTE: if we want to add the constraint of single one directional links between nodes,
  // we'll have to manually query against the db to make sure it doesn't exist

  def create(userEmail: String,
             hypergraphID: UUID,
             hyperlink: Hyperlink): Future[Hyperlink] = {

    val cypherCreate =
      """
        | MATCH (source:Hypernode { id: {sourceId} }), (target:Hypernode { id: {targetId} })
        | CREATE (source)-[HL:HYPERLINK {hyperlinkData}]->(target)
        | RETURN HL;
      """.stripMargin

    Cypher(cypherCreate)
        .apply(Json.obj(
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
        ))
        .map(_.rows.head(0).as[Hyperlink])
  }

  def read(userEmail: String,
           hypergraphID: UUID,
           hyperlinkID: UUID): Future[Option[Hyperlink]] = {

    val cypherRead =
      """
        | MATCH (:Hypernode)-[HL:HYPERLINK { id: {hyperlinkID} }]->(:Hypernode)
        | RETURN HL;
      """.stripMargin

    Cypher(cypherRead)
        .apply(Json.obj(
          "hyperlinkID" -> hyperlinkID
        ))
        .map(_.rows.headOption.map(row => row(0).as[Hyperlink]))
  }

  def readAll(userEmail: String,
              hypergraphID: UUID): Future[Seq[Hyperlink]] = {

    val cypherReadAll =
      """
        | MATCH (:User { email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph { id: {hypergraphID} })
        | MATCH (hg)-[:OWNS_HYPERNODE]->(:Hypernode)-[HL:HYPERLINK]->(:Hypernode)
        | RETURN HL;
      """.stripMargin

    Cypher(cypherReadAll)
        .apply(Json.obj(
          "hypergraphID" -> hypergraphID,
          "userEmail" -> userEmail
        ))
        .map(_.rows.map(row => row(0).as[Hyperlink]))
  }

  def update(userEmail: String,
             hypergraphID: UUID,
             hyperlink: Hyperlink): Future[Hyperlink] = {

    val cypherUpdate =
      """
        | MATCH (:Hypernode)-[HL:HYPERLINK { id: {hyperlinkID} }]->(:Hypernode)
        | SET HL.data = {data}, HL.updatedAt = {updatedAt}
        | RETURN HL;
      """.stripMargin

    Cypher(cypherUpdate)
        .apply(Json.obj(
          "hyperlinkID" -> hyperlink.id,
          "data" -> Json.stringify(hyperlink.data.getOrElse(JsNull)),
          "updatedAt" -> hyperlink.updatedAt.getMillis
        ))
        .map(_.rows.head(0).as[Hyperlink])
  }

  def delete(userEmail: String,
             hypergraphID: UUID,
             hyperlinkID: UUID): Future[Boolean] = {

    val cypherDelete =
      """
        | MATCH (:Hypernode)-[HL:HYPERLINK { id: {hyperlinkID} }]-(:Hypernode)
        | DELETE HL;
      """.stripMargin

    Cypher(cypherDelete)
        .apply(Json.obj(
          "hyperlinkID" -> hyperlinkID
        ))
        .map(_.stats.relationshipsDeleted > 0)
  }
}
