package models

import com.mohiva.play.silhouette.api.{Identity, LoginInfo}

case class User(
  email: String,
  loginInfo: LoginInfo
) extends Identity