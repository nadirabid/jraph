import java.util.UUID

import org.scalatest._
import org.scalatestplus.play._
import play.api.test._
import play.api.test.Helpers._
import play.api.libs.json._

class UserControllerSpec extends WordSpec
  with ShouldMatchers
  with OneAppPerTest {

  /**
   * Example JSON result of Transactional Cypher HTTP endpoint
   * ie. /db/data/transaction/commit
   *
   * {
   *   results : [{
   *     columns: [ 'id(n)' ],
   *     data: [{
   *       row: [ 15 ]
   *     }]
   *   }],
   *   errors: [ ]
   * }
   */

  val userEmail = UUID.randomUUID().toString + "@email.com"

  "The UserController" should {
    "create be able to Create, Find and Delete a new User with a provided email" in {
      var email: String = null

      // create
      val reqJson = Json.obj("email" -> userEmail)
      val createResult = route(FakeRequest(POST, "/user").withJsonBody(reqJson)).get

      status(createResult) shouldBe OK

      email = ((((contentAsJson(createResult) \ "results")(0) \ "data")(0) \ "row")(0) \ "email").as[String]
      email shouldBe userEmail

      // find
      val findResult = route(FakeRequest(GET, "/user/" + userEmail )).get

      status(findResult) shouldBe OK

      email = ((((contentAsJson(findResult) \ "results")(0) \ "data")(0) \ "row")(0) \ "email").as[String]
      email shouldBe userEmail

      // delete
      val deleteResult = route(FakeRequest(DELETE, "/user/" + userEmail)).get

      status(deleteResult) shouldBe OK

      val nodesDeleted = ((contentAsJson(deleteResult) \ "results")(0) \ "stats" \ "nodes_deleted").as[Int]
      nodesDeleted shouldBe 1
    }
  }

}