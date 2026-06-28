"use client"

import { useState } from "react"
import { createOrganizationAction } from "@/modules/auth/actions/tenant.actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export function OnboardingModal({ isOpen }: { isOpen: boolean }) {
  const [name, setName] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Por favor ingresa el nombre de tu negocio")
      return
    }

    setIsSubmitting(true)
    const res = await createOrganizationAction(name.trim(), currency)
    setIsSubmitting(false)

    if (res.success) {
      toast.success("¡Negocio creado correctamente!")
      window.location.reload()
    } else {
      toast.error(res.error || "Ocurrió un error al crear el negocio")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">¡Bienvenido a Phron Agents! 🚀</DialogTitle>
          <DialogDescription>
            Para comenzar a configurar tu chatbot y catálogo de ventas, necesitamos crear tu primer espacio o negocio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="business-name" className="text-sm font-semibold">Nombre de tu Negocio / Proyecto</Label>
            <Input
              id="business-name"
              placeholder="Mi Tienda de Ropa, Euro Store, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="business-currency" className="text-sm font-semibold">Moneda Comercial</Label>
            <select
              id="business-currency"
              className="flex h-9 w-full rounded-md border border-input bg-card text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="USD" className="bg-card text-foreground">Dólar Estadounidense (USD)</option>
              <option value="BOB" className="bg-card text-foreground">Boliviano (BOB / Bs)</option>
              <option value="ARS" className="bg-card text-foreground">Peso Argentino (ARS)</option>
              <option value="MXN" className="bg-card text-foreground">Peso Mexicano (MXN)</option>
              <option value="CLP" className="bg-card text-foreground">Peso Chileno (CLP)</option>
              <option value="COP" className="bg-card text-foreground">Peso Colombiano (COP)</option>
              <option value="PEN" className="bg-card text-foreground">Sol Peruano (PEN)</option>
              <option value="EUR" className="bg-card text-foreground">Euro (EUR)</option>
            </select>
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creando negocio..." : "Crear Negocio y Empezar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
