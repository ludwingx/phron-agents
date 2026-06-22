"use client"

import { useEffect, useState } from "react"
import {
  getWhatsappChannelAction,
  updateWhatsappChannelAction,
  getTelegramChannelAction,
  updateTelegramChannelAction,
  updateOrganizationNameAction,
} from "@/modules/channels/actions/channel.actions"
import { getCurrentOrganization } from "@/lib/tenant" // O llamando a la metadata local
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("Mi Comercio")
  const [phoneNumberId, setPhoneNumberId] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [telegramToken, setTelegramToken] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingChannel, setIsSavingChannel] = useState(false)
  const [isSavingTelegram, setIsSavingTelegram] = useState(false)
  const [isSavingOrg, setIsSavingOrg] = useState(false)

  const loadSettings = async () => {
    setIsLoading(true)
    
    // Cargar canal de WhatsApp
    const resChannel = await getWhatsappChannelAction()
    if (resChannel.success && resChannel.data) {
      setPhoneNumberId(resChannel.data.phoneNumberId || "")
      setAccessToken(resChannel.data.accessToken)
    }

    // Cargar canal de Telegram
    const resTelegram = await getTelegramChannelAction()
    if (resTelegram.success && resTelegram.data) {
      setTelegramToken(resTelegram.data.accessToken)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSaveChannel = async () => {
    if (!phoneNumberId.trim() || !accessToken.trim()) {
      toast.error("Por favor completa los campos del canal de WhatsApp")
      return
    }

    setIsSavingChannel(true)
    const res = await updateWhatsappChannelAction({
      phoneNumberId,
      accessToken,
    })

    if (res.success) {
      toast.success("Credenciales de WhatsApp Cloud API vinculadas correctamente")
    } else {
      toast.error(res.error)
    }
    setIsSavingChannel(false)
  }

  const handleSaveTelegram = async () => {
    if (!telegramToken.trim()) {
      toast.error("Por favor ingresa el Token de API de tu bot de Telegram")
      return
    }

    setIsSavingTelegram(true)
    const res = await updateTelegramChannelAction({
      accessToken: telegramToken,
    })

    if (res.success) {
      toast.success("Token de Telegram Bot API vinculado correctamente")
    } else {
      toast.error(res.error)
    }
    setIsSavingTelegram(false)
  }

  const handleSaveOrg = async () => {
    if (!orgName.trim()) {
      toast.error("El nombre del negocio no puede estar vacío")
      return
    }

    setIsSavingOrg(true)
    const res = await updateOrganizationNameAction(orgName.trim())
    if (res.success) {
      toast.success("Nombre del negocio actualizado correctamente")
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
          <div className="h-[300px] animate-pulse rounded-lg bg-muted/60" />
          <div className="h-[300px] animate-pulse rounded-lg bg-muted/60" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
          Configuración del Sistema
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra las conexiones de canales de WhatsApp y Telegram, tokens de APIs y ajustes del negocio.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Conexión WhatsApp Cloud API */}
        <Card className="border-border shadow-sm transition-all duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle>Canal: WhatsApp Cloud API</CardTitle>
            <CardDescription>
              Conecta tu número oficial a través de la consola de desarrolladores de Meta (Meta for Developers).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneId">Identificador de Teléfono Comercial (Phone Number ID)</Label>
              <Input 
                id="phoneId" 
                placeholder="105847395729185" 
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">Token de Acceso Temporal / Permanente</Label>
              <Input 
                id="token" 
                type="password" 
                placeholder="EAAGb3... (Encriptado al guardar)" 
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Dirección de Webhook para Meta</Label>
              <Input value="https://phronagents.com/api/webhooks/whatsapp" disabled />
              <p className="text-xs text-muted-foreground">Copia esta URL en tu consola de Meta App para recibir los mensajes en vivo.</p>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveChannel} disabled={isSavingChannel}>
                {isSavingChannel ? "Vinculando..." : "Vincular Número"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Conexión Telegram Bot API */}
        <Card className="border-border shadow-sm transition-all duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle>Canal: Telegram Bot</CardTitle>
            <CardDescription>
              Conecta tu bot de Telegram enviando tus credenciales obtenidas desde BotFather.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="telegramToken">Token de API de Telegram Bot (API Key)</Label>
              <Input 
                id="telegramToken" 
                type="password" 
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ... (Encriptado)" 
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Dirección de Webhook para Telegram</Label>
              <Input value="https://phronagents.com/api/webhooks/telegram" disabled />
              <p className="text-xs text-muted-foreground">Usa esta dirección si deseas configurar manualmente el Webhook del Bot.</p>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveTelegram} disabled={isSavingTelegram} className="bg-sky-600 hover:bg-sky-700 text-white">
                {isSavingTelegram ? "Vinculando..." : "Vincular Bot de Telegram"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ajustes de Organización */}
        <Card className="border-border shadow-sm md:col-span-2">
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
              <Input id="currency" defaultValue="USD ($)" disabled />
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveOrg} disabled={isSavingOrg} variant="outline">
                {isSavingOrg ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
