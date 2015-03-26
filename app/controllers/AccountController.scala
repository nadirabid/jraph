package controllers

import javax.inject.Inject

import com.mohiva.play.silhouette.api._
import com.mohiva.play.silhouette.api.services.AuthInfoService
import com.mohiva.play.silhouette.api.util.PasswordHasher
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import com.mohiva.play.silhouette.impl.providers._

import forms.SignUpForm

import models.User
import models.services.UserService
import play.api.i18n.Messages

import play.api.libs.concurrent.Execution.Implicits._
import play.api.mvc.Action

import scala.concurrent.Future

class AccountController @Inject() (implicit val env: Environment[User, SessionAuthenticator],
                                   val authInfoService: AuthInfoService,
                                   val userService: UserService,
                                   val passwordHasher: PasswordHasher)
  extends Silhouette[User, SessionAuthenticator] {

  def create = Action.async { implicit request =>
    SignUpForm.form.bindFromRequest.fold(
      form => Future.successful(BadRequest(views.html.account.signUp(form))),
      data => {
        val loginInfo = LoginInfo(CredentialsProvider.ID, data.email)
        userService.retrieve(loginInfo).flatMap {
          case Some(user) => Future.successful(Redirect(routes.ApplicationController.signUp)
            .flashing("error" -> Messages("user.exists")))
          case None =>
            val authInfo = passwordHasher.hash(data.password)
            val user = User(java.util.UUID.randomUUID(), data.email, None, None, loginInfo)

            for {
              user <- userService.save(user.copy())
              authInfo <- authInfoService.save(loginInfo, authInfo)
              authenticator <- env.authenticatorService.create(user.loginInfo)
              value <- env.authenticatorService.init(authenticator)
              result <- env.authenticatorService.embed(value, Future.successful(
                Redirect(routes.ApplicationController.index())
              ))
            } yield  {
              env.eventBus.publish(SignUpEvent(user, request, request2lang))
              env.eventBus.publish(LoginEvent(user, request, request2lang))
              result
            }
        }
      }
    )
  }

  def delete = SecuredAction.async { implicit request =>
    userService.delete(request.identity.id).map {
      case true => Ok
      case false => ServiceUnavailable
    }
  }
}