package forms

import play.api.data.Form
import play.api.data.Forms._

object ChangeUserPasswordForm {

  val form = Form(
    mapping(
      "oldPassword" -> nonEmptyText,
      "newPassword" -> nonEmptyText,
      "confirmPassword" -> nonEmptyText
    )(Data.apply)(Data.unapply)
  )
  case class Data(oldPassword: String,
                  newPassword: String,
                  confirmPassword: String)
}
