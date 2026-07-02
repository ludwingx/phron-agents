"use client"

import { useEffect, useState } from "react"
import {
  getSalesConfigAction,
  updateSalesConfigAction,
} from "@/modules/sales-config/actions/sales-config.actions"
import {
  getAgentAction,
  updateAgentAction,
} from "@/modules/agents/actions/agent.actions"
import {
  type SalesConfig,
  type ShippingZone,
  type DaySchedule,
  DEFAULT_SALES_CONFIG,
} from "@/modules/sales-config/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

// ─── Day labels ────────────────────────────────────────────────

const DAY_LABELS: Record<keyof SalesConfig["businessHours"], string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
}

const DAY_KEYS = Object.keys(DAY_LABELS) as (keyof SalesConfig["businessHours"])[]

// ─── Personality presets ───────────────────────────────────────

const PERSONALITY_OPTIONS: {
  value: SalesConfig["personalityPreset"]
  emoji: string
  label: string
  desc: string
}[] = [
  {
    value: "friendly",
    emoji: "😊",
    label: "Amigable y Empático",
    desc: "Cálido, cercano y celebra las elecciones del cliente.",
  },
  {
    value: "urgent",
    emoji: "🔥",
    label: "Urgente y Persuasivo",
    desc: "Técnicas de escasez y FOMO para cerrar ventas rápido.",
  },
  {
    value: "formal",
    emoji: "👔",
    label: "Formal y Profesional",
    desc: "Lenguaje respetuoso y estructurado, sin emojis.",
  },
  {
    value: "custom",
    emoji: "✏️",
    label: "Personalizado",
    desc: "Usa solo el System Prompt del módulo Agentes.",
  },
]

// ─── Component ─────────────────────────────────────────────────

