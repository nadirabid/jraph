import java.util.UUID

import org.scalatest._
import play.api.test._
import play.api.test.Helpers._
import play.api.libs.json._

class HypernodeControllerSpec extends WordSpec with Matchers {

  "Hypernode" must {
    "create new node given JSON data and user email" in new WithApplication {
      val userEmail = UUID.randomUUID().toString + "@email.com"
      val reqUserJson = Json.obj("email" -> userEmail)
      val userResult = route(FakeRequest(POST, "/user").withJsonBody(reqUserJson)).get

      status(userResult) shouldBe OK

      route(FakeRequest(DELETE, "/user/" + userEmail)).get
    }


  }

}