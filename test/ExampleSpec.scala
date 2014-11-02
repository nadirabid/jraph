import play.api.test._
import org.scalatestplus.play._
import play.api.{Play, Application}
import play.api.mvc.{Action, Results}

class ExampleSpec extends PlaySpec with OneServerPerSuite with OneBrowserPerSuite with HtmlUnitFactory {

  "The OneBrowserPerTest trait" must {
    "provide a web driver" in {
      go to s"http://localhost:$port/"
      pageTitle mustBe "Data Visualization"
      eventually { pageTitle mustBe "Data Visualization" }
    }
  }

}