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
  const [showPlaygroundSidebar, setShowPlaygroundSidebar] = useState(true)
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
      if (window.innerWidth < 640) {
        setShowPlaygroundSidebar(false)
      }
    } else {
      const errorMsg = !res.success ? res.error : "Fallo al crear conversación"
      toast.error(errorMsg)
    }
  }

  const handleSelectConv = (convId: string) => {
    if (convId === activeConvId) {
      if (window.innerWidth < 640) {
        setShowPlaygroundSidebar(false)
      }
      return
    }
    setActiveConvId(convId)
    setMessages([])
    loadMessagesForConv(convId)
    if (window.innerWidth < 640) {
      setShowPlaygroundSidebar(false)
    }
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
          Playground de Pruebas
        </h1>
        <p className="text-muted-foreground mt-1">
          Interactúa en tiempo real con el agente para probar tus instrucciones y configuraciones.
        </p>
      </div>

      <div className="flex h-[calc(100vh-220px)] border rounded-xl overflow-hidden bg-card shadow-sm relative">
        {/* ---- Sidebar izquierdo: lista de chats de prueba ---- */}
        <div className={`transition-all duration-300 ease-in-out border-r flex flex-col bg-card shrink-0 h-full max-sm:absolute max-sm:inset-y-0 max-sm:left-0 max-sm:z-20 ${
          showPlaygroundSidebar 
            ? "w-[calc(100%-56px)] sm:w-60 md:w-72 opacity-100 max-sm:translate-x-0 max-sm:shadow-2xl" 
            : "w-0 sm:w-0 opacity-0 overflow-hidden border-r-0 max-sm:-translate-x-full"
        }`}>
          <div className="p-3 border-b flex items-center justify-between gap-2 shrink-0">
            <h3 className="font-semibold text-xs sm:text-sm truncate">Chats</h3>
            <Button variant="outline" size="sm" className="shrink-0 text-[10px] sm:text-xs h-7 px-1.5 sm:px-2.5" onClick={handleNewChat}>
              + Nuevo
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {playgroundConvs.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Vacío
              </div>
            ) : (
              playgroundConvs.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConv(conv.id)}
                  className={`px-3 py-2 cursor-pointer border-b border-border/30 transition-colors ${
                    activeConvId === conv.id
                      ? "bg-muted"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-medium truncate">
                      {conv.customer.fullName || "Chat de Prueba"}
                    </span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 block">
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
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          {showPlaygroundSidebar && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2.5 top-3 z-30 h-8 w-8 sm:hidden"
              onClick={() => setShowPlaygroundSidebar(false)}
              title="Cerrar chats"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
                <path d="m16 15-3-3 3-3" />
              </svg>
            </Button>
          )}

          {activeConvId ? (
            <>
              {/* Header del chat */}
              <div className="p-3 border-b flex items-center justify-between bg-muted/5 gap-2 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 shrink-0 ${showPlaygroundSidebar ? "max-sm:hidden" : ""}`}
                    onClick={() => setShowPlaygroundSidebar(!showPlaygroundSidebar)}
                    title={showPlaygroundSidebar ? "Ocultar chats" : "Mostrar chats"}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <path d="M9 3v18" />
                      {showPlaygroundSidebar ? (
                        <path d="m16 15-3-3 3-3" />
                      ) : (
                        <path d="m13 9 3 3-3 3" />
                      )}
                    </svg>
                  </Button>
                  <div className={`truncate ${showPlaygroundSidebar ? "max-sm:hidden" : ""}`}>
                    <h3 className="font-bold text-sm truncate">
                      {playgroundConvs.find((c) => c.id === activeConvId)?.customer.fullName || "Chat de Prueba"}
                    </h3>
                    <span className="text-[11px] text-muted-foreground block truncate">Conversación de prueba del Playground</span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500 border border-violet-500/20 font-bold shrink-0 ${showPlaygroundSidebar ? "max-sm:hidden" : ""}`}>
                  PLAYGROUND
                </span>
              </div>

              {/* Mensajes */}
              <div className={`flex-1 p-4 overflow-y-auto space-y-4 bg-muted/5 ${showPlaygroundSidebar ? "max-sm:hidden" : ""}`}>
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
              <form onSubmit={handleSendMessage} className={`p-3 border-t flex gap-2 bg-card ${showPlaygroundSidebar ? "max-sm:hidden" : ""}`}>
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
    </div>
  )
}
