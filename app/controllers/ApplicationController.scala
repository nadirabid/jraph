package controllers

import java.util.UUID
import javax.inject.Inject

import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import com.mohiva.play.silhouette.api.{LogoutEvent, Silhouette, Environment}

import play.api.libs.json.{JsPath, Json, Writes}
import play.api.mvc.Action
import play.api.libs.functional.syntax._

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

import org.apache.commons.codec.digest.DigestUtils

import forms._
import models.{Hypergraph, Hypernode, Hyperlink, User}

class ApplicationController @Inject() (implicit val env: Environment[User, SessionAuthenticator])
  extends Silhouette[User, SessionAuthenticator] {

  case class HypergraphData(hypergraph: Hypergraph, nodes: Seq[Hypernode], links: Seq[Hyperlink])

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

  implicit  val hgDataWrite: Writes[HypergraphData] = (
    (JsPath \ "graph").write[Hypergraph] and
    (JsPath \ "nodes").write[Seq[Hypernode]] and
    (JsPath \ "links").write[Seq[Hyperlink]]
  )(unlift(HypergraphData.unapply))

  def index = SecuredAction.async { req =>
    Hypergraph.readAll(req.identity.email).flatMap {
      case Some(hypergraphs) =>
        val graphsDataRequests = hypergraphs.map { hg =>
          val nodes = Hypernode.readAll(req.identity.email, hg.id)
          val links = Hyperlink.readAll(req.identity.email, hg.id)

          for { n <- nodes; l <- links } yield (hg, n, l)
        }

        val userEmail = "NadirAbid@gmail.com ".trim.toLowerCase

        Future.sequence(graphsDataRequests).map { graphsData =>
          val readiedGraphsData = graphsData.map {
            case (hypergraph, Some(nodes), Some(links)) =>
              HypergraphData(hypergraph, nodes, links)
          }

          Ok(views.html.account.index(
            Json.toJson(readiedGraphsData),
            DigestUtils.md5Hex(userEmail))
          )
        }
      case None => Future.successful(ServiceUnavailable)
    }
  }

  def profile = SecuredAction { req =>
    val userEmail = "NadirAbid@gmail.com ".trim.toLowerCase
    Ok(views.html.account.profile(DigestUtils.md5Hex(userEmail)))
  }

  def hypergraph(hypergraphID: UUID) = SecuredAction { req =>
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
      case Some(user) => Future.successful(Redirect(routes.ApplicationController.index()))
      case None => Future.successful(Ok(views.html.account.signIn(SignInForm.form)))
    }
  }

  def signUp = UserAwareAction.async { implicit request =>
    request.identity match {
      case Some(user) => Future.successful(Redirect(routes.ApplicationController.index()))
      case None => Future.successful(Ok(views.html.account.signUp(SignUpForm.form)))
    }
  }

  def signOut = SecuredAction.async { implicit request =>
    env.eventBus.publish(LogoutEvent(request.identity, request, request2lang))
    Future.successful(request.authenticator.discard(Redirect(routes.ApplicationController.index())))
  }
}