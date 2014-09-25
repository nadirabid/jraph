
package views.html

import play.twirl.api._
import play.twirl.api.TemplateMagic._

import play.api.templates.PlayMagic._
import models._
import controllers._
import play.api.i18n._
import play.api.mvc._
import play.api.data._
import views.html._

/**/
object main extends BaseScalaTemplate[play.twirl.api.HtmlFormat.Appendable,Format[play.twirl.api.HtmlFormat.Appendable]](play.twirl.api.HtmlFormat) with play.twirl.api.Template2[String,Html,play.twirl.api.HtmlFormat.Appendable] {

  /**/
  def apply/*1.2*/(title: String)(content: Html):play.twirl.api.HtmlFormat.Appendable = {
      _display_ {

Seq[Any](format.raw/*1.32*/("""

"""),format.raw/*3.1*/("""<!DOCTYPE html>

<html lang="en">
    <head>
        <title>"""),_display_(/*7.17*/title),format.raw/*7.22*/("""</title>

            <!-- Viewport mobile tag for sensible mobile support -->
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">

        <link rel="stylesheet" href=""""),_display_(/*12.39*/routes/*12.45*/.Assets.at("style/dependencies/bootstrap.css")),format.raw/*12.91*/("""">
        <link rel="stylesheet" href=""""),_display_(/*13.39*/routes/*13.45*/.Assets.at("style/site.css")),format.raw/*13.73*/("""">
    </head>

    <body>
        """),_display_(/*17.10*/content),format.raw/*17.17*/("""

        """),format.raw/*19.9*/("""<script src=""""),_display_(/*19.23*/routes/*19.29*/.Assets.at("js/dependencies/jquery-2.1.1.js")),format.raw/*19.74*/(""""></script>
        <script src=""""),_display_(/*20.23*/routes/*20.29*/.Assets.at("js/dependencies/snap.svg.js")),format.raw/*20.70*/(""""></script>
        <script src=""""),_display_(/*21.23*/routes/*21.29*/.Assets.at("js/dependencies/d3.js")),format.raw/*21.64*/(""""></script>
        <script src=""""),_display_(/*22.23*/routes/*22.29*/.Assets.at("js/dependencies/lodash.js")),format.raw/*22.68*/(""""></script>
        <script src=""""),_display_(/*23.23*/routes/*23.29*/.Assets.at("js/dependencies/vue.js")),format.raw/*23.65*/(""""></script>
        <script src=""""),_display_(/*24.23*/routes/*24.29*/.Assets.at("js/dependencies/mousetrap.js")),format.raw/*24.71*/(""""></script>
        <script src=""""),_display_(/*25.23*/routes/*25.29*/.Assets.at("js/globals.js")),format.raw/*25.56*/(""""></script>
        <script src=""""),_display_(/*26.23*/routes/*26.29*/.Assets.at("js/util.js")),format.raw/*26.53*/(""""></script>
        <script src=""""),_display_(/*27.23*/routes/*27.29*/.Assets.at("js/directives.js")),format.raw/*27.59*/(""""></script>
        <script src=""""),_display_(/*28.23*/routes/*28.29*/.Assets.at("js/components.js")),format.raw/*28.59*/(""""></script>
        <script src=""""),_display_(/*29.23*/routes/*29.29*/.Assets.at("js/hypergraph.js")),format.raw/*29.59*/(""""></script>
    </body>
</html>
"""))}
  }

  def render(title:String,content:Html): play.twirl.api.HtmlFormat.Appendable = apply(title)(content)

  def f:((String) => (Html) => play.twirl.api.HtmlFormat.Appendable) = (title) => (content) => apply(title)(content)

  def ref: this.type = this

}
              /*
                  -- GENERATED --
                  DATE: Thu Sep 25 03:46:42 PDT 2014
                  SOURCE: /Users/nadirmuzaffar/projects/graphapp2/app/views/main.scala.html
                  HASH: 769cabbb230a8faf5b6a443af9cb225ffa4b0b5f
                  MATRIX: 509->1|627->31|655->33|742->94|767->99|1006->311|1021->317|1088->363|1156->404|1171->410|1220->438|1283->474|1311->481|1348->491|1389->505|1404->511|1470->556|1531->590|1546->596|1608->637|1669->671|1684->677|1740->712|1801->746|1816->752|1876->791|1937->825|1952->831|2009->867|2070->901|2085->907|2148->949|2209->983|2224->989|2272->1016|2333->1050|2348->1056|2393->1080|2454->1114|2469->1120|2520->1150|2581->1184|2596->1190|2647->1220|2708->1254|2723->1260|2774->1290
                  LINES: 19->1|22->1|24->3|28->7|28->7|33->12|33->12|33->12|34->13|34->13|34->13|38->17|38->17|40->19|40->19|40->19|40->19|41->20|41->20|41->20|42->21|42->21|42->21|43->22|43->22|43->22|44->23|44->23|44->23|45->24|45->24|45->24|46->25|46->25|46->25|47->26|47->26|47->26|48->27|48->27|48->27|49->28|49->28|49->28|50->29|50->29|50->29
                  -- GENERATED --
              */
          