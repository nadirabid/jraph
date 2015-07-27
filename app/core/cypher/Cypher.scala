package core.cypher

import play.api.libs.ws._

import play.api.libs.ws.{WS, WSAuthScheme}
import play.api.libs.json._
import play.api.libs.json.Reads._
import play.api.libs.functional.syntax._

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

/**
 * Example JSON result of Transactional Cypher HTTP endpoint
 * ie. /db/data/transaction/commit
 *
 * {
 *  results : [
 *      {
 *        columns: [ 'id(n)' ],
 *        data: [
 *          {
 *            row: [ 15 ]
 *          }
 *        ],
 *        stats: {
 *          contains_updates: false,
 *          nodes_created: 0,
 *          nodes_deleted: 0,
 *          properties_set: 0,
 *          relationships_created: 0,
 *          relationship_deleted: 0,
 *          labels_added: 0,
 *          labels_removed: 0,
 *          indexes_added: 0,
 *          indexes_removed: 0,
 *          constraints_added: 0,
 *          constraints_removed: 0
 *        }
 *      }
 *  ],
 *  errors: [
 *    {
 *      "code": "Neo.ClientError.Statement.InvalidSyntax",
 *      "message": "A more specific message about the type of error"
 *    }
 *  ]
 * }
 */

/**
 *
 * How the cypher API should look:
 *
 * val implicit neo4jConnection = Neo4jConnection(host, port, username, password)
 *
 * Cypher("match n return n")().map { cypherResult =>
 *  cypherResult.validate[User] match {
 *    case CypherSuccess[User](user) => println(user)
 *    case CypherError(err) => println(err)
 *  }
 * }
 *
 * Cypher("match (u:User {userData}) return u")
 *    .on(Json.obj(
 *      "userData" -> Json.obj("id" -> "john.doe@email.com")
 *    ))()
 *    .map { cypherResult => {
 *      cypherResult.data.validate[Seq[User]] match {
 *        case s:JsSuccess[Seq[User]] => println(s.get)
 *        case e:JsError => println(e)
 *      }
 *    }
 *
*/

case class Neo4jConnectionSettings(
    host:String,
    port: Int,
    username: String,
    password: String)

class Neo4jConnection(host: String,
                      port: Int,
                      username: String,
                      password: String,
                      ws: WSClient) {

  private val url = s"http://$host:$port/db/data/transaction/commit"

  private val neo4jHeaders = Seq(
    "Content-Type" -> "application/json",
    "Accept" -> "application/json; charset=UTF-8"
  )

  def this(host: String, port:Int, username: String, password: String) = {
    this(host, port, username, password, WS.client(play.api.Play.current))
  }

  def sendQuery(cypherStatement: String,
                parameters: JsObject): Future[CypherResult] = {

    val reqHolder = ws
        .url(url)
        .withAuth(username, password, WSAuthScheme.BASIC)
        .withHeaders(neo4jHeaders:_*)

    val reqJson = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherStatement,
          "parameters" -> parameters,
          "includeStats" -> true
        )
      )
    )

    reqHolder.post(reqJson).map { resp =>

      val errors = (resp.json \ "errors").as[Vector[JsObject]]

      if (errors.nonEmpty) {
        throw new CypherException(Json.prettyPrint((resp.json \ "errors").as[JsValue]))
      }

      val result = (resp.json \ "results")(0)
      val rows = (result \ "data").as[Vector[JsObject]].map { datum => (datum \ "row").as[JsArray] }
      val stats = (result \ "stats").as[CypherSuccessStats]

      CypherResult(rows, stats)
    }
  }
}

class CypherException(msg: String) extends RuntimeException("Cypher exception: " + msg)

object Neo4jConnection {
  def apply(host: String, port: Int, username: String, password: String) = {
    new Neo4jConnection(host, port, username, password)
  }
}

case class CypherSuccessStats(nodesCreated:Int,
                              nodesDeleted:Int,
                              relationshipsCreated:Int,
                              relationshipsDeleted:Int)

object CypherSuccessStats {
  implicit val reads: Reads[CypherSuccessStats] = (
    (JsPath \ "nodes_created").read[Int] and
    (JsPath \ "nodes_deleted").read[Int] and
    (JsPath \ "relationships_created").read[Int] and
    (JsPath \ "relationship_deleted").read[Int]
  )(CypherSuccessStats.apply _)
}

case class CypherResult(rows: Seq[JsArray],
                        stats: CypherSuccessStats)

case class Cypher(cypher: String, parameters: JsObject = Json.obj()) {
  def apply(args: JsObject = Json.obj())(implicit neo4jConnection: Neo4jConnection) = {
    neo4jConnection.sendQuery(cypher, parameters ++ args)
  }

  def on(args: JsObject) = this.copy(parameters = parameters ++ args)
}

object Cypher {
  def apply(cypher: String) = new Cypher(cypher)
}