import { getOrganizationContext } from "@/lib/tenant"
import { AgentRepository } from "../repositories/agent.repository"

export class AgentService {
  static async getAgent() {
    const organizationId = await getOrganizationContext()
    return AgentRepository.getAgent(organizationId)
  }

  static async updateAgent(data: { promptBase: string; temperature: number; dailyLimit: number }) {
    const organizationId = await getOrganizationContext()
    return AgentRepository.updateAgent(organizationId, data)
  }
}
