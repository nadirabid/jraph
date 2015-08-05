name := """jraph"""

version := "1.0-SNAPSHOT"

lazy val root = (project in file(".")).enablePlugins(PlayScala)

scalaVersion := "2.11.7"

resolvers := ("Atlassian Releases" at "https://maven.atlassian.com/public/") +: resolvers.value

resolvers += "scalaz-bintray" at "https://dl.bintray.com/scalaz/releases"

resolvers += Resolver.sonatypeRepo("snapshots")

libraryDependencies ++= Seq(
  cache,
  ws,
  filters,

  "com.typesafe.play" %% "play-mailer" % "3.0.1",
  "com.mohiva" %% "play-silhouette" % "3.0.0",
  "net.codingwell" %% "scala-guice" % "4.0.0",
  "net.ceedubs" %% "ficus" % "1.1.2",
  "org.scalatestplus" %% "play" % "1.2.0" % "test",
  "com.mohiva" %% "play-silhouette-testkit" % "3.0.0" % "test"
)

play.sbt.routes.RoutesKeys.routesImport += "java.util.UUID"

routesGenerator := InjectedRoutesGenerator