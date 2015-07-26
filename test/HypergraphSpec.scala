import java.util.UUID

import com.mohiva.play.silhouette.api.LoginInfo
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import com.mohiva.play.silhouette.impl.providers.CredentialsProvider
import com.mohiva.play.silhouette.test._

import models.{User, Hypergraph}

import org.joda.time.DateTime

import org.scalatest._
import org.scalatest.concurrent.ScalaFutures
import org.scalatest.time.{Millis, Seconds, Span}
import org.scalatestplus.play._

import play.api.test._
import play.api.test.Helpers._
import play.api.libs.json.Json

class HypergraphSpec extends WordSpec
  with ScalaFutures
  with ShouldMatchers
  with OneAppPerTest
  with OptionValues
  with BeforeAndAfter {

  /*
  implicit val defaultPatience =
    PatienceConfig(timeout = Span(3, Seconds), interval = Span(15, Millis))

  val userEmail = UUID.randomUUID().toString + "@test.com"
  val hypergraphID = UUID.randomUUID()
  val hypergraphName = "TestHypergraphName"

  before {
    running(FakeApplication()) {
      val userCreateRequest = FakeRequest(POST, "/account/create")
        .withFormUrlEncodedBody(Map("email" -> userEmail, "password" -> "123").toSeq:_*)

      val userCreateResult = route(userCreateRequest).get
      status(userCreateResult) shouldBe SEE_OTHER
    }
  }

  after {
    running(FakeApplication()) {
      val identity = User(UUID.randomUUID, userEmail, None, None, LoginInfo(CredentialsProvider.ID, userEmail))
      implicit val env = FakeEnvironment[User, SessionAuthenticator](Seq(identity.loginInfo -> identity))

      val userDeleteRequest = FakeRequest(DELETE, "/account/delete")
        .withAuthenticator(identity.loginInfo)

      val userDeleteResult = route(userDeleteRequest).get
      status(userDeleteResult) shouldBe OK
    }
  }

  "The Hypergraph model and companion object" should {
    "create, find, and delete the given new unique Hypergraph model" in {
      val hypergraphModel = Hypergraph(
        hypergraphID,
        DateTime.now,
        DateTime.now,
        Some(Json.obj("name" -> hypergraphName))
      )

      val createResult = Hypergraph.create(userEmail, hypergraphModel)

      whenReady(createResult) { hypergraphResult =>
        hypergraphResult.id shouldBe hypergraphID
        (hypergraphResult.data.get \ "name").as[String] shouldBe hypergraphName
      }

      val findResult = Hypergraph.read(userEmail, hypergraphID)

      whenReady(findResult) { opt =>
        opt.value.id shouldBe hypergraphID
        (opt.value.data.get \ "name").as[String] shouldBe hypergraphName
      }

      val findAllResult = Hypergraph.readAll(userEmail)

      whenReady(findAllResult) { hypergraphsResult =>
        hypergraphsResult.size shouldBe 2 //including the default graph
        hypergraphsResult.count(_.id == hypergraphID) shouldBe 1
      }

      val modelUpdate = Hypergraph(
        hypergraphID,
        DateTime.now,
        null,
        Some(Json.obj("name" -> "newName", "p1" -> "v1"))
      )

      val updateResult = Hypergraph.update(userEmail, modelUpdate)

      whenReady(updateResult) { hypergraphResult =>
        hypergraphResult.id shouldBe hypergraphID
        (hypergraphResult.data.get \ "p1").as[String] shouldBe "v1"
        (hypergraphResult.data.get \ "name").as[String] shouldBe "newName"
      }

      val deleteResult = Hypergraph.delete(userEmail, hypergraphID)

      whenReady(deleteResult) { res =>
        res shouldBe true
      }

      val findDeletedResult = Hypergraph.read(userEmail, hypergraphID)

      whenReady(findDeletedResult) { opt =>
        opt shouldBe None
      }
    }
  }
  */
}
