import { prisma } from "@/lib/prisma"
import { ProductInput } from "../validators/product.validator"
import { Prisma } from "@prisma/client"

export class ProductRepository {
  static async listProducts(organizationId: string) {
    return prisma.product.findMany({
      where: { organizationId, deletedAt: null },
      include: { variants: true },
      orderBy: { createdAt: "desc" },
    })
  }

  static async findProductById(organizationId: string, id: string) {
    return prisma.product.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { variants: true },
    })
  }

  static async findProductBySku(organizationId: string, sku: string) {
    return prisma.product.findFirst({
      where: { sku, organizationId, deletedAt: null },
    })
  }

  static async createProduct(organizationId: string, data: ProductInput) {
    return prisma.$transaction(async (tx) => {
      // 1. Validar que el SKU no esté duplicado en esta organización
      const existing = await tx.product.findFirst({
        where: { sku: data.sku, organizationId, deletedAt: null },
      })
      if (existing) {
        throw new Error(`Ya existe un producto con el SKU "${data.sku}"`)
      }

      // 2. Crear producto
      const product = await tx.product.create({
        data: {
          organizationId,
          sku: data.sku,
          name: data.name,
          description: data.description || "",
          imageUrl: data.imageUrl || "",
          price: new Prisma.Decimal(data.price),
        },
      })

      // 3. Crear variantes asociadas
      const variantsData = data.variants.map((v) => ({
        productId: product.id,
        attributes: v.attributes as Prisma.JsonObject,
        stock: v.stock,
      }))

      await tx.productVariant.createMany({
        data: variantsData,
      })

      return this.findProductById(organizationId, product.id)
    })
  }

  static async updateProduct(organizationId: string, id: string, data: ProductInput) {
    return prisma.$transaction(async (tx) => {
      // 1. Validar que el producto exista
      const product = await tx.product.findFirst({
        where: { id, organizationId, deletedAt: null },
      })
      if (!product) {
        throw new Error("El producto que intenta actualizar no existe")
      }

      // 2. Validar SKU único en caso de cambio
      if (product.sku !== data.sku) {
        const dupe = await tx.product.findFirst({
          where: { sku: data.sku, organizationId, deletedAt: null },
        })
        if (dupe) {
          throw new Error(`El SKU "${data.sku}" ya está registrado por otro producto`)
        }
      }

      // 3. Actualizar datos base del producto
      await tx.product.update({
        where: { id },
        data: {
          sku: data.sku,
          name: data.name,
          description: data.description || "",
          imageUrl: data.imageUrl || "",
          price: new Prisma.Decimal(data.price),
        },
      })

      // 4. Actualizar variantes de forma simple (borrado lógico/físico y recreación para el MVP)
      await tx.productVariant.deleteMany({
        where: { productId: id },
      })

      const variantsData = data.variants.map((v) => ({
        productId: id,
        attributes: v.attributes as Prisma.JsonObject,
        stock: v.stock,
      }))

      await tx.productVariant.createMany({
        data: variantsData,
      })

      return this.findProductById(organizationId, id)
    })
  }

  static async deleteProduct(organizationId: string, id: string) {
    const product = await prisma.product.findFirst({
      where: { id, organizationId, deletedAt: null },
    })
    
    if (!product) {
      throw new Error("El producto no existe o ya fue eliminado")
    }

    // Estrategia Soft Delete para resguardar órdenes e integridad referencial
    return prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    })
  }
}
