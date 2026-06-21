import { getCurrentSession } from "@/modules/auth/actions/auth.actions"
import { getDashboardMetricsAction } from "@/modules/analytics/actions/analytics.actions"
import { redirect } from "next/navigation"

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
    },
    {
      name: "Productos en Catálogo",
      value: metrics.productsCount.toString(),
      description: "Variantes activas disponibles",
      gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
      borderColor: "border-emerald-500/20",
      textColor: "text-emerald-500",
    },
    {
      name: "Conversaciones de la IA",
      value: metrics.conversationsCount.toString(),
      description: "Chats autónomos procesados",
      gradient: "from-violet-500/10 via-purple-500/5 to-transparent",
      borderColor: "border-violet-500/20",
      textColor: "text-violet-500",
    },
    {
      name: "Pedidos Registrados",
      value: metrics.ordersCount.toString(),
      description: "Ventas cerradas por chat",
      gradient: "from-amber-500/10 via-orange-500/5 to-transparent",
      borderColor: "border-amber-500/20",
      textColor: "text-amber-500",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
          Bienvenido de nuevo
        </h1>
        <p className="text-muted-foreground mt-1">
          Aquí tienes el estado operativo actual de tu organización.
        </p>
      </div>

      {!res.success && (
        <div className="p-4 rounded-lg bg-destructive/15 border border-destructive/20 text-destructive text-sm font-medium">
          Error al sincronizar métricas en tiempo real de la base de datos: {res.error}. Mostrando valores base.
        </div>
      )}

      {/* Grid de Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className={`rounded-xl border ${stat.borderColor} bg-gradient-to-b ${stat.gradient} p-6 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md`}
          >
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <span className="text-sm font-medium text-muted-foreground">{stat.name}</span>
            </div>
            <div className="mt-2">
              <span className={`text-3xl font-extrabold tracking-tight ${stat.textColor}`}>
                {stat.value}
              </span>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {stat.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Panel Auxiliar Informativo */}
      <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm mt-8">
        <h3 className="text-lg font-semibold tracking-tight">Comienza a configurar</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Para que tu agente de IA empiece a vender en WhatsApp, completa los siguientes pasos:
        </p>
        <div className="grid gap-4 md:grid-cols-3 mt-6">
          <div className="rounded-lg bg-muted/40 p-4 border border-border/30">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Paso 1</span>
            <h4 className="font-medium text-sm mt-1">Conecta tu número</h4>
            <p className="text-xs text-muted-foreground mt-1">Vincula tu WhatsApp Business Cloud API en la sección de Ajustes.</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4 border border-border/30">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Paso 2</span>
            <h4 className="font-medium text-sm mt-1">Sube tus Productos</h4>
            <p className="text-xs text-muted-foreground mt-1">Importa tu stock manualmente o sincroniza una hoja de Google Sheets.</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4 border border-border/30">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Paso 3</span>
            <h4 className="font-medium text-sm mt-1">Entrena al Agente</h4>
            <p className="text-xs text-muted-foreground mt-1">Define el prompt de personalidad de tu bot y sube tus FAQs operativas.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
