import { prisma } from "@/lib/prisma"
import { ChannelType } from "@prisma/client"

export class ChannelRepository {
  static async getWhatsappChannel(organizationId: string) {
    return prisma.channel.findFirst({
      where: { organizationId, type: ChannelType.WHATSAPP },
    })
  }

  static async updateWhatsappChannel(organizationId: string, data: {
    phoneNumberId: string
    accessToken: string
  }) {
    const existing = await this.getWhatsappChannel(organizationId)

    if (existing) {
      return prisma.channel.update({
        where: { id: existing.id },
        data: {
          phoneNumberId: data.phoneNumberId,
          accessToken: data.accessToken,
        },
      })
    }

    return prisma.channel.create({
      data: {
        organizationId,
        type: ChannelType.WHATSAPP,
        phoneNumberId: data.phoneNumberId,
        accessToken: data.accessToken,
      },
    })
  }

  static async updateOrganizationName(organizationId: string, name: string) {
    return prisma.organization.update({
      where: { id: organizationId },
      data: { name },
    })
  }
}
