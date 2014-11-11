import java.util.UUID

import org.scalatest._
import play.api.test._
import play.api.test.Helpers._
import play.api.libs.json._

class UserControllerSpec extends WordSpec with Matchers {

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

  "User Controller" should {
    "create a new User given new unique email in POST request" in new WithApplication {
      val reqJson = Json.obj("email" -> userEmail)
      val result = route(FakeRequest(POST, "/user").withJsonBody(reqJson)).get

      status(result) shouldBe OK

      val email = ((((contentAsJson(result) \ "results")(0) \ "data")(0) \ "row")(0) \ "email").as[String]
      email shouldBe userEmail
    }

    "find User by email given a User with that email already exists" in new WithApplication {
      val result = route(FakeRequest(GET, "/user/" + userEmail )).get

      status(result) shouldBe OK

      val email = ((((contentAsJson(result) \ "results")(0) \ "data")(0) \ "row")(0) \ "email").as[String]
      email shouldBe userEmail
    }

    "delete a User of the specified email given the User already exists" in new WithApplication {
      val result = route(FakeRequest(DELETE, "/user/" + userEmail)).get

      status(result) shouldBe OK

      val nodesDeleted = ((contentAsJson(result) \ "results")(0) \ "stats" \ "nodes_deleted").as[Int]
      nodesDeleted shouldBe 1
    }
  }

}