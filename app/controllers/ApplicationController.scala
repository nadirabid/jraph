package controllers

import java.util.UUID
import javax.inject.Inject

import com.mohiva.play.silhouette.api.services.AuthInfoService
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import com.mohiva.play.silhouette.api.{LoginInfo, Silhouette, Environment}
import com.mohiva.play.silhouette.impl.providers.CredentialsProvider
import com.mohiva.play.silhouette.api.util.{PasswordHasher, Credentials, PasswordInfo}
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
    Hypergraph.readAll(req.identity.email).flatMap { hypergraphs =>
      val graphsDataRequests = hypergraphs.map { hg =>
        val nodes = Hypernode.readAll(req.identity.email, hg.id)
        val links = Hyperlink.readAll(req.identity.email, hg.id)

        for {
          n <- nodes
          l <- links
        } yield (hg, n, l)
      }

      val userEmail = req.identity.email.trim.toLowerCase

      Future.sequence(graphsDataRequests).map { graphsData =>
        Ok(views.html.account.index(Json.toJson(graphsData),
                                    Codecs.md5(userEmail.getBytes)))
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
      formWithErrors => {
        val userEmail = req.identity.email.trim.toLowerCase

        val result = BadRequest(views.html.account.profile(
          Codecs.md5(userEmail.getBytes),
          formWithErrors,
          ChangeUserPasswordForm.form
        ))

        Future.successful(result)
      },
      userProfile => {
        val user = req.identity.copy(
          email = userProfile.email,
          firstName = userProfile.firstName,
          lastName = userProfile.lastName,
          loginInfo = LoginInfo(CredentialsProvider.ID, userProfile.email)
        )

        val authenticator = req.authenticator.copy(loginInfo = user.loginInfo)

        userService.update(user).flatMap { _ =>
          val continueToURLAfterRedirect = routes.ApplicationController.profile().toString()
          val result = routes.ApplicationController.reauthenticate(Some(user.email), Some(continueToURLAfterRedirect))
          authenticator.discard(Future.successful(Redirect(result)))
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
            val userProfileData = UserProfileForm.Data(req.identity.firstName, req.identity.lastName, userEmail)

            val changeUserPasswordForm = ChangeUserPasswordForm.form
              .fill(changeUserPasswordFormData)
              .withError("currentPassword", "Incorrect password")

            Future.successful(BadRequest(views.html.account.profile(
              Codecs.md5(userEmail.getBytes),
              UserProfileForm.form.fill(userProfileData),
              changeUserPasswordForm
            )))
          case None =>
            // shit just got bad
            Future.successful(
              Redirect(routes.ApplicationController.profile()).flashing("error" -> Messages("invalid.id"))
            )
        }
      }
    )
  }

  def appAccess = Action {
    Ok(views.html.account.appAccess())
  }

  def signIn = UserAwareAction { req =>
    req.identity match {
      case Some(user) => Future.successful(Redirect(routes.ApplicationController.index()))
      case None => Future.successful(Ok(views.html.account.signIn(SignInForm.form)))
    }
  }

  def signUp = UserAwareAction { req =>
    req.identity match {
      case Some(user) => Future.successful(Redirect(routes.ApplicationController.userGraphs()))
      case None => Future.successful(Ok(views.html.account.signUp(SignUpForm.form)))
    }
  }

  def signOut = SecuredAction.async { implicit req =>
    Future.successful(req.authenticator.discard(Redirect(routes.ApplicationController.index())))
  }

  def reauthenticate(email: Option[String],
                     continueTo: Option[String]) = UserAwareAction.async { req =>
    req.identity match {
      case Some(user) => Future.successful(Redirect(routes.ApplicationController.index()))
      case None =>
        email match {
          case Some(userEmail) =>
            val cleanUserEmail = userEmail.trim.toLowerCase
            val signInForm = SignInForm.form.fill(Credentials(cleanUserEmail, ""))
            val continueToURL = continueTo getOrElse routes.ApplicationController.index().toString()

            val result = Ok(views.html.account.reauthenticate(
              signInForm,
              Codecs.md5(cleanUserEmail.getBytes),
              continueToURL
            ))

            userService.find(userEmail) flatMap {
              case Some(user) => Future.successful(result)
              case None => Future.successful(Redirect(routes.ApplicationController.signIn()))
            }
          case None =>
            Future.successful(Redirect(routes.ApplicationController.signIn()))
        }
    }
  }

  def test = UserAwareAction {
    Ok(views.html.test.index())
  }

  def design = Action {
    Ok(views.html.test.design())
  }

  def trimTrailingForwardSlash(path: String) = Action {
    MovedPermanently("/" + path)
  }
}