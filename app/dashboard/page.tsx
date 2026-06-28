import { getCurrentSession } from "@/modules/auth/actions/auth.actions"
import { getDashboardMetricsAction } from "@/modules/analytics/actions/analytics.actions"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await getCurrentSession()
  
  if (!session) {
    redirect("/login")
  }

  const res = await getDashboardMetricsAction()

  // Valores por defecto en caso de error
  const metrics = res.success ? res.data : {
    customersCount: 0,
    productsCount: 0,
    conversationsCount: 0,
    ordersCount: 0,
  }

  const stats = [
    {
      name: "Clientes Totales",
      value: metrics.customersCount.toString(),
      description: "Contactos activos capturados",
      gradient: "from-blue-500/10 via-cyan-500/5 to-transparent",
      borderColor: "border-blue-500/20",
      textColor: "text-blue-500",
      href: "/dashboard/customers",
    },
    {
      name: "Productos en Catálogo",
      value: metrics.productsCount.toString(),
      description: "Variantes activas disponibles",
      gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
      borderColor: "border-emerald-500/20",
      textColor: "text-emerald-500",
      href: "/dashboard/products",
    },
    {
      name: "Conversaciones de la IA",
      value: metrics.conversationsCount.toString(),
      description: "Chats autónomos procesados",
      gradient: "from-violet-500/10 via-purple-500/5 to-transparent",
      borderColor: "border-violet-500/20",
      textColor: "text-violet-500",
      href: "/dashboard/conversations",
    },
    {
      name: "Pedidos Registrados",
      value: metrics.ordersCount.toString(),
      description: "Ventas cerradas por chat",
      gradient: "from-amber-500/10 via-orange-500/5 to-transparent",
      borderColor: "border-amber-500/20",
      textColor: "text-amber-500",
      href: "/dashboard/conversations",
    },
  ]

  const quickActions = [
    {
      title: "Probar el Agente IA",
      description: "Simula una conversación de cliente en el Playground para verificar cómo responde tu vendedor.",
      href: "/dashboard/agents",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      ),
      color: "text-violet-500 bg-violet-500/10 border-violet-500/20",
    },
    {
      title: "Sincronizar Inventario",
      description: "Importa productos desde tu hoja de Google Sheets para mantener el catálogo actualizado.",
      href: "/dashboard/integrations",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
      ),
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Gestionar Productos",
      description: "Revisa stock, precios y variantes de tu catálogo para que el bot cotice correctamente.",
      href: "/dashboard/products",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
      ),
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "Configurar Canales",
      description: "Vincula tu WhatsApp Business o Bot de Telegram para recibir mensajes en vivo.",
      href: "/dashboard/settings",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
      ),
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
          Bienvenido de nuevo, {session.fullName} a Phron Agents
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Plataforma para gestión de chatbots IA. Aquí tienes el estado operativo actual de tu organización.
        </p>
      </div>

      {!res.success && (
        <div className="p-4 rounded-lg bg-destructive/15 border border-destructive/20 text-destructive text-sm font-medium">
          Error al sincronizar métricas en tiempo real de la base de datos: {res.error}. Mostrando valores base.
        </div>
      )}

      {/* Grid de Métricas */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className={`rounded-xl border ${stat.borderColor} bg-gradient-to-b ${stat.gradient} p-4 sm:p-6 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md block`}
          >
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">{stat.name}</span>
            <div className="mt-1 sm:mt-2">
              <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${stat.textColor}`}>
                {stat.value}
              </span>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 font-medium">
                {stat.description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Acciones Rápidas */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold tracking-tight">Acciones Rápidas</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="group rounded-xl border border-border/40 bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/80 flex flex-col gap-3"
            >
              <div className={`w-9 h-9 rounded-lg ${action.color} border flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                {action.icon}
              </div>
              <div>
                <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">{action.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
