import { prisma } from "@/lib/prisma"
import { getOrganizationContext } from "@/lib/tenant"
import { Prisma } from "@prisma/client"

export class GoogleSheetsService {
  /**
   * Descarga y parsea la hoja de Google Sheets en formato CSV y sincroniza el inventario en Postgres.
   */
  static async syncInventoryFromSheet(spreadsheetUrl: string) {
    const organizationId = await getOrganizationContext()

    // 1. Extraer ID del documento de Google Sheets desde la URL
    const matches = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)
    if (!matches || !matches[1]) {
      throw new Error("URL de Google Sheets inválida. Asegúrate de copiar el enlace de edición.")
    }
    const spreadsheetId = matches[1]

    // Formatear a URL de exportación de CSV para descargar sin autenticación OAuth pesada
    // Asumimos por defecto la hoja principal (inventario1 / gid=0)
    const csvExportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`

    try {
      const response = await fetch(csvExportUrl)
      if (!response.ok) {
        throw new Error("No se pudo acceder a la hoja. Verifica que esté compartida como 'Cualquier persona con el enlace puede leer'.")
      }

      const csvText = await response.text()
      const rows = this.parseCSV(csvText)

      if (rows.length < 2) {
        throw new Error("El archivo de Google Sheets está vacío o no tiene el formato correcto.")
      }

      // Procesar e importar en transacciones Prisma con timeout ampliado (30 segundos)
      await prisma.$transaction(async (tx) => {
        // Marcamos los productos anteriores de este proyecto como inactivos temporalmente para hacer la sincronización limpia
        await tx.product.updateMany({
          where: { organizationId },
          data: { isActive: false }
        })

        // Mapeo dinámico de cabeceras
        const headers = rows[0].map(h => h.trim().toUpperCase())
        
        // Buscar índices basados en palabras clave comunes
        const nameIdx = headers.findIndex(h => h.includes("CONCEPTO") || h.includes("PRODUCTO") || h.includes("NOMBRE") || h.includes("ARTICULO") || h.includes("ARTÍCULO"))
        const qtyIdx = headers.findIndex(h => h.includes("CANTIDAD") || h.includes("STOCK") || h.includes("CANT"))
        const sizesIdx = headers.findIndex(h => h.includes("TALLA") || h.includes("TALLAS") || h.includes("SIZE"))
        const priceSaleIdx = headers.findIndex(h => h.includes("VENTA") || h.includes("PREC. DE VENTA") || h.includes("PRECIO VENTA") || h.includes("PRECIO") || h.includes("P. VENTA"))

        // Valores por defecto en caso de no encontrarse
        const finalNameIdx = nameIdx !== -1 ? nameIdx : 1
        const finalQtyIdx = qtyIdx !== -1 ? qtyIdx : 2
        const finalSizesIdx = sizesIdx !== -1 ? sizesIdx : 3
        const finalPriceSaleIdx = priceSaleIdx !== -1 ? priceSaleIdx : 5

        // Saltar la primera fila (Cabecera)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          if (!row || row.length < 2) continue

          const name = row[finalNameIdx]?.trim()
          const quantityStr = row[finalQtyIdx]?.trim()
          const sizesStr = row[finalSizesIdx]?.trim()
          const priceSaleStr = row[finalPriceSaleIdx]?.trim()

          if (!name || !priceSaleStr) continue

          // Limpiar caracteres no numéricos excepto puntos o comas
          const cleanPriceStr = priceSaleStr.replace(/[^0-9.,]/g, "").replace(",", ".")
          const price = parseFloat(cleanPriceStr)
          if (isNaN(price)) continue

          const totalStock = parseInt(quantityStr?.replace(/[^0-9]/g, "")) || 0
          
          // Crear un SKU amigable autogenerado
          const sku = `SHEET-${name.toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 15)}-${i}`

          // 2. Crear o actualizar producto base
          const product = await tx.product.upsert({
            where: {
              organizationId_sku: { organizationId, sku }
            },
            update: {
              name,
              price: new Prisma.Decimal(price),
              isActive: true,
              deletedAt: null // Recuperar si estaba borrado
            },
            create: {
              organizationId,
              sku,
              name,
              price: new Prisma.Decimal(price),
              isActive: true
            }
          })

          // 3. Limpiar variantes anteriores para sobreescribir el stock fresco
          await tx.productVariant.deleteMany({
            where: { productId: product.id }
          })

          // 4. Crear variantes dinámicas basadas en el listado de tallas separadas por coma
          const sizes = sizesStr ? sizesStr.split(",").map(s => s.trim()).filter(Boolean) : ["Única"]

          // Mapeamos el stock distribuido de forma equitativa por variante o asignando el stock total a cada una en el MVP
          const variantData = sizes.map(size => ({
            productId: product.id,
            attributes: { talla: size } as Prisma.JsonObject,
            stock: Math.max(1, Math.floor(totalStock / sizes.length))
          }))

          await tx.productVariant.createMany({
            data: variantData
          })
        }
      }, {
        timeout: 180000
      })

      return { success: true, rowsSynced: rows.length - 1 }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Fallo al sincronizar hoja de cálculo: ${errorMessage}`)
    }
  }

  /**
   * Helper simple para parsear líneas de CSV respetando comillas y comas.
   */
  private static parseCSV(text: string): string[][] {
    const lines = text.split(/\r?\n/)
    return lines.map(line => {
      const result: string[] = []
      let current = ""
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current)
          current = ""
        } else {
          current += char
        }
      }
      result.push(current)
      return result
    })
  }
}
