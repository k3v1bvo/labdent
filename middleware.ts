import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const token = req.cookies.get("sb-access-token")?.value;

  // Si no hay token → enviar al login
  if (!token && !req.nextUrl.pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Intentamos obtener datos del usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  // Rutas públicas permitidas
  if (req.nextUrl.pathname.startsWith("/auth")) return NextResponse.next();

  // Si no hay usuario, enviarlo al login
  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const rol = user.user_metadata?.rol;

  // 🔒 Control de acceso por rol
  const roleRoutes: Record<string, string[]> = {
    admin: ["/admin", "/dashboard"],
    secretaria: ["/secretaria"],
    doctor: ["/doctor"],
    tecnico: ["/tecnico"],
  };

  const pathname = req.nextUrl.pathname;

  // Si el usuario entra a una ruta fuera de su rol → redirigir
  const allowedRoutes = roleRoutes[rol] || [];
  const isAllowed = allowedRoutes.some((r) => pathname.startsWith(r));

  if (!isAllowed) {
    const redirectUrl = new URL(allowedRoutes[0] || "/auth/login", req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Todo correcto → permitir acceso
  return NextResponse.next();
}

// Aplicar middleware a las rutas protegidas
export const config = {
  matcher: [
    "/admin/:path*",
    "/doctor/:path*",
    "/tecnico/:path*",
    "/secretaria/:path*",
    "/dashboard/:path*",
  ],
};
