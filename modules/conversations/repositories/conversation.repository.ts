import { prisma } from "@/lib/prisma"
import { ConversationStatus, MessageRole } from "@prisma/client"

export class ConversationRepository {
  static async listConversations(organizationId: string) {
    return prisma.conversation.findMany({
      where: { 
        organizationId,
        customer: {
          NOT: {
            labels: {
              has: "playground",
            },
          },
        },
      },
      include: {
        customer: true,
        channel: true,
        assignedUser: {
          select: { id: true, name: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    })
  }

  static async findConversationById(organizationId: string, id: string) {
    return prisma.conversation.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    })
  }

  static async toggleAgentIa(organizationId: string, id: string, status: ConversationStatus) {
    return prisma.conversation.update({
      where: { id },
      data: { status },
    })
  }

  static async createMessage(organizationId: string, data: {
    conversationId: string
    role: MessageRole
    content: string
    providerMessageId?: string
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Guardar mensaje
      const message = await tx.message.create({
        data: {
          organizationId,
          conversationId: data.conversationId,
          role: data.role,
          content: data.content,
          providerMessageId: data.providerMessageId || null,
        },
      })

      // 2. Actualizar fecha de actividad en la conversación
      await tx.conversation.update({
        where: { id: data.conversationId },
        data: { updatedAt: new Date() },
      })

      return message
    })
  }
}
