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

  return (
    <nav className="w-full bg-zinc-900 text-white flex items-center justify-between px-6 py-3 shadow-md">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-bold text-lg hover:text-blue-400 transition">
          🦷 LabDent
        </Link>

        {/* 🔹 TEMPORALMENTE TODOS LOS BOTONES VISIBLES */}
        <Link href="/dashboard" className="text-sm hover:text-blue-400">
          Dashboard
        </Link>
        <Link href="/pedidos" className="text-sm hover:text-blue-400">
          Pedidos
        </Link>
        <Link href="/pedidos/nuevo" className="text-sm hover:text-blue-400">
          Nuevo Pedido
        </Link>
        <Link href="/usuarios" className="text-sm hover:text-blue-400">
          Usuarios
        </Link>
        <Link href="/doctor" className="text-sm hover:text-blue-400">
          Doctor
        </Link>
        <Link href="/secretaria" className="text-sm hover:text-blue-400">
          Secretaria
        </Link>
        <Link href="/tecnico" className="text-sm hover:text-blue-400">
          Técnico
        </Link>
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
          className="flex items-center gap-1 border-gray-400 text-white hover:bg-zinc-800"
        >
          <LogOut size={16} /> Cerrar sesión
        </Button>
      </div>
    </nav>
  );
}
