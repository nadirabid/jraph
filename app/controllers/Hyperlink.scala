package controllers

import scala.concurrent.ExecutionContext.Implicits.global

import play.api.mvc._
import play.api.Play.current
import play.api.libs.json._
import play.api.libs.ws.{WSResponse, WS}
import java.util.UUID

object Hyperlink extends Controller {

  val mockUserId = UUID.fromString("c53303e1-0287-4e5a-8020-1026493c6e37")

  val cypherCreate =
    """
      | MATCH (source:Hypernode { id: {sourceId} }), (target:Hypernode { id: {targetId} })
      | CREATE UNIQUE (source)-[hl:HYPERLINK {hl}]->(target)
      | RETURN hl;
    """.stripMargin

  def create = Action.async(parse.json) { req =>
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
            "hl" -> Json.obj(
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
      | MATCH (:Hypernode)-[hl:HYPERLINK { id: {uuid} }]->(:Hypernode)
      | RETURN hl;
    """.stripMargin

  def read(uuid: UUID) = Action.async { req =>
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

  val cypherAll =
    """
      |MATCH (user:User { id: {userId} }), (user)-[:OWNS]-(:Hypernode)-[rels]->(:Hypernode)
      | RETURN rels;
    """.stripMargin

  def readAll = Action.async(parse.json) { req =>
    val userEmail = (req.body \ "email").asOpt[String] getOrElse mockUserId.toString

    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherAll,
          "parameters" -> Json.obj(
            "userId" -> userEmail
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
      | MATCH (:Hypernode)-[hl:HYPERLINK { id: {uuid} }]->(:Hypernode)
      | SET hl.data = {data}, hl.updatedAt = {updatedAt}
      | RETURN hl;
    """.stripMargin

  def update(uuid: UUID) = Action.async(parse.json) { req =>
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
      | MATCH (:Hypernode)-[hl:HYPERLINK { id: {uuid} }]-(:Hypernode)
      | DELETE hyperlink;
    """.stripMargin

  def delete(uuid: UUID) = Action.async { req =>
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