import { jwtVerify } from "jose"
import { NextRequest, NextResponse } from "next/server"

const COOKIE_NAME = "phron_session"
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "phron-agents-secret-super-key-change-in-prod"
)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(COOKIE_NAME)?.value

  // 1. Verificar si el token es válido
  let hasValidSession = false
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET)
      hasValidSession = true
    } catch {
      hasValidSession = false
    }
  }

  // 2. Ruta protegida: /dashboard/*
  if (pathname.startsWith("/dashboard")) {
    if (!hasValidSession) {
      const loginUrl = new URL("/login", request.url)
      // Opcional: Redireccionar de vuelta después de iniciar sesión
      loginUrl.searchParams.set("from", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // 3. Rutas de Login / Signup: Si ya está logueado, redirigir a dashboard
  if (pathname === "/login" || pathname === "/signup") {
    if (hasValidSession) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return NextResponse.next()
}

// Configurar en qué rutas se activará el middleware
export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
}
