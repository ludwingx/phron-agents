"use server"

import { revalidatePath } from "next/cache"
import { AgentService } from "../services/agent.service"
import { ActionResponse } from "@/modules/auth/actions/auth.actions"
import { getOrganizationContext } from "@/lib/tenant"
import { prisma } from "@/lib/prisma"
import type { Message } from "@prisma/client"
import { AgentExecutorService } from "../services/agent-executor.service"

async function getOrCreatePlaygroundChannel(organizationId: string) {
  let channel = await prisma.channel.findFirst({
    where: { organizationId, type: "WHATSAPP", phoneNumberId: "playground-mock" }
  })
  if (!channel) {
    channel = await prisma.channel.create({
      data: {
        organizationId,
        type: "WHATSAPP",
        phoneNumberId: "playground-mock",
        accessToken: "playground-mock-token"
      }
    })
  }
  return channel
}

export async function createPlaygroundConversationAction(clientName?: string): Promise<ActionResponse<{ id: string }>> {
  try {
    const organizationId = await getOrganizationContext()
    const channel = await getOrCreatePlaygroundChannel(organizationId)
    
    const name = clientName?.trim() || `Cliente de Prueba (${new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })})`
    const customer = await prisma.customer.create({
      data: {
        organizationId,
        fullName: name,
        labels: ["playground"],
      }
    })

    const conversation = await prisma.conversation.create({
      data: {
        organizationId,
        customerId: customer.id,
        channelId: channel.id,
        status: "ACTIVE_IA",
      }
    })

    revalidatePath("/dashboard/agents")
    return { success: true, data: { id: conversation.id } }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Error al crear conversación de prueba" }
  }
}

export async function listPlaygroundConversationsAction() {
  try {
    const organizationId = await getOrganizationContext()
    const conversations = await prisma.conversation.findMany({
      where: {
        organizationId,
        customer: {
          labels: {
            has: "playground"
          }
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    })

    return { success: true as const, data: conversations }
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error al cargar historial del playground" }
  }
}

export async function getPlaygroundMessagesAction(conversationId: string) {
  try {
    const organizationId = await getOrganizationContext()
    const messages = await prisma.message.findMany({
      where: {
        organizationId,
        conversationId,
      },
      orderBy: {
        createdAt: "asc"
      }
    })

    return { success: true as const, data: messages }
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error al cargar mensajes del chat de prueba" }
  }
}

export async function getAgentAction() {
  try {
    const agent = await AgentService.getAgent()
    return {
      success: true as const,
      data: {
        ...agent,
        temperature: Number(agent.temperature),
      },
    }
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error al cargar configuración" }
  }
}

export async function updateAgentAction(data: {
  promptBase: string;
  temperature: number;
  dailyLimit: number;
}): Promise<ActionResponse> {
  try {
    await AgentService.updateAgent(data)
    revalidatePath("/dashboard/agents")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Error al actualizar configuración" }
  }
}

export async function chatPlaygroundAction(
  conversationId: string,
  content: string
): Promise<ActionResponse<{ reply: string; messages: Message[] }>> {
  try {
    const organizationId = await getOrganizationContext()
    
    const reply = await AgentExecutorService.processMessage({
      organizationId,
      conversationId,
      content,
    })

    const updatedMessages = await prisma.message.findMany({
      where: { conversationId, organizationId },
      orderBy: { createdAt: "asc" }
    })

    return { success: true, data: { reply, messages: updatedMessages } }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Error al chatear con el Agente" }
  }
}
