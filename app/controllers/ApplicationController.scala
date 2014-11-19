package controllers

import forms._

import scala.concurrent.Future

import play.api.mvc._

import com.mohiva.play.silhouette.api.services.AuthInfoService
import com.mohiva.play.silhouette.api.{LogoutEvent, Environment, Silhouette}
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import models.User
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

  def signIn = UserAwareAction.async { implicit request =>
    request.identity match {
      case Some(user) => Future.successful(Redirect(routes.ApplicationController.index))
      case None => Future.successful(Ok(views.html.signIn(SignInForm.form)))
    }
  }

  def signUp = UserAwareAction.async { implicit request =>
    request.identity match {
      case Some(user) => Future.successful(Redirect(routes.ApplicationController.index))
      case None => Future.successful(Ok(views.html.signUp(SignUpForm.form)))
    }
  }

  def signUpSubmit = Action { req =>
    Ok
  }

  def authenticate = Action { req =>
    Ok
  }

  def signOut = SecuredAction.async { implicit request =>
    env.eventBus.publish(LogoutEvent(request.identity, request, request2lang))
    Future.successful(request.authenticator.discard(Redirect(routes.ApplicationController.index)))
  }
}