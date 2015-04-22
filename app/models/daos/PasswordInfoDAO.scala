package models.daos

import com.mohiva.play.silhouette.api.LoginInfo
import com.mohiva.play.silhouette.impl.daos.DelegableAuthInfoDAO
import com.mohiva.play.silhouette.api.util.PasswordInfo

import scala.concurrent.ExecutionContext.Implicits.global

import play.api.Play.current
import play.api.libs.functional.syntax._
import play.api.libs.json._
import play.api.libs.json.Reads._
import play.api.libs.ws.{WS, WSRequestHolder}
import play.api.libs.ws.WSAuthScheme

import scala.concurrent.Future

class PasswordInfoDAO extends DelegableAuthInfoDAO[PasswordInfo] {
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

  val dbTxUrl = current.configuration.getString("neo4j.host").map(_ + "/db/data/transaction/commit").get
  val dbUsername = current.configuration.getString("neo4j.username").get
  val dbPassword = current.configuration.getString("neo4j.password").get

  val neo4jHeaders = Map(
    "Content-Type" -> "application/json",
    "Accept" -> "application/json; charset=UTF-8"
  )

  implicit val passwordInfoReads: Reads[PasswordInfo] = (
    (JsPath \ "hasher").read[String] and
    (JsPath \ "passwordDigest").read[String] and
    (JsPath \ "salt").readNullable[String]
  )(PasswordInfo.apply _)

  val cypherRead =
    """
      | MATCH (:User { email: {email} })-[:HAS_PASSWORD]->(passwordInfo:PasswordInfo)
      | RETURN passwordInfo;
    """.stripMargin

  def find(loginInfo: LoginInfo): Future[Option[PasswordInfo]] = {
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
        .url(dbTxUrl)
        .withAuth(dbUsername, dbPassword, WSAuthScheme.BASIC)
        .withHeaders(neo4jHeaders)

    holder.post(neo4jReq).map { neo4jRes =>
      val user = (((neo4jRes.json \ "results")(0) \ "data")(0) \ "row")(0).validate[PasswordInfo]

      user match {
        case s: JsSuccess[PasswordInfo] => Some(s.get)
        case e: JsError => None
      }
    }
  }

  val cypherCreate =
  """
    | MATCH (user:User { email: {email} })
    | CREATE (user)-[:HAS_PASSWORD]->(passwordInfo:PasswordInfo {passwordInfoData})
    | RETURN passwordInfo;
  """.stripMargin

  def save(loginInfo: LoginInfo, passwordInfo: PasswordInfo): Future[PasswordInfo] = {
    val timestamp = System.currentTimeMillis

    // ASK: Do we need a UUID to identify a User node
    // given that we should have unique email addresses?

    // TODO: how to deal with possibly Null salt value. use Writer maybe?
    // Currently using BCryptPasswordHasher which does not set salt value
    // so we're ignoring it below all together

    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherCreate,
          "parameters" -> Json.obj(
            "email" -> loginInfo.providerKey,
            "passwordInfoData" -> Json.obj(
              "hasher" -> passwordInfo.hasher,
              "passwordDigest" -> passwordInfo.password,
              //"salt" -> passwordInfo.salt,
              "createdAt" -> timestamp,
              "updatedAt" -> timestamp
            )
          )
        )
      )
    )

    val holder: WSRequestHolder = WS
        .url(dbTxUrl)
        .withAuth(dbUsername, dbPassword, WSAuthScheme.BASIC)
        .withHeaders(neo4jHeaders)

    holder.post(neo4jReq).map{ res => passwordInfo }
  }

  val cypherUpdate =
    """
      | MATCH (:User { email: {email} })-[:HAS_PASSWORD]->(passwordInfo:PasswordInfo)
      | SET passwordInfo += {passwordInfoData}
      | RETURN passwordInfo;
    """.stripMargin

  // TODO: should return Future[Option[PasswordInfo]]
  def update(loginInfo: LoginInfo, passwordInfo: PasswordInfo): Future[PasswordInfo] = {
    val neo4jReq = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherUpdate,
          "parameters" -> Json.obj(
            "email" -> loginInfo.providerKey,
            "passwordInfoData" -> Json.obj(
              "hasher" -> passwordInfo.hasher,
              "passwordDigest" -> passwordInfo.password,
              //"salt" -> passwordInfo.salt,
              "updatedAt" -> System.currentTimeMillis
            )
          )
        )
      )
    )

    val holder: WSRequestHolder = WS
      .url(dbTxUrl)
      .withAuth(dbUsername, dbPassword, WSAuthScheme.BASIC)
      .withHeaders(neo4jHeaders)

    holder.post(neo4jReq).map{ res => passwordInfo }
  }
}
