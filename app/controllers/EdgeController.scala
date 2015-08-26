package controllers

import java.util.UUID
import javax.inject.Inject

import com.mohiva.play.silhouette.api.{Environment, Silhouette}
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import models.daos.EdgeDAO
import models.{Edge, User}
import org.joda.time.DateTime
import play.api.i18n.MessagesApi
import play.api.libs.concurrent.Execution.Implicits._
import play.api.libs.json._

import scala.concurrent.Future

class EdgeController @Inject() (
                                 edgeDAO: EdgeDAO,
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

    edgeDAO.create(req.identity.email, hypergraphID, model)
        .map(edge => Ok(Json.toJson(edge)))
  }

  def read(hypergraphID: UUID, edgeID: UUID) = SecuredAction.async { req =>
    edgeDAO.read(req.identity.email, hypergraphID, edgeID) map {
      case Some(edge) => Ok(Json.toJson(edge))
      case None => NotFound
    }
  }

  def readAll(hypergraphID: UUID) = SecuredAction.async { req =>
    edgeDAO.readAll(req.identity.email, hypergraphID)
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

    edgeDAO.update(req.identity.email, hypergraphID, model)
        .map(edge => Ok(Json.toJson(edge)))
  }

  def delete(hypergraphID: UUID, edgeID: UUID) = SecuredAction.async { req =>
    edgeDAO.delete(req.identity.email, hypergraphID, edgeID)
        .map(res => Ok(Json.toJson(res)))
  }

}