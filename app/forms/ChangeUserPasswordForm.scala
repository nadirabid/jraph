package forms

import play.api.data.Form
import play.api.data.Forms._

object ChangeUserPasswordForm {

  val form = Form(
    mapping(
      "currentPassword" -> nonEmptyText,
      "newPassword" -> nonEmptyText,
      "passwordConfirmation" -> nonEmptyText
    )(Data.apply)(Data.unapply)
  )
  case class Data(currentPassword: String,
                  newPassword: String,
                  passwordConfirmation: String)
}
