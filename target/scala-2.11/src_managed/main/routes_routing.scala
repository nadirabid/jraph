// @SOURCE:/Users/nadirmuzaffar/projects/graphapp2/conf/routes
// @HASH:752165c4d319f84ada035cf04e1346249f3a64ef
// @DATE:Wed Sep 24 22:21:30 PDT 2014


import play.core._
import play.core.Router._
import play.core.Router.HandlerInvokerFactory._
import play.core.j._

import play.api.mvc._
import _root_.controllers.Assets.Asset

import Router.queryString

object Routes extends Router.Routes {

import ReverseRouteContext.empty

private var _prefix = "/"

def setPrefix(prefix: String) {
  _prefix = prefix
  List[(String,Routes)]().foreach {
    case (p, router) => router.setPrefix(prefix + (if(prefix.endsWith("/")) "" else "/") + p)
  }
}

def prefix = _prefix

lazy val defaultPrefix = { if(Routes.prefix.endsWith("/")) "" else "/" }


// @LINE:6
private[this] lazy val controllers_Application_index0_route = Route("GET", PathPattern(List(StaticPart(Routes.prefix))))
private[this] lazy val controllers_Application_index0_invoker = createInvoker(
controllers.Application.index,
HandlerDef(this.getClass.getClassLoader, "", "controllers.Application", "index", Nil,"GET", """ Home page""", Routes.prefix + """"""))
        

// @LINE:9
private[this] lazy val controllers_Hypernode_create1_route = Route("POST", PathPattern(List(StaticPart(Routes.prefix),StaticPart(Routes.defaultPrefix),StaticPart("hypernode"))))
private[this] lazy val controllers_Hypernode_create1_invoker = createInvoker(
controllers.Hypernode.create,
HandlerDef(this.getClass.getClassLoader, "", "controllers.Hypernode", "create", Nil,"POST", """ API""", Routes.prefix + """hypernode"""))
        

// @LINE:10
private[this] lazy val controllers_Hypernode_read2_route = Route("GET", PathPattern(List(StaticPart(Routes.prefix),StaticPart(Routes.defaultPrefix),StaticPart("hypernode/"),DynamicPart("uuid", """[^/]+""",true))))
private[this] lazy val controllers_Hypernode_read2_invoker = createInvoker(
controllers.Hypernode.read(fakeValue[java.util.UUID]),
HandlerDef(this.getClass.getClassLoader, "", "controllers.Hypernode", "read", Seq(classOf[java.util.UUID]),"GET", """""", Routes.prefix + """hypernode/$uuid<[^/]+>"""))
        

// @LINE:11
private[this] lazy val controllers_Hypernode_all3_route = Route("GET", PathPattern(List(StaticPart(Routes.prefix),StaticPart(Routes.defaultPrefix),StaticPart("hypernode"))))
private[this] lazy val controllers_Hypernode_all3_invoker = createInvoker(
controllers.Hypernode.all,
HandlerDef(this.getClass.getClassLoader, "", "controllers.Hypernode", "all", Nil,"GET", """""", Routes.prefix + """hypernode"""))
        

// @LINE:12
private[this] lazy val controllers_Hypernode_update4_route = Route("PUT", PathPattern(List(StaticPart(Routes.prefix),StaticPart(Routes.defaultPrefix),StaticPart("hypernode/"),DynamicPart("uuid", """[^/]+""",true))))
private[this] lazy val controllers_Hypernode_update4_invoker = createInvoker(
controllers.Hypernode.update(fakeValue[java.util.UUID]),
HandlerDef(this.getClass.getClassLoader, "", "controllers.Hypernode", "update", Seq(classOf[java.util.UUID]),"PUT", """""", Routes.prefix + """hypernode/$uuid<[^/]+>"""))
        

// @LINE:13
private[this] lazy val controllers_Hypernode_batchUpdate5_route = Route("PUT", PathPattern(List(StaticPart(Routes.prefix),StaticPart(Routes.defaultPrefix),StaticPart("hypernode"))))
private[this] lazy val controllers_Hypernode_batchUpdate5_invoker = createInvoker(
controllers.Hypernode.batchUpdate,
HandlerDef(this.getClass.getClassLoader, "", "controllers.Hypernode", "batchUpdate", Nil,"PUT", """""", Routes.prefix + """hypernode"""))
        

// @LINE:14
private[this] lazy val controllers_Hypernode_delete6_route = Route("DELETE", PathPattern(List(StaticPart(Routes.prefix),StaticPart(Routes.defaultPrefix),StaticPart("hypernode/"),DynamicPart("uuid", """[^/]+""",true))))
private[this] lazy val controllers_Hypernode_delete6_invoker = createInvoker(
controllers.Hypernode.delete(fakeValue[java.util.UUID]),
HandlerDef(this.getClass.getClassLoader, "", "controllers.Hypernode", "delete", Seq(classOf[java.util.UUID]),"DELETE", """""", Routes.prefix + """hypernode/$uuid<[^/]+>"""))
        

// @LINE:16
private[this] lazy val controllers_Hyperlink_create7_route = Route("POST", PathPattern(List(StaticPart(Routes.prefix),StaticPart(Routes.defaultPrefix),StaticPart("hyperlink"))))
private[this] lazy val controllers_Hyperlink_create7_invoker = createInvoker(
controllers.Hyperlink.create,
HandlerDef(this.getClass.getClassLoader, "", "controllers.Hyperlink", "create", Nil,"POST", """""", Routes.prefix + """hyperlink"""))
        

// @LINE:17
private[this] lazy val controllers_Hyperlink_read8_route = Route("GET", PathPattern(List(StaticPart(Routes.prefix),StaticPart(Routes.defaultPrefix),StaticPart("hyperlink/"),DynamicPart("uuid", """[^/]+""",true))))
private[this] lazy val controllers_Hyperlink_read8_invoker = createInvoker(
controllers.Hyperlink.read(fakeValue[java.util.UUID]),
HandlerDef(this.getClass.getClassLoader, "", "controllers.Hyperlink", "read", Seq(classOf[java.util.UUID]),"GET", """""", Routes.prefix + """hyperlink/$uuid<[^/]+>"""))
        

// @LINE:18
private[this] lazy val controllers_Hyperlink_all9_route = Route("GET", PathPattern(List(StaticPart(Routes.prefix),StaticPart(Routes.defaultPrefix),StaticPart("hyperlink"))))
private[this] lazy val controllers_Hyperlink_all9_invoker = createInvoker(
controllers.Hyperlink.all,
HandlerDef(this.getClass.getClassLoader, "", "controllers.Hyperlink", "all", Nil,"GET", """""", Routes.prefix + """hyperlink"""))
        

// @LINE:19
private[this] lazy val controllers_Hyperlink_update10_route = Route("PUT", PathPattern(List(StaticPart(Routes.prefix),StaticPart(Routes.defaultPrefix),StaticPart("hyperlink/"),DynamicPart("uuid", """[^/]+""",true))))
private[this] lazy val controllers_Hyperlink_update10_invoker = createInvoker(
controllers.Hyperlink.update(fakeValue[java.util.UUID]),
HandlerDef(this.getClass.getClassLoader, "", "controllers.Hyperlink", "update", Seq(classOf[java.util.UUID]),"PUT", """""", Routes.prefix + """hyperlink/$uuid<[^/]+>"""))
        

// @LINE:20
private[this] lazy val controllers_Hyperlink_delete11_route = Route("DELETE", PathPattern(List(StaticPart(Routes.prefix),StaticPart(Routes.defaultPrefix),StaticPart("hyperlink/"),DynamicPart("uuid", """[^/]+""",true))))
private[this] lazy val controllers_Hyperlink_delete11_invoker = createInvoker(
controllers.Hyperlink.delete(fakeValue[java.util.UUID]),
HandlerDef(this.getClass.getClassLoader, "", "controllers.Hyperlink", "delete", Seq(classOf[java.util.UUID]),"DELETE", """""", Routes.prefix + """hyperlink/$uuid<[^/]+>"""))
        

// @LINE:23
private[this] lazy val controllers_Assets_at12_route = Route("GET", PathPattern(List(StaticPart(Routes.prefix),StaticPart(Routes.defaultPrefix),StaticPart("assets/"),DynamicPart("file", """.+""",false))))
private[this] lazy val controllers_Assets_at12_invoker = createInvoker(
controllers.Assets.at(fakeValue[String], fakeValue[String]),
HandlerDef(this.getClass.getClassLoader, "", "controllers.Assets", "at", Seq(classOf[String], classOf[String]),"GET", """ Map static resources from the /public folder to the /assets URL path""", Routes.prefix + """assets/$file<.+>"""))
        
def documentation = List(("""GET""", prefix,"""controllers.Application.index"""),("""POST""", prefix + (if(prefix.endsWith("/")) "" else "/") + """hypernode""","""controllers.Hypernode.create"""),("""GET""", prefix + (if(prefix.endsWith("/")) "" else "/") + """hypernode/$uuid<[^/]+>""","""controllers.Hypernode.read(uuid:java.util.UUID)"""),("""GET""", prefix + (if(prefix.endsWith("/")) "" else "/") + """hypernode""","""controllers.Hypernode.all"""),("""PUT""", prefix + (if(prefix.endsWith("/")) "" else "/") + """hypernode/$uuid<[^/]+>""","""controllers.Hypernode.update(uuid:java.util.UUID)"""),("""PUT""", prefix + (if(prefix.endsWith("/")) "" else "/") + """hypernode""","""controllers.Hypernode.batchUpdate"""),("""DELETE""", prefix + (if(prefix.endsWith("/")) "" else "/") + """hypernode/$uuid<[^/]+>""","""controllers.Hypernode.delete(uuid:java.util.UUID)"""),("""POST""", prefix + (if(prefix.endsWith("/")) "" else "/") + """hyperlink""","""controllers.Hyperlink.create"""),("""GET""", prefix + (if(prefix.endsWith("/")) "" else "/") + """hyperlink/$uuid<[^/]+>""","""controllers.Hyperlink.read(uuid:java.util.UUID)"""),("""GET""", prefix + (if(prefix.endsWith("/")) "" else "/") + """hyperlink""","""controllers.Hyperlink.all"""),("""PUT""", prefix + (if(prefix.endsWith("/")) "" else "/") + """hyperlink/$uuid<[^/]+>""","""controllers.Hyperlink.update(uuid:java.util.UUID)"""),("""DELETE""", prefix + (if(prefix.endsWith("/")) "" else "/") + """hyperlink/$uuid<[^/]+>""","""controllers.Hyperlink.delete(uuid:java.util.UUID)"""),("""GET""", prefix + (if(prefix.endsWith("/")) "" else "/") + """assets/$file<.+>""","""controllers.Assets.at(path:String = "/public", file:String)""")).foldLeft(List.empty[(String,String,String)]) { (s,e) => e.asInstanceOf[Any] match {
  case r @ (_,_,_) => s :+ r.asInstanceOf[(String,String,String)]
  case l => s ++ l.asInstanceOf[List[(String,String,String)]]
}}
      

def routes:PartialFunction[RequestHeader,Handler] = {

// @LINE:6
case controllers_Application_index0_route(params) => {
   call { 
        controllers_Application_index0_invoker.call(controllers.Application.index)
   }
}
        

// @LINE:9
case controllers_Hypernode_create1_route(params) => {
   call { 
        controllers_Hypernode_create1_invoker.call(controllers.Hypernode.create)
   }
}
        

// @LINE:10
case controllers_Hypernode_read2_route(params) => {
   call(params.fromPath[java.util.UUID]("uuid", None)) { (uuid) =>
        controllers_Hypernode_read2_invoker.call(controllers.Hypernode.read(uuid))
   }
}
        

// @LINE:11
case controllers_Hypernode_all3_route(params) => {
   call { 
        controllers_Hypernode_all3_invoker.call(controllers.Hypernode.all)
   }
}
        

// @LINE:12
case controllers_Hypernode_update4_route(params) => {
   call(params.fromPath[java.util.UUID]("uuid", None)) { (uuid) =>
        controllers_Hypernode_update4_invoker.call(controllers.Hypernode.update(uuid))
   }
}
        

// @LINE:13
case controllers_Hypernode_batchUpdate5_route(params) => {
   call { 
        controllers_Hypernode_batchUpdate5_invoker.call(controllers.Hypernode.batchUpdate)
   }
}
        

// @LINE:14
case controllers_Hypernode_delete6_route(params) => {
   call(params.fromPath[java.util.UUID]("uuid", None)) { (uuid) =>
        controllers_Hypernode_delete6_invoker.call(controllers.Hypernode.delete(uuid))
   }
}
        

// @LINE:16
case controllers_Hyperlink_create7_route(params) => {
   call { 
        controllers_Hyperlink_create7_invoker.call(controllers.Hyperlink.create)
   }
}
        

// @LINE:17
case controllers_Hyperlink_read8_route(params) => {
   call(params.fromPath[java.util.UUID]("uuid", None)) { (uuid) =>
        controllers_Hyperlink_read8_invoker.call(controllers.Hyperlink.read(uuid))
   }
}
        

// @LINE:18
case controllers_Hyperlink_all9_route(params) => {
   call { 
        controllers_Hyperlink_all9_invoker.call(controllers.Hyperlink.all)
   }
}
        

// @LINE:19
case controllers_Hyperlink_update10_route(params) => {
   call(params.fromPath[java.util.UUID]("uuid", None)) { (uuid) =>
        controllers_Hyperlink_update10_invoker.call(controllers.Hyperlink.update(uuid))
   }
}
        

// @LINE:20
case controllers_Hyperlink_delete11_route(params) => {
   call(params.fromPath[java.util.UUID]("uuid", None)) { (uuid) =>
        controllers_Hyperlink_delete11_invoker.call(controllers.Hyperlink.delete(uuid))
   }
}
        

// @LINE:23
case controllers_Assets_at12_route(params) => {
   call(Param[String]("path", Right("/public")), params.fromPath[String]("file", None)) { (path, file) =>
        controllers_Assets_at12_invoker.call(controllers.Assets.at(path, file))
   }
}
        
}

}
     