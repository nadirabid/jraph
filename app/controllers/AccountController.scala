package controllers

import java.util.UUID
import javax.inject.Inject

import com.mohiva.play.silhouette.api._
import com.mohiva.play.silhouette.api.repositories.AuthInfoRepository
import com.mohiva.play.silhouette.api.util.PasswordHasher
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import com.mohiva.play.silhouette.impl.providers._
import forms.SignUpForm
import models.User
import models.services.UserService
import play.api.i18n.MessagesApi
import play.api.libs.concurrent.Execution.Implicits._

import scala.concurrent.Future

class AccountController @Inject() (val messagesApi: MessagesApi,
                                   val env: Environment[User, SessionAuthenticator],
                                   val authInfoRepository: AuthInfoRepository,
                                   val userService: UserService,
                                   val passwordHasher: PasswordHasher)
  extends Silhouette[User, SessionAuthenticator] {

  def create = UserAwareAction.async { implicit  req =>
    req.identity match {
      case Some(user) => Future.successful(Redirect(routes.ApplicationController.userGraphs()))
      case None =>
        SignUpForm.form.bindFromRequest.fold(
          formWithErrors => Future.successful{
            BadRequest(views.html.account.signUp(formWithErrors))
          },
          data => {
            val loginInfo = LoginInfo(CredentialsProvider.ID, data.email)
            userService.retrieve(loginInfo).flatMap {
              case Some(user) => Future.successful {
                val signUpForm = SignUpForm.form
                  .fill(data)
                  .withError("email", "Sorry, that email has already been registered.")
                BadRequest(views.html.account.signUp(signUpForm))
              }
              case None =>
                val passwordInfo = passwordHasher.hash(data.passphrase)
                val fullName = data.fullName.getOrElse("").split(" ")
                val firstName = fullName.lift(0)
                val lastName = fullName.lift(1)

                val user = User(UUID.randomUUID(), data.email, firstName, lastName, loginInfo)

                for {
                  user <- userService.create(user.copy())
                  savedPasswordInfo <- authInfoRepository.add(loginInfo, passwordInfo)
                  authenticator <- env.authenticatorService.create(user.loginInfo)
                  value <- env.authenticatorService.init(authenticator)
                  result <- env.authenticatorService.embed(value,
                    Redirect(routes.ApplicationController.userGraphs())
                  )
                } yield {
                  result
                }
            }
          }
        )
    }
  }

  def delete = SecuredAction.async { implicit request =>
    userService.delete(request.identity.email).map {
      case true => Ok
      case false => ServiceUnavailable
    }
  }
}