package controllers

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

import play.api.mvc._
import play.api.Play.current

import com.mohiva.play.silhouette.api.services.AuthInfoService
import models.User
import com.mohiva.play.silhouette.api.{LogoutEvent, Environment, Silhouette}
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import models.services.UserService

import javax.inject.Inject

class ApplicationController @Inject() (implicit val env: Environment[User, SessionAuthenticator],
                                       val userService: UserService,
                                       val authInfoService: AuthInfoService)
  extends Silhouette[User, SessionAuthenticator] {

  def index = SecuredAction {
    Ok(views.html.graph.index())
  }

  def trimTrailingForwardSlash(path: String) = Action {
    MovedPermanently("/" + path)
  }

  def test = UserAwareAction {
    Ok(views.html.test.index())
  }

  def signIn = UserAwareAction { req =>
    Ok
  }

  def signUp = UserAwareAction { req =>
    Ok
  }

  def signUpSubmit = Action { req =>
    Ok
  }

  def signOut = SecuredAction { req =>
    Ok
  }

  def authenticate = Action { req =>
    Ok
  }
}