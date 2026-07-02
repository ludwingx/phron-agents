import { prisma } from "@/lib/prisma";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export class AgentExecutorService {
  static async processMessage(params: {
    organizationId: string;
    conversationId: string;
    content: string;
    providerMessageId?: string;
  }) {
    const { organizationId, conversationId, content, providerMessageId } = params;

    // 1. Guardar mensaje del usuario si no existe ya (para evitar duplicados por reintentos de webhooks)
    if (providerMessageId) {
      const existing = await prisma.message.findUnique({
        where: { providerMessageId },
      });
      if (existing) {
        // Si ya existe, podemos retornar la última respuesta del bot de esta conversación
        const lastAssistantMessage = await prisma.message.findFirst({
          where: { conversationId, role: "ASSISTANT" },
          orderBy: { createdAt: "desc" },
        });
        return lastAssistantMessage?.content || "Mensaje ya procesado.";
      }
    }

    await prisma.message.create({
      data: {
        organizationId,
        conversationId,
        role: "USER",
        content,
        providerMessageId,
      },
    });

    // Actualizar updatedAt de la conversación
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // 2. Obtener la configuración del agente
    const agent = await prisma.agent.findUnique({
      where: { organizationId },
    });

    if (!agent) {
      throw new Error("No hay un agente configurado para esta organización.");
    }

    // 3. Buscar productos en la base de datos que coincidan
    const stopWords = new Set([
      "que", "tiene", "tienen", "tienes", "tuviera", "tuvieras", "stock", "inventario",
      "catalogo", "catálogo", "hola", "buenas", "días", "tardes", "noches", "este", "esta",
      "estos", "estas", "unos", "unas", "los", "las", "del", "con", "para", "una", "uno", "algo"
    ]);

    const keywords = content.toLowerCase()
      .replace(/[^a-z0-9áéíóúñü ]/g, "")
      .split(" ")
      .map(k => k.trim())
      .filter(k => k.length > 1 && !stopWords.has(k));

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
    });

    let productContext = "\nCATÁLOGO DE PRODUCTOS DISPONIBLES:\n";
    if (matchedProducts.length > 0) {
      matchedProducts.forEach(p => {
        const variantsStr = p.variants
          .map(v => `${Object.values(v.attributes as Record<string, string>).join(", ")} (Stock: ${v.stock})`)
          .join(" | ");
        productContext += `- Producto: ${p.name} | Precio: Bs. ${Number(p.price).toFixed(2)} | Variantes/Tallas: ${variantsStr || "Única (Sin Stock)"}\n`;
      });
    } else {
      productContext += "No hay stock de este producto o no está disponible en este momento.\n";
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
5. SIEMPRE termina con una pregunta que lleve a la venta.`;

    // Cargar historial de mensajes de la conversación
    const allDbMessages = await prisma.message.findMany({
      where: { conversationId, organizationId },
      orderBy: { createdAt: "asc" }
    });

    // Mapear al formato que espera OpenRouter (user/assistant)
    const formattedMessages = allDbMessages.map(m => ({
      role: m.role === "USER" ? "user" as const : "assistant" as const,
      content: m.content
    }));

    const key = process.env.OPENROUTER_KEY || "";
    if (!key) {
      throw new Error("Llave de API de OpenRouter (OPENROUTER_KEY) no configurada en el archivo .env");
    }

    const payload = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemInstruction },
        ...formattedMessages
      ],
      temperature: Number(agent.temperature),
    };

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Fallo en OpenRouter API: ${response.statusText} - ${errBody}`);
    }

    const resJson = await response.json();
    const botReply = resJson.choices[0]?.message?.content || "No he podido procesar tu solicitud.";

    // 4. Guardar respuesta del bot
    await prisma.message.create({
      data: {
        organizationId,
        conversationId,
        role: "ASSISTANT",
        content: botReply,
      }
    });

    return botReply;
  }
}
