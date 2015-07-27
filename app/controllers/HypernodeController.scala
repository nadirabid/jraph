package controllers

import javax.inject.Inject
import java.util.UUID

import com.mohiva.play.silhouette.api.{Silhouette, Environment}
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import models.daos.HypernodeDAO
import models.{Hypernode, User}
import org.joda.time.DateTime
import play.api.i18n.MessagesApi

import play.api.libs.concurrent.Execution.Implicits.defaultContext

import play.api.libs.json._

import scala.concurrent.Future

class HypernodeController @Inject() (
                                      hypernodeDAO: HypernodeDAO,
                                      val messagesApi: MessagesApi,
                                      implicit val env: Environment[User, SessionAuthenticator])
  extends Silhouette[User, SessionAuthenticator] {

  def create(hypergraphID: UUID) = SecuredAction.async(parse.json) { req =>
    val model = Hypernode(
      UUID.randomUUID(),
      DateTime.now,
      DateTime.now,
      (req.body \ "data").asOpt[JsObject]
    )

    hypernodeDAO.create(req.identity.email, hypergraphID, model)
        .map { hypernode =>
          Ok(Json.toJson(hypernode))
        }
  }

  def read(hypergraphID: UUID, hypernodeID: UUID) = SecuredAction.async { req =>
    Hypernode.read(req.identity.email, hypergraphID, hypernodeID) map {
      case Some(hypernode) => Ok(Json.toJson(hypernode))
      case None => NotFound
    }
  }

  def readAll(hypergraphID: UUID) = SecuredAction.async { req =>
    Hypernode.readAll(req.identity.email, hypergraphID)
        .map(hypernodes => Ok(Json.toJson(hypernodes)))
  }

  def update(hypergraphID: UUID, hypernodeID: UUID) = SecuredAction.async(parse.json) { req =>
    val model = Hypernode(
      hypernodeID,
      DateTime.now,
      null,
      (req.body \ "data").asOpt[JsObject]
    )

    Hypernode.update(req.identity.email, hypergraphID, model)
        .map(hypernode => Ok(Json.toJson(hypernode)))
  }

  def batchUpdate(hypergraphID: UUID) = SecuredAction.async(parse.json) { req =>
    val models = (req.body \ "data").as[Seq[JsObject]].map { json =>
      Hypernode((json \ "id").as[UUID], DateTime.now, null, (json \ "data").asOpt[JsObject])
    }

    Hypernode.batchUpdate(req.identity.email, hypergraphID, models)
        .map(hypernodes => Ok(Json.toJson(hypernodes)))
  }

  def delete(hypergraphID: UUID,
             hypernodeID: UUID) = SecuredAction.async(parse.anyContent) { req =>

    Hypernode.delete(req.identity.email, hypergraphID, hypernodeID)
        .map(res => Ok(Json.toJson(res)))
  }

}