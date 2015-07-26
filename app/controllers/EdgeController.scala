package controllers

import java.util.UUID

import javax.inject.Inject

import com.mohiva.play.silhouette.api.{Silhouette, Environment}
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator

import models.{ User, Edge }
import org.joda.time.DateTime
import play.api.i18n.MessagesApi

import play.api.libs.json._

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

class EdgeController @Inject() (
                                 val messagesApi: MessagesApi,
                                 implicit val env: Environment[User, SessionAuthenticator])
  extends Silhouette[User, SessionAuthenticator] {

  def create(hypergraphID: UUID) = SecuredAction.async(parse.json) { req =>
    Future.successful(Ok)

    val model = Edge(
      UUID.randomUUID(),
      (req.body \ "sourceId").as[UUID],
      (req.body \ "targetId").as[UUID],
      DateTime.now,
      DateTime.now,
      (req.body \ "data").asOpt[JsObject]
    )

    Edge.create(req.identity.email, hypergraphID, model)
        .map(edge => Ok(Json.toJson(edge)))
  }

  def read(hypergraphID: UUID, edgeID: UUID) = SecuredAction.async { req =>
    Edge.read(req.identity.email, hypergraphID, edgeID) map {
      case Some(edge) => Ok(Json.toJson(edge))
      case None => NotFound
    }
  }

  def readAll(hypergraphID: UUID) = SecuredAction.async { req =>
    Edge.readAll(req.identity.email, hypergraphID)
        .map(edges => Ok(Json.toJson(edges)))
  }

  def update(hypergraphID: UUID,
             edgeID: UUID) = SecuredAction.async(parse.json) { req =>
    val model = Edge(
      edgeID,
      (req.body \ "sourceId").as[UUID],
      (req.body \ "targetId").as[UUID],
      DateTime.now,
      null,
      (req.body \ "data").asOpt[JsObject]
    )

    Edge.update(req.identity.email, hypergraphID, model)
        .map(edge => Ok(Json.toJson(edge)))
  }

  def delete(hypergraphID: UUID, edgeID: UUID) = SecuredAction.async { req =>
    Edge.delete(req.identity.email, hypergraphID, edgeID)
        .map(res => Ok(Json.toJson(res)))
  }

}