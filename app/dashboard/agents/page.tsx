"use client"

import { useEffect, useState } from "react"
import { getAgentAction, updateAgentAction } from "@/modules/agents/actions/agent.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export default function AgentsPage() {
  const [promptBase, setPromptBase] = useState("")
  const [temperature, setTemperature] = useState(0.1)
  const [dailyLimit, setDailyLimit] = useState(100)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const loadAgent = async () => {
    setIsLoading(true)
    const res = await getAgentAction()
    if (res.success && res.data) {
      setPromptBase(res.data.promptBase)
      setTemperature(res.data.temperature)
      setDailyLimit(res.data.dailyLimit)
    } else {
      toast.error("Error al cargar ajustes del agente")
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadAgent()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    const res = await updateAgentAction({
      promptBase,
      temperature,
      dailyLimit,
    })

    if (res.success) {
      toast.success("Ajustes del agente de IA actualizados correctamente")
    } else {
      toast.error(res.error)
    }
    setIsSaving(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-1/3 animate-pulse rounded-lg bg-muted/60" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 h-[400px] animate-pulse rounded-lg bg-muted/60" />
          <div className="h-[400px] animate-pulse rounded-lg bg-muted/60" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
          Configuración del Agente IA
        </h1>
        <p className="text-muted-foreground mt-1">
          Define la personalidad, prompt de sistema y reglas de comportamiento del vendedor automatizado.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Columna Principal: Prompt de Sistema */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>System Prompt (Instrucciones base)</CardTitle>
              <CardDescription>
                Este prompt le dice a la IA quién es, qué tono usar y qué reglas de venta debe seguir de forma estricta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <textarea
                  className="min-h-[250px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Eres el vendedor inteligente de nuestra ferretería. Tu objetivo es cotizar productos y sugerir opciones de stock..."
                  value={promptBase}
                  onChange={(e) => setPromptBase(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Guardando..." : "Guardar Instrucciones"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Lateral: Parámetros del Motor */}
        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Parámetros Cognitivos</CardTitle>
              <CardDescription>
                Ajusta la precisión e intensidad del bot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperatura (Creatividad)</Label>
                <Input 
                  id="temperature" 
                  type="number" 
                  step="0.1" 
                  value={temperature} 
                  min="0" 
                  max="1" 
                  onChange={(e) => setTemperature(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Un valor bajo (0.1) asegura respuestas exactas sobre stock y precios.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="limit">Límite Diario por Cliente</Label>
                <Input 
                  id="limit" 
                  type="number" 
                  value={dailyLimit} 
                  onChange={(e) => setDailyLimit(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Máximo de respuestas de IA por cliente cada 24 horas.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Modelo de Lenguaje</Label>
                <Input id="model" defaultValue="google/gemini-2.5-flash" disabled />
                <p className="text-xs text-muted-foreground">Modelo económico optimizado provisto por OpenRouter.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
