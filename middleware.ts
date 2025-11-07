import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("sb-access-token")?.value;

  const publicRoutes = ["/auth/login", "/auth/register", "/"]; // puedes ajustar según tus rutas reales

  // Si la ruta es pública → permitir acceso
  if (publicRoutes.some((r) => req.nextUrl.pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Si no hay token → redirigir a login
  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Si hay token → permitir acceso (validación completa se hace en el cliente)
  return NextResponse.next();
}

// Aplica el middleware solo a rutas protegidas
export const config = {
  matcher: [
    "/admin/:path*",
    "/doctor/:path*",
    "/tecnico/:path*",
    "/secretaria/:path*",
    "/dashboard/:path*",
  ],
};
