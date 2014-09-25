
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
object index extends BaseScalaTemplate[play.twirl.api.HtmlFormat.Appendable,Format[play.twirl.api.HtmlFormat.Appendable]](play.twirl.api.HtmlFormat) with play.twirl.api.Template0[play.twirl.api.HtmlFormat.Appendable] {

  /**/
  def apply():play.twirl.api.HtmlFormat.Appendable = {
      _display_ {

Seq[Any](_display_(/*1.2*/main("Data Visualization")/*1.28*/ {_display_(Seq[Any](format.raw/*1.30*/("""

    """),format.raw/*3.5*/("""<main id="application">

        <article class="info-container" v-class="disable-pointer-events:!displayNodeData && !displayNodeCreate">
            <nav class="disable-pointer-events" v-class="hidden:(displayNodeCreate || displayNodeData)">
                <span class="enable-pointer-events">
                    <button class="btn btn-default" v-on="click:displayNodeCreate=true">Create Node</button>
                    <button class="btn btn-default" v-on="click:toggleForce">Toggle Force</button>
                </span>
            </nav>
            <section class="info-overlay"></section>
            <aside class="info-panel default-pointer-events" v-component="x-node-create" v-if="displayNodeCreate" >
                <div v-if="data">
                    <ul class="list-unstyled">
                        <li v-repeat="data"><b>"""),format.raw/*16.48*/("""{"""),format.raw/*16.49*/("""{"""),format.raw/*16.50*/("""$key"""),format.raw/*16.54*/("""}"""),format.raw/*16.55*/("""}"""),format.raw/*16.56*/("""</b>:"""),format.raw/*16.61*/("""{"""),format.raw/*16.62*/("""{"""),format.raw/*16.63*/("""$value"""),format.raw/*16.69*/("""}"""),format.raw/*16.70*/("""}"""),format.raw/*16.71*/("""</li>
                    </ul>
                </div>
                <form class="form-inline">
                    <div class="form-group" v-class="has-error:keyHasError">
                        <input class="form-control" placeholder="Key" type="text" v-model="key">
                    </div>
                    <div class="form-group" v-class="has-error:valueHasError">
                        <input class="form-control" placeholder="Value" type="text" v-model="value">
                    </div>
                    <button class="btn btn-default" type="button" v-on="click:addPropertyHandler">Add</button>
                </form>
                <button class="btn btn-default" v-class="disabled:!data" v-on="click:createNodeHandler">Create</button>
            </aside>
            <aside class="info-panel" v-component="x-node-data" v-if="displayNodeData">
                <ul class="list-unstyled">
                    <li v-repeat="nodeDataList">
                        <span v-if="typeof(value)!='object' && key.charAt(0)!='_'"><b>"""),format.raw/*33.87*/("""{"""),format.raw/*33.88*/("""{"""),format.raw/*33.89*/("""key"""),format.raw/*33.92*/("""}"""),format.raw/*33.93*/("""}"""),format.raw/*33.94*/("""</b>:"""),format.raw/*33.99*/("""{"""),format.raw/*33.100*/("""{"""),format.raw/*33.101*/("""value"""),format.raw/*33.106*/("""}"""),format.raw/*33.107*/("""}"""),format.raw/*33.108*/("""</span>
                        <span v-if="typeof(value)=='object' && key.charAt(0)!='_'">
                            <b>"""),format.raw/*35.32*/("""{"""),format.raw/*35.33*/("""{"""),format.raw/*35.34*/("""key"""),format.raw/*35.37*/("""}"""),format.raw/*35.38*/("""}"""),format.raw/*35.39*/("""</b>:
                            <ul>
                                <li v-repeat="value"><b>"""),format.raw/*37.57*/("""{"""),format.raw/*37.58*/("""{"""),format.raw/*37.59*/("""$key"""),format.raw/*37.63*/("""}"""),format.raw/*37.64*/("""}"""),format.raw/*37.65*/("""</b>:"""),format.raw/*37.70*/("""{"""),format.raw/*37.71*/("""{"""),format.raw/*37.72*/("""$value"""),format.raw/*37.78*/("""}"""),format.raw/*37.79*/("""}"""),format.raw/*37.80*/("""</li>
                            </ul>
                        </span>
                    </li>
                </ul>
                <div v-if="addProperty">
                    <form class="form-inline">
                        <div class="form-group" v-class="has-error:keyHasError">
                            <input class="form-control" placeholder="Key" type="text" v-model="key">
                        </div>
                        <div class="form-group" v-class="has-error:valueHasError">
                            <input class="form-control" placeholder="Value" type="text" v-model="value">
                        </div>
                        <button class="btn btn-default" type="button" v-on="click:savePropertyHandler()">Save</button>
                    </form>
                </div>
                <button class="btn btn-default" v-class="hidden:addProperty" v-on="click:addProperty=true">Add</button>
                <button class="btn btn-default" v-class="hidden:!addProperty" v-on="click:addProperty=false">Cancel</button>
            </aside>
        </article>

        <article class="graph-container">
            <svg class="disable-user-selection" v-attr="viewBox:viewBox"
                 v-component="x-graph"
                 v-xon="x-dragstart:panStart, x-drag:pan"
                 v-ref="graph">
                <g class="link"
                   v-xon="x-mouseover:freezePosition, x-mouseout:releasePosition, x-dragstart:dragstart, x-drag:drag"
                   v-component="x-link"
                   v-repeat="links">
                    <line v-attr="x1:source.x, y1:source.y, x2:target.x, y2:target.y"></line>
                </g>
                <g class="node"
                   v-attr="transform:'translate('+x+','+y+')'"
                   v-component="x-node"
                   v-repeat="nodes">
                    <g v-xon="x-mouseover:mouseover, x-mouseout:mouseout">
                        <x-radial-menu v-if="menu">
                            <x-radial-button v-on="click:setLinkSource">link</x-radial-button>
                            <x-radial-button v-on="click:deleteNode( $event, id )">delete</x-radial-button>
                        </x-radial-menu>
                        <circle class="node-circle"
                        v-attr="r:radius"
                        v-xon="x-click:click, x-dragstart:dragstart, x-drag:drag, x-dragend:dragend">
                        </circle>
                    </g>
                    <text class="node-label"
                    text-anchor="middle"
                    v-attr="transform:'translate('+labelX+','+labelY+')'"
                    v-class="invisible:menu">
                        Label """),format.raw/*87.31*/("""{"""),format.raw/*87.32*/("""{"""),format.raw/*87.33*/("""$index"""),format.raw/*87.39*/("""}"""),format.raw/*87.40*/("""}"""),format.raw/*87.41*/("""
                    """),format.raw/*88.21*/("""</text>
                </g>
                <x-radial-menu v-attr="transform:'translate('+cmX+','+cmY+')'" v-if="displayContextMenu">
                    <x-radial-button>create node</x-radial-button>
                    <x-radial-button>calculate force</x-radial-button>
                </x-radial-menu>
            </svg>
        </article>

    </main>

    <script id="template-radial-button" type="text/x-template">
        <g class="node-menu">
            <path v-attr="d:backgroundPath"></path>
            <path class="node-menu-highlight" v-attr="d:highlightPath"></path>
            <path id=""""),format.raw/*103.23*/("""{"""),format.raw/*103.24*/("""{"""),format.raw/*103.25*/("""textPathId"""),format.raw/*103.35*/("""}"""),format.raw/*103.36*/("""}"""),format.raw/*103.37*/("""" opacity="0" fill="none" v-attr="d:textPath"></path>
            <text class="node-menu-item-label" text-anchor="middle" v-attr="x:x, dy:dy">
            <textPath xlink:href="#"""),format.raw/*105.36*/("""{"""),format.raw/*105.37*/("""{"""),format.raw/*105.38*/("""textPathId"""),format.raw/*105.48*/("""}"""),format.raw/*105.49*/("""}"""),format.raw/*105.50*/("""">
                <content></content>
            </textPath>
            </text>
        </g>
    </script>

    <script id="template-radial-menu" type="text/x-template">
        <g>
            <circle fill-opacity="0" r="80"></circle>
            <g class="content">
                <content></content>
            </g>
        </g>
    </script>
""")))}),format.raw/*120.2*/("""
"""))}
  }

