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

  "The Hypernode controller" should {
    "create, find, read, delete a new node given JSON data and user email" in {
      val identity = User(userEmail, LoginInfo(CredentialsProvider.ID, userEmail))
      implicit val env = FakeEnvironment[User, SessionAuthenticator](identity)

      val defaultHypergraph = Await.result(Hypergraph.readAll(userEmail), 500.millis).get
        .find(_.name == "default").get

      val baseUrl = s"/hypergraph/${defaultHypergraph.hypergraphID}/hypernode"

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

      val createDataString = (contentAsJson(createResult) \ "data").as[String]
      val createDataJson = Json.parse(createDataString)
      (createDataJson \ "p1").as[String] shouldBe "v1"

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

      val updateDataString = (contentAsJson(updateResult) \ "data").as[String]
      val updateDataJson = Json.parse(updateDataString)

      // check the the data has property 'p2' and has removed 'p1'
      (updateDataJson \ "p2").as[String] shouldBe "v2"
      an [JsResultException] should be thrownBy { (updateDataJson \ "p1").as[String] }

      //
      // delete hypernode
      //

      val deleteReqJson = Json.obj("email" -> userEmail)

      val deleteReq = FakeRequest(DELETE, s"$baseUrl/$createUuidString")
        .withJsonBody(deleteReqJson)
        .withAuthenticator(identity.loginInfo)

      val deleteRes = route(deleteReq).get
      status(deleteRes) shouldBe OK

      val nodesDeleted = contentAsJson(deleteRes).as[Boolean]
      nodesDeleted shouldBe true
    }
  }
}