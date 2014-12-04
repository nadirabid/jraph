import java.util.UUID

import com.mohiva.play.silhouette.api.LoginInfo
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import com.mohiva.play.silhouette.impl.providers.CredentialsProvider
import com.mohiva.play.silhouette.test._

import models.{User, Hypergraph}

import org.scalatest._
import org.scalatest.concurrent.ScalaFutures
import org.scalatestplus.play._

import play.api.test._
import play.api.test.Helpers._
import play.api.libs.json._

class HypergraphSpec extends WordSpec
  with ScalaFutures
  with ShouldMatchers
  with OneAppPerTest
  with OptionValues
  with BeforeAndAfter {

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
      val identity = User(userEmail, LoginInfo(CredentialsProvider.ID, userEmail))
      implicit val env = FakeEnvironment[User, SessionAuthenticator](identity)

      val userDeleteRequest = FakeRequest(DELETE, "/account/delete")
        .withAuthenticator(identity.loginInfo)

      val userDeleteResult = route(userDeleteRequest).get
      status(userDeleteResult) shouldBe OK
    }
  }

  "The Hypergraph model and companion object" should {
    "create given a new unique Hypergraph model" in {
      val hypergraphModel = Hypergraph(hypergraphID, hypergraphName)

      val createResult = Hypergraph.create(userEmail, hypergraphModel)

      whenReady(createResult) { opt =>
        opt.value.hypergraphID shouldBe hypergraphID
        opt.value.name shouldBe hypergraphName
      }
    }

    "find a Hypergraph model with the specified hypergraphID" in {
      val findResult = Hypergraph.read(userEmail, hypergraphID)

      whenReady(findResult) { opt =>
        opt.value.hypergraphID shouldBe hypergraphID
        opt.value.name shouldBe hypergraphName
      }
    }

    "delete a Hypergraph model of the specified hypergraphID" in {
      val deleteResult = Hypergraph.delete(userEmail, hypergraphID)

      whenReady(deleteResult) { res =>
        res shouldBe true
      }

      val findResult = Hypergraph.read(userEmail, hypergraphID)

      whenReady(findResult) { opt =>
        opt shouldBe None
      }
    }
  }
}
