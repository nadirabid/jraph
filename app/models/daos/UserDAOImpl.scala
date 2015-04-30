package models.daos

import java.util.UUID

import com.mohiva.play.silhouette.api.LoginInfo

import models.User

import scala.concurrent.ExecutionContext.Implicits.global

import play.api.Play.current
import play.api.libs.functional.syntax._
import play.api.libs.json._
import play.api.libs.json.Reads._

import utils.cypher._

class UserDAOImpl extends UserDAO {
  val dbHost = "localhost"
  val dbPort = current.configuration.getInt("neo4j.port").get
  val dbUsername = current.configuration.getString("neo4j.username").get
  val dbPassword = current.configuration.getString("neo4j.password").get

  implicit val neo4jConnection = Neo4jConnection(dbHost,dbPort, dbUsername, dbPassword)

  implicit val loginInfoReads: Reads[LoginInfo] = (
    (JsPath \ "providerID").read[String] and
    (JsPath \ "email").read[String](email)
  )(LoginInfo.apply _)

  implicit val userReads: Reads[User] = (
      (JsPath \ "id").read[UUID] and
      (JsPath \ "email").read[String](email) and
      (JsPath \ "firstName").readNullable[String] and
      (JsPath \ "lastName").readNullable[String] and
      JsPath.read[LoginInfo]
  )(User.apply _)

  def find(loginInfo: LoginInfo) = {
    val cypherReadByEmail =
      """
        | MATCH (user:User { email: {email} })
        | RETURN user;
      """.stripMargin

    Cypher(cypherReadByEmail)
        .on(Json.obj(
          "email" -> loginInfo.providerKey
        ))
        .apply()
        .map { cypherResult =>
          cypherResult.rows.headOption.map(row => row(0).validate[User])
        }
        .map {
          case Some(s: JsSuccess[User]) => Some(s.get)
          case Some(e: JsError) => None // TODO: do some error logging/exception throwing
          case None => None
        }
  }

  def find(email: String) = {
    val cypherReadByEmail =
      """
        | MATCH (user:User { email: {email} })
        | RETURN user;
      """.stripMargin

    Cypher(cypherReadByEmail)
        .on(Json.obj(
          "email" -> email
        ))
        .apply()
        .map { cypherResult =>
          cypherResult.rows.headOption.map(row => row(0).validate[User])
        }
        .map {
          case Some(s: JsSuccess[User]) => Some(s.get)
          case Some(e: JsError) => None
          case None => None
        }
  }

  def create(user: User) = {
    val cypherCreate =
      """
        | CREATE (user:User {userData}), (hg:Hypergraph {hypergraphData})
        | CREATE (user)-[:OWNS_HYPERGRAPH]->(hg)
        | RETURN user;
      """.stripMargin

    val timestamp = System.currentTimeMillis

    Cypher(cypherCreate)
        .on(Json.obj(
          "hypergraphData" -> Json.obj(
            "id" -> UUID.randomUUID,
            "createdAt" -> timestamp,
            "updatedAt" -> timestamp,
            "data" -> Json.stringify(Json.obj(
              "name" -> "default"
            ))
          ),
          "userData" -> Json.obj(
            "id" -> user.id,
            "email" -> user.email,
            "firstName" -> user.firstName.getOrElse[String](""),
            "lastName" -> user.lastName.getOrElse[String](""),
            "providerID" -> user.loginInfo.providerID,
            "createdAt" -> timestamp,
            "updatedAt" -> timestamp
          )
        ))
        .apply()
        .map(_.rows.head(0).as[User])
  }

  def update(user: User) = {
    val cypherUpdate =
      """
        | MATCH (user:User { id: {id} })
        | SET user += {userData}
        | RETURN user;
      """.stripMargin

    Cypher(cypherUpdate)
        .on(Json.obj(
          "id" -> user.id,
          "userData" -> Json.obj(
            "firstName" -> user.firstName,
            "lastName" -> user.lastName,
            "email" -> user.email,
            "updatedAt" -> System.currentTimeMillis
          )
        ))
        .apply()
        .map(_.rows.head(0).as[User])
  }

  def delete(email: String) = {
    val cypherDelete =
      """
        | MATCH (user:User { email: {email} })-[HAS_PW:HAS_PASSWORD]->(passwordInfo:PasswordInfo)
        | OPTIONAL MATCH (user)-[OWNS_HG:OWNS_HYPERGRAPH]->(hg:Hypergraph)
        | OPTIONAL MATCH (hg)-[OWNS_HN:OWNS_HYPERNODE]->(hn:Hypernode)
        | OPTIONAL MATCH (hn)-[HL:HYPERLINK]->(:Hypernode)
        | DELETE OWNS_HG, OWNS_HN, HAS_PW, HL, user, passwordInfo, hg, hn;
      """.stripMargin

    Cypher(cypherDelete)
        .on(Json.obj(
          "email" -> email
        ))
        .apply()
        .map(_.stats.nodesDeleted > 0)
  }
}