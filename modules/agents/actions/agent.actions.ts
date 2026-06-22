"use server"

import { revalidatePath } from "next/cache"
import { AgentService } from "../services/agent.service"
import { ActionResponse } from "@/modules/auth/actions/auth.actions"
import { getOrganizationContext } from "@/lib/tenant"
import { prisma } from "@/lib/prisma"

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

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
  } catch (error: any) {
    return { success: false as const, error: error.message || "Error al cargar configuración" }
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
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar configuración" }
  }
}

export async function chatPlaygroundAction(
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<ActionResponse<string>> {
  try {
    const organizationId = await getOrganizationContext()
    
    // 1. Obtener la configuración del agente del proyecto actual
    const agent = await AgentService.getAgent()
    
    // 2. Extraer el último mensaje del usuario para buscar contexto relevante
    const lastUserMessage = messages[messages.length - 1]?.content || ""

    // 3. Buscar productos en la base de datos de Prisma que coincidan con la búsqueda
    // Filtramos palabras vacías comunes del español que no aportan al filtro de productos
    const stopWords = new Set(["que", "tiene", "tienen", "tienes", "tuviera", "tuvieras", "stock", "inventario", "catalogo", "catálogo", "hola", "buenas", "días", "tardes", "noches", "este", "esta", "estos", "estas", "unos", "unas", "los", "las", "del", "con", "para", "una", "uno", "algo"])
    
    const keywords = lastUserMessage.toLowerCase()
      .replace(/[^a-z0-9áéíóúñü ]/g, "")
      .split(" ")
      .map(k => k.trim())
      .filter(k => k.length > 1 && !stopWords.has(k))

    // Si la búsqueda no tiene palabras clave específicas (ej: "¿Qué tienes en stock?"),
    // traemos los primeros 10 productos activos para que el bot pueda ofrecerlos en lugar de decir que no hay nada.
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
            stock: { gt: 0 } // Traer solo variantes que de verdad tienen stock
          }
        }
      },
      take: 10
    })

    // 4. Formatear contexto de productos de forma extremadamente limpia y sin ruido (sin SKU al bot a menos que lo pida)
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

    // 5. Construir prompt completo
    const systemInstruction = `${agent.promptBase}

INFORMACIÓN ADICIONAL DE STOCK PARA LA RESPUESTA:
${productContext}

REGLAS DE FORMATO CRÍTICAS:
1. Responde de forma muy natural, conversacional y corta (máximo 2 a 3 líneas de texto por mensaje).
2. NUNCA listes productos con viñetas complejas (ej. * **Producto** - SKU). Menciónalos de forma fluida y conversacional en la frase (ej: "Tenemos el pantalón Dian's a Bs. 150 en tallas 38 y 40").
3. Si el cliente pregunta por algo que no existe en el catálogo anterior, dile de forma directa y amable que no lo tienes disponible por el momento.`

    // 6. Consultar OpenRouter
    const key = process.env.OPENROUTER_KEY || ""
    if (!key) {
      throw new Error("Llave de API de OpenRouter (OPENROUTER_KEY) no configurada en el archivo .env")
    }

    const payload = {
      model: "google/gemini-2.5-flash", // Modelo rápido y económico sugerido
      messages: [
        { role: "system", content: systemInstruction },
        ...messages
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

    return { success: true, data: botReply }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al chatear con el Agente" }
  }
}
