package controllers

import java.util.UUID
import javax.inject.Inject

import com.mohiva.play.silhouette.api.services.AuthInfoService
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import com.mohiva.play.silhouette.api.{LoginInfo, Silhouette, Environment}
import com.mohiva.play.silhouette.impl.providers.CredentialsProvider
import com.mohiva.play.silhouette.api.util.{PasswordHasher, Credentials, PasswordInfo}
import core.authorization.WithAccess
import models.daos.PasswordInfoDAO

import play.api.i18n.Messages
import play.api.libs.Codecs
import play.api.libs.json.{Json, Writes}
import play.api.mvc.Action

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

import forms._
import models.{Hypergraph, Hypernode, Hyperlink, User}
import models.services.UserService

class ApplicationController @Inject() (implicit val env: Environment[User, SessionAuthenticator],
                                       val authInfoService: AuthInfoService,
                                       val userService: UserService,
                                       val passwordHasher: PasswordHasher)
  extends Silhouette[User, SessionAuthenticator] {

  implicit val graphsDataWrite =
      new Writes[(Hypergraph, Seq[Hypernode], Seq[Hyperlink])] {
    def writes(graphsData: (Hypergraph, Seq[Hypernode], Seq[Hyperlink])) = Json.obj(
      "graph" -> graphsData._1,
      "nodes" -> graphsData._2,
      "links" -> graphsData._3
    )
  }

  def userGraphs = SecuredAction.async { req =>
    val userEmail = req.identity.email

    Hypergraph.readAll(userEmail).flatMap { hypergraphs =>
      val graphsDataRequests = hypergraphs.map { hypergraph =>
        for { //this can be sped up by doing Hypernode/Hyperlink.read in parallel
          nodes <- Hypernode.readAll(userEmail, hypergraph.id)
          links <- Hyperlink.readAll(userEmail, hypergraph.id)
        } yield {
          (hypergraph, nodes, links)
        }
      }

      Future.sequence(graphsDataRequests).map { graphsData =>
        Ok(views.html.account.userGraphs(
          Json.toJson(graphsData),
          Codecs.md5(userEmail.trim.toLowerCase.getBytes)
        ))
      }
    }
  }

  def hypergraph(hypergraphID: UUID) = SecuredAction { req =>
    Ok(views.html.graph.index())
  }

  def profile = SecuredAction { req =>
    val userEmail = req.identity.email.trim.toLowerCase

    val userProfileData = UserProfileForm.Data(req.identity.firstName, req.identity.lastName, userEmail)
    val userProfileForm = UserProfileForm.form.fill(userProfileData)

    Ok(views.html.account.profile(
      Codecs.md5(userEmail.getBytes),
      userProfileForm,
      ChangeUserPasswordForm.form
    ))
  }

  def handleUserInfoUpdate = SecuredAction.async { implicit req =>
    UserProfileForm.form.bindFromRequest.fold(
      formWithErrors => Future.successful {
        val userEmail = req.identity.email.trim.toLowerCase

        BadRequest(views.html.account.profile(
          Codecs.md5(userEmail.getBytes),
          formWithErrors,
          ChangeUserPasswordForm.form
        ))
      },
      userProfile => {
        val user = req.identity.copy(
          email = userProfile.email,
          firstName = userProfile.firstName,
          lastName = userProfile.lastName,
          loginInfo = LoginInfo(CredentialsProvider.ID, userProfile.email)
        )

        userService.update(user).flatMap { _ =>
          env.authenticatorService.renew(
            req.authenticator.copy(loginInfo = user.loginInfo),
            Redirect(routes.ApplicationController.profile())
          )
        }
      }
    )
  }

  def handleUserPasswordUpdate = SecuredAction.async { implicit req =>
    ChangeUserPasswordForm.form.bindFromRequest.fold(
      formWithErrors => {
        val userEmail = req.identity.email.trim.toLowerCase
        val userProfileData = UserProfileForm.Data(req.identity.firstName, req.identity.lastName, userEmail)

        Future.successful(BadRequest(views.html.account.profile(
          Codecs.md5(userEmail.getBytes),
          UserProfileForm.form.fill(userProfileData),
          formWithErrors
        )))
      },
      changeUserPasswordFormData => {
        val loginInfo = LoginInfo(CredentialsProvider.ID, req.identity.email)
        val currentPassword = changeUserPasswordFormData.currentPassword

        authInfoService.retrieve[PasswordInfo](loginInfo).flatMap {
          case Some(currentPasswordInfo) if passwordHasher.matches(currentPasswordInfo, currentPassword) =>
            val newPasswordInfo = passwordHasher.hash(changeUserPasswordFormData.newPassword)
            (new PasswordInfoDAO).update(loginInfo, newPasswordInfo).flatMap { _ =>
              Future.successful(Redirect(routes.ApplicationController.profile()))
            }
          case Some(currentPasswordInfo) => // password didn't match
            val userEmail = req.identity.email.trim.toLowerCase
            val userProfileData = UserProfileForm.Data(
              req.identity.firstName,
              req.identity.lastName,
              userEmail
            )

            val changeUserPasswordForm = ChangeUserPasswordForm.form
              .fill(changeUserPasswordFormData)
              .withError("currentPassword", "Incorrect password")

            Future.successful(BadRequest(views.html.account.profile(
              Codecs.md5(userEmail.getBytes),
              UserProfileForm.form.fill(userProfileData),
              changeUserPasswordForm
            )))
          case None => Future.successful { // // shit just got bad
            Redirect(routes.ApplicationController.profile())
              .flashing("error" -> Messages("invalid.id"))
          }
        }
      }
    )
  }

  def devAccess = UserAwareAction { implicit req =>
    req.identity match {
      case Some(user) =>
        if (WithAccess("dev").isAuthorized(user))
          Redirect(routes.ApplicationController.signIn())
        else
          Redirect(routes.ApplicationController.userGraphs())
      case None =>
        Ok(views.html.account.devAccess(DevAccessForm.form))
    }
  }

  def signIn = UserAwareAction { req =>
    req.identity match {
      case Some(user) => Redirect(routes.ApplicationController.userGraphs())
      case None => Ok(views.html.account.signIn(SignInForm.form))
    }
  }

  def signUp = UserAwareAction { req =>
    req.identity match {
      case Some(user) => Redirect(routes.ApplicationController.userGraphs())
      case None => Ok(views.html.account.signUp(SignUpForm.form))
    }
  }

  def signOut = SecuredAction.async { implicit req =>
    env.authenticatorService.discard(
      req.authenticator,
      Redirect(routes.ApplicationController.signIn())
    )
  }

  def trimTrailingForwardSlash(path: String) = Action {
    MovedPermanently("/" + path)
  }
}