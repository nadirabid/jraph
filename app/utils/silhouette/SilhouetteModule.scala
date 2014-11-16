package utils.silhouette

import com.google.inject.{AbstractModule, Provides}
import com.mohiva.play.silhouette.api.services._
import com.mohiva.play.silhouette.api.util._
import com.mohiva.play.silhouette.api.{Environment, EventBus}
import com.mohiva.play.silhouette.impl.authenticators._
import com.mohiva.play.silhouette.impl.daos.DelegableAuthInfoDAO
import com.mohiva.play.silhouette.impl.providers._
import com.mohiva.play.silhouette.impl.providers.credentials.hasher.BCryptPasswordHasher
import com.mohiva.play.silhouette.impl.services._
import com.mohiva.play.silhouette.impl.util._
import models.User
import models.daos._
import models.services.{UserService, UserServiceImpl}
import net.codingwell.scalaguice.ScalaModule
import play.api.Play
import play.api.Play.current

/**
 * The Guice module which wires all Silhouette dependencies.
 */
class SilhouetteModule extends AbstractModule with ScalaModule {

  /**
   * Configures the module.
   */
  def configure() {
    bind[UserService].to[UserServiceImpl]
    bind[UserDAO].to[UserDAOImpl]
    bind[DelegableAuthInfoDAO[PasswordInfo]].to[PasswordInfoDAO]
    bind[CacheLayer].to[PlayCacheLayer]
    bind[HTTPLayer].to[PlayHTTPLayer]
    bind[IDGenerator].toInstance(new SecureRandomIDGenerator())
    bind[PasswordHasher].toInstance(new BCryptPasswordHasher)
    bind[FingerprintGenerator].toInstance(new DefaultFingerprintGenerator(false))
    bind[EventBus].toInstance(EventBus())
  }

  /**
   * Provides the Silhouette environment.
   *
   * @param userService The user service implementation.
   * @param authenticatorService The authentication service implementation.
   * @param eventBus The event bus instance.
   * @return The Silhouette environment.
   */
  @Provides
  def provideEnvironment(userService: UserService,
                         authenticatorService: SessionAuthenticatorService,
                         eventBus: EventBus,
                         credentialsProvider: CredentialsProvider): Environment[User, SessionAuthenticator] = {

    Environment[User, SessionAuthenticator](
      userService,
      authenticatorService,
      Map(credentialsProvider.id -> credentialsProvider),
      eventBus
    )
  }

  /**
   * Provides the authenticator service.
   *
   * @param fingerprintGenerator The cache layer implementation.
   * @return The authenticator service.
   */
  @Provides
  def provideAuthenticatorService(fingerprintGenerator: FingerprintGenerator): SessionAuthenticatorService = {
    new SessionAuthenticatorService(
      SessionAuthenticatorSettings(
        sessionKey = Play.configuration.getString("silhouette.authenticator.sessionKey").get,
        encryptAuthenticator = Play.configuration.getBoolean("silhouette.authenticator.encryptAuthenticator").get,
        useFingerprinting = Play.configuration.getBoolean("silhouette.authenticator.useFingerprinting").get,
        authenticatorIdleTimeout = Play.configuration.getInt("silhouette.authenticator.authenticatorIdleTimeout"),
        authenticatorExpiry = Play.configuration.getInt("silhouette.authenticator.authenticatorExpiry").get
      ),
      fingerprintGenerator,
      Clock()
    )
  }

  /**
   * Provides the auth info service.
   *
   * @param passwordInfoDAO The implementation of the delegable password auth info DAO.
   * @return The auth info service instance.
   */
  @Provides
  def provideAuthInfoService(passwordInfoDAO: DelegableAuthInfoDAO[PasswordInfo]): AuthInfoService = {
    new DelegableAuthInfoService(passwordInfoDAO)
  }

  /**
   * Provides the credentials provider.
   *
   * @param authInfoService The auth info service implemenetation.
   * @param passwordHasher The default password hasher implementation.
   * @return The credentials provider.
   */
  @Provides
  def provideCredentialsProvider(authInfoService: AuthInfoService,
                                 passwordHasher: PasswordHasher): CredentialsProvider = {

    new CredentialsProvider(authInfoService, passwordHasher, Seq(passwordHasher))
  }
}