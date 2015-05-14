package core.authorization

import com.mohiva.play.silhouette.api.Authorization
import models.User
import play.api.i18n.Lang
import play.api.mvc.RequestHeader


case class WithAccess(userRole: String) extends Authorization[User] {
  // check mode to selectively disable dev access

  def isAuthorized(user: User)(implicit request: RequestHeader, lang: Lang) =
    user.role match {
      case Some(role) if role == userRole => true
      case None if userRole == "normal" => true
      case _ => false
    }
}
