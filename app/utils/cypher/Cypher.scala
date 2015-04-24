package utils.cypher

import play.api.libs.ws.{WS, WSAuthScheme}
import play.api.libs.json._

/*
  Cypher("match n return n").map { cypherResponse =>
    row.validate[User] match {
      case CypherResult[User](user) => println(user)
      case CypherError(err) => println(err)
    }
  }
*/

class Neo4jConnection(host: String, port: Int, username: String, password: String) {
  private val url = s"http://$host:$port/db/data/transaction/commit"

  private val neo4jHeaders = Seq(
    "Content-Type" -> "application/json",
    "Accept" -> "application/json; charset=UTF-8"
  )

  def sendQuery(cypherQuery: String, parameters: Option[JsObject]) = {
    val reqHolder = WS
        .url(url)
        .withAuth(username, password, WSAuthScheme.BASIC)
        .withHeaders(neo4jHeaders)

    val reqJson = Json.obj(
      "statements" -> Json.obj(

      )
    )
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