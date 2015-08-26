package models

import java.util.UUID

import org.joda.time.DateTime
import play.api.libs.functional.syntax._
import play.api.libs.json.Reads._
import play.api.libs.json._

case class Hypergraph(
  id: UUID,
  updatedAt: DateTime,
  createdAt: DateTime,
  data: Option[JsObject]
)

object Hypergraph {
  implicit val hypergraphReads: Reads[Hypergraph] = (
    (JsPath \ "id").read[UUID] and
    (JsPath \ "createdAt").read[DateTime] and
    (JsPath \ "updatedAt").read[DateTime] and
    (JsPath \ "data").read[String].map(Json.parse(_).asOpt[JsObject])
  )(Hypergraph.apply _)

  implicit val hypergraphWrites = new Writes[Hypergraph] {
    def writes(hypergraph: Hypergraph) = Json.obj(
      "id" -> hypergraph.id,
      "updatedAt" -> hypergraph.updatedAt,
      "createdAt" -> hypergraph.createdAt,
      "data" -> hypergraph.data
    )
  }
}