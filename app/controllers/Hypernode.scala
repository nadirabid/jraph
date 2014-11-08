package controllers

import scala.concurrent.ExecutionContext.Implicits.global

import play.api.mvc._
import play.api.Play.current
import play.api.libs.json._
import play.api.libs.ws.{WSResponse, WS}
import java.util.UUID

object Hypernode extends Controller {

  val mockUserId = UUID.fromString("c53303e1-0287-4e5a-8020-1026493c6e37")

  val dbUrl = "http://localhost:7474/db/data/transaction/commit"

  val cypherCreate = "MATCH (user:User { id: {userId} }) " +
                     "CREATE (hn:Hypernode {hn}), (user)-[owns:OWNS]->(hn) " +
                     "RETURN hn;"

  def create = Action.async(parse.json) { req =>
    val timestamp = System.currentTimeMillis

    val userEmail = (req.body \ "email").asOpt[String] getOrElse mockUserId.toString

    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherCreate,
          "parameters" -> Json.obj(
            "userId" -> userEmail,
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
      .url(dbUrl)
      .withHeaders(
        "Content-Type" -> "application/json",
        "Accept" -> "application/json; charset=UTF-8"
      )

    holder.post(neo4jReq).map { neo4jRes =>
      Ok(neo4jRes.json)
    }
  }

  val cypherAll = "MATCH (user:User { id: {userId} }), (user)-[:OWNS]->(hn:Hypernode) " +
                  "RETURN hn;"

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
      .url(dbUrl)
      .withHeaders(
        "Content-Type" -> "application/json",
        "Accept" -> "application/json; charset=UTF-8"
      )

    holder.post(neo4jReq).map { neo4jRes =>
      Ok(neo4jRes.json)
    }
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

  def batchUpdate = Action.async(parse.json) { req =>

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

  val cypherDelete = "MATCH (hn:Hypernode { id: {uuid} })-[rels]-() " +
                     "MATCH (user:User { id: {userId} })-[owns:OWNS]->(hn) " +
                     "DELETE owns, rels, hn;"

  def delete(uuid: UUID) = Action.async(parse.json) { req =>
    val userEmail = (req.body \ "email").asOpt[String] getOrElse mockUserId.toString

    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherDelete,
          "parameters" -> Json.obj(
            "uuid" -> uuid,
            "userId" -> userEmail
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

}