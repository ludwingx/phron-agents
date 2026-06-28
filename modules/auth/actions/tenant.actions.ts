"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getCurrentSession } from "@/modules/auth/actions/auth.actions"
import { ActionResponse } from "@/modules/auth/actions/auth.actions"

const ACTIVE_ORG_COOKIE = "phron_active_org"

// Obtener todas las organizaciones asociadas al usuario actual
export async function listUserOrganizationsAction(): Promise<ActionResponse<{ id: string; name: string; currency: string }[]>> {
  const session = await getCurrentSession()
  if (!session) {
    return { success: false, error: "No autorizado: Sesión de usuario no encontrada" }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
      },
    })

    return { success: true, data: user?.organizations || [] }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al listar negocios" }
  }
}

// Cambiar la organización activa configurando la cookie
export async function switchOrganizationAction(organizationId: string): Promise<ActionResponse<{ success: boolean }>> {
  const session = await getCurrentSession()
  if (!session) {
    return { success: false, error: "No autorizado" }
  }

  try {
    // Verificar membresía
    const isMember = await prisma.user.findFirst({
      where: {
        id: session.userId,
        OR: [
          { organizationId: organizationId },
          {
            organizations: {
              some: { id: organizationId },
            },
          },
        ],
      },
    })

    if (!isMember) {
      return { success: false, error: "No tienes acceso a este negocio" }
    }

    // Actualizar organización activa por defecto del perfil en la BD
    await prisma.user.update({
      where: { id: session.userId },
      data: { organizationId },
    })

    // Guardar en la cookie
    const cookieStore = await cookies()
    cookieStore.set({
      name: ACTIVE_ORG_COOKIE,
      value: organizationId,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 días
      sameSite: "lax",
    })

    revalidatePath("/dashboard")
    return { success: true, data: { success: true } }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al cambiar de negocio" }
  }
}

// Crear un nuevo negocio y dejarlo seleccionado automáticamente
export async function createOrganizationAction(name: string, currency: string): Promise<ActionResponse<{ id: string }>> {
  const session = await getCurrentSession()
  if (!session) {
    return { success: false, error: "No autorizado: Sesión no encontrada" }
  }

  if (!name.trim()) {
    return { success: false, error: "El nombre del negocio es requerido" }
  }

  try {
    const newOrg = await prisma.$transaction(async (tx) => {
      // 1. Crear Organización
      const org = await tx.organization.create({
        data: {
          name: name.trim(),
          currency: currency.trim() || "USD",
          users: {
            connect: { id: session.userId },
          },
        },
      })

      // 2. Crear agente IA por defecto para este negocio
      await tx.agent.create({
        data: {
          organizationId: org.id,
          promptBase: `Eres Sofía, la asesora de ventas de ${name.trim()} por WhatsApp. Tu objetivo es vender de forma cordial y directa.`,
          temperature: 0.1,
          dailyLimit: 100,
        },
      })

      // 3. Vincular como organización activa por defecto en el perfil
      await tx.user.update({
        where: { id: session.userId },
        data: { organizationId: org.id },
      })

      return org
    })

    // Guardar en cookie
    const cookieStore = await cookies()
    cookieStore.set({
      name: ACTIVE_ORG_COOKIE,
      value: newOrg.id,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })

    revalidatePath("/dashboard")
    return { success: true, data: { id: newOrg.id } }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al crear el negocio" }
  }
}
