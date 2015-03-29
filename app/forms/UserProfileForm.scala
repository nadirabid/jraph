package forms

import play.api.data.Form
import play.api.data.Forms._

/**
 * The form which handles the sign up process.
 */
object UserProfileForm {
  val form = Form(
    mapping(
      "firstName" -> optional(text),
      "lastName" -> optional(text),
      "email" -> email
    )(Data.apply)(Data.unapply)
  )

  case class Data(firstName: Option[String],
                  lastName: Option[String],
                  email: String) // TODO: should changing the email invalidate auth?
}