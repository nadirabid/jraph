import java.util.UUID

import com.mohiva.play.silhouette.api.LoginInfo
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import com.mohiva.play.silhouette.impl.providers.CredentialsProvider
import com.mohiva.play.silhouette.test._

import models.{Hypergraph, User}

import org.scalatest._
import org.scalatestplus.play._

import play.api.test._
import play.api.test.Helpers._
import play.api.libs.json._

import scala.concurrent.Await
import scala.concurrent.duration._

// By default the tests of a given ScalaTest Suite (WordSpec, FlatSpec, etc)
// are run sequentially inferred from the order in which the tests are defined.

class HypernodeControllerSpec extends WordSpec
  with ShouldMatchers
  with OneAppPerTest
  with BeforeAndAfter {

  /*
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

  "The Hypernode controller" should {
    "create, find, read, delete a new node given JSON data and user email" in {
      val identity = User(UUID.randomUUID, userEmail, None, None, LoginInfo(CredentialsProvider.ID, userEmail))
      implicit val env = FakeEnvironment[User, SessionAuthenticator](Seq(identity.loginInfo -> identity))

      val defaultHypergraph = Await.result(Hypergraph.readAll(userEmail), 3000.millis).find { hg =>
        hg.data match {
          case Some(json) => (json \ "name").as[String] == "default"
          case None => false
        }
      }.get

      val baseUrl = s"/hypergraph/${defaultHypergraph.id}/hypernode"

      //
      // create hypernode
      //

      val createReqJson = Json.obj(
        "email" -> userEmail,
        "data" -> Json.obj(
          "p1" -> "v1"
        )
      )

      val createRequest = FakeRequest(POST, baseUrl)
        .withJsonBody(createReqJson)
        .withAuthenticator(identity.loginInfo)

      val createResult = route(createRequest).get
      status(createResult) shouldBe OK

      val createUuidString = (contentAsJson(createResult) \ "id").as[String]
      val uuid = UUID.fromString(createUuidString)

      uuid.toString shouldEqual createUuidString

      (contentAsJson(createResult) \ "data" \ "p1").as[String] shouldBe "v1"

      //
      // find hypernode
      //

      val findRequest = FakeRequest(GET, s"$baseUrl/$createUuidString")
        .withAuthenticator(identity.loginInfo)

      val findResult = route(findRequest).get
      status(findResult) shouldBe OK

      val findUuidString = (contentAsJson(findResult) \ "id").as[String]

      findUuidString shouldEqual createUuidString

      //
      // findAll hypernode
      //

      val findAllRequest = FakeRequest(GET, baseUrl + "/all")
        .withAuthenticator(identity.loginInfo)

      val findAllResult = route(findAllRequest).get
      status(findAllResult) shouldBe OK

      val findAllResultSeq = contentAsJson(findAllResult).as[Seq[JsObject]]

      findAllResultSeq.size shouldBe 1
      findAllResultSeq.count(o => (o \ "id").as[UUID] == uuid) shouldBe 1

      //
      // update hypernode
      //

      val updateReqJson = Json.obj(
        "data" -> Json.obj(
          "p2" -> "v2"
        )
      )

      val updateRequest = FakeRequest(PUT, s"$baseUrl/$createUuidString")
        .withJsonBody(updateReqJson)
        .withAuthenticator(identity.loginInfo)

      val updateResult = route(updateRequest).get
      status(updateResult) shouldBe OK

      (contentAsJson(updateResult) \ "data" \ "p2").as[String] shouldBe "v2"


      // check the the data has property 'p2' and has removed 'p1'

      an [JsResultException] should be thrownBy {
        (contentAsJson(updateResult) \ "data" \ "p1").as[String]
      }

      //
      // delete hypernode
      //

      val deleteReq = FakeRequest(DELETE, s"$baseUrl/$createUuidString")
        .withAuthenticator(identity.loginInfo)

      val deleteRes = route(deleteReq).get
      status(deleteRes) shouldBe OK

      val nodesDeleted = contentAsJson(deleteRes).as[Boolean]
      nodesDeleted shouldBe true
    }
  }
  */
}