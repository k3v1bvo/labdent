"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface UserData {
  nombre?: string;
  rol?: string;
}

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser({
          nombre: data.user.user_metadata?.nombre,
          rol: data.user.user_metadata?.rol,
        });
      }
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const linksByRole: Record<string, { href: string; label: string }[]> = {
    admin: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/pedidos", label: "Pedidos" },
      { href: "/pedidos/nuevo", label: "Nuevo Pedido" },
      { href: "/usuarios", label: "Usuarios" },
    ],
    secretaria: [
      { href: "/pedidos", label: "Pedidos" },
      { href: "/pedidos/nuevo", label: "Nuevo Pedido" },
    ],
    doctor: [
      { href: "/pedidos/nuevo", label: "Nuevo Pedido" },
      { href: "/pedidos", label: "Mis Pedidos" },
    ],
    tecnico: [
      { href: "/pedidos", label: "Pedidos Asignados" },
    ],
  };

  const links = linksByRole[user?.rol || ""] || [];

  return (
    <nav className="w-full bg-black text-white flex items-center justify-between px-6 py-3 shadow">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-bold text-lg">
          🦷 LabDent
        </Link>

        {/* Links según el rol */}
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm hover:text-blue-400 transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-gray-300">
            {user.nombre} ({user.rol})
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-1"
        >
          <LogOut size={16} /> Cerrar sesión
        </Button>
      </div>
    </nav>
  );
}
