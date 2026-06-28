import { getCurrentSession } from "@/modules/auth/actions/auth.actions"
import { prisma } from "./prisma"
import { cookies } from "next/headers"

const ACTIVE_ORG_COOKIE = "phron_active_org"

/**
 * Obtiene el organizationId del Tenant activo desde cookies o perfil del usuario.
 */
export async function getOrganizationContext(): Promise<string> {
  const session = await getCurrentSession()
  if (!session) {
    throw new Error("No autorizado: Sesión de Tenant no encontrada")
  }

  // 1. Intentar obtener la cookie del negocio activo
  const cookieStore = await cookies()
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value

  if (activeOrgId) {
    // Validar membresía del usuario con este negocio
    const isMember = await prisma.user.findFirst({
      where: {
        id: session.userId,
        organizations: { some: { id: activeOrgId } },
      },
    })
    if (isMember) return activeOrgId
  }

  // 2. Si no hay cookie o no es miembro, leer el organizationId por defecto del perfil
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { organizationId: true },
  })

  if (user?.organizationId) {
    return user.organizationId
  }

  // 3. Fallback: Buscar la primera organización a la que pertenece
  const firstOrg = await prisma.organization.findFirst({
    where: {
      users: { some: { id: session.userId } },
    },
    select: { id: true },
  })

  return firstOrg?.id || ""
}

/**
 * Obtiene los metadatos completos de la organización activa del Tenant.
 */
export async function getCurrentOrganization() {
  const organizationId = await getOrganizationContext()
  if (!organizationId) {
    return null
  }
  
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      currency: true,
    }
  })

  return organization
}
