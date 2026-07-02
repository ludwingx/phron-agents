import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AgentExecutorService } from "@/modules/agents/services/agent-executor.service";
import { haversineDistance } from "@/lib/haversine";
import type { SalesConfig } from "@/modules/sales-config/types";
import { DEFAULT_SALES_CONFIG } from "@/modules/sales-config/types";

// ─── Telegram API helpers ──────────────────────────────────────

async function sendTelegramMessage(token: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function sendTelegramLocation(
  token: string,
  chatId: string,
  latitude: number,
  longitude: number
) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendLocation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, latitude, longitude }),
  });
  if (!res.ok) {
    console.error("Fallo al enviar ubicación a Telegram:", await res.text());
  }
}

async function sendTelegramPhoto(
  token: string,
  chatId: string,
  photoUrl: string,
  caption?: string
) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      ...(caption ? { caption } : {}),
    }),
  });
  if (!res.ok) {
    console.error("Fallo al enviar foto a Telegram:", await res.text());
  }
}

// ─── Load sales config for the org ─────────────────────────────

async function loadSalesConfig(organizationId: string): Promise<SalesConfig> {
  const integration = await prisma.integration.findFirst({
    where: { organizationId, type: "SALES_CONFIG" },
  });
  if (!integration) return { ...DEFAULT_SALES_CONFIG };
  return {
    ...DEFAULT_SALES_CONFIG,
    ...(integration.config as Partial<SalesConfig>),
  };
}

// ─── Process special markers in AI response ────────────────────

async function processSpecialMarkers(
  botReply: string,
  token: string,
  chatId: string,
  salesConfig: SalesConfig
) {
  // Send location if marker present
  if (
    botReply.includes("[SEND_LOCATION]") &&
    salesConfig.businessLatitude != null &&
    salesConfig.businessLongitude != null
  ) {
    await sendTelegramLocation(
      token,
      chatId,
      salesConfig.businessLatitude,
      salesConfig.businessLongitude
    );
  }

  // Send QR photo if marker present
  if (botReply.includes("[SEND_QR]") && salesConfig.paymentQrUrl) {
    await sendTelegramPhoto(
      token,
      chatId,
      salesConfig.paymentQrUrl,
      salesConfig.paymentQrLabel || "Escanea para pagar"
    );
  }
}

// ─── Main webhook handler ──────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // 1. Validar el token y obtener el canal de Telegram
    const channel = await prisma.channel.findFirst({
      where: {
        accessToken: token,
        type: "TELEGRAM",
      },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const body = await req.json();
    const message = body.message;

    if (!message || !message.chat || !message.from) {
      return NextResponse.json({ success: true, message: "Ignored empty update" });
    }

    const chatId = message.chat.id.toString();
    const telegramId = message.from.id.toString();
    const firstName = message.from.first_name || "";
    const lastName = message.from.last_name || "";
    const fullName =
      [firstName, lastName].filter(Boolean).join(" ") || `Usuario Telegram (${telegramId})`;
    const organizationId = channel.organizationId;

    // Determine message content and optional location context
    let textContent: string;
    let locationContext: string | undefined;

    if (message.location) {
      // Customer shared their location — calculate shipping distance
      const customerLat = message.location.latitude;
      const customerLon = message.location.longitude;
      const salesConfig = await loadSalesConfig(organizationId);

      if (
        salesConfig.shippingEnabled &&
        salesConfig.businessLatitude != null &&
        salesConfig.businessLongitude != null
      ) {
        const distance = haversineDistance(
          salesConfig.businessLatitude,
          salesConfig.businessLongitude,
          customerLat,
          customerLon
        );

        // Find matching shipping zone
        const matchedZone = salesConfig.shippingZones.find(
          (z) => distance >= z.minKm && distance <= z.maxKm
        );

        if (matchedZone) {
          locationContext = `El cliente compartió su ubicación. Está a ${distance} km de la tienda (${matchedZone.label}). El costo de envío a su zona es Bs. ${matchedZone.cost}.`;
          if (
            salesConfig.shippingFreeAbove &&
            salesConfig.shippingFreeAbove > 0
          ) {
            locationContext += ` Recuerda: envío gratis en compras mayores a Bs. ${salesConfig.shippingFreeAbove}.`;
          }
        } else {
          locationContext = `El cliente compartió su ubicación. Está a ${distance} km de la tienda, lo cual está FUERA de la zona de cobertura de delivery. Mensaje sugerido: "${salesConfig.outOfRangeMessage}"`;
        }
      } else {
        locationContext = `El cliente compartió su ubicación (lat: ${customerLat}, lon: ${customerLon}), pero el envío por distancia no está configurado.`;
      }

      textContent = `[El cliente compartió su ubicación GPS]`;
    } else if (message.text) {
      textContent = message.text;
    } else {
      // Non-text, non-location update — ignore
      return NextResponse.json({
        success: true,
        message: "Ignored non-text/non-location update",
      });
    }

    const messageId = message.message_id.toString();

    // 2. Buscar o crear el cliente usando telegramId
    let customer = await prisma.customer.findUnique({
      where: {
        organizationId_telegramId: {
          organizationId,
          telegramId,
        },
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          organizationId,
          telegramId,
          fullName,
        },
      });
    }

    // 3. Buscar o crear la conversación
    let conversation = await prisma.conversation.findUnique({
      where: {
        customerId_channelId: {
          customerId: customer.id,
          channelId: channel.id,
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          organizationId,
          customerId: customer.id,
          channelId: channel.id,
          status: "ACTIVE_IA",
        },
      });
    }

    // Si la conversación está pausada (transferida a agente humano), guardamos el mensaje pero no responde la IA
    if (conversation.status !== "ACTIVE_IA") {
      await prisma.message.create({
        data: {
          organizationId,
          conversationId: conversation.id,
          role: "USER",
          content: textContent,
          providerMessageId: `tg-${messageId}`,
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });

      return NextResponse.json({ success: true, message: "Message saved, IA is paused" });
    }

    // 4. Procesar mensaje del usuario y generar respuesta de la IA
    const botReply = await AgentExecutorService.processMessage({
      organizationId,
      conversationId: conversation.id,
      content: textContent,
      providerMessageId: `tg-${messageId}`,
      locationContext,
    });

    // 5. Clean markers and send the text response
    const cleanReply = botReply
      .replace(/\[SEND_LOCATION\]/g, "")
      .replace(/\[SEND_QR\]/g, "")
      .trim();

    if (cleanReply) {
      const tgResponse = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: cleanReply }),
        }
      );

      if (!tgResponse.ok) {
        console.error("Fallo al enviar mensaje a Telegram:", await tgResponse.text());
      }
    }

    // 6. Process special markers (send location map, QR photo, etc.)
    const salesConfig = await loadSalesConfig(organizationId);
    await processSpecialMarkers(botReply, token, chatId, salesConfig);

    return NextResponse.json({ success: true, reply: cleanReply });
  } catch (error) {
    console.error("Error en Webhook de Telegram:", error);
    // Siempre retornar 200 a Telegram para evitar bucles de reintento si falla OpenRouter o la DB
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Error" },
      { status: 200 }
    );
  }
}
