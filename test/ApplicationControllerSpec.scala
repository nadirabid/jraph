import java.util.UUID

import com.google.inject.Guice
import com.mohiva.play.silhouette.api.LoginInfo
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import com.mohiva.play.silhouette.impl.providers.CredentialsProvider
import com.mohiva.play.silhouette.test._

import controllers.ApplicationController
import forms.ChangeUserPasswordForm

import models.User

import org.scalatest.{WordSpec, BeforeAndAfter, ShouldMatchers}
import org.scalatestplus.play._
import play.api.test._
import play.api.test.Helpers._
import core.silhouette.SilhouetteModule

// By default the tests of a given ScalaTest Suite (WordSpec, FlatSpec, etc)
// are run sequentially inferred from the order in which the tests are defined.

class ApplicationControllerSpec extends WordSpec
  with ShouldMatchers
  with BeforeAndAfter
  with OneAppPerTest {

  val userEmail = UUID.randomUUID().toString + "@test.com"
  val userPassword = "123"

  val injector = Guice.createInjector(new SilhouetteModule)

  before {
    running(FakeApplication()) {
      val userCreateRequest = FakeRequest(POST, "/account/create")
        .withFormUrlEncodedBody(Map("email" -> userEmail, "password" -> userPassword).toSeq:_*)

      val userCreateResult = route(userCreateRequest).get
      status(userCreateResult) shouldBe SEE_OTHER
    }
  }

  after {
    running(FakeApplication()) {
      val identity = User(UUID.randomUUID, userEmail, None, None, LoginInfo(CredentialsProvider.ID, userEmail))
      implicit val env = FakeEnvironment[User, SessionAuthenticator](Seq(identity.loginInfo -> identity))

      val userDeleteRequest = FakeRequest(DELETE, "/account/delete")
        .withAuthenticator(identity.loginInfo)

      val userDeleteResult = route(userDeleteRequest).get
      status(userDeleteResult) shouldBe OK
    }
  }

  "The `handleUserPasswordUpdate` method" should {
    "update the user password" in {
      val identity = User(UUID.randomUUID, userEmail, None, None, LoginInfo(CredentialsProvider.ID, userEmail))
      implicit val env = FakeEnvironment[User, SessionAuthenticator](Seq(identity.loginInfo -> identity))

      val newPassword = "1234"
      val formData = ChangeUserPasswordForm.Data(userPassword, newPassword, newPassword)
      val form = ChangeUserPasswordForm.form.fill(formData)

      val request = FakeRequest()
        .withAuthenticator(identity.loginInfo)
        .withFormUrlEncodedBody(form.data.toSeq:_*)

      val controller = injector.getInstance(classOf[ApplicationController])

      val result = controller.handleUserPasswordUpdate(request)
      status(result) shouldBe SEE_OTHER
    }
  }

}