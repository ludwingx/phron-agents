"use server"

import { AnalyticsService } from "../services/analytics.service"

export async function getDashboardMetricsAction() {
  try {
    const metrics = await AnalyticsService.getSummaryMetrics()
    return { success: true as const, data: metrics }
  } catch (error: any) {
    return { success: false as const, error: error.message || "Error al cargar analíticas" }
  }
}
