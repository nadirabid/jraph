import java.util.UUID

import com.mohiva.play.silhouette.api.LoginInfo
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import com.mohiva.play.silhouette.impl.providers.CredentialsProvider
import com.mohiva.play.silhouette.test._
import models.User
import org.scalatest._
import org.scalatestplus.play._
import play.api.test._
import play.api.test.Helpers._
import play.api.libs.json._

// By default the tests of a given ScalaTest Suite (WordSpec, FlatSpec, etc)
// are run sequentially inferred from the order in which the tests are defined.

class HypernodeControllerSpec extends WordSpec
  with ShouldMatchers
  with OneAppPerTest
  with BeforeAndAfter {

  val userEmail = UUID.randomUUID().toString + "@email.com"

  before {
    running(FakeApplication()) {
      val userCreateRequest = FakeRequest(POST, "/create")
        .withFormUrlEncodedBody(Map("email" -> userEmail, "password" -> "123").toSeq:_*)

      val userCreateResult = route(userCreateRequest).get
      status(userCreateResult) shouldBe OK
    }
  }

  after {
    running(FakeApplication()) {
      val identity = User(userEmail, LoginInfo(CredentialsProvider.ID, userEmail))
      implicit val env = FakeEnvironment[User, SessionAuthenticator](identity)

      val userDeleteRequest = FakeRequest(DELETE, "/delete")
        .withAuthenticator(identity.loginInfo)

      val userDeleteResult = route(userDeleteRequest).get
      status(userDeleteResult) shouldBe OK
    }
  }

  "The Hypernode controller" should {
    "create a new node given JSON data and user email" in {
      val identity = User(userEmail, LoginInfo(CredentialsProvider.ID, userEmail))
      implicit val env = FakeEnvironment[User, SessionAuthenticator](identity)

      val createReqJson = Json.obj(
        "email" -> userEmail,
        "data" -> Json.obj(
          "p1" -> "v1"
        )
      )

      val createRequest = FakeRequest(POST, "/hypernode")
        .withJsonBody(createReqJson)
        .withAuthenticator(identity.loginInfo)

      val createResult = route(createRequest).get

      println("create result status", status(createResult))
      status(createResult) shouldBe OK

      val createUuidString = ((((contentAsJson(createResult) \ "results")(0) \ "data")(0) \ "row")(0) \ "id").as[String]
      val uuid = UUID.fromString(createUuidString)

      uuid.toString shouldEqual createUuidString

      val createDataString = ((((contentAsJson(createResult) \ "results")(0) \ "data")(0) \ "row")(0) \ "data").as[String]
      val createDataJson = Json.parse(createDataString)
      (createDataJson \ "p1").as[String] shouldBe "v1"
    }
  }

  /*
  "The HypernodeController" should {
    "create, find, update, delete a new node given JSON data and user email" in {
      //
      // create hypernode
      //

      val createReqJson = Json.obj(
        "email" -> userEmail,
        "data" -> Json.obj(
          "p1" -> "v1"
        )
      )

      val createResult = route(FakeRequest(POST, "/hypernode").withJsonBody(createReqJson)).get
      status(createResult) shouldBe OK

      val createUuidString = ((((contentAsJson(createResult) \ "results")(0) \ "data")(0) \ "row")(0) \ "id").as[String]
      val uuid = UUID.fromString(createUuidString)

      uuid.toString shouldEqual createUuidString

      val createDataString = ((((contentAsJson(createResult) \ "results")(0) \ "data")(0) \ "row")(0) \ "data").as[String]
      val createDataJson = Json.parse(createDataString)
      (createDataJson \ "p1").as[String] shouldBe "v1"

      //
      // find hypernode
      //

      val findResult = route(FakeRequest(GET, "/hypernode/" + createUuidString)).get
      status(findResult) shouldBe OK

      val findUuidString = ((((contentAsJson(findResult) \ "results")(0) \ "data")(0) \ "row")(0) \ "id").as[String]

      findUuidString shouldEqual createUuidString

      //
      // update hypernode
      //

      val updateReqJson = Json.obj(
        "data" -> Json.obj(
          "p2" -> "v2"
        )
      )

      val updateResult = route(FakeRequest(PUT, "/hypernode/" + createUuidString).withJsonBody(updateReqJson)).get
      status(updateResult) shouldBe OK

      val updateDataString = ((((contentAsJson(updateResult) \ "results")(0) \ "data")(0) \ "row")(0) \ "data").as[String]
      val updateDataJson = Json.parse(updateDataString)

      // check the the data has property 'p2' and has removed 'p1'
      (updateDataJson \ "p2").as[String] shouldBe "v2"
      an [JsResultException] should be thrownBy { (updateDataJson \ "p1").as[String] }

      //
      // delete hypernode
      //

      val deleteReqJson = Json.obj("email" -> userEmail)
      val deleteRes = route(FakeRequest(DELETE, "/hypernode/" + createUuidString).withJsonBody(deleteReqJson)).get
      status(deleteRes) shouldBe OK

      val nodesDeleted = ((contentAsJson(deleteRes) \ "results")(0) \ "stats" \ "nodes_deleted").as[Int]
      nodesDeleted shouldBe 1
    }
  }
  */

}