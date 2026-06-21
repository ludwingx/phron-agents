"use server"

import { revalidatePath } from "next/cache"
import { GoogleSheetsService } from "../services/sheets.service"
import { ActionResponse } from "@/modules/auth/actions/auth.actions"

export async function syncGoogleSheetAction(spreadsheetUrl: string): Promise<ActionResponse<{ rowsSynced: number }>> {
  if (!spreadsheetUrl) {
    return { success: false, error: "La URL de Google Sheets es requerida" }
  }

  try {
    const res = await GoogleSheetsService.syncInventoryFromSheet(spreadsheetUrl)
    revalidatePath("/dashboard/products")
    revalidatePath("/dashboard")
    return { success: true, data: res }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al sincronizar Google Sheets" }
  }
}
