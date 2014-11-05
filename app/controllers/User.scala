package controllers

import scala.concurrent.ExecutionContext.Implicits.global

import play.api.libs.ws.{WS, WSRequestHolder}
import play.api.libs.json._
import play.api.mvc._
import play.api.Play.current

trait User extends Controller {

  val dbUrl = "http://localhost:7474/db/data/transaction/commit"

  val cypherCreate =
    """
      | CREATE (user:User {userData})
      | RETURN user;
    """.stripMargin

  def create = Action.async(parse.json) { req =>
    val timestamp = System.currentTimeMillis

    // ASK: Do we need a UUID to identify a User node
    // given that we should have unique email addresses?

    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherCreate,
          "parameters" -> Json.obj(
            "userData" -> Json.obj(
              "email" -> Json.stringify(req.body \ "email"),
              "createdAt" -> timestamp,
              "updatedAt" -> timestamp
            )
          )
        )
      )
    )

    val holder: WSRequestHolder = WS
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
      | MATCH (user:User { email: {email} })
      | RETURN user;
    """.stripMargin

  def read = Action.async(parse.json) { req =>
    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherRead,
          "parameters" -> Json.obj(
            "email" -> Json.stringify(req.body \ "email")
          )
        )
      )
    )

    val holder: WSRequestHolder = WS
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
      | MATCH (user:User { email: {email} })
      | DELETE user;
    """.stripMargin

  val cypherDelete2 =
    """
      | MATCH (user:User { email: {email} })
      | OPTIONAL MATCH (user)-[owns:OWNS]-(hn:Hypernode)
      | OPTIONAL MATCH (hn)-[hl:HYPERLINK]->()
      | DELETE user, owns, hn, hl;
    """.stripMargin

  def delete = Action.async(parse.json) { req =>
    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherRead,
          "parameters" -> Json.obj(
            "email" -> Json.stringify(req.body \ "email")
          )
        )
      )
    )

    val holder: WSRequestHolder = WS
      .url(dbUrl)
      .withHeaders(
        "Content-Type" -> "application/json",
        "Accepts" -> "application/json; charset=UTF-8"
      )

    holder.post(neo4jReq).map { neo4jRes =>
      Ok(neo4jRes.json)
    }
  }

}

object User extends User