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
  val dbTxUrl = current.configuration.getString("neo4j.host").map(_ + "/db/data/transaction/commit").get
  val dbPort = current.configuration.getInt("neo4j.port").get
  val dbUsername = current.configuration.getString("neo4j.username").get
  val dbPassword = current.configuration.getString("neo4j.password").get

  implicit val neo4jConnection = Neo4jConnection(dbHost, dbPort, dbUsername, dbPassword)

  val neo4jHeaders = Seq(
    "Content-Type" -> "application/json",
    "Accept" -> "application/json; charset=UTF-8"
  )

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
        .on(Json.obj(
            "email" -> loginInfo.providerKey
        ))
        .apply()
        .map(_.rows.head(0).validate[PasswordInfo])
        .map {
          case s: JsSuccess[PasswordInfo] => Some(s.get)
          case e: JsError => None
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
        .on(Json.obj(
          "email" -> loginInfo.providerKey,
          "passwordInfoData" -> Json.obj(
            "hasher" -> passwordInfo.hasher,
            "passwordDigest" -> passwordInfo.password,
            //"salt" -> passwordInfo.salt,
            "createdAt" -> timestamp,
            "updatedAt" -> timestamp
          )
        ))
        .apply()
        .map(_.rows.head(0).as[PasswordInfo])
  }

  // TODO: should return Future[Option[PasswordInfo]]
  def update(loginInfo: LoginInfo, passwordInfo: PasswordInfo): Future[PasswordInfo] = {
    val cypherUpdate =
      """
        | MATCH (:User { email: {email} })-[:HAS_PASSWORD]->(passwordInfo:PasswordInfo)
        | SET passwordInfo += {passwordInfoData}
        | RETURN passwordInfo;
      """.stripMargin

    Cypher(cypherUpdate)
        .on(Json.obj(
          "email" -> loginInfo.providerKey,
          "passwordInfoData" -> Json.obj(
            "hasher" -> passwordInfo.hasher,
            "passwordDigest" -> passwordInfo.password,
            //"salt" -> passwordInfo.salt,
            "updatedAt" -> System.currentTimeMillis
          )
        ))
        .apply()
        .map(_.rows.head(0).as[PasswordInfo])
  }
}
