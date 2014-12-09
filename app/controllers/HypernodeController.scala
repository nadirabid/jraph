package controllers

import javax.inject.Inject
import java.util.UUID

import com.mohiva.play.silhouette.api.{Silhouette, Environment}
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import models.{Hypernode, User}
import org.joda.time.DateTime

import scala.concurrent.ExecutionContext.Implicits.global

import play.api.Play.current
import play.api.libs.json._
import play.api.libs.ws.WS

import scala.concurrent.Future

class HypernodeController @Inject() (implicit val env: Environment[User, SessionAuthenticator])
  extends Silhouette[User, SessionAuthenticator] {

  implicit val hypernodeWrites = new Writes[Hypernode] {
    def writes(hypernode: Hypernode) = Json.obj(
      "id" -> hypernode.hypernodeID,
      "createdAt" -> hypernode.createdAt.getMillis,
      "updatedAt" -> hypernode.updatedAt.getMillis,
      "date" -> hypernode.data
    )
  }

  def createHypernode(hypergraphID: UUID) = SecuredAction.async(parse.json) { req =>
    val model = Hypernode(
      UUID.randomUUID(),
      DateTime.now,
      DateTime.now,
      Json.stringify(req.body \ "data")
    )

    Hypernode.create(req.identity.email, hypergraphID, model) map {
      case Some(hypernode) => Ok(Json.toJson(hypernode))
      case None => ServiceUnavailable
    }
  }

  def readHypernode(hypergraphID: UUID, hypernodeID: UUID) = SecuredAction.async { req =>
    Hypernode.read(req.identity.email, hypergraphID, hypernodeID) map {
      case Some(hypernode) => Ok(Json.toJson(hypernode))
      case None => ServiceUnavailable
    }
  }

  def readAllHypernode(hypergraphID: UUID) = SecuredAction.async { req =>
    Hypernode.readAll(req.identity.email, hypergraphID) map {
      case Some(hypernodes) => Ok(Json.toJson(hypergraphID))
      case None => ServiceUnavailable
    }
  }

  def updateHypernode(hypergraphID: UUID,
                      hypernodeID: UUID) = SecuredAction.async(parse.json) { req =>

    val model = Hypernode(
      hypernodeID,
      DateTime.now,
      null,
      Json.stringify(req.body \ "data")
    )

    Hypernode.update(req.identity.email, hypergraphID, model) map {
      case Some(hypernode) => Ok(Json.toJson(hypernode))
      case None => ServiceUnavailable
    }
  }

  def batchUpdateHypernode(hypergraphID: UUID) = SecuredAction.async(parse.json) { req =>
    val models = (req.body \ "data").as[Seq[JsObject]] map { json =>
      Hypernode((json \ "id").as[UUID], DateTime.now, null, Json.stringify(json \ "data"))
    }

    Hypernode.batchUpdate(req.identity.email, hypergraphID, models) map {
      case Some(hypernodes) => Ok(Json.toJson(hypernodes))
      case None => ServiceUnavailable
    }
  }

  def deleteHypergraph(hypergraphID: UUID,
                       hypernodeID: UUID) = SecuredAction.async(parse.json) { req =>

    Hypernode.delete(req.identity.email, hypergraphID, hypernodeID) map {
      case true => Ok(Json.toJson(true))
      case false => ServiceUnavailable
    }
  }

  val dbUrl = "http://localhost:7474/db/data/transaction/commit"

  val cypherCreate =
    """
      | MATCH (user:User { email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph { name: {hypergraphName} })
      | CREATE (hn:Hypernode {hn}), (hg)-[:OWNS_HYPERNODE]->(hn)
      | RETURN hn;
    """.stripMargin

  def create(hypergraphID: UUID) = SecuredAction.async(parse.json) { req =>
    val timestamp = System.currentTimeMillis

    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherCreate,
          "parameters" -> Json.obj(
            "userEmail" -> req.identity.email,
            "hypergraphName" -> "default", //TODO: need to switch this to use ID
            "hn" -> Json.obj(
              "id" -> UUID.randomUUID(),
              "createdAt" -> timestamp,
              "updatedAt" -> timestamp,
              "data" -> Json.stringify(req.body \ "data")
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
      Ok(neo4jRes.json)
    }
  }

  val cypherRead =
    """
      | MATCH (hn:Hypernode { id: {uuid} })
      | RETURN hn;
    """.stripMargin

  def read(hypergraphID: UUID, uuid: UUID) = SecuredAction.async { req =>
    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherRead,
          "parameters" -> Json.obj("uuid" -> uuid)
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
      Ok(neo4jRes.json)
    }
  }

  val cypherReadAll =
    """
      | MATCH (:User { email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph { name: {hypergraphName} })
      | MATCH (hg)-[:OWNS_HYPERNODE]->(hn:Hypernode)
      | RETURN hn;
    """.stripMargin

  def readAll(hypergraphID: UUID) = SecuredAction.async { req =>
    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherReadAll,
          "parameters" -> Json.obj(
            "hypergraphName" -> "default",
            "userEmail" -> req.identity.email
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
      Ok(neo4jRes.json)
    }
  }

  val cypherUpdate =
    """
      | MATCH (hn { id: {uuid} })
      | SET hn.data = {data}, hn.updatedAt = {updatedAt}
      | RETURN hn;
    """.stripMargin

  def update(hypergraphID: UUID, uuid: UUID) = SecuredAction.async(parse.json) { req =>
    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherUpdate,
          "parameters" -> Json.obj(
            "uuid" -> uuid,
            "data" -> Json.stringify(req.body \ "data"),
            "updatedAt" -> System.currentTimeMillis
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
      Ok(neo4jRes.json)
    }
  }

  def batchUpdate(hypergraphID: UUID) = SecuredAction.async(parse.json) { req =>
    val nodes = (req.body \ "data").as[Seq[JsObject]]

    val neo4jReq = Json.obj(
      "statements" -> nodes.map{ node =>
        Json.obj(
          "statement" -> cypherUpdate,
          "parameters" -> Json.obj(
            "uuid" -> UUID.fromString((node \ "id").as[String]),
            "data" -> Json.stringify(node \ "data"),
            "updatedAt" -> System.currentTimeMillis
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

    holder.post(neo4jReq).map { neo4jRes =>
      Ok(neo4jRes.json)
    }
  }

  val cypherDelete =
    """
      | MATCH (hn:Hypernode { id: {uuid} }),
      |       (:User { email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph { name: {hypergraphName} }),
      |       (hg)-[OWNS_HN:OWNS_HYPERNODE]->(hn)
      | OPTIONAL MATCH (hn)-[HL:HYPERLINK]-(:Hypernode)
      | DELETE OWNS_HN, HL, hn;
    """.stripMargin

  def delete(hypergraphID: UUID, uuid: UUID) = SecuredAction.async(parse.json) { req =>
    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherDelete,
          "parameters" -> Json.obj(
            "uuid" -> uuid,
            "hypergraphName" -> "default",
            "userEmail" -> req.identity.email
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

    holder.post(neo4jReq).map { neo4jRes =>
      Ok(neo4jRes.json)
    }
  }

}