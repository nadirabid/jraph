package core.filters

import play.api.mvc._

import scala.concurrent.Future

class UnsupportedBrowserFilter extends Filter with Results {

  def apply(nextFilter: RequestHeader => Future[Result])
           (requestHeader: RequestHeader): Future[Result] = {

    val UnsupportedBrowsersPattern = "(MSIE\\s\\d+\\.)".r.unanchored

    val userAgent = requestHeader.headers.get("User-Agent")

    userAgent match {
      case Some(UnsupportedBrowsersPattern(a)) => Future.successful(Ok(views.html.unsupportedBrowser()))
      case Some(b) => nextFilter(requestHeader)
      case None => nextFilter(requestHeader)
    }
  }
}