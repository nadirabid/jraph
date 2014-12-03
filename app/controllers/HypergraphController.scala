package controllers

import javax.inject.Inject

import com.mohiva.play.silhouette.api.{Silhouette, Environment}
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import models.User

import scala.concurrent.ExecutionContext.Implicits.global

import play.api.Play.current
import play.api.libs.json._
import play.api.libs.ws.WS
import java.util.UUID

// TODO: make sure we sanitize the Cypher queries for there user specified parameters

class HypergraphController @Inject() (implicit val env: Environment[User, SessionAuthenticator])
  extends Silhouette[User, SessionAuthenticator] {

  val dbUrl = "http://localhost:7474/db/data/transaction/commit"

  val cypherCreate =
    """
      | MATCH   (u:User { email: {userEmail} })
      | CREATE  (u)-[:OWNS_HYPERGRAPH]->(hg:Hypergraph {hypergraphData})
      | RETURN  hg;
    """.stripMargin

  def create = SecuredAction.async(parse.json) { req =>
    val neo4jReqJson = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherCreate,
          "parameters" -> Json.obj(
            "userEmail" -> req.identity.email,
            "hypergraphData" -> Json.obj(
              "id" -> UUID.randomUUID(),
              "name" -> (req.body \ "name").as[String]
            )
          )
        )
      )
    )

    val holder = WS
      .url(dbUrl)
      .withHeaders(
        "Content-Type" -> "application/json",
        "Accept" -> "application/json; charset=UTF-8"
      )

    // TODO: need to sanitize the response before returning it to client
    holder.post(neo4jReqJson).map { neo4jRes =>
      Ok(neo4jRes.body)
    }
  }

  val cypherRead =
    """
      | MATCH   (:User {email: userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph { id: hypergraphID })
      | RETURN  hg;
    """.stripMargin

  def read(hypergraphID: UUID) = SecuredAction.async { req =>
    val neo4jReqJson = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherCreate,
          "parameters" -> Json.obj(
            "userEmail" -> req.identity.email,
            "id" -> hypergraphID
          )
        )
      )
    )

    val holder = WS
      .url(dbUrl)
      .withHeaders(
        "Content-Type" -> "application/json",
        "Accept" -> "application/json; charset=UTF-8"
      )

    // TODO: need to sanitize the response before returning it to client
    holder.post(neo4jReqJson).map { neo4jRes =>
      Ok(neo4jRes.body)
    }
  }

  val cypherReadAll =
    """
      | MATCH   (:User { email: {userEmail} })-[:OWNS_HYPERGRAPH]->(hg:Hypergraph)
      | RETURN  hg;
    """.stripMargin

  def readAll = SecuredAction.async { req =>
    val neo4jReqJson = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherCreate,
          "parameters" -> Json.obj(
            "userEmail" -> req.identity.email
          )
        )
      )
    )

    val holder = WS
      .url(dbUrl)
      .withHeaders(
        "Content-Type" -> "application/json",
        "Accept" -> "application/json; charset=UTF-8"
      )

    // TODO: need to sanitize the response before returning it to client
    holder.post(neo4jReqJson).map { neo4jRes =>
      Ok(neo4jRes.body)
    }
  }

  val cypherDelete =
    """
      | MATCH           (:User { email: {userEmail} })-[OWNS_HG:OWNS_HYPERGRAPH]->(hg:Hypergraph { id: hypergraphID })
      | OPTIONAL MATCH  (hg)-[OWNS_HN:OWNS_HYPERNODE]->(hn:Hypernode)
      | DELETE          OWNS_HG, OWNS_HN, hn, hg;
    """.stripMargin

  def delete(hypergraphID: UUID) = SecuredAction.async { req =>
    val neo4jReqJson = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherCreate,
          "parameters" -> Json.obj(
            "userEmail" -> req.identity.email,
            "id" -> hypergraphID
          ),
          "includeStats" -> true
        )
      )
    )

    val holder = WS
      .url(dbUrl)
      .withHeaders(
        "Content-Type" -> "application/json",
        "Accept" -> "application/json; charset=UTF-8"
      )

    // TODO: need to sanitize the response before returning it to client
    holder.post(neo4jReqJson).map { neo4jRes =>
      Ok(neo4jRes.body)
    }
  }

}
