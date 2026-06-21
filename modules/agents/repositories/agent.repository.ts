import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export class AgentRepository {
  static async getAgent(organizationId: string) {
    const agent = await prisma.agent.findUnique({
      where: { organizationId },
    })

    if (agent) return agent

    // Si no existe, crear uno por defecto en el primer acceso (Fase 6 auto-creación)
    return prisma.agent.create({
      data: {
        organizationId,
        promptBase: `Eres el asistente comercial de nuestro negocio. Tu objetivo es cotizar productos y responder dudas operativas de los clientes en base al catálogo.`,
        temperature: new Prisma.Decimal(0.1),
        dailyLimit: 100,
      },
    })
  }

  static async updateAgent(organizationId: string, data: {
    promptBase: string
    temperature: number
    dailyLimit: number
  }) {
    const existing = await this.getAgent(organizationId)

    return prisma.$transaction(async (tx) => {
      // 1. Guardar versión histórica antes del cambio (Rollback support)
      await tx.agentVersion.create({
        data: {
          agentId: existing.id,
          versionNumber: existing.version,
          promptSnapshot: existing.promptBase,
        },
      })

      // 2. Actualizar configuración activa incrementando la versión
      return tx.agent.update({
        where: { id: existing.id },
        data: {
          promptBase: data.promptBase,
          temperature: new Prisma.Decimal(data.temperature),
          dailyLimit: data.dailyLimit,
          version: existing.version + 1,
        },
      })
    })
  }
}
