package controllers

import javax.inject.Inject
import java.util.UUID

import com.mohiva.play.silhouette.api.{Silhouette, Environment}
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import models.{Hypernode, User}
import org.joda.time.DateTime

import scala.concurrent.ExecutionContext.Implicits.global

import play.api.Play.current
import play.api.libs.json._
import play.api.libs.ws.WS

import scala.concurrent.Future

class HypernodeController @Inject() (implicit val env: Environment[User, SessionAuthenticator])
  extends Silhouette[User, SessionAuthenticator] {

  implicit val hypernodeWrites = new Writes[Hypernode] {
    def writes(hypernode: Hypernode) = Json.obj(
      "id" -> hypernode.hypernodeID,
      "createdAt" -> hypernode.createdAt.getMillis,
      "updatedAt" -> hypernode.updatedAt.getMillis,
      "data" -> hypernode.data
    )
  }

  def create(hypergraphID: UUID) = SecuredAction.async(parse.json) { req =>
    val model = Hypernode(
      UUID.randomUUID(),
      DateTime.now,
      DateTime.now,
      Json.stringify(req.body \ "data")
    )

    Hypernode.create(req.identity.email, hypergraphID, model) map {
      case Some(hypernode) => Ok(Json.toJson(hypernode))
      case None => ServiceUnavailable
    }
  }

  def read(hypergraphID: UUID, hypernodeID: UUID) = SecuredAction.async { req =>
    Hypernode.read(req.identity.email, hypergraphID, hypernodeID) map {
      case Some(hypernode) => Ok(Json.toJson(hypernode))
      case None => ServiceUnavailable
    }
  }

  def readAll(hypergraphID: UUID) = SecuredAction.async { req =>
    Hypernode.readAll(req.identity.email, hypergraphID) map {
      case Some(hypernodes) => Ok(Json.toJson(hypergraphID))
      case None => ServiceUnavailable
    }
  }

  def update(hypergraphID: UUID, hypernodeID: UUID) = SecuredAction.async(parse.json) { req =>
    val model = Hypernode(
      hypernodeID,
      DateTime.now,
      null,
      Json.stringify(req.body \ "data")
    )

    Hypernode.update(req.identity.email, hypergraphID, model) map {
      case Some(hypernode) => Ok(Json.toJson(hypernode))
      case None => ServiceUnavailable
    }
  }

  def batchUpdate(hypergraphID: UUID) = SecuredAction.async(parse.json) { req =>
    val models = (req.body \ "data").as[Seq[JsObject]] map { json =>
      Hypernode((json \ "id").as[UUID], DateTime.now, null, Json.stringify(json \ "data"))
    }

    Hypernode.batchUpdate(req.identity.email, hypergraphID, models) map {
      case Some(hypernodes) => Ok(Json.toJson(hypernodes))
      case None => ServiceUnavailable
    }
  }

  def delete(hypergraphID: UUID,
             hypernodeID: UUID) = SecuredAction.async(parse.json) { req =>

    Hypernode.delete(req.identity.email, hypergraphID, hypernodeID) map {
      case true => Ok(Json.toJson(true))
      case false => ServiceUnavailable
    }
  }

}