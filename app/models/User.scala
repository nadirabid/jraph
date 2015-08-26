package models

import java.util.UUID

import com.mohiva.play.silhouette.api.{Identity, LoginInfo}

case class User(
    id: UUID,
    email: String,
    firstName: Option[String],
    lastName: Option[String],
    loginInfo: LoginInfo,
    role: Option[String] = None
) extends Identity
