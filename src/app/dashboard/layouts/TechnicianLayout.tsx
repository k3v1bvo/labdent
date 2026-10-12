"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  Menu,
  ClipboardList,
  History,
  User,
  LogOut,
} from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export default function TechnicianLayout({ children }: Props) {
  const [open, setOpen] = useState(true);
  const [profile, setProfile] = useState<{ name?: string }>();
  const router = useRouter();

  // 🔹 Obtener datos del usuario logueado
  useEffect(() => {
    async function fetchProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("nombre")
        .eq("id", user.id)
        .single();

      if (profileData) setProfile({ name: profileData.nombre });
    }

    fetchProfile();
  }, []);

  // 🔹 Cerrar sesión
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Sidebar */}
      <aside
        className={`${
          open ? "w-64" : "w-16"
        } bg-green-700 text-white transition-all duration-300 flex flex-col shadow-lg`}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between p-4 border-b border-green-600">
          <h1
            className={`font-bold text-lg tracking-wide transition-opacity ${
              !open && "opacity-0"
            }`}
          >
            Técnico
          </h1>
          <Menu
            className="cursor-pointer w-5 h-5 hover:text-green-300"
            onClick={() => setOpen(!open)}
          />
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-2 px-2 mt-4">
          <SidebarButton
            icon={<ClipboardList className="w-4 h-4" />}
            label="Mis tareas"
            open={open}
            onClick={() => router.push("/dashboard/technician")}
          />
          <SidebarButton
            icon={<History className="w-4 h-4" />}
            label="Historial"
            open={open}
            onClick={() => router.push("/dashboard/technician/history")}
          />
          <SidebarButton
            icon={<User className="w-4 h-4" />}
            label="Perfil"
            open={open}
            onClick={() => router.push("/dashboard/profile")}
          />
        </nav>

        {/* Cerrar sesión */}
        <div className="p-4 border-t border-green-600 mt-auto">
          <Button
            variant="destructive"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {open && "Cerrar sesión"}
          </Button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center px-6 py-4 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-100">
            Panel del Técnico
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            👷 {profile?.name || "Cargando..."}
          </div>
        </header>

        {/* Contenido dinámico */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

/** 🔹 Componente auxiliar para botones del menú lateral */
function SidebarButton({
  icon,
  label,
  open,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      className="w-full justify-start text-white hover:bg-green-600 transition-colors"
      onClick={onClick}
    >
      <span className="mr-3">{icon}</span>
      {open && <span>{label}</span>}
    </Button>
  );
}
