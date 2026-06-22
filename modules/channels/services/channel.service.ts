import { getOrganizationContext } from "@/lib/tenant"
import { ChannelRepository } from "../repositories/channel.repository"

export class ChannelService {
  static async getWhatsappChannel() {
    const organizationId = await getOrganizationContext()
    return ChannelRepository.getWhatsappChannel(organizationId)
  }

  static async getTelegramChannel() {
    const organizationId = await getOrganizationContext()
    return ChannelRepository.getTelegramChannel(organizationId)
  }

  static async updateWhatsappChannel(data: { phoneNumberId: string; accessToken: string }) {
    const organizationId = await getOrganizationContext()
    return ChannelRepository.updateWhatsappChannel(organizationId, data)
  }

  static async updateTelegramChannel(data: { accessToken: string }) {
    const organizationId = await getOrganizationContext()
    return ChannelRepository.updateTelegramChannel(organizationId, data)
  }

  static async updateOrganizationName(name: string) {
    const organizationId = await getOrganizationContext()
    return ChannelRepository.updateOrganizationName(organizationId, name)
  }
}
