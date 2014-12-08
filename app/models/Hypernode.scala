package models

import java.util.UUID

import play.api.Play.current
import play.api.libs.json.Reads._
import play.api.libs.json._
import play.api.libs.ws.WS
import play.api.libs.functional.syntax._

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

import org.joda.time._

case class Hypernode(
  hypernodeID: UUID,
  updatedAt: DateTime,
  createdAt: DateTime,
  data: String
)

object Hypernode {

  def create(hypergraphID: UUID, hypernode: Hypernode): Future[Option[Hypernode]] =
    Future.successful(None)

  def read(hypergraphID: UUID, hypernodeID: UUID): Future[Option[Hypernode]] =
    Future.successful(None)

  def readAll(hypergraphID: UUID, hypernodeID: UUID): Future[Option[Seq[Hypernode]]] =
    Future.successful(None)

  def update(hypergraphID: UUID, hypernode: Hypernode): Future[Option[Hypernode]] =
    Future.successful(None)
  
  def batchUpdate(hypergraphID: UUID, hypernodes: Seq[Hypernode]): Future[Option[Seq[Hypernode]]] =
    Future.successful(None)

  def delete(hypergraphID: UUID, hypernodeID: UUID): Future[Option[Boolean]] =
    Future.successful(None)

}