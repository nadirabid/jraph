package controllers

import java.util.UUID
import javax.inject.Inject

import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import com.mohiva.play.silhouette.api.{LoginInfo, LogoutEvent, Silhouette, Environment}
import com.mohiva.play.silhouette.impl.providers.CredentialsProvider
import models.services.UserService

import play.api.libs.json.{Json, Writes}
import play.api.mvc.Action

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

import org.apache.commons.codec.digest.DigestUtils

import forms._
import models.{Hypergraph, Hypernode, Hyperlink, User}

class ApplicationController @Inject() (implicit val env: Environment[User, SessionAuthenticator],
                                       val userService: UserService)
  extends Silhouette[User, SessionAuthenticator] {

  case class HypergraphData(hypergraph: Hypergraph,
                            nodes: Seq[Hypernode],
                            links: Seq[Hyperlink])

  implicit val hypergraphWrites = new Writes[Hypergraph] {
    def writes(hypergraph: Hypergraph) = Json.obj(
      "id" -> hypergraph.id,
      "name" -> hypergraph.name,
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

          for { n <- nodes; l <- links } yield (hg, n, l)
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

  def profile = SecuredAction { req =>
    val userEmail = req.identity.email.trim.toLowerCase
    val userProfileData = UserProfileForm.Data(req.identity.firstName, req.identity.lastName, userEmail)
    val userProfileForm = UserProfileForm.form.fill(userProfileData)
    Ok(views.html.account.profile(DigestUtils.md5Hex(userEmail), userProfileForm))
  }

  def hypergraph(hypergraphID: UUID) = SecuredAction { req =>
    Ok(views.html.graph.index())
  }

  def updateUserProfile = SecuredAction.async { implicit req =>
    UserProfileForm.form.bindFromRequest.fold(
      formWithErrors => {
        val userEmail = req.identity.email.trim.toLowerCase
        val result = BadRequest(views.html.account.profile(DigestUtils.md5Hex(userEmail), formWithErrors))
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
          authenticator.renew(Future.successful(Redirect(routes.ApplicationController.profile())))
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
    env.eventBus.publish(LogoutEvent(req.identity, req, request2lang))
    Future.successful(req.authenticator.discard(Redirect(routes.ApplicationController.index())))
  }

  def test = UserAwareAction {
    Ok(views.html.test.index())
  }

  def trimTrailingForwardSlash(path: String) = Action {
    MovedPermanently("/" + path)
  }
}