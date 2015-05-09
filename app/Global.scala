import java.io.File

import com.google.inject.Guice

import com.mohiva.play.silhouette.api.{Logger, SecuredSettings}

import com.typesafe.config.ConfigFactory

import play.api.libs.ws.{WSRequestHolder, WSAuthScheme, WS}
import play.api.{Mode, Configuration, GlobalSettings}
import play.api.i18n.{Lang, Messages}
import play.api.mvc.Results._
import play.api.mvc.{RequestHeader, Result}
import play.api.Play.current
import play.api.Application

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

import core.silhouette.SilhouetteModule
import controllers.routes

object Global extends GlobalSettings with SecuredSettings with Logger {

  /**
   * The Guice dependencies injector.
   */
  val injector = Guice.createInjector(new SilhouetteModule)


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
   * Loads the controller classes with the Guice injector,
   * in order to be able to inject dependencies directly into the controller.
   */
  override def getControllerInstance[A](controllerClass: Class[A]) =
    injector.getInstance(controllerClass)

  /**
   * Override to allow loading configuration file specific to the environment/mode.
   * Allows us to have configuration settings based on the environment we're running in.
   */
  override def onLoadConfig(config: Configuration,
                            path: File, classLoader: ClassLoader,
                            mode: Mode.Mode): Configuration = {

    val modeSpecificConfig = config ++ Configuration(
      ConfigFactory.load(s"application.${mode.toString.toLowerCase}.conf")
    )

    super.onLoadConfig(modeSpecificConfig, path, classLoader, mode)
  }

  /**
   * Called when a user is not authenticated.
   */
  override def onNotAuthenticated(request: RequestHeader,
                                  lang: Lang): Option[Future[Result]] = {

    Some(Future.successful(Redirect(routes.ApplicationController.devAccess())))
  }

  /**
   * Called when a user is authenticated but not authorized.
   *
   * As defined by RFC 2616, the status code of the response should be 403 Forbidden.
   *
   */
  override def onNotAuthorized(request: RequestHeader,
                               lang: Lang): Option[Future[Result]] = {

    Some(Future.successful(
      Redirect(routes.ApplicationController.signIn())
        .flashing("error" -> Messages("access.denied"))
    ))
  }
}