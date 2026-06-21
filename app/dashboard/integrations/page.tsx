"use client"

import { useState } from "react"
import { syncGoogleSheetAction } from "@/modules/integrations/actions/sheets.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export default function IntegrationsPage() {
  const [sheetUrl, setSheetUrl] = useState("")
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

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

    if (res.success && res.data) {
      toast.success("Catálogo sincronizado con éxito!")
      setSyncResult(`Sincronización exitosa: ${res.data.rowsSynced} productos importados/actualizados. El agente IA ya puede vender estos artículos.`)
    } else {
      toast.error(res.error || "Fallo en la importación de datos")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
          Integración Google Sheets
        </h1>
        <p className="text-muted-foreground mt-1">
          Vincula la hoja de cálculo de inventario de tu cliente para alimentar de forma directa el catálogo del bot.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Sincronizador de Inventario</CardTitle>
            <CardDescription>
              Asegúrate de que la hoja de Google Sheets esté configurada en "Compartir" &rarr; "Cualquier persona con el enlace puede leer".
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sheetUrl">Enlace de Edición de Google Sheets (URL)</Label>
              <Input
                id="sheetUrl"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                disabled={isSyncing}
              />
              <p className="text-[11px] text-muted-foreground">
                El importador procesará de forma automática la primera pestaña del documento (gid=0).
              </p>
            </div>

            {syncResult && (
              <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                {syncResult}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={handleSync} disabled={isSyncing}>
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
