import { prisma } from "@/lib/prisma"

export class AnalyticsRepository {
  static async getTenantMetrics(organizationId: string) {
    const [customersCount, productsCount, conversationsCount, ordersCount] = await Promise.all([
      // Clientes totales no borrados
      prisma.customer.count({
        where: { organizationId, deletedAt: null },
      }),
      // Productos no borrados
      prisma.product.count({
        where: { organizationId, deletedAt: null },
      }),
      // Conversaciones del bot
      prisma.conversation.count({
        where: { organizationId },
      }),
      // Pedidos realizados
      prisma.order.count({
        where: { organizationId },
      }),
    ])

    return {
      customersCount,
      productsCount,
      conversationsCount,
      ordersCount,
    }
  }
}
