name := """analyte"""

version := "1.0-SNAPSHOT"

lazy val root = (project in file(".")).enablePlugins(PlayScala)

scalaVersion := "2.11.1"

libraryDependencies ++= Seq(
  cache,
  ws,
  "org.scalatestplus" %% "play" % "1.2.0" % "test"
)

MochaKeys.requires ++= Seq("./Setup.js")