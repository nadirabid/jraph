package core.modules

import com.google.inject.{Provides, AbstractModule}
import core.cypher.{Neo4jConnectionSettings, Neo4jConnection}
import models.daos.HypernodeDAO
import net.codingwell.scalaguice.ScalaModule

import play.api.Configuration
import play.api.libs.ws.WSClient

import net.ceedubs.ficus.Ficus._
import net.ceedubs.ficus.readers.ArbitraryTypeReader._

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
