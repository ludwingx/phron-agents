"use server"

import { revalidatePath } from "next/cache"
import { ActionResponse } from "@/modules/auth/actions/auth.actions"
import { getOrganizationContext } from "@/lib/tenant"
import { prisma } from "@/lib/prisma"

const INTEGRATION_TYPE = "SALES_CONFIG"

import {
  type SalesConfig,
  type BankTransfer,
  DEFAULT_SALES_CONFIG,
} from "../types"

// ─── Actions ───────────────────────────────────────────────────

export async function getSalesConfigAction(): Promise<ActionResponse<SalesConfig>> {
  try {
    const organizationId = await getOrganizationContext()

    const integration = await prisma.integration.findFirst({
      where: { organizationId, type: INTEGRATION_TYPE },
    })

    if (!integration) {
      return { success: true, data: { ...DEFAULT_SALES_CONFIG } }
    }

    // Merge saved config with defaults so new fields get defaults automatically
    const saved = integration.config as Record<string, unknown>
    const merged: SalesConfig = {
      ...DEFAULT_SALES_CONFIG,
      ...(saved as Partial<SalesConfig>),
      businessHours: {
        ...DEFAULT_SALES_CONFIG.businessHours,
        ...((saved.businessHours as Partial<SalesConfig["businessHours"]>) || {}),
      },
      bankTransfer: {
        ...DEFAULT_SALES_CONFIG.bankTransfer,
        ...((saved.bankTransfer as Partial<BankTransfer>) || {}),
      },
    }

    return { success: true, data: merged }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener configuración de ventas",
    }
  }
}

export async function updateSalesConfigAction(
  data: SalesConfig
): Promise<ActionResponse> {
  try {
    const organizationId = await getOrganizationContext()

    const existing = await prisma.integration.findFirst({
      where: { organizationId, type: INTEGRATION_TYPE },
    })

    if (existing) {
      await prisma.integration.update({
        where: { id: existing.id },
        data: { config: data as unknown as Record<string, unknown> },
      })
    } else {
      await prisma.integration.create({
        data: {
          organizationId,
          type: INTEGRATION_TYPE,
          config: data as unknown as Record<string, unknown>,
        },
      })
    }

    revalidatePath("/dashboard/sales-config")
    return { success: true }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al guardar configuración de ventas",
    }
  }
}
