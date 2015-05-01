package models.daos

import com.mohiva.play.silhouette.api.LoginInfo
import com.mohiva.play.silhouette.impl.daos.DelegableAuthInfoDAO
import com.mohiva.play.silhouette.api.util.PasswordInfo

import scala.concurrent.ExecutionContext.Implicits.global

import play.api.Play.current
import play.api.libs.functional.syntax._
import play.api.libs.json._
import play.api.libs.json.Reads._

import scala.concurrent.Future

import utils.cypher._

class PasswordInfoDAO extends DelegableAuthInfoDAO[PasswordInfo] {
  val dbHost = "localhost"
  val dbPort = current.configuration.getInt("neo4j.port").get
  val dbUsername = current.configuration.getString("neo4j.username").get
  val dbPassword = current.configuration.getString("neo4j.password").get

  implicit val neo4jConnection = Neo4jConnection(dbHost, dbPort, dbUsername, dbPassword)

  implicit val passwordInfoReads: Reads[PasswordInfo] = (
    (JsPath \ "hasher").read[String] and
    (JsPath \ "passwordDigest").read[String] and
    (JsPath \ "salt").readNullable[String]
  )(PasswordInfo.apply _)

  def find(loginInfo: LoginInfo): Future[Option[PasswordInfo]] = {
    val cypherRead =
      """
        | MATCH (:User { email: {email} })-[:HAS_PASSWORD]->(passwordInfo:PasswordInfo)
        | RETURN passwordInfo;
      """.stripMargin

    Cypher(cypherRead)
        .apply(Json.obj(
            "email" -> loginInfo.providerKey
        ))
        .map { cypherResult =>
          cypherResult.rows.headOption.map(row => row(0).validate[PasswordInfo])
        }
        .map {
          case Some(s: JsSuccess[PasswordInfo]) => Some(s.get)
          case Some(e: JsError) => None // TODO: should do error logging
          case None => None
        }
  }

  def save(loginInfo: LoginInfo, passwordInfo: PasswordInfo): Future[PasswordInfo] = {
    val cypherCreate =
      """
        | MATCH (user:User { email: {email} })
        | CREATE (user)-[:HAS_PASSWORD]->(passwordInfo:PasswordInfo {passwordInfoData})
        | RETURN passwordInfo;
      """.stripMargin

    // TODO: how to deal with possibly Null salt value. use Writer maybe?
    // Currently using BCryptPasswordHasher which does not set salt value
    // so we're ignoring it below all together

    val timestamp = System.currentTimeMillis

    Cypher(cypherCreate)
        .apply(Json.obj(
          "email" -> loginInfo.providerKey,
          "passwordInfoData" -> Json.obj(
            "hasher" -> passwordInfo.hasher,
            "passwordDigest" -> passwordInfo.password,
            //"salt" -> passwordInfo.salt,
            "createdAt" -> timestamp,
            "updatedAt" -> timestamp
          )
        ))
        .map(_.rows.head(0).as[PasswordInfo])
  }

  def update(loginInfo: LoginInfo, passwordInfo: PasswordInfo): Future[PasswordInfo] = {
    val cypherUpdate =
      """
        | MATCH (:User { email: {email} })-[:HAS_PASSWORD]->(passwordInfo:PasswordInfo)
        | SET passwordInfo += {passwordInfoData}
        | RETURN passwordInfo;
      """.stripMargin

    Cypher(cypherUpdate)
        .apply(Json.obj(
          "email" -> loginInfo.providerKey,
          "passwordInfoData" -> Json.obj(
            "hasher" -> passwordInfo.hasher,
            "passwordDigest" -> passwordInfo.password,
            //"salt" -> passwordInfo.salt,
            "updatedAt" -> System.currentTimeMillis
          )
        ))
        .map(_.rows.head(0).as[PasswordInfo])
  }
}
