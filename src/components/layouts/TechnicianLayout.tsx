"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  Menu,
  Wrench,
  Clock,
  User,
  LogOut,
} from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export default function TechnicianLayout({ children }: Props) {
  const [open, setOpen] = useState(true);
  const [profile, setProfile] = useState<{ name?: string }>({});
  const router = useRouter();
  const pathname = usePathname();

  // 🔹 Cargar datos del técnico logueado
  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("nombre")
        .eq("id", user.id)
        .single();

      if (profileData) setProfile({ name: profileData.nombre });
    }

    loadProfile();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const isActive = (path: string) =>
    pathname === path
      ? "bg-green-800 text-white"
      : "hover:bg-green-600 text-green-100";

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside
        className={`${
          open ? "w-64" : "w-16"
        } bg-green-700 text-white flex flex-col justify-between transition-all duration-300`}
      >
        {/* Encabezado */}
        <div>
          <div className="flex items-center justify-between p-4 border-b border-green-600">
            <h1 className={`font-bold text-lg ${!open && "hidden"}`}>
              Técnico
            </h1>
            <Menu
              className="cursor-pointer hover:opacity-80"
              onClick={() => setOpen(!open)}
            />
          </div>

          {/* Navegación */}
          <nav className="space-y-2 px-3 mt-4">
            <Button
              variant="ghost"
              className={`w-full justify-start ${isActive("/dashboard/technician")}`}
              onClick={() => router.push("/dashboard/technician")}
            >
              <Wrench className="w-4 h-4 mr-2" /> {open && "Mis tareas"}
            </Button>

            <Button
              variant="ghost"
              className={`w-full justify-start ${isActive("/dashboard/technician/history")}`}
              onClick={() => router.push("/dashboard/technician/history")}
            >
              <Clock className="w-4 h-4 mr-2" /> {open && "Historial"}
            </Button>

            <Button
              variant="ghost"
              className={`w-full justify-start ${isActive("/dashboard/profile")}`}
              onClick={() => router.push("/dashboard/profile")}
            >
              <User className="w-4 h-4 mr-2" /> {open && "Perfil"}
            </Button>
          </nav>
        </div>

        {/* Pie de menú */}
        <div className="border-t border-green-600 p-4">
          <div className="truncate mb-3">
            <p className="font-semibold text-sm">
              {profile?.name || "Cargando..."}
            </p>
            <p className="text-xs text-green-200">Técnico</p>
          </div>

          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" /> {open && "Cerrar sesión"}
          </Button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 bg-white shadow-sm border-b">
          <h2 className="text-lg font-semibold text-gray-700">
            Panel del Técnico
          </h2>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
