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
  "User#create" should {
    "create a new user given new unique email" in new WithApplication {
      val reqJson = Json.obj("email" -> "test@email.com")
      val result = route(FakeRequest(POST, "/user").withJsonBody(reqJson)).get

      status(result) must equalTo(OK)

      val email = ((((contentAsJson(result) \ "results")(0) \ "data")(0) \ "row")(0) \ "email").as[String]
      email must equalTo("test@email.com")
    }
  }
}