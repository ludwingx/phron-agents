"use client"

import { useEffect, useState } from "react"
import {
  listConversationsAction,
  findConversationByIdAction,
  toggleAgentIaAction,
  sendMessageAction,
} from "@/modules/conversations/actions/conversation.actions"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface SerializedConversation {
  id: string
  status: "ACTIVE_IA" | "PAUSED" | "CLOSED"
  updatedAt: Date
  customer: {
    id: string
    fullName: string | null
    phoneNumber: string
    labels: string[]
  }
  channel?: {
    type: string
  }
}

interface Message {
  id: string
  role: "USER" | "ASSISTANT" | "SYSTEM" | "HUMAN_AGENT"
  content: string
  createdAt: Date
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<SerializedConversation[]>([])
  const [activeConv, setActiveConv] = useState<SerializedConversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isChatLoading, setIsChatLoading] = useState(false)

  const loadConversations = async (selectId?: string) => {
    setIsLoading(true)
    const res = await listConversationsAction()
    if (res.success && res.data) {
      const data = res.data as any[]
      setConversations(data)
      if (data.length > 0) {
        // Seleccionar por defecto
        const defaultConv = selectId ? data.find((c) => c.id === selectId) : data[0]
        if (defaultConv) {
          setActiveConv(defaultConv)
          loadMessages(defaultConv.id)
        }
      }
    } else {
      toast.error("Error al cargar inbox de chats")
    }
    setIsLoading(false)
  }

  const loadMessages = async (id: string) => {
    setIsChatLoading(true)
    const res = await findConversationByIdAction(id)
    if (res.success && res.data) {
      setMessages(res.data.messages as any[])
    } else {
      toast.error("Error al cargar mensajes")
    }
    setIsChatLoading(false)
  }

  useEffect(() => {
    loadConversations()
  }, [])

  const handleSelectConversation = (conv: SerializedConversation) => {
    setActiveConv(conv)
    loadMessages(conv.id)
  }

  const handleToggleIA = async () => {
    if (!activeConv) return
    const newStatus = activeConv.status === "ACTIVE_IA" ? "PAUSED" : "ACTIVE_IA"
    
    const res = await toggleAgentIaAction(activeConv.id, newStatus)
    if (res.success) {
      toast.success(newStatus === "PAUSED" ? "Agente de IA Pausado (Staff Mode)" : "Agente de IA Reactivado")
      // Actualizar estado local
      const updated = { ...activeConv, status: newStatus } as SerializedConversation
      setActiveConv(updated)
      setConversations(conversations.map((c) => (c.id === activeConv.id ? updated : c)))
    } else {
      toast.error("Error al cambiar estado del bot")
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !activeConv) return

    const res = await sendMessageAction({
      conversationId: activeConv.id,
      content: inputText.trim(),
    })

    if (res.success) {
      setInputText("")
      // Recargar mensajes y refrescar estado del chat
      loadMessages(activeConv.id)
      loadConversations(activeConv.id)
    } else {
      toast.error("Error al enviar mensaje")
    }
  }

  return (
    <div className="flex h-[calc(100vh-140px)] border rounded-xl overflow-hidden bg-card shadow-sm">
      {/* Columna 1: Listado de Chats */}
      <div className="w-1/3 border-r flex flex-col bg-muted/10">
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg">Inbox de Chats</h2>
          <p className="text-xs text-muted-foreground mt-1">Conexión con WhatsApp Business API</p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y">
          {isLoading && conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Cargando chats...</div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Sin conversaciones de clientes por el momento.
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`p-4 cursor-pointer transition-colors ${
                  activeConv?.id === conv.id ? "bg-muted" : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">
                    {conv.customer.fullName || "Cliente Anónimo"}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      conv.status === "ACTIVE_IA"
                        ? "bg-violet-500/10 text-violet-500 border border-violet-500/20"
                        : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    }`}
                  >
                    {conv.status === "ACTIVE_IA" ? "IA ACTIVA" : "PAUSADO"}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {conv.customer.phoneNumber}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Columna 2: Historial del Chat */}
      <div className="flex-1 flex flex-col justify-between">
        {activeConv ? (
          <>
            <div className="p-4 border-b flex items-center justify-between bg-muted/5">
              <div>
                <h3 className="font-bold text-sm">
                  {activeConv.customer.fullName || "Cliente Anónimo"}
                </h3>
                <span className="text-xs text-muted-foreground">{activeConv.customer.phoneNumber}</span>
              </div>
              <Button
                variant={activeConv.status === "ACTIVE_IA" ? "outline" : "default"}
                size="sm"
                onClick={handleToggleIA}
              >
                {activeConv.status === "ACTIVE_IA" ? "Pausar IA (Staff Mode)" : "Reactivar Vendedor IA"}
              </Button>
            </div>

            {/* Mensajes */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-muted/5">
              {isChatLoading && messages.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground">Cargando historial...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground mt-8">
                  Inicio del historial de chat de WhatsApp.
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-[70%] ${
                      m.role === "USER" ? "mr-auto" : "ml-auto items-end"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-lg text-sm ${
                        m.role === "USER"
                          ? "bg-muted text-foreground rounded-tl-none border"
                          : m.role === "ASSISTANT"
                          ? "bg-violet-600 text-white rounded-tr-none"
                          : "bg-primary text-primary-foreground rounded-tr-none"
                      }`}
                    >
                      {m.content}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 px-1">
                      {m.role === "USER" ? "Cliente" : m.role === "ASSISTANT" ? "IA Bot" : "Operador"} •{" "}
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2 bg-card">
              <Input
                placeholder="Escribe un mensaje para responder manualmente (Pausará la IA)..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <Button type="submit">Enviar</Button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground bg-muted/5">
            Selecciona una conversación del panel lateral para visualizar su historial de mensajes de WhatsApp.
          </div>
        )}
      </div>
    </div>
  )
}
