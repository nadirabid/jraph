package forms

import play.api.data.Form
import play.api.data.Forms._

object DevAccessForm {
  case class Data(password: String)

  val form = Form(
    mapping(
      "password" -> nonEmptyText
    )(Data.apply)(Data.unapply)
  )
}
