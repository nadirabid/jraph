package utils.cypher

class Neo4jConnection(host: String, port: Int, username: String, password: String) {
  private val baseUrl = s"http://$host:$port/db/data/transaction/commit"

  val neo4jHeaders = Seq(
    "Content-Type" -> "application/json",
    "Accept" -> "application/json; charset=UTF-8"
  )
}

object Neo4jConnection {
  def apply(host: String, port: Int, username: String, password: String) =
    new Neo4jConnection(host, port, username, password)
}
