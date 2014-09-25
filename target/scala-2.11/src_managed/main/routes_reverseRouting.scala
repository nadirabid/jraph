// @SOURCE:/Users/nadirmuzaffar/projects/graphapp2/conf/routes
// @HASH:752165c4d319f84ada035cf04e1346249f3a64ef
// @DATE:Wed Sep 24 22:21:30 PDT 2014

import Routes.{prefix => _prefix, defaultPrefix => _defaultPrefix}
import play.core._
import play.core.Router._
import play.core.Router.HandlerInvokerFactory._
import play.core.j._

import play.api.mvc._
import _root_.controllers.Assets.Asset

import Router.queryString


// @LINE:23
// @LINE:20
// @LINE:19
// @LINE:18
// @LINE:17
// @LINE:16
// @LINE:14
// @LINE:13
// @LINE:12
// @LINE:11
// @LINE:10
// @LINE:9
// @LINE:6
package controllers {

// @LINE:20
// @LINE:19
// @LINE:18
// @LINE:17
// @LINE:16
class ReverseHyperlink {


// @LINE:17
def read(uuid:java.util.UUID): Call = {
   import ReverseRouteContext.empty
   Call("GET", _prefix + { _defaultPrefix } + "hyperlink/" + implicitly[PathBindable[java.util.UUID]].unbind("uuid", uuid))
}
                        

// @LINE:16
def create(): Call = {
   import ReverseRouteContext.empty
   Call("POST", _prefix + { _defaultPrefix } + "hyperlink")
}
                        

// @LINE:19
def update(uuid:java.util.UUID): Call = {
   import ReverseRouteContext.empty
   Call("PUT", _prefix + { _defaultPrefix } + "hyperlink/" + implicitly[PathBindable[java.util.UUID]].unbind("uuid", uuid))
}
                        

// @LINE:20
def delete(uuid:java.util.UUID): Call = {
   import ReverseRouteContext.empty
   Call("DELETE", _prefix + { _defaultPrefix } + "hyperlink/" + implicitly[PathBindable[java.util.UUID]].unbind("uuid", uuid))
}
                        

// @LINE:18
def all(): Call = {
   import ReverseRouteContext.empty
   Call("GET", _prefix + { _defaultPrefix } + "hyperlink")
}
                        

}
                          

// @LINE:23
class ReverseAssets {


// @LINE:23
def at(file:String): Call = {
   implicit val _rrc = new ReverseRouteContext(Map(("path", "/public")))
   Call("GET", _prefix + { _defaultPrefix } + "assets/" + implicitly[PathBindable[String]].unbind("file", file))
}
                        

}
                          

// @LINE:14
// @LINE:13
// @LINE:12
// @LINE:11
// @LINE:10
// @LINE:9
class ReverseHypernode {


// @LINE:10
def read(uuid:java.util.UUID): Call = {
   import ReverseRouteContext.empty
   Call("GET", _prefix + { _defaultPrefix } + "hypernode/" + implicitly[PathBindable[java.util.UUID]].unbind("uuid", uuid))
}
                        

// @LINE:9
def create(): Call = {
   import ReverseRouteContext.empty
   Call("POST", _prefix + { _defaultPrefix } + "hypernode")
}
                        

// @LINE:12
def update(uuid:java.util.UUID): Call = {
   import ReverseRouteContext.empty
   Call("PUT", _prefix + { _defaultPrefix } + "hypernode/" + implicitly[PathBindable[java.util.UUID]].unbind("uuid", uuid))
}
                        

// @LINE:14
def delete(uuid:java.util.UUID): Call = {
   import ReverseRouteContext.empty
   Call("DELETE", _prefix + { _defaultPrefix } + "hypernode/" + implicitly[PathBindable[java.util.UUID]].unbind("uuid", uuid))
}
                        

// @LINE:13
def batchUpdate(): Call = {
   import ReverseRouteContext.empty
   Call("PUT", _prefix + { _defaultPrefix } + "hypernode")
}
                        

// @LINE:11
def all(): Call = {
   import ReverseRouteContext.empty
   Call("GET", _prefix + { _defaultPrefix } + "hypernode")
}
                        

}
                          

// @LINE:6
class ReverseApplication {


// @LINE:6
def index(): Call = {
   import ReverseRouteContext.empty
   Call("GET", _prefix)
}
                        

}
                          
}
                  


