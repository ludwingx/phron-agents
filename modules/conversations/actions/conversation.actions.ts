"use server"

import { revalidatePath } from "next/cache"
import { ConversationService } from "../services/conversation.service"
import { ConversationStatus, MessageRole } from "@prisma/client"
import { ActionResponse } from "@/modules/auth/actions/auth.actions"

export async function listConversationsAction() {
  try {
    const conversations = await ConversationService.listConversations()
    return { success: true as const, data: conversations }
  } catch (error: any) {
    return { success: false as const, error: error.message || "Error al cargar conversaciones" }
  }
}

export async function findConversationByIdAction(id: string) {
  try {
    const conversation = await ConversationService.findConversationById(id)
    return { success: true as const, data: conversation }
  } catch (error: any) {
    return { success: false as const, error: error.message || "Error al cargar conversación" }
  }
}

export async function toggleAgentIaAction(id: string, status: ConversationStatus): Promise<ActionResponse> {
  try {
    await ConversationService.toggleAgentIa(id, status)
    revalidatePath("/dashboard/conversations")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar estado del bot" }
  }
}

export async function sendMessageAction(data: {
  conversationId: string
  content: string
}): Promise<ActionResponse> {
  try {
    await ConversationService.sendMessage({
      conversationId: data.conversationId,
      role: MessageRole.HUMAN_AGENT,
      content: data.content,
    })
    
    // Forzar pausado automático del bot cuando responde un humano (Regla de Handoff)
    await ConversationService.toggleAgentIa(data.conversationId, ConversationStatus.PAUSED)
    
    revalidatePath("/dashboard/conversations")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al enviar mensaje" }
  }
}
