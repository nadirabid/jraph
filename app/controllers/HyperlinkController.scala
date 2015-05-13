package controllers

import java.util.UUID

import javax.inject.Inject

import com.mohiva.play.silhouette.api.{Silhouette, Environment}
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import core.authorization.WithAccess

import models.{ User, Hyperlink }
import org.joda.time.DateTime

import play.api.libs.json._

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

class HyperlinkController @Inject() (implicit val env: Environment[User, SessionAuthenticator])
  extends Silhouette[User, SessionAuthenticator] {

  def create(hypergraphID: UUID) = SecuredAction(WithAccess("normal")).async(parse.json) { req =>
    Future.successful(Ok)

    val model = Hyperlink(
      UUID.randomUUID(),
      (req.body \ "sourceId").as[UUID],
      (req.body \ "targetId").as[UUID],
      DateTime.now,
      DateTime.now,
      (req.body \ "data").asOpt[JsObject]
    )

    Hyperlink.create(req.identity.email, hypergraphID, model)
        .map(hyperlink => Ok(Json.toJson(hyperlink)))
  }

  def read(hypergraphID: UUID, hyperlinkID: UUID) = SecuredAction(WithAccess("normal")).async { req =>
    Hyperlink.read(req.identity.email, hypergraphID, hyperlinkID) map {
      case Some(hyperlink) => Ok(Json.toJson(hyperlink))
      case None => NotFound
    }
  }

  def readAll(hypergraphID: UUID) = SecuredAction(WithAccess("normal")).async { req =>
    Hyperlink.readAll(req.identity.email, hypergraphID)
        .map(hyperlinks => Ok(Json.toJson(hyperlinks)))
  }

  def update(hypergraphID: UUID,
             hyperlinkID: UUID) = SecuredAction(WithAccess("normal")).async(parse.json) { req =>
    val model = Hyperlink(
      hyperlinkID,
      (req.body \ "sourceId").as[UUID],
      (req.body \ "targetId").as[UUID],
      DateTime.now,
      null,
      (req.body \ "data").asOpt[JsObject]
    )

    Hyperlink.update(req.identity.email, hypergraphID, model)
        .map(hyperlink => Ok(Json.toJson(hyperlink)))
  }

  def delete(hypergraphID: UUID, hyperlinkID: UUID) = SecuredAction(WithAccess("normal")).async { req =>
    Hyperlink.delete(req.identity.email, hypergraphID, hyperlinkID)
        .map(res => Ok(Json.toJson(res)))
  }

}