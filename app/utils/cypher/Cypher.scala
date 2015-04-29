package utils.cypher

import play.api.Play.current
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
 *        {
 *          row: [ 15 ]
 *        }
 *      ],
 *      stats: {
 *        contains_updates: false,
 *        nodes_created: 0,
 *        nodes_deleted: 0,
 *        properties_set: 0,
 *        relationships_created: 0,
 *        relationships_deleted: 0,
 *        labels_added: 0,
 *        labels_removed: 0,
 *        indexes_added: 0,
 *        indexes_removed: 0,
 *        constraints_added: 0,
 *        constraints_removed: 0
 *      }
 *    }
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

class Neo4jConnection(host: String, port: Int, username: String, password: String) {
  private val url = s"http://$host:$port/db/data/transaction/commit"

  private val neo4jHeaders = Seq(
    "Content-Type" -> "application/json",
    "Accept" -> "application/json; charset=UTF-8"
  )

  def sendQuery(cypherStatement: String,
                parameters: JsObject): Future[CypherResult] = {

    val reqHolder = WS
        .url(url)
        .withAuth(username, password, WSAuthScheme.BASIC)
        .withHeaders(neo4jHeaders:_*)

    val reqJson = Json.obj(
      "statements" -> Json.arr(
        Json.obj(
          "statement" -> cypherStatement,
          "parameters" -> parameters
        )
      )
    )

    reqHolder.post(reqJson).map { resp =>
      val errors = (resp.json \ "errors").as[Seq[JsObject]]

      if (errors.nonEmpty) {
        throw new CypherException(Json.prettyPrint(resp.json \ "errors"))
      }

      val results = (resp.json \ "results")(0)
      val dataRows = (results \ "data").as[Seq[JsObject]].map { datum => (datum \ "row").as[JsObject]}
      val stats = (results \ "stats").as[CypherSuccessStats]

      CypherResult(dataRows, stats)
    }
  }
}

class CypherException(msg: String) extends RuntimeException("Cypher exception: " + msg)

object Neo4jConnection {
  def apply(host: String, port: Int, username: String, password: String) = {
    new Neo4jConnection(host, port, username, password)
  }
}

case class CypherSuccessStats(nodesDeleted:Int,
                              relationshipsDeleted:Int)

object CypherSuccessStats {
  implicit val reads: Reads[CypherSuccessStats] = (
    (JsPath \ "nodes_deleted").read[Int] and
    (JsPath \ "relationships_deleted").read[Int]
  )(CypherSuccessStats.apply _)
}

case class CypherResult(data: Seq[JsObject],
                        stats: CypherSuccessStats)

case class Cypher(cypher: String, parameters: JsObject = Json.obj()) {
  def apply(implicit neo4jConnection: Neo4jConnection) = {
    neo4jConnection.sendQuery(cypher, parameters)
  }

  def on(args: JsObject) = this.copy(parameters = args ++ parameters)
}

object Cypher {
  def apply(cypher: String) = new Cypher(cypher)
}