package models

import java.util.UUID

import play.api.libs.json._

import org.joda.time.DateTime
import play.api.libs.functional.syntax._

case class Hypernode(
  id: UUID,
  updatedAt: DateTime,
  createdAt: DateTime,
  data: Option[JsObject]
)

object Hypernode {
  implicit val hypernodeReads: Reads[Hypernode] = (
      (JsPath \ "id").read[UUID] and
      (JsPath \ "createdAt").read[DateTime] and
      (JsPath \ "updatedAt").read[DateTime] and
      (JsPath \ "data").read[String].map(Json.parse(_).asOpt[JsObject])
    )(Hypernode.apply _)

  implicit val hypernodeWrites = new Writes[Hypernode] {
    def writes(hypernode: Hypernode) = Json.obj(
      "id" -> hypernode.id,
      "createdAt" -> hypernode.createdAt.getMillis,
      "updatedAt" -> hypernode.updatedAt.getMillis,
      "data" -> hypernode.data
    )
  }
}