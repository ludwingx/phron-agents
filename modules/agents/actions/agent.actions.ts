"use server"

import { revalidatePath } from "next/cache"
import { AgentService } from "../services/agent.service"
import { ActionResponse } from "@/modules/auth/actions/auth.actions"

export async function getAgentAction() {
  try {
    const agent = await AgentService.getAgent()
    // Serializar Decimal a number para compatibilidad con componentes cliente
    return {
      success: true as const,
      data: {
        ...agent,
        temperature: Number(agent.temperature),
      },
    }
  } catch (error: any) {
    return { success: false as const, error: error.message || "Error al cargar configuración de la IA" }
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
    return { success: false, error: error.message || "Error al actualizar configuración de la IA" }
  }
}
