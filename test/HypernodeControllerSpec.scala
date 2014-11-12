import java.util.UUID

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
      val reqUserJson = Json.obj("email" -> userEmail)
      val userCreateResult = route(FakeRequest(POST, "/user").withJsonBody(reqUserJson)).get
      status(userCreateResult) shouldBe OK
    }
  }

  after {
    running(FakeApplication()) {
      val userDeleteResult = route(FakeRequest(DELETE, "/user/" + userEmail)).get
      status(userDeleteResult) shouldBe OK
    }
  }

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

}