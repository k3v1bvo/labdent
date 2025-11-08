"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  LayoutDashboard,
  PackageSearch,
  FilePlus2,
  Users,
  Workflow,
  LogOut,
} from "lucide-react";

type UserRole = "admin" | "secretaria" | "doctor" | "tecnico";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const menuByRole: Record<UserRole, NavItem[]> = {
  admin: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Pedidos", href: "/pedidos", icon: PackageSearch },
    { label: "Nuevo Pedido", href: "/pedidos/nuevo", icon: FilePlus2 },
    { label: "Usuarios", href: "/admin/usuarios", icon: Users }, // crea luego si quieres
    { label: "Estaciones", href: "/admin/estaciones", icon: Workflow }, // idem
  ],
  secretaria: [
    { label: "Pedidos", href: "/pedidos", icon: PackageSearch },
    { label: "Nuevo Pedido", href: "/pedidos/nuevo", icon: FilePlus2 },
  ],
  doctor: [
    { label: "Nuevo Pedido", href: "/pedidos/nuevo", icon: FilePlus2 },
    { label: "Mis Pedidos", href: "/pedidos", icon: PackageSearch },
  ],
  tecnico: [
    { label: "Pedidos en producción", href: "/pedidos", icon: PackageSearch },
  ],
};

export function Sidebar() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [name, setName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Intentar leer perfil
      const { data: profile } = await supabase
        .from("profiles")
        .select("rol,nombre")
        .eq("id", user.id)
        .maybeSingle();

      const rol =
        (profile?.rol as UserRole | undefined) ||
        (user.user_metadata?.rol as UserRole | undefined) ||
        "tecnico";

      setRole(rol);
      setName(profile?.nombre || user.email || "Usuario");
      setLoading(false);
    };

    load();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  // No renderizar nada si no hay sesión o está cargando
  if (loading || !role) return null;

  const menu = menuByRole[role] || [];

  return (
    <aside className="w-64 bg-[#050816] text-gray-100 flex flex-col border-r border-white/10">
      <div className="px-5 py-4 border-b border-white/10">
        <div className="text-sm uppercase tracking-[0.2em] text-violet-400">
          LabDent
        </div>
        <div className="text-xs text-gray-400 mt-1">Workflow Laboratorio</div>
        <div className="mt-3 text-sm">
          <span className="font-semibold">{name}</span>
          <span className="ml-2 px-2 py-0.5 text-[0.65rem] rounded-full bg-violet-500/20 text-violet-300 uppercase">
            {role}
          </span>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-1">
        {menu.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition
                ${
                  active
                    ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