  def render(): play.twirl.api.HtmlFormat.Appendable = apply()

  def f:(() => play.twirl.api.HtmlFormat.Appendable) = () => apply()

  def ref: this.type = this

}
              /*
                  -- GENERATED --
                  DATE: Thu Sep 25 03:47:53 PDT 2014
                  SOURCE: /Users/nadirmuzaffar/projects/graphapp2/app/views/index.scala.html
                  HASH: bd919ae85b32983874a14fffef02b36ac8f35453
                  MATRIX: 580->1|614->27|653->29|685->35|1557->879|1586->880|1615->881|1647->885|1676->886|1705->887|1738->892|1767->893|1796->894|1830->900|1859->901|1888->902|2964->1950|2993->1951|3022->1952|3053->1955|3082->1956|3111->1957|3144->1962|3174->1963|3204->1964|3238->1969|3268->1970|3298->1971|3449->2094|3478->2095|3507->2096|3538->2099|3567->2100|3596->2101|3719->2196|3748->2197|3777->2198|3809->2202|3838->2203|3867->2204|3900->2209|3929->2210|3958->2211|3992->2217|4021->2218|4050->2219|6794->4935|6823->4936|6852->4937|6886->4943|6915->4944|6944->4945|6993->4966|7627->5571|7657->5572|7687->5573|7726->5583|7756->5584|7786->5585|7993->5763|8023->5764|8053->5765|8092->5775|8122->5776|8152->5777|8535->6129
                  LINES: 22->1|22->1|22->1|24->3|37->16|37->16|37->16|37->16|37->16|37->16|37->16|37->16|37->16|37->16|37->16|37->16|54->33|54->33|54->33|54->33|54->33|54->33|54->33|54->33|54->33|54->33|54->33|54->33|56->35|56->35|56->35|56->35|56->35|56->35|58->37|58->37|58->37|58->37|58->37|58->37|58->37|58->37|58->37|58->37|58->37|58->37|108->87|108->87|108->87|108->87|108->87|108->87|109->88|124->103|124->103|124->103|124->103|124->103|124->103|126->105|126->105|126->105|126->105|126->105|126->105|141->120
                  -- GENERATED --
              */
          