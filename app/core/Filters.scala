package core

import javax.inject.Inject

import core.filters.{UnsupportedBrowserFilter, UnsupportedDeviceFilter}
import play.api.http.HttpFilters
import play.api.mvc.EssentialFilter
import play.filters.csrf.CSRFFilter
import play.filters.gzip.GzipFilter
import play.filters.headers.SecurityHeadersFilter


/**
 * Provides filters.
 */
class Filters @Inject() (csrfFilter: CSRFFilter,
                         gzipFilter: GzipFilter,
                         securityHeadersFilter: SecurityHeadersFilter,
                         unsupportedDeviceFilter: UnsupportedDeviceFilter,
                         unsupportedBrowserFilter: UnsupportedBrowserFilter)
  extends HttpFilters {
  override def filters: Seq[EssentialFilter] = Seq(gzipFilter, csrfFilter, unsupportedDeviceFilter, unsupportedBrowserFilter)
}