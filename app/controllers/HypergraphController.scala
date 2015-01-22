package controllers

import javax.inject.Inject

import com.mohiva.play.silhouette.api.{Silhouette, Environment}
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import models.{Hypergraph, User}
import org.joda.time.DateTime

import scala.concurrent.ExecutionContext.Implicits.global

import play.api.libs.json._

import java.util.UUID

// TODO: make sure we sanitize the Cypher queries for there user specified parameters

class HypergraphController @Inject() (implicit val env: Environment[User, SessionAuthenticator])
  extends Silhouette[User, SessionAuthenticator] {

  implicit val hypergraphWrites = new Writes[Hypergraph] {
    def writes(hypergraph: Hypergraph) = Json.obj(
      "id" -> hypergraph.id,
      "name" -> hypergraph.name,
      "updatedAt" -> hypergraph.updatedAt,
      "createdAt" -> hypergraph.createdAt,
      "data" -> hypergraph.data
    )
  }

  def create = SecuredAction.async(parse.json) { req =>
    val model = Hypergraph(
      UUID.randomUUID(),
      (req.body \ "name").as[String],
      DateTime.now,
      DateTime.now,
      (req.body \ "data").asOpt[JsObject]
    )

    Hypergraph.create(req.identity.email, model).map {
      case Some(hypergraph) => Ok(Json.toJson(hypergraph))
      case None => ServiceUnavailable
    }
  }

  def read(hypergraphID: UUID) = SecuredAction.async { req =>
    Hypergraph.read(req.identity.email, hypergraphID).map {
      case Some(hypergraph) => Ok(Json.toJson(hypergraph))
      case None => ServiceUnavailable
    }
  }

  def readAll = SecuredAction.async { req =>
    Hypergraph.readAll(req.identity.email).map {
      case Some(hypergraphs) => Ok(Json.toJson(hypergraphs))
      case None => ServiceUnavailable
    }
  }

  def update(hypergraphID: UUID) = SecuredAction.async(parse.json) { req =>
    val model = Hypergraph(
      hypergraphID,
      null,
      DateTime.now,
      null,
      (req.body \ "data").asOpt[JsObject]
    )

    Hypergraph.update(req.identity.email, model) map {
      case Some(hypergraph) => Ok(Json.toJson(hypergraph))
      case None => ServiceUnavailable
    }
  }

  def delete(hypergraphID: UUID) = SecuredAction.async { req =>
    Hypergraph.delete(req.identity.email, hypergraphID).map {
      case true => Ok(Json.toJson(true))
      case false => ServiceUnavailable
    }
  }

}
