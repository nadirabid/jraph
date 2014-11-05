import org.scalatestplus.play._

class ExampleSpec
  extends PlaySpec
  with OneServerPerSuite
  with OneBrowserPerSuite
  with HtmlUnitFactory {

  "The OneBrowserPerTest trait" must {
    "provide a web driver" in {
      go to s"http://localhost:$port/"
      pageTitle mustBe "Data Visualization"
      eventually { pageTitle mustBe "Data Visualization" }
    }
  }

}