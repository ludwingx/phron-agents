import { getOrganizationContext } from "@/lib/tenant"
import { CustomerRepository } from "../repositories/customer.repository"
import { CustomerInput } from "../validators/customer.validator"

export class CustomerService {
  static async listCustomers() {
    const organizationId = await getOrganizationContext()
    return CustomerRepository.listCustomers(organizationId)
  }

  static async findCustomerById(id: string) {
    const organizationId = await getOrganizationContext()
    return CustomerRepository.findCustomerById(organizationId, id)
  }

  static async createCustomer(data: CustomerInput) {
    const organizationId = await getOrganizationContext()
    return CustomerRepository.createCustomer(organizationId, data)
  }

  static async updateCustomer(id: string, data: CustomerInput) {
    const organizationId = await getOrganizationContext()
    return CustomerRepository.updateCustomer(organizationId, id, data)
  }

  static async deleteCustomer(id: string) {
    const organizationId = await getOrganizationContext()
    return CustomerRepository.deleteCustomer(organizationId, id)
  }
}
