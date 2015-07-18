package forms

import play.api.data.Form
import play.api.data.Forms._

object CreateAccountForm {

  val form = Form(
    mapping(
      "fullName" -> optional(text),
      "email" -> email,
      "passphrase" -> nonEmptyText
    )(Data.apply)(Data.unapply)
  )

  case class Data(fullName: Option[String],
                  email: String,
                  passphrase: String)
}