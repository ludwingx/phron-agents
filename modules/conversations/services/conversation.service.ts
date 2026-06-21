import { getOrganizationContext } from "@/lib/tenant"
import { ConversationRepository } from "../repositories/conversation.repository"
import { ConversationStatus, MessageRole } from "@prisma/client"

export class ConversationService {
  static async listConversations() {
    const organizationId = await getOrganizationContext()
    return ConversationRepository.listConversations(organizationId)
  }

  static async findConversationById(id: string) {
    const organizationId = await getOrganizationContext()
    return ConversationRepository.findConversationById(organizationId, id)
  }

  static async toggleAgentIa(id: string, status: ConversationStatus) {
    const organizationId = await getOrganizationContext()
    return ConversationRepository.toggleAgentIa(organizationId, id, status)
  }

  static async sendMessage(data: {
    conversationId: string
    role: MessageRole
    content: string
    providerMessageId?: string
  }) {
    const organizationId = await getOrganizationContext()
    return ConversationRepository.createMessage(organizationId, data)
  }
}
