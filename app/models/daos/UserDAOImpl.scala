package models.daos

import java.util.UUID

import com.mohiva.play.silhouette.api.LoginInfo

import models.User

import scala.concurrent.ExecutionContext.Implicits.global

import play.api.Play.current
import play.api.libs.functional.syntax._
import play.api.libs.json._
import play.api.libs.json.Reads._
import play.api.libs.ws.{WS, WSRequestHolder}

class UserDAOImpl extends UserDAO {
  val dbUrl = "http://localhost:7474/db/data/transaction/commit"

  /**
   * Example JSON result of Transactional Cypher HTTP endpoint
   * ie. /db/data/transaction/commit
   *
   * {
   *  results : [{
   *    columns: [ 'id(n)' ],
   *    data: [{
   *      row: [ 15 ]
   *    }]
   *  }],
   *  errors: [ ]
   * }
   */

  implicit val loginInfoReads: Reads[LoginInfo] = (
    (JsPath \ "providerID").read[String] and
    (JsPath \ "email").read[String](email)
  )(LoginInfo.apply _)

  implicit val userReads: Reads[User] = (
    (JsPath \ "email").read[String](email) and
    JsPath.read[LoginInfo]
  )(User.apply _)

  val cypherRead =
    """
      | MATCH (user:User { email: {email} })
      | RETURN user;
    """.stripMargin

  def find(loginInfo: LoginInfo) = {
    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherRead,
          "parameters" -> Json.obj(
            "email" -> loginInfo.providerKey
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
      val user = (((neo4jRes.json \ "results")(0) \ "data")(0) \ "row")(0).validate[User]

      user match {
        case s: JsSuccess[User] => Some(s.get)
        case e: JsError => None
      }
    }
  }

  def find(userID: String) = {
    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherRead,
          "parameters" -> Json.obj(
            "email" -> userID
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
      val user = (((neo4jRes.json \ "results")(0) \ "data")(0) \ "row")(0).validate[User]

      user match {
        case s: JsSuccess[User] => Some(s.get)
        case e: JsError => None
      }
    }
  }

  val cypherCreate =
    """
      | CREATE (user:User {userData}), (hg:Hypergraph {hypergraphData})
      | CREATE (user)-[:OWNS_HYPERGRAPH]->(hg)
      | RETURN user;
    """.stripMargin

  def save(user: User) = {
    val timestamp = System.currentTimeMillis

    // ASK: Do we need a UUID to identify a User node
    // given that we should have unique email addresses?

    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherCreate,
          "parameters" -> Json.obj(
            "hypergraphData" -> Json.obj(
              "id" -> UUID.randomUUID(),
              "name" -> "default",
              "createdAt" -> timestamp,
              "updateAt" -> timestamp
            ),
            "userData" -> Json.obj(
              "email" -> user.email,
              "providerID" -> user.loginInfo.providerID,
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

    //TODO: check if post returned with error
    holder.post(neo4jReq).map { _ => user}
  }

  val cypherDelete =
    """
      | MATCH (user:User { email: {email} }),
      |       (passwordInfo:PasswordInfo { providerKey: {email} })
      | OPTIONAL MATCH (user)-[OWNS_HG:OWNS_HYPERGRAPH]->(hg:Hypergraph)
      | OPTIONAL MATCH (hg)-[OWNS_HN:OWNS_HYPERNODE]->(hn:Hypernode)
      | OPTIONAL MATCH (hn)-[HL:HYPERLINK]->(:Hypernode)
      | DELETE OWNS_HG, OWNS_HN, HL, user, passwordInfo, hg, hn;
    """.stripMargin

  def delete(userID: String) = {
    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherDelete,
          "parameters" -> Json.obj(
            "email" -> userID
          ),
          "includeStats" -> true
        )
      )
    )

    val holder: WSRequestHolder = WS
      .url(dbUrl)
      .withHeaders(
        "Content-Type" -> "application/json",
        "Accepts" -> "application/json; charset=UTF-8"
      )

    // TODO: check if there was any error and the stats confirm at least one deleted node
    holder.post(neo4jReq).map { _ => true }
  }
}