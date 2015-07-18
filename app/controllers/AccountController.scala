package controllers

import java.util.UUID
import javax.inject.Inject

import com.mohiva.play.silhouette.api._
import com.mohiva.play.silhouette.api.services.AuthInfoService
import com.mohiva.play.silhouette.api.util.PasswordHasher
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import com.mohiva.play.silhouette.impl.providers._
import core.authorization.WithAccess

import forms.{CreateAccountForm, SignUpForm}

import models.User
import models.services.UserService

import play.api.i18n.Messages
import play.api.libs.concurrent.Execution.Implicits._
import play.api.mvc.Action
import play.api.mvc.Results._

import scala.concurrent.Future

class AccountController @Inject() (implicit val env: Environment[User, SessionAuthenticator],
                                   val authInfoService: AuthInfoService,
                                   val userService: UserService,
                                   val passwordHasher: PasswordHasher)
  extends Silhouette[User, SessionAuthenticator] {

  def createAccount = UserAwareAction.async { implicit  req =>
    req.identity match {
      case Some(user) => Redirect(routes.ApplicationController.userGraphs())
      case None =>
        CreateAccountForm.form.bindFromRequest.fold(
          form => Future.successful(BadRequest(views.html.account.createAccount(form))),
          data => {
            val loginInfo = LoginInfo(CredentialsProvider.ID, data.email)
            userService.retrieve(loginInfo).flatMap {
              case Some(user) => Future.successful(Redirect(routes.ApplicationController.createAccount()))
              case None =>
                val passwordInfo = passwordHasher.hash(data.password)
                val fullName = data.fullName.getOrElse("").split(" ")
                val firstName = fullName.lift(0)
                val lastName = fullName.lift(1)

                val user = User(UUID.randomUUID(), data.email, firstName, lastName, loginInfo)

                for {
                  user <- userService.create(user.copy())
                  savedPasswordInfo <- authInfoService.save(loginInfo, passwordInfo)
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

  def create = UserAwareAction.async { implicit req =>
    // TODO: make sure we don't create an account with a user email/id that already exists

    if (play.api.Play.isTest(play.api.Play.current) ||
      (req.identity.isDefined && WithAccess("dev").isAuthorized(req.identity.get))) {
      SignUpForm.form.bindFromRequest.fold(
        form => Future.successful(BadRequest(views.html.account.signUp(form))),
        data => {
          val loginInfo = LoginInfo(CredentialsProvider.ID, data.email)
          userService.retrieve(loginInfo).flatMap {
            case Some(user) => Future.successful(Redirect(routes.ApplicationController.signUp())
              .flashing("error" -> Messages("user.exists")))
            case None =>
              val passwordInfo = passwordHasher.hash(data.password)
              val user = User(UUID.randomUUID(), data.email, None, None, loginInfo)

              for {
                user <- userService.create(user.copy())
                savedPasswordInfo <- authInfoService.save(loginInfo, passwordInfo)
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
    else {
      Future.successful(Redirect(routes.ApplicationController.devAccess()))
    }
  }

  def delete = SecuredAction(WithAccess("normal")).async { implicit request =>
    userService.delete(request.identity.email).map {
      case true => Ok
      case false => ServiceUnavailable
    }
  }
}