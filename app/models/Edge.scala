package models

import java.util.UUID

import org.joda.time._
import play.api.libs.functional.syntax._
import play.api.libs.json.Reads._
import play.api.libs.json._

case class Edge(
  id: UUID,
  sourceID: UUID,
  targetID: UUID,
  updatedAt: DateTime,
  createdAt: DateTime,
  data: Option[JsObject]
)

object Edge {

  implicit val edgeReads: Reads[Edge] = (
    (JsPath \ "id").read[UUID] and
    (JsPath \ "sourceId").read[UUID] and
    (JsPath \ "targetId").read[UUID] and
    (JsPath \ "updatedAt").read[DateTime] and
    (JsPath \ "createdAt").read[DateTime] and
    (JsPath \ "data").read[String].map(Json.parse(_).asOpt[JsObject])
  )(Edge.apply _)

  implicit val edgeWrites = new Writes[Edge] {
    def writes(edge: Edge) = Json.obj(
      "id" -> edge.id,
      "sourceId" -> edge.sourceID,
      "targetId" -> edge.targetID,
      "updatedAt" -> edge.updatedAt.getMillis,
      "createdAt" -> edge.createdAt.getMillis,
      "data" -> edge.data
    )
  }
}
