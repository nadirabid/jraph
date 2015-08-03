package core

import javax.inject.Inject

import play.api.http.HttpFilters
import play.api.mvc.EssentialFilter
import play.filters.csrf.CSRFFilter
import play.filters.headers.SecurityHeadersFilter
import play.filters.gzip.GzipFilter

/**
 * Provides filters.
 */
class Filters @Inject() (csrfFilter: CSRFFilter,
                         gzipFilter: GzipFilter,
                         securityHeadersFilter: SecurityHeadersFilter)
  extends HttpFilters {
  override def filters: Seq[EssentialFilter] = Seq(gzipFilter, csrfFilter)
}