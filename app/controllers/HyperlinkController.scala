package controllers

import java.util.UUID

import javax.inject.Inject

import com.mohiva.play.silhouette.api.{Silhouette, Environment}
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator

import models.{ User, Hyperlink }
import org.joda.time.DateTime

import play.api.libs.json._

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

class HyperlinkController @Inject() (implicit val env: Environment[User, SessionAuthenticator])
  extends Silhouette[User, SessionAuthenticator] {

  //TODO: change api from using "xId" to "xID"
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

  def create(hypergraphID: UUID) = SecuredAction.async(parse.json) { req =>
    Future.successful(Ok)

    val model = Hyperlink(
      UUID.randomUUID(),
      (req.body \ "sourceId").as[UUID],
      (req.body \ "targetId").as[UUID],
      DateTime.now,
      DateTime.now,
      (req.body \ "data").asOpt[JsObject]
    )

    Hyperlink.create(req.identity.email, hypergraphID, model) map {
      case Some(hyperlink) => Ok(Json.toJson(hyperlink))
      case None => ServiceUnavailable
    }
  }

  def read(hypergraphID: UUID, hyperlinkID: UUID) = SecuredAction.async { req =>
    Hyperlink.read(req.identity.email, hypergraphID, hyperlinkID) map {
      case Some(hyperlink) => Ok(Json.toJson(hyperlink))
      case None => ServiceUnavailable
    }
  }

  def readAll(hypergraphID: UUID) = SecuredAction.async { req =>
    Hyperlink.readAll(req.identity.email, hypergraphID) map {
      case Some(hyperlinks) => Ok(Json.toJson(hyperlinks))
      case None => ServiceUnavailable
    }
  }

  def update(hypergraphID: UUID,
             hyperlinkID: UUID) = SecuredAction.async(parse.json) { req =>
    val model = Hyperlink(
      hyperlinkID,
      (req.body \ "sourceId").as[UUID],
      (req.body \ "targetId").as[UUID],
      DateTime.now,
      null,
      (req.body \ "data").asOpt[JsObject]
    )

    Hyperlink.update(req.identity.email, hypergraphID, model) map {
      case Some(hyperlink) => Ok(Json.toJson(hyperlink))
      case None => ServiceUnavailable
    }
  }

  def delete(hypergraphID: UUID, hyperlinkID: UUID) = SecuredAction.async { req =>
    Hyperlink.delete(req.identity.email, hypergraphID, hyperlinkID) map {
      case true => Ok(Json.toJson(true))
      case false => ServiceUnavailable
    }
  }

}