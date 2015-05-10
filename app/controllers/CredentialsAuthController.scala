package controllers

import javax.inject.Inject

import com.mohiva.play.silhouette.api._
import com.mohiva.play.silhouette.api.exceptions.{ConfigurationException, ProviderException}
import com.mohiva.play.silhouette.api.util.Credentials
import com.mohiva.play.silhouette.impl.exceptions.IdentityNotFoundException
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import com.mohiva.play.silhouette.impl.providers._
import forms.{DevAccessForm, SignInForm}
import models.User
import models.services.UserService
import play.api.i18n.Messages
import play.api.libs.concurrent.Execution.Implicits._
import play.api.mvc.Action

import scala.concurrent.Future

/**
 * The credentials auth controller.
 *
 * @param env The Silhouette environment.
 */
class CredentialsAuthController @Inject()(
    implicit val env: Environment[User, SessionAuthenticator],
    val credentialsProvider: CredentialsProvider,
    val userService: UserService)
  extends Silhouette[User, SessionAuthenticator] {

  /**
   * Authenticates a user against the credentials provider.
   *
   * @return The result to display.
   */
  def authenticate(continueTo: Option[String]) = Action.async { implicit req =>
    SignInForm.form.bindFromRequest.fold(
      form => Future.successful(BadRequest(views.html.account.signIn(form))),
      credentials =>
        credentialsProvider.authenticate(credentials).flatMap { loginInfo =>
          val continueToURL = continueTo.getOrElse(routes.ApplicationController.userGraphs().toString())

          userService.retrieve(loginInfo).flatMap {
            case Some(user) => env.authenticatorService.create(user.loginInfo).flatMap { authenticator =>
              env.authenticatorService.init(authenticator).flatMap { v =>
                env.authenticatorService.embed(v, Redirect(continueToURL))
              }
            }
            case None => Future.failed(new IdentityNotFoundException("Couldn't find user"))
          }
        }.recover {
          case e: ProviderException =>
            Redirect(routes.ApplicationController.signIn()).flashing("error" -> Messages("invalid.credentials"))
        }
    )
  }

  def authenticateDevAccess = Action.async { implicit req =>
    DevAccessForm.form.bindFromRequest.fold(
      form => Future.successful(BadRequest(views.html.account.devAccess())),
      passwordData => Future.successful(Ok)
    )
  }
}