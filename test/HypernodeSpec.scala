import java.util.UUID

import com.mohiva.play.silhouette.api.LoginInfo
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import com.mohiva.play.silhouette.impl.providers.CredentialsProvider
import com.mohiva.play.silhouette.test._

import models.{User, Hypergraph, Hypernode}

import org.scalatest._
import org.scalatest.concurrent.ScalaFutures
import org.scalatestplus.play._

import org.joda.time._
import play.api.libs.json.{JsResultException, Json}

import play.api.test._
import play.api.test.Helpers._

import scala.concurrent.Await
import scala.concurrent.duration._

class HypernodeSpec extends WordSpec
  with ScalaFutures
  with ShouldMatchers
  with OneAppPerTest
  with OptionValues
  with BeforeAndAfter {

  val userEmail = UUID.randomUUID().toString + "@test.com"

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

  "The Hypernode model and companion object" should {
    "create, find, and delete the given new unique Hypernode model" in {
      val defaultHypergraph = Await.result(Hypergraph.readAll(userEmail), 500.millis).get
        .find(_.name == "default").get

      val hypernodeModel = Hypernode(
        UUID.randomUUID(),
        DateTime.now,
        DateTime.now,
        Some(Json.obj("p1" -> "v1"))
      )

      val createResult = Hypernode.create(
        userEmail,
        defaultHypergraph.id,
        hypernodeModel
      )

      whenReady(createResult) { opt =>
        opt.value.hypernodeID shouldBe hypernodeModel.hypernodeID
        (opt.value.data.get \ "p1").as[String] shouldBe "v1"
      }

      val findResult = Hypernode.read(
        userEmail,
        defaultHypergraph.id,
        hypernodeModel.hypernodeID
      )

      whenReady(findResult) { opt =>
        opt.value.hypernodeID shouldBe hypernodeModel.hypernodeID
        (opt.value.data.get \ "p1").as[String] shouldBe "v1"
      }

      val findAllResult = Hypernode.readAll(userEmail, defaultHypergraph.id)

      whenReady(findAllResult) { opt =>
        opt.value.size shouldBe 1
        opt.value.count(_.hypernodeID == hypernodeModel.hypernodeID) shouldBe 1
      }

      val modelUpdate = Hypernode(
        hypernodeModel.hypernodeID,
        DateTime.now,
        null,
        Some(Json.obj("p2" -> "v2"))
      )

      val updateResult = Hypernode.update(userEmail, defaultHypergraph.id, modelUpdate)

      whenReady(updateResult) { opt =>
        opt.value.hypernodeID shouldBe hypernodeModel.hypernodeID
        (opt.value.data.get \ "p2").as[String] shouldBe "v2"

        an [JsResultException] should be thrownBy {
          (opt.value.data.get \ "p1").as[String]
        }
      }

      val batchUpdateModels = Seq(Hypernode(
        hypernodeModel.hypernodeID,
        DateTime.now,
        null,
        Some(Json.obj("p3" -> "v3"))
      ))

      val batchUpdateResult = Hypernode.batchUpdate(
        userEmail,
        defaultHypergraph.id,
        batchUpdateModels
      )

      whenReady(batchUpdateResult) { opt =>
        opt.value.size shouldBe 1

        val batchUpdatedNode = opt.value.find(_.hypernodeID == hypernodeModel.hypernodeID)
        (batchUpdatedNode.value.data.get \ "p3").as[String] shouldBe "v3"
      }

      val deleteResult = Hypernode.delete(
        userEmail,
        defaultHypergraph.id,
        hypernodeModel.hypernodeID
      )

      whenReady(deleteResult) { opt =>
        opt shouldBe true
      }

      val deleteFindResult = Hypernode.read(
        userEmail,
        defaultHypergraph.id,
        hypernodeModel.hypernodeID
      )

      whenReady(deleteFindResult) { opt =>
        opt shouldBe None
      }
    }
  }
}