// @LINE:23
// @LINE:20
// @LINE:19
// @LINE:18
// @LINE:17
// @LINE:16
// @LINE:14
// @LINE:13
// @LINE:12
// @LINE:11
// @LINE:10
// @LINE:9
// @LINE:6
package controllers.javascript {
import ReverseRouteContext.empty

// @LINE:20
// @LINE:19
// @LINE:18
// @LINE:17
// @LINE:16
class ReverseHyperlink {


// @LINE:17
def read : JavascriptReverseRoute = JavascriptReverseRoute(
   "controllers.Hyperlink.read",
   """
      function(uuid) {
      return _wA({method:"GET", url:"""" + _prefix + { _defaultPrefix } + """" + "hyperlink/" + (""" + implicitly[PathBindable[java.util.UUID]].javascriptUnbind + """)("uuid", uuid)})
      }
   """
)
                        

// @LINE:16
def create : JavascriptReverseRoute = JavascriptReverseRoute(
   "controllers.Hyperlink.create",
   """
      function() {
      return _wA({method:"POST", url:"""" + _prefix + { _defaultPrefix } + """" + "hyperlink"})
      }
   """
)
                        

// @LINE:19
def update : JavascriptReverseRoute = JavascriptReverseRoute(
   "controllers.Hyperlink.update",
   """
      function(uuid) {
      return _wA({method:"PUT", url:"""" + _prefix + { _defaultPrefix } + """" + "hyperlink/" + (""" + implicitly[PathBindable[java.util.UUID]].javascriptUnbind + """)("uuid", uuid)})
      }
   """
)
                        

// @LINE:20
def delete : JavascriptReverseRoute = JavascriptReverseRoute(
   "controllers.Hyperlink.delete",
   """
      function(uuid) {
      return _wA({method:"DELETE", url:"""" + _prefix + { _defaultPrefix } + """" + "hyperlink/" + (""" + implicitly[PathBindable[java.util.UUID]].javascriptUnbind + """)("uuid", uuid)})
      }
   """
)
                        

// @LINE:18
def all : JavascriptReverseRoute = JavascriptReverseRoute(
   "controllers.Hyperlink.all",
   """
      function() {
      return _wA({method:"GET", url:"""" + _prefix + { _defaultPrefix } + """" + "hyperlink"})
      }
   """
)
                        

}
              

// @LINE:23
class ReverseAssets {


// @LINE:23
def at : JavascriptReverseRoute = JavascriptReverseRoute(
   "controllers.Assets.at",
   """
      function(file) {
      return _wA({method:"GET", url:"""" + _prefix + { _defaultPrefix } + """" + "assets/" + (""" + implicitly[PathBindable[String]].javascriptUnbind + """)("file", file)})
      }
   """
)
                        

}
              

// @LINE:14
// @LINE:13
// @LINE:12
// @LINE:11
// @LINE:10
// @LINE:9
class ReverseHypernode {


// @LINE:10
def read : JavascriptReverseRoute = JavascriptReverseRoute(
   "controllers.Hypernode.read",
   """
      function(uuid) {
      return _wA({method:"GET", url:"""" + _prefix + { _defaultPrefix } + """" + "hypernode/" + (""" + implicitly[PathBindable[java.util.UUID]].javascriptUnbind + """)("uuid", uuid)})
      }
   """
)
                        

// @LINE:9
def create : JavascriptReverseRoute = JavascriptReverseRoute(
   "controllers.Hypernode.create",
   """
      function() {
      return _wA({method:"POST", url:"""" + _prefix + { _defaultPrefix } + """" + "hypernode"})
      }
   """
)
                        

// @LINE:12
def update : JavascriptReverseRoute = JavascriptReverseRoute(
   "controllers.Hypernode.update",
   """
      function(uuid) {
      return _wA({method:"PUT", url:"""" + _prefix + { _defaultPrefix } + """" + "hypernode/" + (""" + implicitly[PathBindable[java.util.UUID]].javascriptUnbind + """)("uuid", uuid)})
      }
   """
)
                        

// @LINE:14
def delete : JavascriptReverseRoute = JavascriptReverseRoute(
   "controllers.Hypernode.delete",
   """
      function(uuid) {
      return _wA({method:"DELETE", url:"""" + _prefix + { _defaultPrefix } + """" + "hypernode/" + (""" + implicitly[PathBindable[java.util.UUID]].javascriptUnbind + """)("uuid", uuid)})
      }
   """
)
                        

// @LINE:13
def batchUpdate : JavascriptReverseRoute = JavascriptReverseRoute(
   "controllers.Hypernode.batchUpdate",
   """
      function() {
      return _wA({method:"PUT", url:"""" + _prefix + { _defaultPrefix } + """" + "hypernode"})
      }
   """
)
                        

// @LINE:11
def all : JavascriptReverseRoute = JavascriptReverseRoute(
   "controllers.Hypernode.all",
   """
      function() {
      return _wA({method:"GET", url:"""" + _prefix + { _defaultPrefix } + """" + "hypernode"})
      }
   """
)
                        

}
              

// @LINE:6
class ReverseApplication {


// @LINE:6
def index : JavascriptReverseRoute = JavascriptReverseRoute(
   "controllers.Application.index",
   """
      function() {
      return _wA({method:"GET", url:"""" + _prefix + """"})
      }
   """
)
                        

}
              
}
        


