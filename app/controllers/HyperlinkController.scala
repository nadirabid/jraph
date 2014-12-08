package controllers

import javax.inject.Inject

import com.mohiva.play.silhouette.api.{Silhouette, Environment}
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import models.User

import scala.concurrent.ExecutionContext.Implicits.global

import play.api.Play.current
import play.api.libs.json._
import play.api.libs.ws.WS
import java.util.UUID

class HyperlinkController @Inject() (implicit val env: Environment[User, SessionAuthenticator])
  extends Silhouette[User, SessionAuthenticator] {

  val cypherCreate =
    """
      | MATCH (source:Hypernode { id: {sourceId} }), (target:Hypernode { id: {targetId} })
      | CREATE UNIQUE (source)-[HL:HYPERLINK {hyperlinkData}]->(target)
      | RETURN HL;
    """.stripMargin

  def create(hypergraphID: UUID) = SecuredAction.async(parse.json) { req =>
    val sourceId = UUID.fromString((req.body \ "sourceId").as[String])
    val targetId = UUID.fromString((req.body \ "targetId").as[String])

    val timestamp = System.currentTimeMillis

    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherCreate,
          "parameters" -> Json.obj(
            "sourceId" -> sourceId,
            "targetId" -> targetId,
            "hyperlinkData" -> Json.obj(
              "id" -> UUID.randomUUID(),
              "createdAt" -> timestamp,
              "updatedAt" -> timestamp,
              "sourceId" -> sourceId,
              "targetId" -> targetId,
              "data" -> Json.stringify(req.body \ "data")
            )
          )
        )
      )
    )

    val holder = WS
      .url("http://localhost:7474/db/data/transaction/commit")
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
      | MATCH (:Hypernode)-[HL:HYPERLINK { id: {uuid} }]->(:Hypernode)
      | RETURN HL;
    """.stripMargin

  def read(hypergraphID: UUID, uuid: UUID) = SecuredAction.async { req =>
    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherRead,
          "parameters" -> Json.obj(
            "uuid" -> uuid
          )
        )
      )
    )

    val holder = WS
      .url("http://localhost:7474/db/data/transaction/commit")
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
      | MATCH (hg)-[:OWNS_HYPERNODE]->(:Hypernode)-[HL:HYPERLINK]->(:Hypernode)
      | RETURN HL;
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
      .url("http://localhost:7474/db/data/transaction/commit")
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
      | MATCH (:Hypernode)-[HL:HYPERLINK { id: {uuid} }]->(:Hypernode)
      | SET HL.data = {data}, HL.updatedAt = {updatedAt}
      | RETURN HL;
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
      .url("http://localhost:7474/db/data/transaction/commit")
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
      | MATCH (:Hypernode)-[HL:HYPERLINK { id: {uuid} }]-(:Hypernode)
      | DELETE HL;
    """.stripMargin

  def delete(hypergraphID: UUID, uuid: UUID) = SecuredAction.async { req =>
    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherDelete,
          "parameters" -> Json.obj(
            "uuid" -> uuid
          )
        )
      )
    )

    val holder = WS
      .url("http://localhost:7474/db/data/transaction/commit")
      .withHeaders(
        "Content-Type" -> "application/json",
        "Accept" -> "application/json; charset=UTF-8"
      )

    holder.post(neo4jReq).map { neo4jRes =>
      Ok(neo4jRes.json)
    }
  }
}