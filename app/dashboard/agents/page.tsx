"use client"

import { useEffect, useState } from "react"
import { getAgentAction, updateAgentAction, chatPlaygroundAction } from "@/modules/agents/actions/agent.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export default function AgentsPage() {
  const [promptBase, setPromptBase] = useState("")
  const [temperature, setTemperature] = useState(0.1)
  const [dailyLimit, setDailyLimit] = useState(100)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Estados del Playground
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState("")
  const [isTyping, setIsTyping] = useState(false)

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
      toast.success("Instrucciones y parámetros del Agente IA guardados en el proyecto", {
        description: "El chat playground usará las nuevas reglas a partir de ahora.",
      })
    } else {
      toast.error(res.error)
    }
    setIsSaving(false)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return

    const userMsg: ChatMessage = { role: "user", content: inputText }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInputText("")
    setIsTyping(true)

    // Enviar a la Server Action del Playground
    const res = await chatPlaygroundAction(updatedMessages)
    setIsTyping(false)

    if (res.success && res.data) {
      setMessages([...updatedMessages, { role: "assistant", content: res.data }])
    } else {
      toast.error(res.error || "Fallo en la comunicación con el Agente")
    }
  }

  const handleResetChat = () => {
    setMessages([])
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-1/3 animate-pulse rounded-lg bg-muted/60" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-[450px] animate-pulse rounded-lg bg-muted/60" />
          <div className="h-[450px] animate-pulse rounded-lg bg-muted/60" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Configuración del Agente IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Define las reglas cognitivas y prueba al vendedor del proyecto actual en tiempo real.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Columna Izquierda: Prompt e Instrucciones */}
        <div className="space-y-6">
          <Card className="border-border shadow-sm flex flex-col h-[calc(100vh-200px)]">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">System Prompt & Ajustes</CardTitle>
              <CardDescription>
                Define la personalidad y reglas de comportamiento del vendedor.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt Base (Instrucciones)</Label>
                <textarea
                  id="prompt"
                  className="min-h-[220px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Eres el vendedor comercial..."
                  value={promptBase}
                  onChange={(e) => setPromptBase(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="temperature" className="text-xs">Temperatura (Creatividad)</Label>
                  <Input 
                    id="temperature" 
                    type="number" 
                    step="0.1" 
                    value={temperature} 
                    min="0" 
                    max="1" 
                    onChange={(e) => setTemperature(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="limit" className="text-xs">Límite Diario Mensajes</Label>
                  <Input 
                    id="limit" 
                    type="number" 
                    value={dailyLimit} 
                    onChange={(e) => setDailyLimit(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Modelo activo: Google Gemini 2.5 Flash (Vía OpenRouter)</Label>
              </div>
            </CardContent>
            <div className="p-4 border-t bg-muted/10 flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar Ajustes"}
              </Button>
            </div>
          </Card>
        </div>

        {/* Columna Derecha: Playground (Chat de pruebas) */}
        <div>
          <Card className="border-border shadow-sm flex flex-col h-[calc(100vh-200px)]">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Agent Playground (Pruebas)</CardTitle>
                <CardDescription>
                  Chatea con el bot para verificar sus respuestas.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleResetChat}>
                Reiniciar Chat
              </Button>
            </CardHeader>
            
            {/* Mensajes del Playground */}
            <CardContent className="flex-1 overflow-y-auto space-y-4 pt-4 bg-muted/5 flex flex-col justify-end">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2 my-auto">
                  <p className="text-sm font-medium text-muted-foreground">El chat está vacío</p>
                  <p className="text-xs text-muted-foreground max-w-[250px]">
                    Envía un primer mensaje (ej: "hola" o "¿tienes pantalones?") para simular la conversación de tu cliente.
                  </p>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col max-w-[80%] ${
                      m.role === "user" ? "ml-auto items-end" : "mr-auto"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-lg text-sm ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-muted text-foreground rounded-tl-none border"
                      }`}
                    >
                      {m.content}
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-1 px-1">
                      {m.role === "user" ? "Tú" : "Bot"}
                    </span>
                  </div>
                ))
              )}
              {isTyping && (
                <div className="mr-auto max-w-[80%] flex flex-col">
                  <div className="p-3 rounded-lg bg-muted text-foreground rounded-tl-none border text-xs italic animate-pulse">
                    El agente comercial está respondiendo...
                  </div>
                </div>
              )}
            </CardContent>

            {/* Input del Playground */}
            <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
              <Input
                placeholder="Pregúntale al bot por stock, precios o dudas..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isTyping}
              />
              <Button type="submit" disabled={isTyping}>Enviar</Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
