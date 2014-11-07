import org.specs2.mutable._
import org.specs2.runner._
import org.junit.runner._
import play.api.libs.json._

import play.api.test._
import play.api.test.Helpers._

/**
 * Add your spec here.
 * You can mock out a whole application including requests, plugins etc.
 * For more information, consult the wiki.
 */
@RunWith(classOf[JUnitRunner])
class UserSpec extends Specification {

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

  sequential

  "User" should {
    "create a new User given new unique email in POST request" in new WithApplication {
      val reqJson = Json.obj("email" -> "test@email.com")
      val result = route(FakeRequest(POST, "/user").withJsonBody(reqJson)).get

      status(result) must equalTo(OK)

      val email = ((((contentAsJson(result) \ "results")(0) \ "data")(0) \ "row")(0) \ "email").as[String]
      email must equalTo("test@email.com")
    }

    "find User by email given a User with that email already exists" in new WithApplication {
      val result = route(FakeRequest(GET, "/user/test@email.com" )).get

      status(result) must equalTo(OK)

      val email = ((((contentAsJson(result) \ "results")(0) \ "data")(0) \ "row")(0) \ "email").as[String]
      email must equalTo("test@email.com")
    }

    "delete a User of the specified email given the User already exists" in new WithApplication {
      val result = route(FakeRequest(DELETE, "/user/test@email.com")).get

      status(result) must equalTo(OK)

      contentAsJson(result) \ "email" must equalTo("something wrong")
      //TODO check return stats to see delete nodes count
    }
  }

}