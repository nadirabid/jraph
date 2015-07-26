package controllers

import javax.inject.Inject

import com.mohiva.play.silhouette.api.{Silhouette, Environment}
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import models.{Hypergraph, User}
import org.joda.time.DateTime
import play.api.i18n.MessagesApi

import scala.concurrent.ExecutionContext.Implicits.global

import play.api.libs.json._

import java.util.UUID

class HypergraphController @Inject() (
                                       val messagesApi: MessagesApi,
                                       implicit val env: Environment[User, SessionAuthenticator])
  extends Silhouette[User, SessionAuthenticator] {

  def create = SecuredAction.async(parse.json) { req =>
    val model = Hypergraph(
      UUID.randomUUID(),
      DateTime.now,
      DateTime.now,
      (req.body \ "data").asOpt[JsObject]
    )

    Hypergraph.create(req.identity.email, model)
        .map(hypergraph => Ok(Json.toJson(hypergraph)))
  }

  def read(hypergraphID: UUID) = SecuredAction.async { req =>
    Hypergraph.read(req.identity.email, hypergraphID).map {
      case Some(hypergraph) => Ok(Json.toJson(hypergraph))
      case None => NotFound
    }
  }

  def readAll = SecuredAction.async { req =>
    Hypergraph.readAll(req.identity.email)
        .map(hypergraphs => Ok(Json.toJson(hypergraphs)))
  }

  def update(hypergraphID: UUID) = SecuredAction.async(parse.json) { req =>
    val model = Hypergraph(
      hypergraphID,
      DateTime.now,
      null,
      (req.body \ "data").asOpt[JsObject]
    )

    Hypergraph.update(req.identity.email, model)
        .map(hypergraph => Ok(Json.toJson(hypergraph)))
  }

  def delete(hypergraphID: UUID) = SecuredAction.async { req =>
    Hypergraph.delete(req.identity.email, hypergraphID)
        .map(res => Ok(Json.toJson(res)))
  }

}
