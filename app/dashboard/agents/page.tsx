"use client"

import { useEffect, useRef, useState } from "react"
import {
  getAgentAction,
  updateAgentAction,
  chatPlaygroundAction,
  createPlaygroundConversationAction,
  listPlaygroundConversationsAction,
  getPlaygroundMessagesAction,
} from "@/modules/agents/actions/agent.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface PlaygroundConversation {
  id: string
  updatedAt: string
  customer: {
    fullName: string | null
  }
}

export default function AgentsPage() {
  const [promptBase, setPromptBase] = useState("")
  const [temperature, setTemperature] = useState(0.1)
  const [dailyLimit, setDailyLimit] = useState(100)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Estados del Playground
  const [playgroundConvs, setPlaygroundConvs] = useState<PlaygroundConversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string>("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

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

  const loadPlaygroundConversations = async (selectId?: string) => {
    const res = await listPlaygroundConversationsAction()
    if (res.success && res.data) {
      const data = res.data as unknown as PlaygroundConversation[]
      setPlaygroundConvs(data)
      if (data.length > 0) {
        const idToSelect = selectId || data[0].id
        setActiveConvId(idToSelect)
        loadMessagesForConv(idToSelect)
      } else {
        handleNewChat()
      }
    }
  }

  const loadMessagesForConv = async (convId: string) => {
    const res = await getPlaygroundMessagesAction(convId)
    if (res.success && res.data) {
      setMessages(
        res.data.map((m: any) => ({
          role: m.role === "USER" ? "user" : "assistant",
          content: m.content,
        }))
      )
    } else {
      toast.error("Error al cargar mensajes")
    }
  }

  useEffect(() => {
    loadAgent()
    loadPlaygroundConversations()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    const res = await updateAgentAction({
      promptBase,
      temperature,
      dailyLimit,
    })

    if (res.success) {
      toast.success("Instrucciones y parámetros del Agente IA guardados", {
        description: "El Playground usará las nuevas reglas a partir de ahora.",
      })
    } else {
      toast.error(res.error)
    }
    setIsSaving(false)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !activeConvId) return

    const userMsg: ChatMessage = { role: "user", content: inputText }
    setMessages((prev) => [...prev, userMsg])
    const sentText = inputText
    setInputText("")
    setIsTyping(true)

    const res = await chatPlaygroundAction(activeConvId, sentText)
    setIsTyping(false)

    if (!res.success) {
      toast.error(res.error || "Fallo en la comunicación con el Agente")
    } else if (res.data) {
      setMessages(
        res.data.messages.map((m: any) => ({
          role: m.role === "USER" ? "user" : "assistant",
          content: m.content,
        }))
      )
      // Refresh sidebar list to update order
      loadPlaygroundConversations(activeConvId)
    } else {
      toast.error("Fallo en la comunicación con el Agente (respuesta vacía)")
    }
  }

  const handleNewChat = async () => {
    setMessages([])
    const res = await createPlaygroundConversationAction()
    if (res.success && res.data) {
      toast.success("Nueva conversación de prueba creada")
      await loadPlaygroundConversations(res.data.id)
    } else {
      const errorMsg = !res.success ? res.error : "Fallo al crear conversación"
      toast.error(errorMsg)
    }
  }

  const handleSelectConv = (convId: string) => {
    if (convId === activeConvId) return
    setActiveConvId(convId)
    setMessages([])
    loadMessagesForConv(convId)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-1/3 animate-pulse rounded-lg bg-muted/60" />
        <div className="h-[500px] animate-pulse rounded-lg bg-muted/60" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
          Agente IA
        </h1>
        <p className="text-muted-foreground mt-1">
          Configura las reglas de tu vendedor y pruébalo en tiempo real.
        </p>
      </div>

      <Tabs defaultValue="playground" className="w-full">
        <TabsList variant="line">
          <TabsTrigger value="playground">Playground de Pruebas</TabsTrigger>
          <TabsTrigger value="settings">Ajustes del Agente</TabsTrigger>
        </TabsList>

        {/* ===================== TAB: AJUSTES ===================== */}
        <TabsContent value="settings">
          <div className="grid gap-6 lg:grid-cols-3 mt-4">
            {/* Prompt Base (ancho) */}
            <Card className="lg:col-span-2 border-border shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg">System Prompt</CardTitle>
                <CardDescription>
                  Escribe las instrucciones de personalidad, tono y reglas para el vendedor IA.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pt-4">
                <textarea
                  id="prompt"
                  className="min-h-[340px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
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
              <div className="p-4 border-t bg-muted/10 flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Guardando..." : "Guardar Ajustes"}
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ===================== TAB: PLAYGROUND ===================== */}
        <TabsContent value="playground">
          <div className="flex h-[calc(100vh-240px)] border rounded-xl overflow-hidden bg-card shadow-sm mt-4">
            {/* ---- Sidebar izquierdo: lista de chats de prueba ---- */}
            <div className="w-72 border-r flex flex-col bg-muted/10 shrink-0">
              <div className="p-3 border-b flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm truncate">Chats de Prueba</h3>
                <Button variant="outline" size="sm" className="shrink-0 text-xs h-7 px-2.5" onClick={handleNewChat}>
                  + Nuevo
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {playgroundConvs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No hay chats de prueba aún.
                  </div>
                ) : (
                  playgroundConvs.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConv(conv.id)}
                      className={`px-3 py-3 cursor-pointer border-b border-border/30 transition-colors ${
                        activeConvId === conv.id
                          ? "bg-muted"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">
                          {conv.customer.fullName || "Chat de Prueba"}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">
                        {new Date(conv.updatedAt).toLocaleString("es-ES", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ---- Panel derecho: área de chat ---- */}
            <div className="flex-1 flex flex-col min-w-0">
              {activeConvId ? (
                <>
                  {/* Header del chat */}
                  <div className="p-3 border-b flex items-center justify-between bg-muted/5">
                    <div>
                      <h3 className="font-bold text-sm">
                        {playgroundConvs.find((c) => c.id === activeConvId)?.customer.fullName || "Chat de Prueba"}
                      </h3>
                      <span className="text-[11px] text-muted-foreground">Conversación de prueba del Playground</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500 border border-violet-500/20 font-bold">
                      PLAYGROUND
                    </span>
                  </div>

                  {/* Mensajes */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-muted/5">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center mb-2">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-500"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Conversación nueva</p>
                        <p className="text-xs text-muted-foreground max-w-[280px]">
                          Envía un mensaje (ej: &quot;hola&quot; o &quot;¿tienes pantalones?&quot;) para simular a un cliente real.
                        </p>
                      </div>
                    ) : (
                      messages.map((m, idx) => (
                        <div
                          key={idx}
                          className={`flex flex-col max-w-[75%] ${
                            m.role === "user" ? "ml-auto items-end" : "mr-auto"
                          }`}
                        >
                          <div
                            className={`p-3 rounded-lg text-sm leading-relaxed ${
                              m.role === "user"
                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                : "bg-muted text-foreground rounded-tl-none border"
                            }`}
                          >
                            {m.content}
                          </div>
                          <span className="text-[9px] text-muted-foreground mt-1 px-1">
                            {m.role === "user" ? "Tú (Cliente simulado)" : "Agente IA"}
                          </span>
                        </div>
                      ))
                    )}
                    {isTyping && (
                      <div className="mr-auto max-w-[75%] flex flex-col">
                        <div className="p-3 rounded-lg bg-muted text-foreground rounded-tl-none border text-xs italic animate-pulse">
                          El agente comercial está respondiendo...
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <form onSubmit={handleSendMessage} className="p-3 border-t flex gap-2 bg-card">
                    <Input
                      placeholder="Escribe como si fueras un cliente..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      disabled={isTyping}
                      className="text-sm"
                    />
                    <Button type="submit" disabled={isTyping || !activeConvId}>
                      Enviar
                    </Button>
                  </form>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center text-center p-8 text-muted-foreground bg-muted/5">
                  <p className="text-sm">Selecciona o crea una conversación de prueba para empezar.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
