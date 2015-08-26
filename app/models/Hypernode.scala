package models

import java.util.UUID

import play.api.libs.json._

import org.joda.time.DateTime
import play.api.libs.functional.syntax._

case class HypernodeClientDisplay(x: Double, y: Double)

object HypernodeClientDisplay {
  implicit val reads = new Reads[HypernodeClientDisplay] {
    def reads(clientDisplayJson: JsValue) = JsSuccess(HypernodeClientDisplay(
      (clientDisplayJson \ "x").as[Double],
      (clientDisplayJson \ "y").as[Double]
    ))
  }

  implicit val writes = new Writes[HypernodeClientDisplay] {
    def writes(hypernodeClientDisplay: HypernodeClientDisplay) = Json.obj(
      "x" -> hypernodeClientDisplay.x,
      "y" -> hypernodeClientDisplay.y
    )
  }
}

case class HypernodeDataProperty(value: String)

object HypernodeDataProperty {
  implicit val reads = new Reads[HypernodeDataProperty] {
    def reads(dataPropertyJson: JsValue) = JsSuccess(HypernodeDataProperty(
      (dataPropertyJson \ "value").as[String]
    ))
  }

  implicit val writes = new Writes[HypernodeDataProperty] {
    def writes(dataProperty: HypernodeDataProperty) = Json.obj(
      "value" -> dataProperty.value
    )
  }
}

case class HypernodeDataProperties(
                                    tags: Seq[HypernodeDataProperty],
                                    links: Seq[HypernodeDataProperty],
                                    emails: Seq[HypernodeDataProperty],
                                    phoneNumbers: Seq[HypernodeDataProperty]
                                    )

object HypernodeDataProperties {
  implicit val reads = new Reads[HypernodeDataProperties] {
    def reads(dataPropertiesJson: JsValue) = JsSuccess(HypernodeDataProperties(
      (dataPropertiesJson \ "tags").as[Seq[HypernodeDataProperty]],
      (dataPropertiesJson \ "links").as[Seq[HypernodeDataProperty]],
      (dataPropertiesJson \ "emails").as[Seq[HypernodeDataProperty]],
      (dataPropertiesJson \ "phoneNumbers").as[Seq[HypernodeDataProperty]]
    ))
  }

  implicit val writes = new Writes[HypernodeDataProperties] {
    def writes(dataProperties: HypernodeDataProperties) = Json.obj(
      "tags" -> dataProperties.tags,
      "links" -> dataProperties.links,
      "emails" -> dataProperties.emails,
      "phoneNumbers" -> dataProperties.phoneNumbers
    )
  }
}

case class HypernodeData(
                          name: String,
                          clientDisplay: HypernodeClientDisplay,
                          properties: Option[HypernodeDataProperties]
                          )

object HypernodeData {
  implicit val reads = new Reads[HypernodeData] {
    def reads(data: JsValue) = JsSuccess(HypernodeData(
      (data \ "name").as[String],
      (data \ "clientDisplay").as[HypernodeClientDisplay],
      (data \ "properties").asOpt[HypernodeDataProperties]
    ))
  }

  implicit val writes = new Writes[HypernodeData] {
    def writes(hypernodeData: HypernodeData) = Json.obj(
      "name" -> hypernodeData.name,
      "clientDisplay" -> hypernodeData.clientDisplay,
      "properties" -> hypernodeData.properties
    )
  }
}

case class Hypernode(
                      id: UUID,
                      updatedAt: DateTime,
                      createdAt: DateTime,
                      data: HypernodeData
                      )

object Hypernode {
  implicit val reads = new Reads[Hypernode] {
    def reads(hypernodeJson: JsValue) = JsSuccess(Hypernode(
      (hypernodeJson \ "id").as[UUID],
      (hypernodeJson \ "updatedAt").as[DateTime],
      (hypernodeJson \ "createdAt").as[DateTime],
      (hypernodeJson \ "data").as[HypernodeData]
    ))
  }

  implicit val writes = new Writes[Hypernode] {
    def writes(hypernode: Hypernode) = Json.obj(
      "id" -> hypernode.id,
      "createdAt" -> hypernode.createdAt.getMillis,
      "updatedAt" -> hypernode.updatedAt.getMillis,
      "data" -> hypernode.data
    )
  }
}