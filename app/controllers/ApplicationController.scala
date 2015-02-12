package controllers

import java.util.UUID
import javax.inject.Inject

import forms._
import play.api.libs.json.{Json, Writes}

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

import play.api.mvc._

import com.mohiva.play.silhouette.api._
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator

import models._

class ApplicationController @Inject() (implicit val env: Environment[User, SessionAuthenticator])
  extends Silhouette[User, SessionAuthenticator] {

  implicit val hypergraphWrites = new Writes[Hypergraph] {
    def writes(hypergraph: Hypergraph) = Json.obj(
      "id" -> hypergraph.id,
      "name" -> hypergraph.name,
      "updatedAt" -> hypergraph.updatedAt,
      "createdAt" -> hypergraph.createdAt,
      "data" -> hypergraph.data
    )
  }

  def index = SecuredAction.async { req =>
    Hypergraph.readAll(req.identity.email).map {
      case Some(hypergraphs) => {
        Ok(views.html.account.index(Json.toJson(hypergraphs)))
      }
      case None => ServiceUnavailable
    }
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