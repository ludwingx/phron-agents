"use client"

import { useEffect, useState } from "react"
import {
  syncGoogleSheetAction,
  getGoogleSheetIntegration,
  saveGoogleSheetUrlAction,
} from "@/modules/integrations/actions/sheets.actions"
import {
  getWhatsappChannelAction,
  updateWhatsappChannelAction,
  getTelegramChannelAction,
  updateTelegramChannelAction,
} from "@/modules/channels/actions/channel.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export default function IntegrationsPage() {
  // Google Sheets State
  const [sheetUrl, setSheetUrl] = useState("")
  const [savedUrl, setSavedUrl] = useState("")
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  // WhatsApp State
  const [phoneNumberId, setPhoneNumberId] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [isSavingChannel, setIsSavingChannel] = useState(false)

  // Telegram State
  const [telegramToken, setTelegramToken] = useState("")
  const [isSavingTelegram, setIsSavingTelegram] = useState(false)

  const [isLoading, setIsLoading] = useState(true)

  // Precargar la configuración al montar el componente
  useEffect(() => {
    const loadData = async () => {
      // 1. Cargar Google Sheets
      const resSheet = await getGoogleSheetIntegration()
      if (resSheet.success && resSheet.data) {
        setSheetUrl(resSheet.data.spreadsheetUrl)
        setSavedUrl(resSheet.data.spreadsheetUrl)
        setLastSyncAt(resSheet.data.lastSyncAt)
      }

      // 2. Cargar WhatsApp
      const resChannel = await getWhatsappChannelAction()
      if (resChannel.success && resChannel.data) {
        setPhoneNumberId(resChannel.data.phoneNumberId || "")
        setAccessToken(resChannel.data.accessToken)
      }

      // 3. Cargar Telegram
      const resTelegram = await getTelegramChannelAction()
      if (resTelegram.success && resTelegram.data) {
        setTelegramToken(resTelegram.data.accessToken)
      }

      setIsLoading(false)
    }
    loadData()
  }, [])

  const handleSaveUrl = async () => {
    if (!sheetUrl.trim()) {
      toast.error("Por favor ingresa la URL de Google Sheets")
      return
    }

    setIsSaving(true)
    const res = await saveGoogleSheetUrlAction(sheetUrl.trim())
    setIsSaving(false)

    if (res.success) {
      setSavedUrl(sheetUrl.trim())
      toast.success("Enlace de Google Sheets guardado correctamente")
    } else {
      toast.error(res.error || "Error al guardar el enlace")
    }
  }

  const handleSync = async () => {
    if (!sheetUrl.trim()) {
      toast.error("Por favor ingresa la URL de edición de Google Sheets")
      return
    }

    setIsSyncing(true)
    setSyncResult(null)
    toast.info("Iniciando descarga y parseo de inventario...")

    const res = await syncGoogleSheetAction(sheetUrl.trim())
    setIsSyncing(false)

    if (res.success) {
      setSavedUrl(sheetUrl.trim())
      setLastSyncAt(new Date().toISOString())
      toast.success("Catálogo sincronizado con éxito!")
      setSyncResult(`Sincronización exitosa: ${res.data?.rowsSynced || 0} productos importados/actualizados. El agente IA ya puede vender estos artículos.`)
    } else {
      toast.error(res.error || "Fallo en la importación de datos")
    }
  }

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

  const hasUnsavedChanges = sheetUrl.trim() !== savedUrl
  const isConnected = !!savedUrl

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
          Canales e Integraciones
        </h1>
        <p className="text-muted-foreground mt-1">
          Conecta tu chatbot de IA a canales de mensajería (WhatsApp, Telegram) y alimenta tu catálogo de productos desde Google Sheets.
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

        {/* Google Sheets Card */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sincronizador de Inventario</CardTitle>
                <CardDescription>
                  Asegúrate de que la hoja de Google Sheets esté configurada en &quot;Compartir&quot; &rarr; &quot;Cualquier persona con el enlace puede leer&quot;.
                </CardDescription>
              </div>
              {isConnected && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Vinculado
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sheetUrl">Enlace de Google Sheets (URL)</Label>
              <Input
                id="sheetUrl"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                disabled={isSyncing || isSaving}
              />
              <p className="text-[11px] text-muted-foreground">
                El importador procesará de forma automática la primera pestaña del documento (gid=0).
              </p>
            </div>

            {lastSyncAt && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/30 rounded-md px-3 py-2 border border-border/30">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-emerald-500"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>
                  Última sincronización: {new Date(lastSyncAt).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
            )}

            {syncResult && (
              <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                {syncResult}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              {hasUnsavedChanges && (
                <Button variant="outline" onClick={handleSaveUrl} disabled={isSaving || isSyncing}>
                  {isSaving ? "Guardando..." : "Guardar enlace"}
                </Button>
              )}
              <Button onClick={handleSync} disabled={isSyncing || isSaving || !sheetUrl.trim()}>
                {isSyncing ? "Sincronizando inventario..." : "Sincronizar ahora"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instrucciones de Formato */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Mapeo Inteligente de Columnas</CardTitle>
            <CardDescription>
              El sincronizador detecta y lee de forma automática las columnas relevantes buscando palabras clave en tu cabecera.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs space-y-3">
            <p className="text-muted-foreground">
              Puedes organizar tu archivo Google Sheets con el orden de columnas que prefieras. Solo asegúrate de incluir palabras similares a estas en tu fila de cabecera:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              <li><strong>Concepto / Producto</strong>: Columna con el nombre de la prenda (ej: <code>Concepto</code>, <code>Producto</code>, <code>Nombre</code>).</li>
              <li><strong>Tallas disponibles</strong> (Opcional): Listado de tallas separadas por comas (ej: <code>Tallas</code>, <code>Talla</code>).</li>
              <li><strong>Cantidad / Stock</strong> (Opcional): Stock disponible de las prendas (ej: <code>Cantidad</code>, <code>Stock</code>).</li>
              <li><strong>Precio de venta</strong>: Precio final al público (ej: <code>Precio Venta</code>, <code>Venta</code>, <code>Precio</code>).</li>
            </ul>
            <p className="text-[11px] text-emerald-500 font-semibold bg-emerald-500/10 p-2.5 rounded border border-emerald-500/20">
              ✓ Si una columna de Tallas o Stock no está presente en tu hoja de cálculo, el sistema asignará valores por defecto automáticamente para que puedas gestionarlos y editarlos directamente en el módulo de Productos de la aplicación.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
