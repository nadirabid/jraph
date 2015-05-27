package models

import java.util.UUID

import play.api.Play.current
import play.api.libs.json.Reads._
import play.api.libs.json._
import play.api.libs.functional.syntax._
import core.cypher.{Cypher, Neo4jConnection}

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

import org.joda.time._

case class Edge(
  id: UUID,
  sourceID: UUID,
  targetID: UUID,
  updatedAt: DateTime,
  createdAt: DateTime,
  data: Option[JsObject]
)

object Edge {
  // TODO: security issue - "edge" queries do not use hypergraphID or userEmail currently, use them!

  val dbHost = "localhost"
  val dbPort = current.configuration.getInt("neo4j.port").get
  val dbUsername = current.configuration.getString("neo4j.username").get
  val dbPassword = current.configuration.getString("neo4j.password").get

  implicit val neo4jConnection = Neo4jConnection(dbHost, dbPort, dbUsername, dbPassword)

  implicit val edgeReads: Reads[Edge] = (
    (JsPath \ "id").read[UUID] and
    (JsPath \ "sourceId").read[UUID] and
    (JsPath \ "targetId").read[UUID] and
    (JsPath \ "updatedAt").read[DateTime] and
    (JsPath \ "createdAt").read[DateTime] and
    (JsPath \ "data").read[String].map(Json.parse(_).asOpt[JsObject])
  )(Edge.apply _)

  implicit val edgeWrites = new Writes[Edge] {
    def writes(edge: Edge) = Json.obj(
      "id" -> edge.id,
      "sourceId" -> edge.sourceID,
      "targetId" -> edge.targetID,
      "updatedAt" -> edge.updatedAt.getMillis,
      "createdAt" -> edge.createdAt.getMillis,
      "data" -> edge.data
    )
  }

  // NOTE: if we want to add the constraint of single one directional links between nodes,
  // we'll have to manually query against the db to make sure it doesn't exist

  def create(userEmail: String,
             hypergraphID: UUID,
             edge: Edge): Future[Edge] = {

    val cypherCreate =
      """
        | MATCH (source:Hypernode { id: {sourceId} }), (target:Hypernode { id: {targetId} })
        | CREATE (source)-[E:EDGE {edgeData}]->(target)
        | RETURN E;
      """.stripMargin

    Cypher(cypherCreate)
        .apply(Json.obj(
          "sourceId" -> edge.sourceID,
          "targetId" -> edge.targetID,
          "edgeData" -> Json.obj(
            "id" -> edge.id,
            "createdAt" -> edge.createdAt.getMillis,
            "updatedAt" -> edge.updatedAt.getMillis,
            "sourceId" -> edge.sourceID,
            "targetId" -> edge.targetID,
            "data" -> Json.stringify(edge.data.getOrElse(JsNull))
          )
        ))
        .map(_.rows.head(0).as[Edge])
  }

  def read(userEmail: String,
           hypergraphID: UUID,
           edgeID: UUID): Future[Option[Edge]] = {

    val cypherRead =
      """
        | MATCH (:Hypernode)-[E:EDGE { id: {edgeID} }]->(:Hypernode)
        | RETURN E;
      """.stripMargin

    Cypher(cypherRead)
        .apply(Json.obj(
          "edgeID" -> edgeID
        ))
        .map(_.rows.headOption.map(row => row(0).as[Edge]))
  }

  def readAll(userEmail: String,
              hypergraphID: UUID): Future[Seq[Edge]] = {

    val cypherReadAll =
      """
        | MATCH (:User { email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph { id: {hypergraphID} })
        | MATCH (hg)-[:OWNS_HYPERNODE]->(:Hypernode)-[E:EDGE]->(:Hypernode)
        | RETURN E;
      """.stripMargin

    Cypher(cypherReadAll)
        .apply(Json.obj(
          "hypergraphID" -> hypergraphID,
          "userEmail" -> userEmail
        ))
        .map(_.rows.map(row => row(0).as[Edge]))
  }

  def update(userEmail: String,
             hypergraphID: UUID,
             edge: Edge): Future[Edge] = {

    val cypherUpdate =
      """
        | MATCH (:Hypernode)-[E:EDGE { id: {edgeID} }]->(:Hypernode)
        | SET E.data = {data}, E.updatedAt = {updatedAt}
        | RETURN E;
      """.stripMargin

    Cypher(cypherUpdate)
        .apply(Json.obj(
          "edgeID" -> edge.id,
          "data" -> Json.stringify(edge.data.getOrElse(JsNull)),
          "updatedAt" -> edge.updatedAt.getMillis
        ))
        .map(_.rows.head(0).as[Edge])
  }

  def delete(userEmail: String,
             hypergraphID: UUID,
             edgeID: UUID): Future[Boolean] = {

    val cypherDelete =
      """
        | MATCH (:Hypernode)-[E:EDGE { id: {edgeID} }]-(:Hypernode)
        | DELETE E;
      """.stripMargin

    Cypher(cypherDelete)
        .apply(Json.obj(
          "edgeID" -> edgeID
        ))
        .map(_.stats.relationshipsDeleted > 0)
  }
}
