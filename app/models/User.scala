package models

import com.mohiva.play.silhouette.api.{Identity, LoginInfo}

case class User(
    email: String,
    firstName: Option[String],
    lastName: Option[String],
    loginInfo: LoginInfo
) extends Identity