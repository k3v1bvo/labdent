"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user || null);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  // 🔹 Enlaces de navegación (visibles para todos por ahora)
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/pedidos", label: "Pedidos" },
    { href: "/pedidos/nuevo", label: "Nuevo Pedido" },
    { href: "/usuarios", label: "Usuarios" },
    { href: "/doctor", label: "Doctor" },
    { href: "/secretaria", label: "Secretaria" },
    { href: "/tecnico", label: "Técnico" },
  ];

  return (
    <nav className="w-full bg-zinc-900 text-white flex items-center justify-between px-6 py-3 shadow-md border-b border-zinc-800">
      {/* Izquierda */}
      <div className="flex items-center gap-6">
        <Link href="/" className="font-bold text-lg hover:text-blue-400 transition">
          🦷 LabDent
        </Link>

        {/* 🔥 Aquí aparecen los botones */}
        <div className="flex items-center gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium hover:text-blue-400 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Derecha */}
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-gray-300">
            {user.user_metadata?.nombre || "Usuario"} (
            {user.user_metadata?.rol || "rol"})
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-1 border-gray-500 text-white hover:bg-zinc-800"
        >
          <LogOut size={16} /> Cerrar sesión
        </Button>
      </div>
    </nav>
  );
}
