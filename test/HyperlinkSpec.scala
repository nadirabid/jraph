import java.util.UUID

import com.mohiva.play.silhouette.api.LoginInfo
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import com.mohiva.play.silhouette.impl.providers.CredentialsProvider
import com.mohiva.play.silhouette.test._

import models.{User, Hypergraph, Hypernode, Hyperlink}

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

class HyperlinkSpec extends WordSpec
  with ScalaFutures
  with ShouldMatchers
  with OneAppPerTest
  with OptionValues
  with BeforeAndAfter {

  implicit val defaultPatience =
    PatienceConfig(timeout = Span(2, Seconds), interval = Span(15, Millis))

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

  "The Hyperlink model and companion object" should {
    "create, find, and delete the given new unique Hyperlink model" in {
      val defaultHypergraph = Await.result(Hypergraph.readAll(userEmail), 1000.millis).get.find { hg =>
        hg.data match {
          case Some(json) => (json \ "name").as[String] == "default"
          case None => false
        }
      }.get

      val sourceNode = Hypernode(
        UUID.randomUUID(),
        DateTime.now,
        DateTime.now,
        Some(Json.obj("p1" -> "v1"))
      )

      val targetNode = Hypernode(
        UUID.randomUUID(),
        DateTime.now,
        DateTime.now,
        Some(Json.obj("p1" -> "v1"))
      )

      Await.result(Hypernode.create(userEmail, defaultHypergraph.id, sourceNode), 200.millis)
      Await.result(Hypernode.create(userEmail, defaultHypergraph.id, targetNode), 200.millis)

      val hyperlink = Hyperlink(
        UUID.randomUUID(),
        sourceNode.id,
        targetNode.id,
        DateTime.now,
        DateTime.now,
        Some(Json.obj("p1" -> "v1"))
      )

      val createResult = Hyperlink.create(userEmail, defaultHypergraph.id, hyperlink)

      whenReady(createResult) { opt =>
        opt.isEmpty shouldBe false
        opt.value.id shouldBe hyperlink.id
        (opt.value.data.get \ "p1").as[String] shouldBe "v1"
      }

      val findResult = Hyperlink.read(userEmail, defaultHypergraph.id, hyperlink.id)

      whenReady(findResult) { opt =>
        opt.isEmpty shouldBe false
        opt.value.id shouldBe hyperlink.id
        (opt.value.data.get \ "p1").as[String] shouldBe "v1"
      }

      val findAllResult = Hyperlink.readAll(userEmail, defaultHypergraph.id)

      whenReady(findAllResult) { opt =>
        opt.isEmpty shouldBe false
        opt.value.count(_.id == hyperlink.id) shouldBe 1
      }

      val hyperlinkUpdate = Hyperlink(
        hyperlink.id,
        sourceNode.id,
        targetNode.id,
        DateTime.now,
        null,
        Some(Json.obj("p2" -> "v2"))
      )

      val updateResult = Hyperlink.update(
        userEmail,
        defaultHypergraph.id,
        hyperlinkUpdate
      )

      whenReady(updateResult) { opt =>
        opt.isEmpty shouldBe false
        opt.value.id shouldBe hyperlink.id
        (opt.value.data.get \ "p2").as[String] shouldBe "v2"

        an [JsResultException] should be thrownBy {
          (opt.value.data.get \ "p1").as[String]
        }
      }

      val deleteResult = Hyperlink.delete(
        userEmail,
        defaultHypergraph.id,
        hyperlink.id
      )

      whenReady(deleteResult) { opt =>
        opt shouldBe true
      }

      val deleteFindResult = Hyperlink.read(
        userEmail,
        defaultHypergraph.id,
        hyperlink.id
      )

      whenReady(deleteFindResult) { opt =>
        opt shouldBe None
      }
    }

    "create, find, and delete the given new unique Hyperlink model with a null data property" in {
      val defaultHypergraph = Await.result(Hypergraph.readAll(userEmail), 500.millis).get.find { hg =>
        hg.data match {
          case Some(json) => (json \ "name").as[String] == "default"
          case None => false
        }
      }.get

      val sourceNode = Hypernode(
        UUID.randomUUID(),
        DateTime.now,
        DateTime.now,
        Some(Json.obj("p1" -> "v1"))
      )

      val targetNode = Hypernode(
        UUID.randomUUID(),
        DateTime.now,
        DateTime.now,
        Some(Json.obj("p1" -> "v1"))
      )

      Await.result(Hypernode.create(userEmail, defaultHypergraph.id, sourceNode), 200.millis)
      Await.result(Hypernode.create(userEmail, defaultHypergraph.id, targetNode), 200.millis)

      val hyperlink = Hyperlink(
        UUID.randomUUID(),
        sourceNode.id,
        targetNode.id,
        DateTime.now,
        DateTime.now,
        None
      )

      val createResult = Hyperlink.create(userEmail, defaultHypergraph.id, hyperlink)

      whenReady(createResult) { opt =>
        opt.isEmpty shouldBe false
        opt.value.id shouldBe hyperlink.id
        opt.value.data shouldBe None
      }

      val findResult = Hyperlink.read(userEmail, defaultHypergraph.id, hyperlink.id)

      whenReady(findResult) { opt =>
        opt.isEmpty shouldBe false
        opt.value.id shouldBe hyperlink.id
        opt.value.data shouldBe None
      }

      val findAllResult = Hyperlink.readAll(userEmail, defaultHypergraph.id)

      whenReady(findAllResult) { opt =>
        opt.isEmpty shouldBe false
        opt.value.count(_.id == hyperlink.id) shouldBe 1
      }

      val hyperlinkUpdate = Hyperlink(
        hyperlink.id,
        sourceNode.id,
        targetNode.id,
        DateTime.now,
        null,
        Some(Json.obj("p2" -> "v2"))
      )

      val updateResult = Hyperlink.update(
        userEmail,
        defaultHypergraph.id,
        hyperlinkUpdate
      )

      whenReady(updateResult) { opt =>
        opt.isEmpty shouldBe false
        opt.value.id shouldBe hyperlink.id
        (opt.value.data.get \ "p2").as[String] shouldBe "v2"
      }

      val hyperlinkUpdate2 = Hyperlink(
        hyperlink.id,
        sourceNode.id,
        targetNode.id,
        DateTime.now,
        null,
        None
      )

      val update2Result = Hyperlink.update(
        userEmail,
        defaultHypergraph.id,
        hyperlinkUpdate2
      )

      whenReady(update2Result) { opt =>
        opt.isEmpty shouldBe false
        opt.value.id shouldBe hyperlink.id
        opt.value.data shouldBe None
      }

      val deleteResult = Hyperlink.delete(
        userEmail,
        defaultHypergraph.id,
        hyperlink.id
      )

      whenReady(deleteResult) { opt =>
        opt shouldBe true
      }

      val deleteFindResult = Hyperlink.read(
        userEmail,
        defaultHypergraph.id,
        hyperlink.id
      )

      whenReady(deleteFindResult) { opt =>
        opt shouldBe None
      }
    }
  }
}
