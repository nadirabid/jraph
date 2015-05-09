package models

import com.mohiva.play.silhouette.api.{Identity, LoginInfo}
import java.util.UUID

case class User(
    id: UUID,
    email: String,
    firstName: Option[String],
    lastName: Option[String],
    loginInfo: LoginInfo,
    role: Option[String] = None
) extends Identity