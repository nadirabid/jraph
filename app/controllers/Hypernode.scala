package controllers

import scala.concurrent.ExecutionContext.Implicits.global

import play.api.mvc._
import play.api.Play.current
import play.api.libs.json._
import play.api.libs.ws.{WSResponse, WS}
import java.util.UUID

object Hypernode extends Controller {

  val mockUserId = UUID.fromString("c53303e1-0287-4e5a-8020-1026493c6e37")

  val cypherCreate = "MATCH (user:User { id: {userId} }) " +
                     "CREATE (hn:Hypernode {hn}) (user)-[owns:OWNS]->(hn) " +
                     "RETURN hn;"

  def create = Action.async(parse.json) { req =>
    val timestamp = System.currentTimeMillis
    val test: UUID = null

    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherCreate,
          "parameters" -> Json.obj(
            "userId" -> mockUserId,
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
      .url("http://localhost:7474/db/data/transaction/commit")
      .withHeaders(
        "Content-Type" -> "application/json",
        "Accept" -> "application/json; charset=UTF-8"
      )

    holder.post(neo4jReq).map { neo4jRes =>
      Ok(neo4jRes.json)
    }
  }

  val cypherRead = "MATCH (hn:Hypernode { id: {uuid} }) " +
                   "RETURN hn;"

  def read(uuid: UUID) = Action.async { req =>
    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherRead,
          "parameters" -> Json.obj("uuid" -> uuid)
        )
      )
    )

    val holder = WS
      .url("http://localhost:7474/db/data/transaction/commit")
      .withHeaders(
        "Content-Type" -> "application/json",
        "Accept" -> "application/json; charset=UTF-8"
      )

    holder.post(neo4jReq).map { neo4jRes => Ok(neo4jRes.json)}
  }

  val cypherAll = "MATCH (user:User { id: {userId} }), (user)-[:OWNS]->(hn:Hypernode) " +
                  "RETURN hn;"

  def all = Action.async { req =>
    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherAll,
          "parameters" -> Json.obj(
            "userId" -> mockUserId
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

    holder.post(neo4jReq).map { neo4jRes => Ok(neo4jRes.json) }
  }

  val cypherUpdate = "MATCH (hn { id: {uuid} }) " +
                     "SET hn.data = {data}, hn.updatedAt = {updatedAt} " +
                     "RETURN hn;"

  def update(uuid: UUID) = Action.async(parse.json) { req =>
    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherUpdate,
          "parameters" -> Json.obj(
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

    holder.post(neo4jReq).map { neo4jRes => Ok(neo4jRes.json) }
  }

  def batchUpdate = Action.async(parse.json) { req =>

    val statements = new JsArray

    (req.body \ "data").as[Seq[JsObject]].foreach{ jsObj =>
      statements.append(Json.obj(
        "statement" -> cypherUpdate,
        "parameters" -> Json.obj(
          "data" -> jsObj,
          "updatedAt" -> System.currentTimeMillis
        )
      ))
    }

    val neo4jReq = Json.obj(
      "statements" -> statements
    )

    val holder = WS
      .url("http://localhost:7474/db/data/transaction/commit")
      .withHeaders(
        "Content-Type" -> "application/json",
        "Accept" -> "application/json; charset=UTF-8"
      )

    holder.post(neo4jReq).map { neo4jRes => Ok(neo4jRes.json) }
  }

  val cypherDelete = "MATCH (hn:Hypernode { id: {uuid} })-[rels]-() " +
                     "MATCH (user:User { id: {userId} })-[owns:OWNS]->(hypernode) " +
                     "DELETE owns, rels, hypernode;"

  def delete(uuid: UUID) = Action.async(parse.json) { req =>
    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherDelete,
          "parameters" -> Json.obj(
            "uuid" -> uuid,
            "userId" -> mockUserId
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
