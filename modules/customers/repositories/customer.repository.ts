import { prisma } from "@/lib/prisma"
import { CustomerInput } from "../validators/customer.validator"

export class CustomerRepository {
  static async listCustomers(organizationId: string) {
    return prisma.customer.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    })
  }

  static async findCustomerById(organizationId: string, id: string) {
    return prisma.customer.findFirst({
      where: { id, organizationId, deletedAt: null },
    })
  }

  static async findCustomerByPhone(organizationId: string, phoneNumber: string) {
    return prisma.customer.findFirst({
      where: { phoneNumber, organizationId, deletedAt: null },
    })
  }

  static async createCustomer(organizationId: string, data: CustomerInput) {
    // 1. Validar unicidad del teléfono dentro de este Tenant
    const existing = await this.findCustomerByPhone(organizationId, data.phoneNumber)
    if (existing) {
      throw new Error(`El número de teléfono "${data.phoneNumber}" ya está registrado para otro cliente`)
    }

    return prisma.customer.create({
      data: {
        organizationId,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        labels: data.labels,
      },
    })
  }

  static async updateCustomer(organizationId: string, id: string, data: CustomerInput) {
    // 1. Validar que exista el cliente
    const customer = await this.findCustomerById(organizationId, id)
    if (!customer) {
      throw new Error("El cliente no existe o fue eliminado")
    }

    // 2. Validar teléfono único en caso de cambio
    if (customer.phoneNumber !== data.phoneNumber) {
      const dupe = await this.findCustomerByPhone(organizationId, data.phoneNumber)
      if (dupe) {
        throw new Error(`El número de teléfono "${data.phoneNumber}" ya está registrado`)
      }
    }

    return prisma.customer.update({
      where: { id },
      data: {
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        labels: data.labels,
      },
    })
  }

  static async deleteCustomer(organizationId: string, id: string) {
    const customer = await this.findCustomerById(organizationId, id)
    if (!customer) {
      throw new Error("El cliente no existe o ya fue eliminado")
    }

    // Soft delete para resguardar la consistencia de los historiales de chats
    return prisma.customer.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    })
  }
}
