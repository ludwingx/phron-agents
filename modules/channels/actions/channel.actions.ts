"use server"

import { revalidatePath } from "next/cache"
import { ChannelService } from "../services/channel.service"
import { ActionResponse } from "@/modules/auth/actions/auth.actions"

export async function getWhatsappChannelAction() {
  try {
    const channel = await ChannelService.getWhatsappChannel()
    return { success: true as const, data: channel }
  } catch (error: any) {
    return { success: false as const, error: error.message || "Error al obtener canal" }
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
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar WhatsApp API" }
  }
}

export async function updateOrganizationNameAction(name: string): Promise<ActionResponse> {
  try {
    await ChannelService.updateOrganizationName(name)
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/settings")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar organización" }
  }
}
