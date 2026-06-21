import { getCurrentSession } from "@/modules/auth/actions/auth.actions"
import { prisma } from "./prisma"

/**
 * Obtiene el organizationId del Tenant activo desde la sesión del backend.
 * Lanza un error si el usuario no está autenticado, evitando cualquier manipulación del frontend.
 */
export async function getOrganizationContext(): Promise<string> {
  const session = await getCurrentSession()
  
  if (!session || !session.organizationId) {
    throw new Error("No autorizado: Sesión de Tenant no encontrada")
  }
  
  return session.organizationId
}

/**
 * Obtiene los metadatos completos de la organización activa del Tenant.
 */
export async function getCurrentOrganization() {
  const organizationId = await getOrganizationContext()
  
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      currency: true,
    }
  })

  if (!organization) {
    throw new Error("Negocio/Organización no encontrada en la base de datos")
  }

  return organization
}
