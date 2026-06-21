import { getOrganizationContext } from "@/lib/tenant"
import { ProductRepository } from "../repositories/product.repository"
import { ProductInput } from "../validators/product.validator"

export class ProductService {
  static async listProducts() {
    const organizationId = await getOrganizationContext()
    return ProductRepository.listProducts(organizationId)
  }

  static async findProductById(id: string) {
    const organizationId = await getOrganizationContext()
    return ProductRepository.findProductById(organizationId, id)
  }

  static async createProduct(data: ProductInput) {
    const organizationId = await getOrganizationContext()
    return ProductRepository.createProduct(organizationId, data)
  }

  static async updateProduct(id: string, data: ProductInput) {
    const organizationId = await getOrganizationContext()
    return ProductRepository.updateProduct(organizationId, id, data)
  }

  static async deleteProduct(id: string) {
    const organizationId = await getOrganizationContext()
    return ProductRepository.deleteProduct(organizationId, id)
  }
}
