package controllers

import java.util.UUID
import javax.inject.Inject

import com.mohiva.play.silhouette.api.{Environment, Silhouette}
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import models._
import models.daos.HypernodeDAO
import org.joda.time.DateTime
import play.api.i18n.MessagesApi
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import play.api.libs.json._

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
      (req.body \ "data").as[HypernodeData]
    )

    hypernodeDAO.create(req.identity.email, hypergraphID, model)
        .map { hypernode =>
          Ok(Json.toJson(hypernode))
        }
  }

  def read(hypergraphID: UUID, hypernodeID: UUID) = SecuredAction.async { req =>
    hypernodeDAO.read(req.identity.email, hypergraphID, hypernodeID) map {
      case Some(hypernode) => Ok(Json.toJson(hypernode))
      case None => NotFound
    }
  }

  def readAll(hypergraphID: UUID) = SecuredAction.async { req =>
    hypernodeDAO.readAll(req.identity.email, hypergraphID)
        .map(hypernodes => Ok(Json.toJson(hypernodes)))
  }

  def update(hypergraphID: UUID, hypernodeID: UUID) = SecuredAction.async(parse.json) { req =>
    val model = Hypernode(
      hypernodeID,
      DateTime.now,
      null,
      (req.body \ "data").as[HypernodeData]
    )

    hypernodeDAO.update(req.identity.email, hypergraphID, model)
        .map(hypernode => Ok(Json.toJson(hypernode)))
  }

  def batchUpdate(hypergraphID: UUID) = SecuredAction.async(parse.json) { req =>
    val models = (req.body \ "data").as[Seq[JsObject]].map { json =>
      Hypernode((json \ "id").as[UUID], DateTime.now, null, (json \ "data").as[HypernodeData])
    }

    hypernodeDAO.batchUpdate(req.identity.email, hypergraphID, models)
        .map(hypernodes => Ok(Json.toJson(hypernodes)))
  }

  def delete(hypergraphID: UUID,
             hypernodeID: UUID) = SecuredAction.async(parse.anyContent) { req =>

    hypernodeDAO.delete(req.identity.email, hypergraphID, hypernodeID)
        .map(res => Ok(Json.toJson(res)))
  }

}