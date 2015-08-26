package core.modules

import com.google.inject.{AbstractModule, Provides}
import core.cypher.{Neo4jConnection, Neo4jConnectionSettings}
import net.ceedubs.ficus.Ficus._
import net.ceedubs.ficus.readers.ArbitraryTypeReader._
import net.codingwell.scalaguice.ScalaModule
import play.api.Configuration
import play.api.libs.ws.WSClient

class CypherModule extends AbstractModule with ScalaModule {

  def configure(): Unit = {}

  @Provides
  def providesNeo4jConnection(ws: WSClient, configuration: Configuration): Neo4jConnection = {
    val config = configuration.underlying.as[Neo4jConnectionSettings]("neo4j")

    new Neo4jConnection(
      config.host,
      config.port,
      config.username,
      config.password,
      ws
    )
  }
}
