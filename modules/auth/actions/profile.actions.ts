"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { getCurrentSession } from "./auth.actions"
import { ActionResponse } from "./auth.actions"
import { AuthService } from "../services/auth.service"

const COOKIE_NAME = "phron_session"

export async function updateProfileOrCreateAction(formData: {
  fullName: string
  email: string
  password?: string
}): Promise<ActionResponse> {
  const session = await getCurrentSession()
  if (!session) {
    return { success: false, error: "No tienes una sesión activa" }
  }

  try {
    const dataToUpdate: Record<string, any> = {
      name: formData.fullName,
      email: formData.email,
    }

    if (formData.password && formData.password.trim().length > 0) {
      dataToUpdate.passwordHash = await AuthService.hashPassword(formData.password)
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: dataToUpdate,
    })

    // Generar un nuevo token para refrescar la sesión del usuario
    const newToken = await AuthService.generateToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.name,
      organizationId: updatedUser.organizationId || "",
      role: updatedUser.role,
    })

    const cookieStore = await cookies()
    cookieStore.set({
      name: COOKIE_NAME,
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 día
      path: "/",
    })

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/settings")
    return { success: true }
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "El correo electrónico ya está registrado por otro usuario" }
    }
    return { success: false, error: error.message || "Error al actualizar el perfil" }
  }
}
