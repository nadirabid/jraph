name := "analyte"

version := "1.0"

lazy val root = (project in file(".")).enablePlugins(PlayScala)

scalaVersion := "2.11.6"

resolvers ++= Seq(
  "Sonatype Snapshots" at "https://oss.sonatype.org/content/repositories/snapshots/",
  "Atlassian Releases" at "https://maven.atlassian.com/public/"
)

libraryDependencies ++= Seq(
  "net.codingwell" %% "scala-guice" % "4.0.0-beta5",
  "org.scalatestplus" %% "play" % "1.2.0" % "test",
  "com.mohiva" %% "play-silhouette" % "3.0.0-SNAPSHOT",
  "com.mohiva" %% "play-silhouette-testkit" % "3.0.0-SNAPSHOT" % "test"
)

routesGenerator := InjectedRoutesGenerator

play.sbt.routes.RoutesKeys.routesImport += "java.util.UUID"

/*
TaskKey[Unit]("stop") := {
  val pidFile = target.value / "universal" / "stage" / "RUNNING_PID"
  if (!pidFile.exists) throw new Exception("App not started!")
  val pid = IO.read(pidFile)
  s"kill $pid".!
  println(s"Stopped application with process ID $pid")
}
*/

//TwirlKeys.templateImports +=
//MochaKeys.requires ++= Seq("./Setup.js")