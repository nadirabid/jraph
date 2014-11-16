name := """analyte"""

version := "1.0-SNAPSHOT"

lazy val root = (project in file(".")).enablePlugins(PlayScala)

scalaVersion := "2.11.1"

resolvers += "Sonatype Snapshots" at "https://oss.sonatype.org/content/repositories/snapshots/"

libraryDependencies ++= Seq(
  cache,
  ws,
  "org.scalatestplus" %% "play" % "1.2.0" % "test",
  "com.mohiva" %% "play-silhouette" % "2.0-SNAPSHOT",
  "net.codingwell" %% "scala-guice" % "4.0.0-beta4"
)

//MochaKeys.requires ++= Seq("./Setup.js")