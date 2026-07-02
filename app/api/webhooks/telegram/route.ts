import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AgentExecutorService } from "@/modules/agents/services/agent-executor.service";

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

    // Las actualizaciones de Telegram pueden ser de varios tipos, nos interesan los mensajes de texto
    const message = body.message;
    if (!message || !message.text || !message.chat || !message.from) {
      // Retornamos 200 para que Telegram no reintente con actualizaciones no soportadas (ej: imágenes, ubicaciones, etc.)
      return NextResponse.json({ success: true, message: "Ignored non-text or empty update" });
    }

    const chatId = message.chat.id.toString();
    const telegramId = message.from.id.toString();
    const firstName = message.from.first_name || "";
    const lastName = message.from.last_name || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || `Usuario Telegram (${telegramId})`;
    const textContent = message.text;
    const messageId = message.message_id.toString();

    const organizationId = channel.organizationId;

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

    // Si la conversación está pausada (ej. transferida a agente humano), guardamos el mensaje pero no responde la IA
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

      // Actualizar updatedAt de la conversación
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
    });

    // 5. Enviar la respuesta de vuelta a Telegram
    const tgResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: botReply,
      }),
    });

    if (!tgResponse.ok) {
      console.error("Fallo al enviar mensaje a Telegram:", await tgResponse.text());
    }

    return NextResponse.json({ success: true, reply: botReply });
  } catch (error) {
    console.error("Error en Webhook de Telegram:", error);
    // Siempre retornar 200 a Telegram para evitar bucles de reintento si falla OpenRouter o la DB
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Error" }, { status: 200 });
  }
}
