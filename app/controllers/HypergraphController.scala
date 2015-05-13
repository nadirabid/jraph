package controllers

import javax.inject.Inject

import com.mohiva.play.silhouette.api.{Silhouette, Environment}
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import core.authorization.WithAccess
import models.{Hypergraph, User}
import org.joda.time.DateTime

import scala.concurrent.ExecutionContext.Implicits.global

import play.api.libs.json._

import java.util.UUID

class HypergraphController @Inject() (
    implicit val env: Environment[User, SessionAuthenticator])
  extends Silhouette[User, SessionAuthenticator] {

  def create = SecuredAction(WithAccess("dev")).async(parse.json) { req =>
    val model = Hypergraph(
      UUID.randomUUID(),
      DateTime.now,
      DateTime.now,
      (req.body \ "data").asOpt[JsObject]
    )

    Hypergraph.create(req.identity.email, model)
        .map(hypergraph => Ok(Json.toJson(hypergraph)))
  }

  def read(hypergraphID: UUID) = SecuredAction(WithAccess("dev")).async { req =>
    Hypergraph.read(req.identity.email, hypergraphID).map {
      case Some(hypergraph) => Ok(Json.toJson(hypergraph))
      case None => NotFound
    }
  }

  def readAll = SecuredAction(WithAccess("dev")).async { req =>
    Hypergraph.readAll(req.identity.email)
        .map(hypergraphs => Ok(Json.toJson(hypergraphs)))
  }

  def update(hypergraphID: UUID) = SecuredAction(WithAccess("dev")).async(parse.json) { req =>
    val model = Hypergraph(
      hypergraphID,
      DateTime.now,
      null,
      (req.body \ "data").asOpt[JsObject]
    )

    Hypergraph.update(req.identity.email, model)
        .map(hypergraph => Ok(Json.toJson(hypergraph)))
  }

  def delete(hypergraphID: UUID) = SecuredAction(WithAccess("dev")).async { req =>
    Hypergraph.delete(req.identity.email, hypergraphID)
        .map(res => Ok(Json.toJson(res)))
  }

}
