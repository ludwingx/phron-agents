"use server"

import { revalidatePath } from "next/cache"
import { AgentService } from "../services/agent.service"
import { ActionResponse } from "@/modules/auth/actions/auth.actions"
import { getOrganizationContext } from "@/lib/tenant"
import { prisma } from "@/lib/prisma"
import type { Message } from "@prisma/client"

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

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
  promptBase: string
  temperature: number
  dailyLimit: number
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
    
    // 1. Guardar mensaje del usuario
    await prisma.message.create({
      data: {
        organizationId,
        conversationId,
        role: "USER",
        content,
      }
    })

    // Actualizar updatedAt de la conversación
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    })

    // 2. Obtener la configuración del agente del proyecto actual
    const agent = await AgentService.getAgent()
    
    // 3. Buscar productos en la base de datos de Prisma que coincidan con la búsqueda
    const stopWords = new Set(["que", "tiene", "tienen", "tienes", "tuviera", "tuvieras", "stock", "inventario", "catalogo", "catálogo", "hola", "buenas", "días", "tardes", "noches", "este", "esta", "estos", "estas", "unos", "unas", "los", "las", "del", "con", "para", "una", "uno", "algo"])
    
    const keywords = content.toLowerCase()
      .replace(/[^a-z0-9áéíóúñü ]/g, "")
      .split(" ")
      .map(k => k.trim())
      .filter(k => k.length > 1 && !stopWords.has(k))

    const matchedProducts = await prisma.product.findMany({
      where: {
        organizationId,
        deletedAt: null,
        isActive: true,
        ...(keywords.length > 0 ? {
          OR: keywords.map(kw => ({
            OR: [
              { name: { contains: kw, mode: "insensitive" } },
              { description: { contains: kw, mode: "insensitive" } },
              { sku: { contains: kw, mode: "insensitive" } }
            ]
          }))
        } : {})
      },
      include: {
        variants: {
          where: {
            stock: { gt: 0 }
          }
        }
      },
      take: 10
    })

    let productContext = "\nCATÁLOGO DE PRODUCTOS DISPONIBLES:\n"
    if (matchedProducts.length > 0) {
      matchedProducts.forEach(p => {
        const variantsStr = p.variants
          .map(v => `${Object.values(v.attributes as Record<string, string>).join(", ")} (Stock: ${v.stock})`)
          .join(" | ")
        productContext += `- Producto: ${p.name} | Precio: Bs. ${Number(p.price).toFixed(2)} | Variantes/Tallas: ${variantsStr || "Única (Sin Stock)"}\n`
      })
    } else {
      productContext += "No hay stock de este producto o no está disponible en este momento.\n"
    }

    const systemInstruction = `${agent.promptBase}

INFORMACIÓN ADICIONAL DE STOCK PARA LA RESPUESTA:
${productContext}

REGLAS DE FORMATO CRÍTICAS:
1. Sé conversacional y directa. Evita párrafos largos, pero puedes usar hasta 4-5 líneas si necesitas mostrar varias opciones.
2. Cuando la clienta pregunte por una CATEGORÍA (ej: "pantalones", "blusas", "vestidos"), muestra TODAS las opciones disponibles del catálogo en una lista corta y natural. Ejemplo:
   "¡Tenemos varias opciones! 👗
   • Pantalón Dian's — Bs. 150 (tallas 38, 40)
   • Jean Levanta Cola — Bs. 180 (tallas 36, 38, 40)
   • Pantalón Wide Leg — Bs. 120 (tallas 38, 42)
   ¿Cuál te llama la atención?"
3. Cuando pregunte por un PRODUCTO ESPECÍFICO, responde directo con precio y tallas sin listar todo.
4. Si el producto o talla no existe en el catálogo anterior, dile de forma directa y amable que no lo tienes disponible y sugiere alternativas del catálogo.
5. SIEMPRE termina con una pregunta que lleve a la venta.`

    // Cargar historial de mensajes de la conversación
    const allDbMessages = await prisma.message.findMany({
      where: { conversationId, organizationId },
      orderBy: { createdAt: "asc" }
    })

    // Mapear al formato que espera OpenRouter (user/assistant)
    const formattedMessages = allDbMessages.map(m => ({
      role: m.role === "USER" ? "user" as const : "assistant" as const,
      content: m.content
    }))

    const key = process.env.OPENROUTER_KEY || ""
    if (!key) {
      throw new Error("Llave de API de OpenRouter (OPENROUTER_KEY) no configurada en el archivo .env")
    }

    const payload = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemInstruction },
        ...formattedMessages
      ],
      temperature: Number(agent.temperature),
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errBody = await response.text()
      throw new Error(`Fallo en OpenRouter API: ${response.statusText} - ${errBody}`)
    }

    const resJson = await response.json()
    const botReply = resJson.choices[0]?.message?.content || "No he podido procesar tu solicitud."

    // 4. Guardar respuesta del bot
    await prisma.message.create({
      data: {
        organizationId,
        conversationId,
        role: "ASSISTANT",
        content: botReply,
      }
    })

    // Obtener la lista de mensajes actualizada
    const updatedMessages = await prisma.message.findMany({
      where: { conversationId, organizationId },
      orderBy: { createdAt: "asc" }
    })

    return { success: true, data: { reply: botReply, messages: updatedMessages } }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Error al chatear con el Agente" }
  }
}
