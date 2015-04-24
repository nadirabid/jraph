package utils.cypher

import play.api.libs.ws.{WS, WSAuthScheme}
import play.api.libs.json._

/**
 * Example JSON result of Transactional Cypher HTTP endpoint
 * ie. /db/data/transaction/commit
 *
 * {
 *  results : [{
 *    columns: [ 'id(n)' ],
 *    data: [{
 *      row: [ 15 ]
 *    }]
 *  }],
 *  errors: [ ]
 * }
 */

/**
 * Cypher("match n return n").map { cypherResponse =>
 *  cypherResponse.validate[User] match {
 *    case CypherResult[User](user) => println(user)
 *    case CypherError(err) => println(err)
 *  }
 * }
 *
 * Cypher("match (u:User {userData}) return u")
 *    .on(Json.obj(
 *      "userData" -> Json.obj("id" -> "john.doe@email.com")
 *    ))
 *    .map { cypherResponse => {
 *      cypherResponse.validate[User] match {
 *        case CypherResult[User](user) => println(user)
 *        case CypherError(err) => println(err)
 *      }
 *    }
*/

class Neo4jConnection(host: String, port: Int, username: String, password: String) {
  private val url = s"http://$host:$port/db/data/transaction/commit"

  private val neo4jHeaders = Seq(
    "Content-Type" -> "application/json",
    "Accept" -> "application/json; charset=UTF-8"
  )

  def sendQuery(cypherStatement: String, parameters: JsObject = new JsObject()) = {
    val reqHolder = WS
        .url(url)
        .withAuth(username, password, WSAuthScheme.BASIC)
        .withHeaders(neo4jHeaders)

    val reqJson = Json.obj(
      "statements" -> Json.obj(
        Json.arr(
          "statement" -> cypherStatement,
          "parameters" -> parameters
        )
      )
    )

    reqHolder.post(reqJson)
  }
}

trait CypherResponse

class CypherResult {

}

class CypherError {

}



object Neo4jConnection {
  def apply(host: String, port: Int, username: String, password: String) =
    new Neo4jConnection(host, port, username, password)
}

object Cypher {
  def apply(implicit connection: Neo4jConnection) = {

  }
}