import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export class AuthRepository {
  static async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    })
  }

  static async registerOrganizationAndAdmin(data: {
    fullName: string
    email: string
    passwordHash: string
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Crear Organización por defecto en segundo plano
      const organization = await tx.organization.create({
        data: {
          name: `Espacio de ${data.fullName}`,
        },
      })

      // 2. Crear Usuario Administrador
      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          name: data.fullName,
          email: data.email,
          passwordHash: data.passwordHash,
          role: UserRole.ADMIN,
        },
      })

      return { organization, user }
    })
  }
}