export default function SalesConfigPage() {
  const [config, setConfig] = useState<SalesConfig>({ ...DEFAULT_SALES_CONFIG })
  const [promptBase, setPromptBase] = useState("")
  const [temperature, setTemperature] = useState(0.1)
  const [dailyLimit, setDailyLimit] = useState(100)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [resConfig, resAgent] = await Promise.all([
        getSalesConfigAction(),
        getAgentAction(),
      ])

      if (resConfig.success && resConfig.data) {
        setConfig(resConfig.data)
      }
      if (resAgent.success && resAgent.data) {
        setPromptBase(resAgent.data.promptBase)
        setTemperature(resAgent.data.temperature)
        setDailyLimit(resAgent.data.dailyLimit)
      }
      setIsLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    const [resConfig, resAgent] = await Promise.all([
      updateSalesConfigAction(config),
      updateAgentAction({ promptBase, temperature, dailyLimit }),
    ])

    if (resConfig.success && resAgent.success) {
      toast.success("Configuración del Agente IA guardada correctamente", {
        description: "Los cambios se aplicarán inmediatamente en las próximas conversaciones.",
      })
    } else {
      const errorMsg = [resConfig.error, resAgent.error].filter(Boolean).join(" | ")
      toast.error(errorMsg || "Error al guardar la configuración")
    }
    setIsSaving(false)
  }

  // ─── Updater helpers ──────────────────────────────────────

  const updateField = <K extends keyof SalesConfig>(key: K, value: SalesConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const updateDaySchedule = (
    day: keyof SalesConfig["businessHours"],
    field: keyof DaySchedule,
    value: string | boolean
  ) => {
    setConfig((prev) => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: { ...prev.businessHours[day], [field]: value },
      },
    }))
  }

  const updateShippingZone = (index: number, field: keyof ShippingZone, value: string | number) => {
    setConfig((prev) => {
      const zones = [...prev.shippingZones]
      zones[index] = { ...zones[index], [field]: value }
      return { ...prev, shippingZones: zones }
    })
  }

  const addShippingZone = () => {
    const lastZone = config.shippingZones[config.shippingZones.length - 1]
    setConfig((prev) => ({
      ...prev,
      shippingZones: [
        ...prev.shippingZones,
        {
          label: `Zona ${prev.shippingZones.length + 1}`,
          minKm: lastZone ? lastZone.maxKm : 0,
          maxKm: lastZone ? lastZone.maxKm + 10 : 10,
          cost: 0,
        },
      ],
    }))
  }

  const removeShippingZone = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      shippingZones: prev.shippingZones.filter((_, i) => i !== index),
    }))
  }

  const addHandoffKeyword = () => {
    setConfig((prev) => ({
      ...prev,
      humanHandoffKeywords: [...prev.humanHandoffKeywords, ""],
    }))
  }

  const updateHandoffKeyword = (index: number, value: string) => {
    setConfig((prev) => {
      const keywords = [...prev.humanHandoffKeywords]
      keywords[index] = value
      return { ...prev, humanHandoffKeywords: keywords }
    })
  }

  const removeHandoffKeyword = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      humanHandoffKeywords: prev.humanHandoffKeywords.filter((_, i) => i !== index),
    }))
  }

  // ─── Loading state ───────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-1/3 animate-pulse rounded-lg bg-muted/60" />
        <div className="h-[500px] animate-pulse rounded-lg bg-muted/60" />
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Configuración del Agente de Ventas IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Configura las instrucciones de tu vendedor virtual, su personalidad y todos los parámetros comerciales del negocio.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="shrink-0">
          {isSaving ? "Guardando..." : "💾 Guardar Todo"}
        </Button>
      </div>

      <Tabs defaultValue="agent" className="w-full">
        <TabsList variant="line" className="flex-wrap">
          <TabsTrigger value="agent">🤖 Instrucciones IA</TabsTrigger>
          <TabsTrigger value="location">📍 Negocio</TabsTrigger>
          <TabsTrigger value="hours">🕒 Horarios</TabsTrigger>
          <TabsTrigger value="shipping">🚚 Envíos</TabsTrigger>
          <TabsTrigger value="payments">💳 Pagos</TabsTrigger>
          <TabsTrigger value="personality">🎭 Personalidad</TabsTrigger>
        </TabsList>

        {/* ═══════════════ TAB: INSTRUCCIONES IA ═══════════════ */}
        <TabsContent value="agent">
          <div className="grid gap-6 lg:grid-cols-3 mt-4">
            {/* Prompt Base (ancho) */}
            <Card className="lg:col-span-2 border-border shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg">System Prompt</CardTitle>
                <CardDescription>
                  Escribe las instrucciones de personalidad, tono y reglas de comportamiento para el vendedor IA.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pt-4">
                <textarea
                  id="prompt"
                  className="min-h-[380px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                  placeholder="Eres el vendedor comercial de una tienda de ropa..."
                  value={promptBase}
                  onChange={(e) => setPromptBase(e.target.value)}
                />
              </CardContent>
            </Card>

            {/* Parámetros (lateral) */}
            <Card className="border-border shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg">Parámetros</CardTitle>
                <CardDescription>
                  Ajustes técnicos del modelo de lenguaje.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-4 flex-1">
                <div className="space-y-2">
                  <Label htmlFor="temperature" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Temperatura (Creatividad)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    value={temperature}
                    min="0"
                    max="1"
                    onChange={(e) => setTemperature(Number(e.target.value))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    0 = respuestas más predecibles. 1 = respuestas más creativas.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limit" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Límite Diario de Mensajes</Label>
                  <Input
                    id="limit"
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(Number(e.target.value))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Máximo de mensajes procesados por día para control de costos.
                  </p>
                </div>

                <div className="rounded-lg bg-muted/40 border border-border/30 p-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Modelo Activo</span>
                  <p className="text-sm font-medium">Google Gemini 2.5 Flash</p>
                  <p className="text-[11px] text-muted-foreground">Vía OpenRouter API</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════ TAB: NEGOCIO Y UBICACIÓN ═══════════════ */}
        <TabsContent value="location">
          <div className="grid gap-6 lg:grid-cols-2 mt-4">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg">📍 Dirección y Coordenadas</CardTitle>
                <CardDescription>
                  Configura la ubicación de tu negocio para que el bot pueda enviar un mapa interactivo a tus clientes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="businessAddress" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Dirección física
                  </Label>
                  <Input
                    id="businessAddress"
                    placeholder="Av. 6 de Agosto #123, Zona Sopocachi, La Paz"
                    value={config.businessAddress}
                    onChange={(e) => updateField("businessAddress", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Latitud
                    </Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="0.000001"
                      placeholder="-16.5000"
                      value={config.businessLatitude ?? ""}
                      onChange={(e) =>
                        updateField("businessLatitude", e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Longitud
                    </Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="0.000001"
                      placeholder="-68.1500"
                      value={config.businessLongitude ?? ""}
                      onChange={(e) =>
                        updateField("businessLongitude", e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-muted/40 border border-border/30 p-3 space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    💡 <strong>¿Cómo obtener tus coordenadas?</strong> Abre{" "}
                    <a
                      href="https://www.google.com/maps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      Google Maps
                    </a>
                    , haz clic derecho sobre tu tienda y selecciona las coordenadas que aparecen. Se copiarán automáticamente.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Preview card */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg">Vista Previa</CardTitle>
                <CardDescription>
                  Así se verá cuando un cliente pregunte por la ubicación.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="rounded-lg border border-border/50 p-4 bg-muted/20 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0 text-xs">🤖</div>
                    <div className="bg-muted rounded-lg rounded-tl-none p-3 text-sm border">
                      {config.businessAddress ? (
                        <>
                          ¡Claro! Nuestra tienda está ubicada en{" "}
                          <strong>{config.businessAddress}</strong>. Te envío el mapa para que puedas
                          llegar fácilmente 📍
                        </>
                      ) : (
                        <span className="text-muted-foreground italic">
                          Configura la dirección para ver la vista previa...
                        </span>
                      )}
                    </div>
                  </div>
                  {config.businessLatitude && config.businessLongitude && (
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 shrink-0" />
                      <div className="bg-muted rounded-lg p-3 text-sm border flex items-center gap-2">
                        <span className="text-lg">🗺️</span>
                        <div>
                          <p className="font-medium text-xs">Ubicación compartida</p>
                          <p className="text-[10px] text-muted-foreground">
                            {config.businessLatitude}, {config.businessLongitude}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════ TAB: HORARIOS ═══════════════ */}
        <TabsContent value="hours">
          <div className="grid gap-6 lg:grid-cols-3 mt-4">
            <Card className="lg:col-span-2 border-border shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg">🕒 Horarios de Atención</CardTitle>
                <CardDescription>
                  Define qué días y horas atiende tu negocio. Fuera de estos horarios, el bot responderá automáticamente con tu mensaje personalizado sin consumir tokens de IA.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {DAY_KEYS.map((day) => {
                  const schedule = config.businessHours[day]
                  return (
                    <div
                      key={day}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                        schedule.enabled
                          ? "bg-background border-border"
                          : "bg-muted/30 border-border/30 opacity-60"
                      }`}
                    >
                      <label className="flex items-center gap-2 cursor-pointer min-w-[120px]">
                        <input
                          type="checkbox"
                          checked={schedule.enabled}
                          onChange={(e) => updateDaySchedule(day, "enabled", e.target.checked)}
                          className="w-4 h-4 rounded accent-primary"
                        />
                        <span className="text-sm font-medium">{DAY_LABELS[day]}</span>
                      </label>
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={schedule.open}
                          onChange={(e) => updateDaySchedule(day, "open", e.target.value)}
                          disabled={!schedule.enabled}
                          className="w-[120px] text-sm"
                        />
                        <span className="text-xs text-muted-foreground">a</span>
                        <Input
                          type="time"
                          value={schedule.close}
                          onChange={(e) => updateDaySchedule(day, "close", e.target.value)}
                          disabled={!schedule.enabled}
                          className="w-[120px] text-sm"
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg">⚙️ Configuración</CardTitle>
                <CardDescription>
                  Zona horaria y mensaje fuera de horario.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 flex-1">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Zona Horaria
                  </Label>
                  <select
                    value={config.timezone}
                    onChange={(e) => updateField("timezone", e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="America/La_Paz">🇧🇴 Bolivia (GMT-4)</option>
                    <option value="America/Lima">🇵🇪 Perú (GMT-5)</option>
                    <option value="America/Bogota">🇨🇴 Colombia (GMT-5)</option>
                    <option value="America/Santiago">🇨🇱 Chile (GMT-4)</option>
                    <option value="America/Argentina/Buenos_Aires">🇦🇷 Argentina (GMT-3)</option>
                    <option value="America/Mexico_City">🇲🇽 México (GMT-6)</option>
                    <option value="America/Guayaquil">🇪🇨 Ecuador (GMT-5)</option>
                    <option value="America/Caracas">🇻🇪 Venezuela (GMT-4)</option>
                    <option value="America/Asuncion">🇵🇾 Paraguay (GMT-4)</option>
                    <option value="America/Montevideo">🇺🇾 Uruguay (GMT-3)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Mensaje fuera de horario
                  </Label>
                  <textarea
                    className="min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                    placeholder="¡Hola! En este momento estamos fuera de horario..."
                    value={config.offHoursMessage}
                    onChange={(e) => updateField("offHoursMessage", e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Este mensaje se enviará automáticamente sin usar IA cuando un cliente escriba fuera de los horarios configurados.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════ TAB: ENVÍOS ═══════════════ */}
        <TabsContent value="shipping">
          <div className="grid gap-6 lg:grid-cols-3 mt-4">
            <Card className="lg:col-span-2 border-border shadow-sm">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">🚚 Zonas de Envío por Distancia</CardTitle>
                    <CardDescription>
                      Define rangos de distancia desde tu tienda y el costo de envío para cada zona.
                      El cálculo se basa en la ubicación GPS que el cliente comparte en Telegram.
                    </CardDescription>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={config.shippingEnabled}
                      onChange={(e) => updateField("shippingEnabled", e.target.checked)}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    <span className="text-xs font-semibold">Activar</span>
                  </label>
                </div>
              </CardHeader>
              <CardContent className={`pt-4 space-y-3 ${!config.shippingEnabled ? "opacity-40 pointer-events-none" : ""}`}>
                {config.shippingZones.map((zone, i) => (
                  <div
                    key={i}
                    className="flex items-end gap-3 p-3 rounded-lg border border-border bg-background"
                  >
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Nombre
                      </Label>
                      <Input
                        value={zone.label}
                        onChange={(e) => updateShippingZone(i, "label", e.target.value)}
                        placeholder="Zona Centro"
                        className="text-sm"
                      />
                    </div>
                    <div className="w-20 space-y-1">
                      <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Desde (km)
                      </Label>
                      <Input
                        type="number"
                        value={zone.minKm}
                        onChange={(e) => updateShippingZone(i, "minKm", Number(e.target.value))}
                        className="text-sm"
                      />
                    </div>
                    <div className="w-20 space-y-1">
                      <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Hasta (km)
                      </Label>
                      <Input
                        type="number"
                        value={zone.maxKm}
                        onChange={(e) => updateShippingZone(i, "maxKm", Number(e.target.value))}
                        className="text-sm"
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Costo (Bs.)
                      </Label>
                      <Input
                        type="number"
                        value={zone.cost}
                        onChange={(e) => updateShippingZone(i, "cost", Number(e.target.value))}
                        className="text-sm"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive/80 h-9 px-2 shrink-0"
                      onClick={() => removeShippingZone(i)}
                      disabled={config.shippingZones.length <= 1}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addShippingZone}>
                  + Agregar Zona
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg">⚙️ Opciones Adicionales</CardTitle>
              </CardHeader>
              <CardContent className={`pt-4 space-y-4 flex-1 ${!config.shippingEnabled ? "opacity-40 pointer-events-none" : ""}`}>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Envío gratis a partir de (Bs.)
                  </Label>
                  <Input
                    type="number"
                    placeholder="Ej: 200 (dejar vacío para desactivar)"
                    value={config.shippingFreeAbove ?? ""}
                    onChange={(e) =>
                      updateField("shippingFreeAbove", e.target.value ? Number(e.target.value) : null)
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Si el monto de la compra supera este valor, el envío será gratis. Deja vacío para desactivar.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Mensaje fuera de cobertura
                  </Label>
                  <textarea
                    className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                    value={config.outOfRangeMessage}
                    onChange={(e) => updateField("outOfRangeMessage", e.target.value)}
                  />
                </div>

                <div className="rounded-lg bg-sky-500/10 border border-sky-500/20 p-3">
                  <p className="text-[11px] text-sky-400 font-medium">
                    📌 El cliente comparte su ubicación directamente en Telegram (botón adjuntar → Ubicación). El sistema calcula la distancia con la Fórmula de Haversine y responde automáticamente con el costo correspondiente.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════ TAB: PAGOS Y RESERVAS ═══════════════ */}
        <TabsContent value="payments">
          <div className="grid gap-6 lg:grid-cols-2 mt-4">
            {/* QR de Pago */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg">📱 QR de Pago</CardTitle>
                <CardDescription>
                  El bot enviará esta imagen de QR cuando el cliente solicite realizar un pago.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    URL de la imagen QR
                  </Label>
                  <Input
                    placeholder="https://ejemplo.com/mi-qr-yape.png"
                    value={config.paymentQrUrl}
                    onChange={(e) => updateField("paymentQrUrl", e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Sube tu QR a un servicio de imágenes (Google Drive público, Imgur, etc.) y pega el enlace directo aquí.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Etiqueta del QR
                  </Label>
                  <Input
                    placeholder="Escanea para pagar con Yape"
                    value={config.paymentQrLabel}
                    onChange={(e) => updateField("paymentQrLabel", e.target.value)}
                  />
                </div>

                {config.paymentQrUrl && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Vista previa
                    </Label>
                    <div className="rounded-lg border border-border/50 p-3 bg-muted/20 flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={config.paymentQrUrl}
                        alt="QR Preview"
                        className="max-w-[200px] max-h-[200px] rounded-md object-contain"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = "none"
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Datos Bancarios */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">🏦 Transferencia Bancaria</CardTitle>
                    <CardDescription>
                      Datos de cuenta para clientes que prefieran pagar por transferencia.
                    </CardDescription>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={config.bankTransfer.enabled}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          bankTransfer: { ...prev.bankTransfer, enabled: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 rounded accent-primary"
                    />
                    <span className="text-xs font-semibold">Activar</span>
                  </label>
                </div>
              </CardHeader>
              <CardContent className={`pt-4 space-y-3 ${!config.bankTransfer.enabled ? "opacity-40 pointer-events-none" : ""}`}>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Banco</Label>
                  <Input
                    placeholder="Banco Mercantil Santa Cruz"
                    value={config.bankTransfer.bankName}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        bankTransfer: { ...prev.bankTransfer, bankName: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo de Cuenta</Label>
                    <Input
                      placeholder="Caja de Ahorros Bs."
                      value={config.bankTransfer.accountType}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          bankTransfer: { ...prev.bankTransfer, accountType: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nro. de Cuenta</Label>
                    <Input
                      placeholder="4500123456"
                      value={config.bankTransfer.accountNumber}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          bankTransfer: { ...prev.bankTransfer, accountNumber: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Titular</Label>
                    <Input
                      placeholder="Juan Pérez"
                      value={config.bankTransfer.accountHolder}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          bankTransfer: { ...prev.bankTransfer, accountHolder: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CI / NIT</Label>
                    <Input
                      placeholder="12345678"
                      value={config.bankTransfer.idNumber}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          bankTransfer: { ...prev.bankTransfer, idNumber: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reservas */}
            <Card className="lg:col-span-2 border-border shadow-sm">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">🛒 Sistema de Reservas</CardTitle>
                    <CardDescription>
                      Permite que los clientes aparten productos abonando un porcentaje del precio total.
                    </CardDescription>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={config.reservationEnabled}
                      onChange={(e) => updateField("reservationEnabled", e.target.checked)}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    <span className="text-xs font-semibold">Activar</span>
                  </label>
                </div>
              </CardHeader>
              <CardContent className={`pt-4 ${!config.reservationEnabled ? "opacity-40 pointer-events-none" : ""}`}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Porcentaje para Reservar (%)
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={config.reservationPercentage}
                      onChange={(e) => updateField("reservationPercentage", Number(e.target.value))}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      El bot calculará automáticamente este porcentaje sobre el precio del producto y se lo indicará al cliente.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Vigencia de la Reserva (horas)
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={config.reservationExpiryHours}
                      onChange={(e) => updateField("reservationExpiryHours", Number(e.target.value))}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Tiempo máximo que el cliente tiene para completar el pago antes de que la reserva expire.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════ TAB: PERSONALIDAD Y ESCALAMIENTO ═══════════════ */}
        <TabsContent value="personality">
          <div className="grid gap-6 lg:grid-cols-3 mt-4">
            {/* Presets de personalidad */}
            <Card className="lg:col-span-2 border-border shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg">🎭 Tono de Personalidad del Agente</CardTitle>
                <CardDescription>
                  Define cómo se comunica tu agente de ventas con los clientes. Esta personalidad se combina con tu System Prompt.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {PERSONALITY_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      onClick={() => updateField("personalityPreset", option.value)}
                      className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ${
                        config.personalityPreset === option.value
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-border/80 hover:bg-muted/30"
                      }`}
                    >
                      {config.personalityPreset === option.value && (
                        <span className="absolute top-2.5 right-2.5 text-primary text-sm">✓</span>
                      )}
                      <div className="text-2xl mb-2">{option.emoji}</div>
                      <h4 className="font-semibold text-sm">{option.label}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{option.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Traspaso a humano */}
            <Card className="border-border shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">🤝 Traspaso a Humano</CardTitle>
                    <CardDescription>
                      Palabras clave que pausan la IA y transfieren el chat a un agente humano.
                    </CardDescription>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={config.humanHandoffEnabled}
                      onChange={(e) => updateField("humanHandoffEnabled", e.target.checked)}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    <span className="text-xs font-semibold">Activar</span>
                  </label>
                </div>
              </CardHeader>
              <CardContent className={`pt-4 space-y-3 flex-1 ${!config.humanHandoffEnabled ? "opacity-40 pointer-events-none" : ""}`}>
                {config.humanHandoffKeywords.map((kw, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={kw}
                      onChange={(e) => updateHandoffKeyword(i, e.target.value)}
                      placeholder="Ej: hablar con alguien"
                      className="text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive/80 h-9 px-2 shrink-0"
                      onClick={() => removeHandoffKeyword(i)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addHandoffKeyword}>
                  + Agregar palabra clave
                </Button>
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 mt-2">
                  <p className="text-[11px] text-amber-400 font-medium">
                    ⚠️ Si el mensaje del cliente contiene alguna de estas frases, la IA se pausará y el chat aparecerá en tu bandeja de "Chats en Vivo" para que un humano responda.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Floating save button for mobile */}
      <div className="fixed bottom-6 right-6 sm:hidden z-50">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          size="lg"
          className="shadow-xl rounded-full h-14 w-14 p-0"
        >
          {isSaving ? "..." : "💾"}
        </Button>
      </div>
    </div>
  )
}
