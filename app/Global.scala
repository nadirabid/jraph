
import com.mohiva.play.silhouette.api.{Logger, SecuredSettings}

import play.api.libs.ws.{WSRequestHolder, WSAuthScheme, WS}
import play.api.GlobalSettings
import play.api.i18n.{Lang, Messages}
import play.api.mvc.Results._
import play.api.mvc.{RequestHeader, Result}
import play.api.Play.current
import play.api.Application

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

object Global extends GlobalSettings with SecuredSettings with Logger {

  override def onStart(app: Application) = {
    val dbDataUrl = current.configuration.getString("neo4j.host") match {
      case Some(host) => host + "/db/data"
      case None => throw new AppConfigurationException("neo4j.host is undefined")
    }

    val dbUsername = current.configuration.getString("neo4j.username") match {
      case Some(username) => username
      case None => throw new AppConfigurationException("neo4j.username is undefined")
    }

    val dbPassword = current.configuration.getString("neo4j.password") match {
      case Some(password) => password
      case None => throw new AppConfigurationException("neo4j.password is undefined")
    }

    val neo4jVersion = current.configuration.getString("neo4j.version") match {
      case Some(version) => version
      case None => throw new AppConfigurationException("neo4j.version is undefined")
    }

    val holder:WSRequestHolder = WS
      .url(dbDataUrl)
      .withAuth(dbUsername, dbPassword, WSAuthScheme.BASIC)
      .withHeaders(
        "Content-Type" -> "application/json",
        "Accept" -> "application/json; charset=UTF-8"
      )

    holder.get().map {
      neo4jRes => (neo4jRes.json \ "neo4j_version").asOpt[String] match {
        case Some(version) if version != neo4jVersion =>
          throw new AppConfigurationException(
            "Unexpected version of Neo4j: " + version + ". Expected: " + neo4jVersion
          )
        case None =>
          throw new AppConfigurationException("Couldn't verify the connection with Neo4j")
      }
    }.recover {
      case e =>
        throw new AppConfigurationException(
          "Couldn't establish a connection with Neo4j. " +
          "You either messed up the configuration or forgot to start Neo4j" +
          e.getMessage
        )
    }
  }

  /**
   * Called when a user is not authenticated.
   */
  override def onNotAuthenticated(request: RequestHeader,
                                  lang: Lang): Option[Future[Result]] = {

    import play.api.i18n.Messages.Implicits._
    Some(Future.successful(
      Redirect(controllers.routes.ApplicationController.devAccess())
    ))
  }

  /**
   * Called when a user is authenticated but not authorized.
   *
   * As defined by RFC 2616, the status code of the response should be 403 Forbidden.
   *
   */
  override def onNotAuthorized(request: RequestHeader,
                               lang: Lang): Option[Future[Result]] = {

    import play.api.i18n.Messages.Implicits._
    Some(Future.successful(
      Redirect(controllers.routes.ApplicationController.signIn())
        .flashing("error" -> Messages("access.denied"))
    ))
  }
}