// @LINE:23
// @LINE:20
// @LINE:19
// @LINE:18
// @LINE:17
// @LINE:16
// @LINE:14
// @LINE:13
// @LINE:12
// @LINE:11
// @LINE:10
// @LINE:9
// @LINE:6
package controllers.ref {


// @LINE:20
// @LINE:19
// @LINE:18
// @LINE:17
// @LINE:16
class ReverseHyperlink {


// @LINE:17
def read(uuid:java.util.UUID): play.api.mvc.HandlerRef[_] = new play.api.mvc.HandlerRef(
   controllers.Hyperlink.read(uuid), HandlerDef(this.getClass.getClassLoader, "", "controllers.Hyperlink", "read", Seq(classOf[java.util.UUID]), "GET", """""", _prefix + """hyperlink/$uuid<[^/]+>""")
)
                      

// @LINE:16
def create(): play.api.mvc.HandlerRef[_] = new play.api.mvc.HandlerRef(
   controllers.Hyperlink.create(), HandlerDef(this.getClass.getClassLoader, "", "controllers.Hyperlink", "create", Seq(), "POST", """""", _prefix + """hyperlink""")
)
                      

// @LINE:19
def update(uuid:java.util.UUID): play.api.mvc.HandlerRef[_] = new play.api.mvc.HandlerRef(
   controllers.Hyperlink.update(uuid), HandlerDef(this.getClass.getClassLoader, "", "controllers.Hyperlink", "update", Seq(classOf[java.util.UUID]), "PUT", """""", _prefix + """hyperlink/$uuid<[^/]+>""")
)
                      

// @LINE:20
def delete(uuid:java.util.UUID): play.api.mvc.HandlerRef[_] = new play.api.mvc.HandlerRef(
   controllers.Hyperlink.delete(uuid), HandlerDef(this.getClass.getClassLoader, "", "controllers.Hyperlink", "delete", Seq(classOf[java.util.UUID]), "DELETE", """""", _prefix + """hyperlink/$uuid<[^/]+>""")
)
                      

// @LINE:18
def all(): play.api.mvc.HandlerRef[_] = new play.api.mvc.HandlerRef(
   controllers.Hyperlink.all(), HandlerDef(this.getClass.getClassLoader, "", "controllers.Hyperlink", "all", Seq(), "GET", """""", _prefix + """hyperlink""")
)
                      

}
                          

// @LINE:23
class ReverseAssets {


// @LINE:23
def at(path:String, file:String): play.api.mvc.HandlerRef[_] = new play.api.mvc.HandlerRef(
   controllers.Assets.at(path, file), HandlerDef(this.getClass.getClassLoader, "", "controllers.Assets", "at", Seq(classOf[String], classOf[String]), "GET", """ Map static resources from the /public folder to the /assets URL path""", _prefix + """assets/$file<.+>""")
)
                      

}
                          

// @LINE:14
// @LINE:13
// @LINE:12
// @LINE:11
// @LINE:10
// @LINE:9
class ReverseHypernode {


// @LINE:10
def read(uuid:java.util.UUID): play.api.mvc.HandlerRef[_] = new play.api.mvc.HandlerRef(
   controllers.Hypernode.read(uuid), HandlerDef(this.getClass.getClassLoader, "", "controllers.Hypernode", "read", Seq(classOf[java.util.UUID]), "GET", """""", _prefix + """hypernode/$uuid<[^/]+>""")
)
                      

// @LINE:9
def create(): play.api.mvc.HandlerRef[_] = new play.api.mvc.HandlerRef(
   controllers.Hypernode.create(), HandlerDef(this.getClass.getClassLoader, "", "controllers.Hypernode", "create", Seq(), "POST", """ API""", _prefix + """hypernode""")
)
                      

// @LINE:12
def update(uuid:java.util.UUID): play.api.mvc.HandlerRef[_] = new play.api.mvc.HandlerRef(
   controllers.Hypernode.update(uuid), HandlerDef(this.getClass.getClassLoader, "", "controllers.Hypernode", "update", Seq(classOf[java.util.UUID]), "PUT", """""", _prefix + """hypernode/$uuid<[^/]+>""")
)
                      

// @LINE:14
def delete(uuid:java.util.UUID): play.api.mvc.HandlerRef[_] = new play.api.mvc.HandlerRef(
   controllers.Hypernode.delete(uuid), HandlerDef(this.getClass.getClassLoader, "", "controllers.Hypernode", "delete", Seq(classOf[java.util.UUID]), "DELETE", """""", _prefix + """hypernode/$uuid<[^/]+>""")
)
                      

// @LINE:13
def batchUpdate(): play.api.mvc.HandlerRef[_] = new play.api.mvc.HandlerRef(
   controllers.Hypernode.batchUpdate(), HandlerDef(this.getClass.getClassLoader, "", "controllers.Hypernode", "batchUpdate", Seq(), "PUT", """""", _prefix + """hypernode""")
)
                      

// @LINE:11
def all(): play.api.mvc.HandlerRef[_] = new play.api.mvc.HandlerRef(
   controllers.Hypernode.all(), HandlerDef(this.getClass.getClassLoader, "", "controllers.Hypernode", "all", Seq(), "GET", """""", _prefix + """hypernode""")
)
                      

}
                          

// @LINE:6
class ReverseApplication {


// @LINE:6
def index(): play.api.mvc.HandlerRef[_] = new play.api.mvc.HandlerRef(
   controllers.Application.index(), HandlerDef(this.getClass.getClassLoader, "", "controllers.Application", "index", Seq(), "GET", """ Home page""", _prefix + """""")
)
                      

}
                          
}
        
    