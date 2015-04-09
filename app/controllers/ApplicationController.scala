package controllers

import java.util.UUID
import javax.inject.Inject

import com.mohiva.play.silhouette.api.services.AuthInfoService
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import com.mohiva.play.silhouette.api.{LoginInfo, Silhouette, Environment}
import com.mohiva.play.silhouette.impl.providers.CredentialsProvider
import com.mohiva.play.silhouette.api.util.{PasswordHasher, Credentials, PasswordInfo}
import models.daos.PasswordInfoDAO

import org.apache.commons.codec.digest.DigestUtils

import play.api.i18n.Messages
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

  case class HypergraphData(hypergraph: Hypergraph,
                            nodes: Seq[Hypernode],
                            links: Seq[Hyperlink])

  implicit val hypergraphWrites = new Writes[Hypergraph] {
    def writes(hypergraph: Hypergraph) = Json.obj(
      "id" -> hypergraph.id,
      "updatedAt" -> hypergraph.updatedAt,
      "createdAt" -> hypergraph.createdAt,
      "data" -> hypergraph.data
    )
  }

  implicit val hypernodeWrites = new Writes[Hypernode] {
    def writes(hypernode: Hypernode) = Json.obj(
      "id" -> hypernode.id,
      "createdAt" -> hypernode.createdAt.getMillis,
      "updatedAt" -> hypernode.updatedAt.getMillis,
      "data" -> hypernode.data
    )
  }

  implicit val hyperlinkWrites = new Writes[Hyperlink] {
    def writes(hyperlink: Hyperlink) = Json.obj(
      "id" -> hyperlink.id,
      "sourceId" -> hyperlink.sourceID,
      "targetId" -> hyperlink.targetID,
      "updatedAt" -> hyperlink.updatedAt.getMillis,
      "createdAt" -> hyperlink.createdAt.getMillis,
      "data" -> hyperlink.data
    )
  }

  implicit val hypergraphDataWrite = new Writes[HypergraphData] {
    def writes(hypergraphData: HypergraphData) = Json.obj(
      "graph" -> hypergraphData.hypergraph,
      "nodes" -> hypergraphData.nodes,
      "links" -> hypergraphData.links
    )
  }

  def index = SecuredAction.async { req =>
    Hypergraph.readAll(req.identity.email).flatMap {
      case Some(hypergraphs) =>
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
          val readiedGraphsData = graphsData.map {
            case (hypergraph, Some(nodes), Some(links)) =>
              HypergraphData(hypergraph, nodes, links)
          }

          Ok(views.html.account.index(Json.toJson(readiedGraphsData), DigestUtils.md5Hex(userEmail)))
        }
      case None => Future.successful(ServiceUnavailable)
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
      DigestUtils.md5Hex(userEmail),
      userProfileForm,
      ChangeUserPasswordForm.form
    ))
  }

  def handleUserInfoUpdate = SecuredAction.async { implicit req =>
    UserProfileForm.form.bindFromRequest.fold(
      formWithErrors => {
        val userEmail = req.identity.email.trim.toLowerCase

        val result = BadRequest(views.html.account.profile(
          DigestUtils.md5Hex(userEmail),
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
          DigestUtils.md5Hex(userEmail),
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
              DigestUtils.md5Hex(userEmail),
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

  def signIn = UserAwareAction.async { req =>
    req.identity match {
      case Some(user) => Future.successful(Redirect(routes.ApplicationController.index()))
      case None => Future.successful(Ok(views.html.account.signIn(SignInForm.form)))
    }
  }

  def signUp = UserAwareAction.async { req =>
    req.identity match {
      case Some(user) => Future.successful(Redirect(routes.ApplicationController.index()))
      case None => Future.successful(Ok(views.html.account.signUp(SignUpForm.form)))
    }
  }

  def signOut = SecuredAction.async { implicit req =>
    Future.successful(req.authenticator.discard(Redirect(routes.ApplicationController.index())))
  }

  def reauthenticate(email: Option[String], continueTo: Option[String]) = UserAwareAction.async { req =>
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
              DigestUtils.md5Hex(cleanUserEmail),
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

  def trimTrailingForwardSlash(path: String) = Action {
    MovedPermanently("/" + path)
  }
}