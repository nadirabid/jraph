import org.scalatest._
import org.scalatest.concurrent.ScalaFutures
import org.scalatest.time.{Millis, Seconds, Span}
import org.scalatestplus.play._

import play.api.libs.json.Json
import play.api.Play.current

import java.util.UUID

import utils.cypher.{Neo4jConnection, Cypher}

class CypherSpec extends WordSpec
  with ShouldMatchers
  with ScalaFutures
  with OneAppPerSuite {

  implicit val defaultPatience =
      PatienceConfig(timeout = Span(3, Seconds), interval = Span(15, Millis))

  val dbHost = "localhost"
  val dbPort = 7474
  val dbUsername = "neo4j"
  val dbPassword = "password"

  implicit val neo4jConnection = Neo4jConnection(dbHost, dbPort, dbUsername, dbPassword)

  "The `Cypher` method" should {

    "be able to execute a simple create and delete cypher query" in {
      val testNodeID = UUID.randomUUID().toString
      whenReady(Cypher(s"create (n:TestNode { id: '$testNodeID' }) return n")()) { cypherResult =>
        (cypherResult.rows.head(0) \ "id").as[String] shouldBe testNodeID
        cypherResult.stats.nodesCreated shouldBe 1
      }

      whenReady(Cypher(s"match (n:TestNode { id: '$testNodeID' }) delete n")()) { cypherResult =>
        cypherResult.stats.nodesDeleted shouldBe 1
      }
    }

  }

  "The `on` method" should {

    "apply dynamic parameters to cypher queries specified through 'on'" in {
      val testNodeID = UUID.randomUUID().toString

      val createCypherQuery = Cypher(s"create (n:TestNode { id: {testNodeID} }) return n")
        .on(Json.obj("testNodeID" -> testNodeID))

      whenReady(createCypherQuery()) { cypherResult =>
        (cypherResult.rows.head(0) \ "id").as[String] shouldBe testNodeID
        cypherResult.stats.nodesCreated shouldBe 1
      }

      val deleteCypherQuery = Cypher(s"match (n:TestNode { id: {testNodeID} }) delete n")
        .on(Json.obj("testNodeID" -> testNodeID))

      whenReady(deleteCypherQuery()) { cypherResult =>
        cypherResult.stats.nodesDeleted shouldBe 1
      }
    }

  }
}
