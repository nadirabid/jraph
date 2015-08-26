package controllers

import java.util.UUID
import javax.inject.Inject

import com.mohiva.play.silhouette.api.{Environment, Silhouette}
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import models.daos.HypergraphDAO
import models.{Hypergraph, User}
import org.joda.time.DateTime
import play.api.i18n.MessagesApi
import play.api.libs.concurrent.Execution.Implicits._
import play.api.libs.json._

class HypergraphController @Inject() (
                                       hypergraphDAO: HypergraphDAO,
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

    hypergraphDAO.create(req.identity.email, model)
        .map(hypergraph => Ok(Json.toJson(hypergraph)))
  }

  def read(hypergraphID: UUID) = SecuredAction.async { req =>
    hypergraphDAO.read(req.identity.email, hypergraphID).map {
      case Some(hypergraph) => Ok(Json.toJson(hypergraph))
      case None => NotFound
    }
  }

  def readAll = SecuredAction.async { req =>
    hypergraphDAO.readAll(req.identity.email)
        .map(hypergraphs => Ok(Json.toJson(hypergraphs)))
  }

  def update(hypergraphID: UUID) = SecuredAction.async(parse.json) { req =>
    val model = Hypergraph(
      hypergraphID,
      DateTime.now,
      null,
      (req.body \ "data").asOpt[JsObject]
    )

    hypergraphDAO.update(req.identity.email, model)
        .map(hypergraph => Ok(Json.toJson(hypergraph)))
  }

  def delete(hypergraphID: UUID) = SecuredAction.async { req =>
    hypergraphDAO.delete(req.identity.email, hypergraphID)
        .map(res => Ok(Json.toJson(res)))
  }

}
