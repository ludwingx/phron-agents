"use client"

import { useEffect, useState } from "react"
import {
  updateOrganizationAction,
  getCurrentOrganizationAction,
} from "@/modules/channels/actions/channel.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { updateProfileOrCreateAction } from "@/modules/auth/actions/profile.actions"
import { getCurrentSession } from "@/modules/auth/actions/auth.actions"

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("Mi Comercio")
  const [currency, setCurrency] = useState("USD")
  
  // Profile State
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingOrg, setIsSavingOrg] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  useEffect(() => {
    let active = true

    const loadSettings = async () => {
      // Cargar negocio actual
      const resOrg = await getCurrentOrganizationAction()
      if (!active) return
      if (resOrg.success && resOrg.data) {
        setOrgName(resOrg.data.name)
        setCurrency(resOrg.data.currency)
      }

      // Cargar perfil del usuario actual
      const session = await getCurrentSession()
      if (!active) return
      if (session) {
        setFullName(session.fullName || "")
        setEmail(session.email || "")
      }

      setIsLoading(false)
    }

    loadSettings()

    return () => {
      active = false
    }
  }, [])

  const handleSaveProfile = async () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error("Por favor completa los campos de Nombre y Usuario")
      return
    }

    setIsSavingProfile(true)
    const res = await updateProfileOrCreateAction({
      fullName: fullName.trim(),
      email: email.trim(),
      password: password || undefined,
    })

    if (res.success) {
      toast.success("Perfil actualizado correctamente")
      setPassword("") // limpiar contraseña después de guardar
      // Recargar la página para refrescar los datos del navbar/sidebar
      window.location.reload()
    } else {
      toast.error(res.error)
    }
    setIsSavingProfile(false)
  }

  const handleSaveOrg = async () => {
    if (!orgName.trim()) {
      toast.error("El nombre del negocio no puede estar vacío")
      return
    }

    setIsSavingOrg(true)
    const res = await updateOrganizationAction({
      name: orgName.trim(),
      currency: currency
    })
    if (res.success) {
      toast.success("Ajustes del negocio actualizados correctamente")
      window.location.reload()
    } else {
      toast.error(res.error)
    }
    setIsSavingOrg(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-1/3 animate-pulse rounded-lg bg-muted/60" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-[250px] animate-pulse rounded-lg bg-muted/60" />
          <div className="h-[250px] animate-pulse rounded-lg bg-muted/60" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
          Configuración General
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra los datos generales de tu organización y actualiza los detalles de tu cuenta.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Ajustes de Organización */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Datos de la Organización</CardTitle>
            <CardDescription>
              Configuración general e identificadores comerciales del Tenant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Nombre del Negocio</Label>
              <Input 
                id="orgName" 
                value={orgName} 
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Moneda Comercial</Label>
              <select
                id="currency"
                className="flex h-9 w-full rounded-md border border-input bg-card text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="USD" className="bg-card text-foreground">Dólar Estadounidense (USD / $)</option>
                <option value="BOB" className="bg-card text-foreground">Boliviano (BOB / Bs)</option>
                <option value="ARS" className="bg-card text-foreground">Peso Argentino (ARS / $)</option>
                <option value="MXN" className="bg-card text-foreground">Peso Mexicano (MXN / $)</option>
                <option value="CLP" className="bg-card text-foreground">Peso Chileno (CLP / $)</option>
                <option value="COP" className="bg-card text-foreground">Peso Colombiano (COP / $)</option>
                <option value="PEN" className="bg-card text-foreground">Sol Peruano (PEN / S/.)</option>
                <option value="EUR" className="bg-card text-foreground">Euro (EUR / €)</option>
              </select>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveOrg} disabled={isSavingOrg} variant="outline">
                {isSavingOrg ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ajustes de Perfil de Usuario */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Mi Perfil / Cuenta</CardTitle>
            <CardDescription>
              Actualiza tus datos personales y credenciales de acceso.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre Completo</Label>
              <Input 
                id="fullName" 
                placeholder="Juan Pérez" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Usuario / Correo Electrónico</Label>
              <Input 
                id="email" 
                placeholder="juan_perez" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Nueva Contraseña (Opcional)</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="Dejar vacío para no cambiar" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                {isSavingProfile ? "Guardando..." : "Guardar Perfil"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
