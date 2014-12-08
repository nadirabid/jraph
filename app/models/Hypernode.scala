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
  data: String
)

object Hypernode {

  val dbUrl = "http://localhost:7474/db/data/transaction/commit"

  implicit val hypergraphReads: Reads[Hypernode] = (
    ((JsPath \ "row")(0) \ "hypernodeID").read[UUID] and
    ((JsPath \ "row")(0) \ "createdAt").read[DateTime] and
    ((JsPath \ "row")(0) \ "updatedAt").read[DateTime] and
    ((JsPath \ "row")(0) \ "data").read[String]
  )(Hypernode.apply _)

  val cypherCreate =
    """
      | MATCH (user:User { email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph { name: {hypergraphName} })
      | CREATE (hn:Hypernode {hn}), (hg)-[:OWNS_HYPERNODE]->(hn)
      | RETURN hn;
    """.stripMargin

  def create(userEmail: String,
             hypergraphID: UUID,
             hypernode: Hypernode): Future[Option[Hypernode]] = {

    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherCreate,
          "parameters" -> Json.obj(
            "userEmail" -> userEmail,
            "hypergraphName" -> "default", //TODO: need to switch this to use ID
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

    holder.post(neo4jReq).map { neo4jRes =>
      None
    }
  }

  val cypherRead =
    """
      | MATCH (hn:Hypernode { id: {uuid} })
      | RETURN hn;
    """.stripMargin

  def read(hypergraphID: UUID, hypernodeID: UUID): Future[Option[Hypernode]] =
    Future.successful(None)

  val cypherReadAll =
    """
      | MATCH (:User { email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph { name: {hypergraphName} })
      | MATCH (hg)-[:OWNS_HYPERNODE]->(hn:Hypernode)
      | RETURN hn;
    """.stripMargin

  def readAll(hypergraphID: UUID, hypernodeID: UUID): Future[Option[Seq[Hypernode]]] =
    Future.successful(None)

  val cypherUpdate =
    """
      | MATCH (hn { id: {uuid} })
      | SET hn.data = {data}, hn.updatedAt = {updatedAt}
      | RETURN hn;
    """.stripMargin

  def update(hypergraphID: UUID, hypernode: Hypernode): Future[Option[Hypernode]] =
    Future.successful(None)

  def batchUpdate(hypergraphID: UUID, hypernodes: Seq[Hypernode]): Future[Option[Seq[Hypernode]]] =
    Future.successful(None)

  val cypherDelete =
    """
      | MATCH (hn:Hypernode { id: {uuid} }),
      |       (:User { email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph { name: {hypergraphName} }),
      |       (hg)-[OWNS_HN:OWNS_HYPERNODE]->(hn)
      | OPTIONAL MATCH (hn)-[HL:HYPERLINK]-(:Hypernode)
      | DELETE OWNS_HN, HL, hn;
    """.stripMargin

  def delete(hypergraphID: UUID, hypernodeID: UUID): Future[Option[Boolean]] =
    Future.successful(None)

}