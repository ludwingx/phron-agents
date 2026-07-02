"use server"

import { revalidatePath } from "next/cache"
import { ChannelService } from "../services/channel.service"
import { ActionResponse } from "@/modules/auth/actions/auth.actions"
import { prisma } from "@/lib/prisma"
import { getOrganizationContext, getCurrentOrganization } from "@/lib/tenant"

export async function getCurrentOrganizationAction() {
  try {
    const org = await getCurrentOrganization()
    return { success: true as const, data: org }
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error al obtener organización" }
  }
}

export async function getWhatsappChannelAction() {
  try {
    const channel = await ChannelService.getWhatsappChannel()
    return { success: true as const, data: channel }
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error al obtener canal" }
  }
}

export async function getTelegramChannelAction() {
  try {
    const channel = await ChannelService.getTelegramChannel()
    return { success: true as const, data: channel }
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error al obtener canal de Telegram" }
  }
}

export async function updateWhatsappChannelAction(data: {
  phoneNumberId: string
  accessToken: string
}): Promise<ActionResponse> {
  try {
    await ChannelService.updateWhatsappChannel(data)
    revalidatePath("/dashboard/settings")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Error al actualizar WhatsApp API" }
  }
}

export async function updateTelegramChannelAction(data: {
  accessToken: string
}): Promise<ActionResponse> {
  try {
    await ChannelService.updateTelegramChannel(data)

    // Registrar el webhook automáticamente con Telegram si tenemos una URL de la app
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://phronagents.com"
    if (appUrl.startsWith("https://")) {
      const webhookUrl = `${appUrl}/api/webhooks/telegram?token=${data.accessToken}`
      const tgRes = await fetch(`https://api.telegram.org/bot${data.accessToken}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl })
      })

      if (!tgRes.ok) {
        console.error("Fallo al registrar webhook en Telegram:", await tgRes.text())
      } else {
        console.log("Webhook de Telegram registrado correctamente:", webhookUrl)
      }
    }

    revalidatePath("/dashboard/settings")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Error al actualizar Telegram Bot API" }
  }
}

export async function updateOrganizationAction(data: { name: string; currency: string }): Promise<ActionResponse> {
  try {
    const organizationId = await getOrganizationContext()
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: data.name,
        currency: data.currency,
      },
    })
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/settings")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Error al actualizar organización" }
  }
}
