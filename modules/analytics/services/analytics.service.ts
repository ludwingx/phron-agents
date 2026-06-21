import { getOrganizationContext } from "@/lib/tenant"
import { AnalyticsRepository } from "../repositories/analytics.repository"

export class AnalyticsService {
  static async getSummaryMetrics() {
    const organizationId = await getOrganizationContext()
    return AnalyticsRepository.getTenantMetrics(organizationId)
  }
}
