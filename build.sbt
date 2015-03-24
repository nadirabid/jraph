name := """analyte"""

version := "1.0-SNAPSHOT"

lazy val root = (project in file(".")).enablePlugins(PlayScala)

scalaVersion := "2.11.6"

resolvers += "Sonatype Snapshots" at "https://oss.sonatype.org/content/repositories/snapshots/"

libraryDependencies ++= Seq(
  cache,
  ws,
  "com.mohiva" %% "play-silhouette" % "2.0-RC2",
  "net.codingwell" %% "scala-guice" % "4.0.0-beta5",
  "commons-codec" % "commons-codec" % "1.10",
  "org.scalatestplus" %% "play" % "1.2.0" % "test",
  "com.mohiva" %% "play-silhouette-testkit" % "2.0-RC2" % "test"
)

PlayKeys.routesImport += "java.util.UUID"

//TwirlKeys.templateImports +=
//MochaKeys.requires ++= Seq("./Setup.js")