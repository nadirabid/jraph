package forms

import play.api.data.Form
import play.api.data.Forms._

/**
 * The form which handles the sign up process.
 */
object UserProfileForm {
  val form = Form(
    mapping(
      "firstName" -> text,
      "lastName" -> text,
      "email" -> email
    )(UserProfileData.apply)(UserProfileData.unapply)
  )

  case class UserProfileData(firstName: String,
                             lastName: String,
                             email: String) // TODO: should changing the email invalidate auth?
}