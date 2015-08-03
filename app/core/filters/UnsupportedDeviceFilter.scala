package core.filters

import play.api.mvc._
import scala.concurrent.Future

class UnsupportedDeviceFilter extends Filter with Results {

  def apply(nextFilter: RequestHeader => Future[Result])
           (requestHeader: RequestHeader): Future[Result] = {

    val Pattern = "(iPhone|webOS|iPod|Android|BlackBerry|mobile|SAMSUNG|IEMobile|OperaMobi)".r.unanchored

    val userAgent = requestHeader.headers.get("User-Agent")

    userAgent match {
      case Some(Pattern(a)) => Future.successful(Ok(views.html.unsupportedDevice()))
      case Some(b) => nextFilter(requestHeader)
      case None => nextFilter(requestHeader)
    }
  }
}