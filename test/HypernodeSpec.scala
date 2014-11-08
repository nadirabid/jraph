import java.util.UUID

import org.specs2.mutable._
import org.specs2.runner._
import org.junit.runner._
import play.api.libs.json._

import play.api.test._
import play.api.test.Helpers._

@RunWith(classOf[JUnitRunner])
class HypernodeSpec extends Specification {

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

  "Hypernode" should {
    "create new node given JSON data and user email" in new WithApplication {
      //create user
      val email = UUID.randomUUID().toString + "@email.com"
      val reqJson = Json.obj("email" -> email)
      route(FakeRequest(POST, "/user").withJsonBody(reqJson)).get
    }
  }

}