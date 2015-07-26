import java.io.File

import com.typesafe.config.ConfigFactory

import play.api.{Mode, Configuration, GlobalSettings}

object Global extends GlobalSettings  {

  /**
   * Override to allow loading configuration file specific to the environment/mode.
   * Allows us to have configuration settings based on the environment we're running in.
   */
  /*
  override def onLoadConfig(config: Configuration,
                            path: File, classLoader: ClassLoader,
                            mode: Mode.Mode): Configuration = {

    val modeSpecificConfig = config ++ Configuration(
      ConfigFactory.load(s"application.${mode.toString.toLowerCase}.conf")
    )

    super.onLoadConfig(modeSpecificConfig, path, classLoader, mode)
  }
*/
}