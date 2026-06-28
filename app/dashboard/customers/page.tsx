"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { customerValidator, CustomerInput } from "@/modules/customers/validators/customer.validator"
import {
  listCustomersAction,
  createCustomerAction,
  updateCustomerAction,
  deleteCustomerAction,
} from "@/modules/customers/actions/customer.actions"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SerializedCustomer {
  id: string
  fullName: string | null
  phoneNumber: string
  labels: string[]
  createdAt: Date
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<SerializedCustomer[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<SerializedCustomer | null>(null)
  
  // Variable temporal para entrada de etiquetas
  const [labelInput, setLabelInput] = useState("")

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerValidator),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      labels: [],
    },
  })

  const currentLabels = watch("labels") || []

  const loadCustomers = async () => {
    setIsLoading(true)
    const res = await listCustomersAction()
    if (res.success && res.data) {
      setCustomers(res.data as any)
    } else {
      toast.error("Error al cargar clientes")
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  const handleOpenCreate = () => {
    setEditingCustomer(null)
    reset({
      fullName: "",
      phoneNumber: "",
      labels: [],
    })
    setIsOpen(true)
  }

  const handleOpenEdit = (customer: SerializedCustomer) => {
    setEditingCustomer(customer)
    reset({
      fullName: customer.fullName || "",
      phoneNumber: customer.phoneNumber,
      labels: customer.labels,
    })
    setIsOpen(true)
  }

  const onSubmit = async (data: CustomerInput) => {
    setIsLoading(true)
    let res
    if (editingCustomer) {
      res = await updateCustomerAction(editingCustomer.id, data)
    } else {
      res = await createCustomerAction(data)
    }

    if (res.success) {
      toast.success(editingCustomer ? "Contacto actualizado" : "Contacto registrado en el CRM")
      setIsOpen(false)
      loadCustomers()
    } else {
      toast.error(res.error)
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("¿Está seguro de que desea eliminar este cliente?")) {
      const res = await deleteCustomerAction(id)
      if (res.success) {
        toast.success("Cliente eliminado del CRM")
        loadCustomers()
      } else {
        toast.error(res.error)
      }
    }
  }

  const addLabel = () => {
    if (!labelInput.trim()) return
    if (currentLabels.includes(labelInput.trim())) return
    setValue("labels", [...currentLabels, labelInput.trim()])
    setLabelInput("")
  }

  const removeLabel = (labelToRemove: string) => {
    setValue("labels", currentLabels.filter((l) => l !== labelToRemove))
  }

  // Filtrado de contactos en vivo
  const filteredCustomers = customers.filter((c) => {
    const search = searchQuery.toLowerCase()
    const nameMatch = c.fullName?.toLowerCase().includes(search)
    const phoneMatch = c.phoneNumber?.includes(search)
    const labelMatch = c.labels.some((l) => l.toLowerCase().includes(search))
    return nameMatch || phoneMatch || labelMatch
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Directorio de Clientes (CRM)
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Visualiza e interactúa con los contactos capturados por tus agentes conversacionales.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="shrink-0 w-full sm:w-auto">Nuevo Cliente</Button>
      </div>

      {/* Caja de Búsqueda */}
      <div className="flex items-center gap-2 max-w-sm">
        <Input
          placeholder="Buscar por nombre, teléfono o etiqueta..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading && customers.length === 0 ? (
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded-lg bg-muted/60" />
          <div className="h-28 w-full animate-pulse rounded-lg bg-muted/60" />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl bg-card text-center space-y-3">
          <h3 className="font-semibold text-lg">No se encontraron clientes</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Prueba ajustando la búsqueda o crea un nuevo contacto manualmente para tu base.
          </p>
          {customers.length === 0 && (
            <Button onClick={handleOpenCreate}>Agregar primer cliente</Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 bg-card overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="p-4">Nombre Completo</th>
                <th className="p-4">Número de Teléfono</th>
                <th className="p-4">Etiquetas</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-4 font-semibold text-sm">{customer.fullName || "Sin nombre registrado"}</td>
                  <td className="p-4 font-mono text-sm">{customer.phoneNumber}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {customer.labels.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">Sin etiquetas</span>
                      ) : (
                        customer.labels.map((label) => (
                          <span
                            key={label}
                            className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary"
                          >
                            {label}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(customer)}>
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(customer.id)}>
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal CRUD Cliente */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Editar Contacto" : "Nuevo Contacto"}</DialogTitle>
            <DialogDescription>
              Registra o edita los detalles de contacto de tu cliente en el CRM.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre Completo</Label>
              <Input id="fullName" placeholder="Carlos Gómez" {...register("fullName")} />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Número Telefónico (WhatsApp)</Label>
              <Input id="phoneNumber" placeholder="+5491112345678" {...register("phoneNumber")} />
              {errors.phoneNumber && <p className="text-xs text-destructive">{errors.phoneNumber.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Etiquetas de CRM</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="ej: Interesado, Mayorista"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addLabel()
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addLabel}>
                  Añadir
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {currentLabels.map((l) => (
                  <span
                    key={l}
                    onClick={() => removeLabel(l)}
                    className="inline-flex items-center gap-1 rounded bg-muted/80 px-2.5 py-1 text-xs font-semibold border border-border cursor-pointer hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                    title="Haga clic para remover"
                  >
                    {l} &times;
                  </span>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar Cliente</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
