package controllers

import javax.inject.Inject

import com.mohiva.play.silhouette.api._
import com.mohiva.play.silhouette.api.exceptions.{ConfigurationException, ProviderException}
import com.mohiva.play.silhouette.api.util.Credentials
import com.mohiva.play.silhouette.impl.exceptions.IdentityNotFoundException
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import com.mohiva.play.silhouette.impl.providers._
import core.authorization.WithAccess
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

  def authenticate = SecuredAction(WithAccess("dev")).async { implicit req =>
    SignInForm.form.bindFromRequest.fold(
      formWithErrors => Future.successful {
        BadRequest(views.html.account.signIn(formWithErrors))
      },
      credentials => credentialsProvider.authenticate(credentials).flatMap { loginInfo =>
        userService.retrieve(loginInfo).flatMap {
          case Some(user) =>
            val continueToResult = Redirect(routes.ApplicationController.userGraphs())

            for {
              authenticator <- env.authenticatorService.create(user.loginInfo)
              value <- env.authenticatorService.init(authenticator)
              result <- env.authenticatorService.embed(value, continueToResult)
            } yield {
              result
            }
          case None =>
            Future.failed(new IdentityNotFoundException("Couldn't find user"))
        }
      }.recover {
        case e: ProviderException =>
          e.getMessage
          val signInFormWithErrors = SignInForm.form
            .fill(Credentials("",""))
            .withError("passphrase", "Email and passphrase did not match.")
          BadRequest(views.html.account.signIn(signInFormWithErrors))
      }
    )
  }

  def authenticateDevAccess = Action.async { implicit  req =>
    DevAccessForm.form.bindFromRequest.fold(
      formWithErrors => Future.successful {
        BadRequest(views.html.account.devAccess(formWithErrors))
      },
      devAccessFormData => {
        val credentials = Credentials("devAccess@email.com", devAccessFormData.password)

        credentialsProvider.authenticate(credentials).flatMap { loginInfo =>
          userService.retrieve(loginInfo).flatMap {
            case Some(user) =>
              val continueToResult = Redirect(routes.ApplicationController.signIn())

              for {
                authenticator <- env.authenticatorService.create(user.loginInfo)
                value <- env.authenticatorService.init(authenticator)
                result <- env.authenticatorService.embed(value, continueToResult)
              } yield {
                result
              }
            case None =>
              Future.failed(new IdentityNotFoundException("Couldn't find user"))
          }
        }.recover {
          case e: ProviderException =>
            Redirect(routes.ApplicationController.signIn())
              .flashing("error" -> Messages("invalid.credentials"))
        }
      }
    )
  }
}