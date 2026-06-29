"use client"

import { useEffect, useState, startTransition } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { productValidator, ProductInput } from "@/modules/products/validators/product.validator"
import {
  listProductsAction,
  createProductAction,
  updateProductAction,
  deleteProductAction,
} from "@/modules/products/actions/product.actions"
import { toast } from "sonner"
import { getCurrentOrganizationAction } from "@/modules/channels/actions/channel.actions"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SerializedProduct {
  id: string
  sku: string
  name: string
  description: string | null
  imageUrl: string | null
  price: number
  variants: {
    id: string
    productId: string
    attributes: Record<string, string>
    stock: number
  }[]
}

export default function ProductsPage() {
  const [products, setProducts] = useState<SerializedProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<SerializedProduct | null>(null)

  // Variantes temporales para la creación interactiva de atributos
  const [attrKey, setAttrKey] = useState("")
  const [attrValue, setAttrValue] = useState("")
  const [currency, setCurrency] = useState("USD")

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productValidator),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      imageUrl: "",
      price: 0,
      variants: [{ stock: 0, attributes: {} }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants",
  })

  // Carga de catálogo en el cliente
  const loadProducts = async () => {
    setIsLoading(true)
    const res = await listProductsAction()
    if (res.success && res.data) {
      setProducts(res.data)
    } else {
      toast.error("Error al cargar productos")
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadProducts()

    const loadCurrency = async () => {
      const res = await getCurrentOrganizationAction()
      if (res.success && res.data) {
        setCurrency(res.data.currency || "USD")
      }
    }
    loadCurrency()
  }, [])

  const formatCurrency = (amount: number, code: string) => {
    const formatters: Record<string, string> = {
      USD: "$",
      BOB: "Bs",
      ARS: "$",
      MXN: "$",
      CLP: "$",
      COP: "$",
      PEN: "S/.",
      EUR: "€",
    }
    const symbol = formatters[code.toUpperCase()] || code
    return `${symbol} ${amount.toFixed(2)}`
  }

  const handleOpenCreate = () => {
    setEditingProduct(null)
    reset({
      sku: "",
      name: "",
      description: "",
      imageUrl: "",
      price: 0,
      variants: [{ stock: 0, attributes: {} }],
    })
    setIsOpen(true)
  }

  const handleOpenEdit = (product: SerializedProduct) => {
    setEditingProduct(product)
    reset({
      sku: product.sku,
      name: product.name,
      description: product.description || "",
      imageUrl: product.imageUrl || "",
      price: product.price,
      variants: product.variants.map((v) => ({
        stock: v.stock,
        attributes: v.attributes,
      })),
    })
    setIsOpen(true)
  }

  const onSubmit = async (data: ProductInput) => {
    setIsLoading(true)
    let res
    if (editingProduct) {
      res = await updateProductAction(editingProduct.id, data)
    } else {
      res = await createProductAction(data)
    }

    if (res.success) {
      toast.success(editingProduct ? "Producto actualizado" : "Producto creado correctamente")
      setIsOpen(false)
      loadProducts()
    } else {
      toast.error(res.error)
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("¿Está seguro que desea eliminar este producto?")) {
      const res = await deleteProductAction(id)
      if (res.success) {
        toast.success("Producto eliminado (Soft Delete)")
        loadProducts()
      } else {
        toast.error(res.error)
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Catálogo de Productos
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Administra tus artículos, stock y variantes disponibles para el vendedor de IA.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="shrink-0 w-full sm:w-auto">Nuevo Producto</Button>
      </div>

      {isLoading && products.length === 0 ? (
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded-lg bg-muted/60" />
          <div className="h-28 w-full animate-pulse rounded-lg bg-muted/60" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl bg-card text-center space-y-3">
          <h3 className="font-semibold text-lg">No hay productos registrados</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Agrega tu primer artículo para que el bot de WhatsApp pueda responder y cotizar stock.
          </p>
          <Button onClick={handleOpenCreate}>Crear tu primer producto</Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 bg-card overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="p-4">SKU</th>
                <th className="p-4">Nombre</th>
                <th className="p-4">Precio</th>
                <th className="p-4">Variantes & Stock</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-4 font-mono text-sm font-semibold">{product.sku}</td>
                  <td className="p-4 font-medium">{product.name}</td>
                  <td className="p-4 font-semibold text-primary">{formatCurrency(product.price, currency)}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {product.variants.map((v, idx) => {
                        const label = Object.values(v.attributes).join(" / ") || "Único"
                        const stockColor = v.stock > 5
                          ? "text-emerald-600 bg-emerald-500/10"
                          : v.stock > 0
                            ? "text-amber-600 bg-amber-500/10"
                            : "text-red-500 bg-red-500/10"
                        return (
                          <span
                            key={v.id || idx}
                            className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1 text-xs border border-border/50"
                          >
                            <span className="font-medium">{label}</span>
                            <span className={`font-bold text-[11px] rounded px-1 py-0.5 ${stockColor}`}>
                              {v.stock > 0 ? `Stock: ${v.stock}` : "Agotado"}
                            </span>
                          </span>
                        )
                      })}
                    </div>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(product)}>
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(product.id)}>
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal CRUD Producto */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
            <DialogDescription>
              Define el catálogo y las propiedades dinámicas asociadas a tus productos.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU Único</Label>
                <Input id="sku" placeholder="ZAP-DEPORT-01" {...register("sku")} />
                {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Precio (USD)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="29.99"
                  {...register("price", { valueAsNumber: true })}
                />
                {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Producto</Label>
              <Input id="name" placeholder="Zapatilla Run Max" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input id="description" placeholder="Zapatilla ultra liviana para asfalto" {...register("description")} />
            </div>

            {/* Gestión de Variantes Dinámicas con atributos JSON */}
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Variantes e Inventario</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ stock: 0, attributes: {} })}
                >
                  Agregar Variante
                </Button>
              </div>

              {fields.map((field, idx) => (
                <div key={field.id} className="p-3 border rounded-lg bg-muted/20 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Variante #{idx + 1}</span>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => remove(idx)}
                      >
                        Remover
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Stock Disponible</Label>
                      <Input
                        type="number"
                        placeholder="10"
                        {...register(`variants.${idx}.stock` as const, { valueAsNumber: true })}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Atributos (JSON)</Label>
                      <Input
                        placeholder='ej: {"talla":"M", "color":"Azul"}'
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value)
                            setValue(`variants.${idx}.attributes` as const, parsed)
                          } catch {
                            // Ignorar errores parciales de tipado en vivo
                          }
                        }}
                        defaultValue={JSON.stringify(field.attributes || {})}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {errors.variants && <p className="text-xs text-destructive">{errors.variants.message}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar Producto</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
