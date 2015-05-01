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

  "The `Cypher.apply` method" should {

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

    "should apply optionally provided query parameters" in {
      val testNodeID = UUID.randomUUID().toString

      val createCypherFutureResult = Cypher(s"create (n:TestNode { id: {testNodeID} }) return n")
        .apply(Json.obj("testNodeID" -> testNodeID))

      whenReady(createCypherFutureResult) { cypherResult =>
        (cypherResult.rows.head(0) \ "id").as[String] shouldBe testNodeID
        cypherResult.stats.nodesCreated shouldBe 1
      }

      val deleteCypherFutureResult = Cypher(s"match (n:TestNode { id: {testNodeID} }) delete n")
        .apply(Json.obj("testNodeID" -> testNodeID))

      whenReady(deleteCypherFutureResult) { cypherResult =>
        cypherResult.stats.nodesDeleted shouldBe 1
      }
    }

  }

  "The `Cypher.on` method" should {

    "should apply optionally provided query parameters" in {
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

    "add to the parameters object when called in a chained manner" in {
      val testNodeID = UUID.randomUUID().toString

      val createCypherQuery = Cypher(s"create (n:TestNode { id: {testNodeID} }) return n")
        .on(Json.obj("testNodeID" -> testNodeID))
        .on(Json.obj("chainedProp" -> "chainedVal"))

      whenReady(createCypherQuery()) { cypherResult =>
        (cypherResult.rows.head(0) \ "id").as[String] shouldBe testNodeID
        (cypherResult.rows.head(0) \ "chainedProp").as[String] shouldBe "chainedVal"
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
