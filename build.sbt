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
  "org.scalatestplus" %% "play" % "1.2.0" % "test",
  "com.mohiva" %% "play-silhouette-testkit" % "2.0-RC2" % "test"
)

TaskKey[Unit]("stop") := {
  val pidFile = target.value / "universal" / "stage" / "RUNNING_PID"
  if (!pidFile.exists) throw new Exception("App not started!")
  val pid = IO.read(pidFile)
  s"kill $pid".!
  println(s"Stopped application with process ID $pid")
}

PlayKeys.routesImport += "java.util.UUID"

//TwirlKeys.templateImports +=
//MochaKeys.requires ++= Seq("./Setup.js")