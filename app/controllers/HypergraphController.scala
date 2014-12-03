package controllers

import javax.inject.Inject

import com.mohiva.play.silhouette.api.{Silhouette, Environment}
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import models.{Hypergraph, User}

import scala.concurrent.ExecutionContext.Implicits.global

import play.api.Play.current
import play.api.libs.json._
import play.api.libs.ws.WS
import java.util.UUID

// TODO: make sure we sanitize the Cypher queries for there user specified parameters

class HypergraphController @Inject() (implicit val env: Environment[User, SessionAuthenticator])
  extends Silhouette[User, SessionAuthenticator] {

  def create = SecuredAction.async(parse.json) { req =>
    val model = Hypergraph(UUID.randomUUID(), (req.body \ "name").as[String])

    Hypergraph.create(req.identity.email, model).map {
      case Some(_) => Ok(Json.toJson(_))
      case None => ServiceUnavailable
    }
  }

  def read(hypergraphID: UUID) = SecuredAction.async { req =>
    Hypergraph.read(req.identity.email, hypergraphID).map {
      case Some(_) => Ok(Json.toJson(_))
      case None => ServiceUnavailable
    }
  }

  def readAll = SecuredAction.async { req =>
    Hypergraph.readAll(req.identity.email).map {
      case Some(_) => Ok(Json.toJson(_))
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
