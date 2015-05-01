package testutils

import play.api.Play._
import utils.cypher.Neo4jConnection

trait Neo4jConnectionFixture {
  val dbHost = "localhost"
  val dbPort = current.configuration.getInt("neo4j.port").get
  val dbUsername = current.configuration.getString("neo4j.username").get
  val dbPassword = current.configuration.getString("neo4j.password").get

  implicit val neo4jConnection = Neo4jConnection(dbHost, dbPort, dbUsername, dbPassword)
}
