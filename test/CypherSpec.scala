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

  val dbTxUrl = current.configuration.getString("neo4j.host").map(_ + "/db/data/transaction/commit").get
  val dbUsername = current.configuration.getString("neo4j.username").get
  val dbPassword = current.configuration.getString("neo4j.password").get

  implicit val neo4jConnect =
      Neo4jConnection()

  "The Cypher API" should {
    "be able to execute a simple create and delete cypher query" in {
      val testNodeID = UUID.randomUUID().toString
      whenReady(Cypher(s"create (n:TestNode { id: '$testNodeID' }) return n")()) { cypherResult =>
        (cypherResult.data \ "id").as[String] shouldBe testNodeID
        cypherResult.stats.nodesCreated shouldBe 1
      }

      whenReady(Cypher(s"match (n:TestNode { id: '$testNodeID' })")()) { cypherResult =>
        cypherResult.stats.nodesDeleted shouldBe 1
      }
    }

    "apply dynamic parameters to cypher queries specified through 'on'" in {
      val testNodeID = UUID.randomUUID().toString

      val createCypherQuery = Cypher(s"create (n:TestNode { id: {testNodeID} }) return n")
          .on(Json.obj("testNodeID" -> testNodeID))

      whenReady(createCypherQuery()) { cypherResult =>
        (cypherResult.data \ "id").as[String] shouldBe testNodeID
        cypherResult.stats.nodesCreated shouldBe 1
      }

      val deleteCypherQuery = Cypher(s"match (n:TestNode { id: {testNodeID} })")
          .on(Json.obj("testNodeID" -> testNodeID))

      whenReady(deleteCypherQuery()) { cypherResult =>
        cypherResult.stats.nodesDeleted shouldBe 1
      } 
    }
  }
}
