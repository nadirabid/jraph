package models

import com.mohiva.play.silhouette.api.{Identity, LoginInfo}
import java.util.UUID

import play.api.libs.json.Reads._
import play.api.libs.json.{JsPath, Reads}
import play.api.libs.functional.syntax._

case class User(
    id: UUID,
    email: String,
    firstName: Option[String],
    lastName: Option[String],
    loginInfo: LoginInfo,
    role: Option[String] = None
) extends Identity

object User {
    implicit val userReads: Reads[User] = (
      (JsPath \ "id").read[UUID] and
        (JsPath \ "email").read[String](email) and
        (JsPath \ "firstName").readNullable[String] and
        (JsPath \ "lastName").readNullable[String] and
        JsPath.read[LoginInfo] and
        (JsPath \ "role").readNullable[String]
      )(User.apply _)
}