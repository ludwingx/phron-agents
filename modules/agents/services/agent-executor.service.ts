import { prisma } from "@/lib/prisma";
import type { SalesConfig } from "@/modules/sales-config/types";
import { DEFAULT_SALES_CONFIG } from "@/modules/sales-config/types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// ─── Personality presets ───────────────────────────────────────

const PERSONALITY_PRESETS: Record<string, string> = {
  friendly:
    "Eres un vendedor(a) extremadamente amable, cálido(a) y empático(a). Usas emojis con moderación. Haces sentir al cliente como en casa, como si hablaras con un(a) amigo(a). Celebras sus elecciones y les das confianza.",
  urgent:
    "Eres un vendedor(a) persuasivo(a) que utiliza técnicas de urgencia y escasez (FOMO). Mencionas que el stock es limitado, que otros clientes están interesados, y creas sensación de oportunidad única. Siempre profesional pero con energía de cierre.",
  formal:
    "Eres un asesor(a) comercial profesional y formal. Utilizas un lenguaje respetuoso, evitas emojis innecesarios y brindas información estructurada. Ideal para clientes corporativos o productos de alto valor.",
  custom: "", // Uses only the user's promptBase
};

// ─── Helpers ───────────────────────────────────────────────────

function isWithinBusinessHours(config: SalesConfig): boolean {
  const tz = config.timezone || "America/La_Paz";
  const now = new Date();

  // Get the current day name and time in the business's timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const dayName = parts.find((p) => p.type === "weekday")?.value?.toLowerCase() || "";
  const hour = parts.find((p) => p.type === "hour")?.value || "00";
  const minute = parts.find((p) => p.type === "minute")?.value || "00";
  const currentTime = `${hour}:${minute}`;

  const dayMap: Record<string, keyof SalesConfig["businessHours"]> = {
    monday: "monday",
    tuesday: "tuesday",
    wednesday: "wednesday",
    thursday: "thursday",
    friday: "friday",
    saturday: "saturday",
    sunday: "sunday",
  };

  const dayKey = dayMap[dayName];
  if (!dayKey) return true; // Fail-open

  const schedule = config.businessHours[dayKey];
  if (!schedule || !schedule.enabled) return false;

  return currentTime >= schedule.open && currentTime <= schedule.close;
}

