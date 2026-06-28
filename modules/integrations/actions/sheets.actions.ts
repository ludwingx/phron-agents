"use server"

import { revalidatePath } from "next/cache"
import { GoogleSheetsService } from "../services/sheets.service"
import { ActionResponse } from "@/modules/auth/actions/auth.actions"
import { getOrganizationContext } from "@/lib/tenant"
import { prisma } from "@/lib/prisma"

const INTEGRATION_TYPE = "GOOGLE_SHEETS"

// Obtener la integración de Google Sheets guardada
export async function getGoogleSheetIntegration(): Promise<ActionResponse<{ spreadsheetUrl: string; lastSyncAt: string | null }>> {
  try {
    const organizationId = await getOrganizationContext()

    const integration = await prisma.integration.findFirst({
      where: { organizationId, type: INTEGRATION_TYPE },
    })

    if (!integration) {
      return { success: true, data: { spreadsheetUrl: "", lastSyncAt: null } }
    }

    const config = integration.config as Record<string, unknown>
    return {
      success: true,
      data: {
        spreadsheetUrl: (config.spreadsheetUrl as string) || "",
        lastSyncAt: integration.updatedAt.toISOString(),
      },
    }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Error al obtener integración" }
  }
}

// Guardar/actualizar la URL de Google Sheets sin sincronizar
export async function saveGoogleSheetUrlAction(spreadsheetUrl: string): Promise<ActionResponse<{ saved: boolean }>> {
  if (!spreadsheetUrl.trim()) {
    return { success: false, error: "La URL de Google Sheets es requerida" }
  }

  try {
    const organizationId = await getOrganizationContext()

    const existing = await prisma.integration.findFirst({
      where: { organizationId, type: INTEGRATION_TYPE },
    })

    if (existing) {
      await prisma.integration.update({
        where: { id: existing.id },
        data: { config: { spreadsheetUrl } },
      })
    } else {
      await prisma.integration.create({
        data: {
          organizationId,
          type: INTEGRATION_TYPE,
          config: { spreadsheetUrl },
        },
      })
    }

    revalidatePath("/dashboard/integrations")
    return { success: true, data: { saved: true } }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Error al guardar enlace" }
  }
}

// Sincronizar inventario Y guardar la URL automáticamente
export async function syncGoogleSheetAction(spreadsheetUrl: string): Promise<ActionResponse<{ rowsSynced: number }>> {
  if (!spreadsheetUrl) {
    return { success: false, error: "La URL de Google Sheets es requerida" }
  }

  try {
    const organizationId = await getOrganizationContext()

    // Sincronizar inventario
    const res = await GoogleSheetsService.syncInventoryFromSheet(spreadsheetUrl)

    // Guardar/actualizar la URL en la tabla Integration automáticamente
    const existing = await prisma.integration.findFirst({
      where: { organizationId, type: INTEGRATION_TYPE },
    })

    if (existing) {
      await prisma.integration.update({
        where: { id: existing.id },
        data: { config: { spreadsheetUrl } },
      })
    } else {
      await prisma.integration.create({
        data: {
          organizationId,
          type: INTEGRATION_TYPE,
          config: { spreadsheetUrl },
        },
      })
    }

    revalidatePath("/dashboard/products")
    revalidatePath("/dashboard/integrations")
    revalidatePath("/dashboard")
    return { success: true, data: res }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Error al sincronizar Google Sheets" }
  }
}
