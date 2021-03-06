import java.util.UUID

import com.mohiva.play.silhouette.api.LoginInfo
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import com.mohiva.play.silhouette.impl.providers.CredentialsProvider
import com.mohiva.play.silhouette.test._

import models.{User, Hypergraph, Hypernode}

import org.scalatest._
import org.scalatest.concurrent.ScalaFutures
import org.scalatest.time.{Millis, Seconds, Span}
import org.scalatestplus.play._

import org.joda.time.DateTime
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
  /*

  implicit val defaultPatience =
    PatienceConfig(timeout = Span(3, Seconds), interval = Span(15, Millis))

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
      val identity = User(UUID.randomUUID, userEmail, None, None, LoginInfo(CredentialsProvider.ID, userEmail))
      implicit val env = FakeEnvironment[User, SessionAuthenticator](Seq(identity.loginInfo -> identity))

      val userDeleteRequest = FakeRequest(DELETE, "/account/delete")
        .withAuthenticator(identity.loginInfo)

      val userDeleteResult = route(userDeleteRequest).get
      status(userDeleteResult) shouldBe OK
    }
  }

  "The Hypernode model and companion object" should {
    "create, find, and delete the given new unique Hypernode model" in {
      val defaultHypergraph = Await.result(Hypergraph.readAll(userEmail), 3000.millis).find { hg =>
        hg.data match {
          case Some(json) => (json \ "name").as[String] == "default"
          case None => false
        }
      }.get

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

      whenReady(createResult) { hn =>
        hn.id shouldBe hypernodeModel.id
        (hn.data.get \ "p1").as[String] shouldBe "v1"
      }

      val findResult = Hypernode.read(
        userEmail,
        defaultHypergraph.id,
        hypernodeModel.id
      )

      whenReady(findResult) { opt =>
        opt.value.id shouldBe hypernodeModel.id
        (opt.value.data.get \ "p1").as[String] shouldBe "v1"
      }

      val findAllResult = Hypernode.readAll(userEmail, defaultHypergraph.id)

      whenReady(findAllResult) { hnSeq =>
        hnSeq.size shouldBe 1
        hnSeq.count(_.id == hypernodeModel.id) shouldBe 1
      }

      val modelUpdate = Hypernode(
        hypernodeModel.id,
        DateTime.now,
        null,
        Some(Json.obj("p2" -> "v2"))
      )

      val updateResult = Hypernode.update(userEmail, defaultHypergraph.id, modelUpdate)

      whenReady(updateResult) { hn =>
        hn.id shouldBe hypernodeModel.id
        (hn.data.get \ "p2").as[String] shouldBe "v2"

        an [JsResultException] should be thrownBy {
          (hn.data.get \ "p1").as[String]
        }
      }

      val batchUpdateModels = Seq(Hypernode(
        hypernodeModel.id,
        DateTime.now,
        null,
        Some(Json.obj("p3" -> "v3"))
      ))

      val batchUpdateResult = Hypernode.batchUpdate(
        userEmail,
        defaultHypergraph.id,
        batchUpdateModels
      )

      whenReady(batchUpdateResult) { hn =>
        hn.size shouldBe 1

        val batchUpdatedNode = hn.find(_.id == hypernodeModel.id)
        (batchUpdatedNode.value.data.get \ "p3").as[String] shouldBe "v3"
      }

      val deleteResult = Hypernode.delete(
        userEmail,
        defaultHypergraph.id,
        hypernodeModel.id
      )

      whenReady(deleteResult) { res =>
        res shouldBe true
      }

      val deleteFindResult = Hypernode.read(
        userEmail,
        defaultHypergraph.id,
        hypernodeModel.id
      )

      whenReady(deleteFindResult) { opt =>
        opt shouldBe None
      }
    }
  }
  */
}