function checkHumanHandoff(content: string, config: SalesConfig): boolean {
  if (!config.humanHandoffEnabled || config.humanHandoffKeywords.length === 0) return false;
  const lower = content.toLowerCase();
  return config.humanHandoffKeywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function buildSalesContext(config: SalesConfig): string {
  const sections: string[] = [];

  // Ubicación
  if (config.businessAddress) {
    sections.push(
      `UBICACIÓN DEL NEGOCIO:\n- Dirección: ${config.businessAddress}\n- Si el cliente pregunta dónde están ubicados o cómo llegar, responde con la dirección y SIEMPRE incluye el marcador [SEND_LOCATION] al final de tu respuesta para que el sistema envíe el mapa interactivo automáticamente.`
    );
  }

  // Envíos
  if (config.shippingEnabled && config.shippingZones.length > 0) {
    let shippingText = "POLÍTICA DE ENVÍOS (DELIVERY):\n";
    config.shippingZones.forEach((z) => {
      shippingText += `- ${z.label}: de ${z.minKm} a ${z.maxKm} km → Costo: Bs. ${z.cost}\n`;
    });
    if (config.shippingFreeAbove) {
      shippingText += `- Envío GRATIS en compras mayores a Bs. ${config.shippingFreeAbove}\n`;
    }
    shippingText +=
      "- Cuando el cliente quiera delivery, pídele que comparta su ubicación en Telegram usando el botón de adjuntar → Ubicación para calcular el costo exacto.";
    sections.push(shippingText);
  }

  // Pagos
  const paymentMethods: string[] = [];
  if (config.paymentQrUrl) {
    paymentMethods.push(
      `- QR de Pago (${config.paymentQrLabel}): Cuando el cliente acepte pagar o quiera los datos de pago, incluye el marcador [SEND_QR] en tu respuesta para que el sistema envíe la imagen del QR automáticamente.`
    );
  }
  if (config.bankTransfer.enabled && config.bankTransfer.bankName) {
    paymentMethods.push(
      `- Transferencia Bancaria:\n  Banco: ${config.bankTransfer.bankName}\n  Tipo de cuenta: ${config.bankTransfer.accountType}\n  Nro. de Cuenta: ${config.bankTransfer.accountNumber}\n  Titular: ${config.bankTransfer.accountHolder}\n  CI/NIT: ${config.bankTransfer.idNumber}`
    );
  }
  if (paymentMethods.length > 0) {
    sections.push("MÉTODOS DE PAGO DISPONIBLES:\n" + paymentMethods.join("\n"));
  }

  // Reservas
  if (config.reservationEnabled) {
    sections.push(
      `POLÍTICA DE RESERVAS:\n- El cliente puede reservar/apartar un producto abonando el ${config.reservationPercentage}% del precio.\n- La reserva tiene una vigencia de ${config.reservationExpiryHours} horas.\n- Si el cliente pregunta cómo reservar, calcula el monto del ${config.reservationPercentage}% sobre el precio del producto y ofrécele los métodos de pago disponibles.`
    );
  }

  return sections.length > 0
    ? "\n\nINFORMACIÓN COMERCIAL DEL NEGOCIO:\n" + sections.join("\n\n")
    : "";
}

// ─── Main service ──────────────────────────────────────────────

export class AgentExecutorService {
  static async processMessage(params: {
    organizationId: string;
    conversationId: string;
    content: string;
    providerMessageId?: string;
    locationContext?: string; // Extra context when the customer shares a location
  }) {
    const { organizationId, conversationId, content, providerMessageId, locationContext } = params;

    // 1. Load sales config
    const salesIntegration = await prisma.integration.findFirst({
      where: { organizationId, type: "SALES_CONFIG" },
    });
    const salesConfig: SalesConfig = salesIntegration
      ? { ...DEFAULT_SALES_CONFIG, ...(salesIntegration.config as Partial<SalesConfig>) }
      : { ...DEFAULT_SALES_CONFIG };

    // 2. Check business hours
    if (!isWithinBusinessHours(salesConfig)) {
      // Save user message and return off-hours message without consuming AI tokens
      if (providerMessageId) {
        const existing = await prisma.message.findUnique({ where: { providerMessageId } });
        if (existing) return salesConfig.offHoursMessage;
      }

      await prisma.message.create({
        data: { organizationId, conversationId, role: "USER", content, providerMessageId },
      });
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
      await prisma.message.create({
        data: { organizationId, conversationId, role: "ASSISTANT", content: salesConfig.offHoursMessage },
      });
      return salesConfig.offHoursMessage;
    }

    // 3. Check human handoff keywords
    if (checkHumanHandoff(content, salesConfig)) {
      if (providerMessageId) {
        const existing = await prisma.message.findUnique({ where: { providerMessageId } });
        if (existing) return "Tu mensaje ha sido transferido a un agente humano.";
      }

      await prisma.message.create({
        data: { organizationId, conversationId, role: "USER", content, providerMessageId },
      });

      // Pause conversation so human agent takes over
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { status: "PAUSED", updatedAt: new Date() },
      });

      const handoffReply =
        "Entendido, te estoy transfiriendo con un asesor humano. En breve te responderá. ¡Gracias por tu paciencia! 🙏";
      await prisma.message.create({
        data: { organizationId, conversationId, role: "ASSISTANT", content: handoffReply },
      });

      return handoffReply;
    }

    // 4. Deduplicate by provider message ID
    if (providerMessageId) {
      const existing = await prisma.message.findUnique({
        where: { providerMessageId },
      });
      if (existing) {
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

    // 5. Obtener la configuración del agente
    const agent = await prisma.agent.findUnique({
      where: { organizationId },
    });

    if (!agent) {
      throw new Error("No hay un agente configurado para esta organización.");
    }

    // 6. Buscar productos en la base de datos que coincidan
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

    // 7. Build personality prefix
    const personalityText =
      salesConfig.personalityPreset !== "custom"
        ? PERSONALITY_PRESETS[salesConfig.personalityPreset] + "\n\n"
        : "";

    // 8. Build sales context
    const salesContext = buildSalesContext(salesConfig);

    // 9. Location context (if customer shared location via Telegram)
    const locationBlock = locationContext ? `\n\nCONTEXTO DE UBICACIÓN DEL CLIENTE:\n${locationContext}` : "";

    const systemInstruction = `${personalityText}${agent.promptBase}

INFORMACIÓN ADICIONAL DE STOCK PARA LA RESPUESTA:
${productContext}
${salesContext}
${locationBlock}

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
5. SIEMPRE termina con una pregunta que lleve a la venta.
6. Los marcadores [SEND_LOCATION], [SEND_QR] son instrucciones para el sistema. Inclúyelos en tu respuesta SOLO cuando corresponda según las reglas anteriores. NO los muestres como texto visible; simplemente colócalos al final de tu mensaje.`;

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

    // 10. Guardar respuesta del bot (sin los marcadores del sistema)
    const cleanReply = botReply
      .replace(/\[SEND_LOCATION\]/g, "")
      .replace(/\[SEND_QR\]/g, "")
      .trim();

    await prisma.message.create({
      data: {
        organizationId,
        conversationId,
        role: "ASSISTANT",
        content: cleanReply,
      }
    });

    // Return the raw reply (with markers) so the webhook can process them
    return botReply;
  }
}
