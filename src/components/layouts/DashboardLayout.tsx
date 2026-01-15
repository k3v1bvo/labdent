"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Menu,
  Home,
  Users,
  Package,
  Settings,
  LogOut,
  Hammer,
  User,
  MapPin,
  FileText,
  Clipboard,
} from "lucide-react";
import AdminNotifications from "@/components/notifications/AdminNotifications";

interface Props {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: Props) {
  const [open, setOpen] = useState(true);
  const [profile, setProfile] = useState<{ name?: string; role?: string }>({});
  const router = useRouter();

  // 🔹 Cargar perfil desde Supabase
  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("nombre, rol")
        .eq("id", user.id)
        .single();

      if (profileData)
        setProfile({ name: profileData.nombre, role: profileData.rol });
    }

    loadProfile();
  }, []);

  // 🔹 Cerrar sesión
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Sidebar */}
      <aside
        className={`relative ${
          open ? "w-64" : "w-16"
        } bg-green-700 text-white transition-all duration-300 flex flex-col shadow-lg`}
      >
        {/* Botón para expandir/colapsar */}
        <button
          onClick={() => setOpen(!open)}
          className="absolute -right-4 top-6 z-20 bg-green-700 hover:bg-green-600 border border-green-400 text-white rounded-full p-2 shadow-md"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Logo */}
        <div className="flex items-center justify-center p-4 border-b border-green-600">
          {open && (
            <h1 className="font-bold text-lg tracking-wide">DentalApp</h1>
          )}
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-1 px-2 mt-4">
          <SidebarButton
            icon={<Home className="w-4 h-4" />}
            label="Inicio"
            open={open}
            onClick={() => router.push("/dashboard/admin")}
          />
          <SidebarButton
            icon={<Package className="w-4 h-4" />}
            label="Pedidos"
            open={open}
            onClick={() => router.push("/dashboard/admin/orders")}
          />
          <SidebarButton
            icon={<Users className="w-4 h-4" />}
            label="Doctores"
            open={open}
            onClick={() => router.push("/dashboard/admin/doctors")}
          />
          <SidebarButton
            icon={<FileText className="w-4 h-4" />}
            label="Estaciones"
            open={open}
            onClick={() => router.push("/dashboard/admin/stations")}
          />
          <SidebarButton
            icon={<Clipboard className="w-4 h-4" />}
            label="Mis trabajos"
            open={open}
            onClick={() => router.push("/dashboard/technician")}
          />
          <SidebarButton
            icon={<MapPin className="w-4 h-4" />}
            label="Seguimiento"
            open={open}
            onClick={() => router.push("/dashboard/admin/tracking")}
          />
          <SidebarButton
            icon={<Settings className="w-4 h-4" />}
            label="Usuarios"
            open={open}
            onClick={() => router.push("/dashboard/admin/users")}
          />
          <SidebarButton
            icon={<User className="w-4 h-4" />}
            label="Perfil"
            open={open}
            onClick={() => router.push("/dashboard/profile")}
          />
        </nav>

        {/* Footer del sidebar */}
        <div className="p-4 border-t border-green-600 mt-auto">
          {open && (
            <div className="mb-3 text-sm">
              <p className="font-semibold">{profile?.name || "Usuario"}</p>
              <p className="text-green-200">{profile?.role}</p>
            </div>
          )}

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
        <header className="flex justify-between items-center px-6 py-4 bg-white shadow-sm border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-700">
            Panel Administrativo
          </h2>

          <div className="flex items-center gap-4">
            {/* 🔔 Notificaciones del Admin */}
            <AdminNotifications />

            {/* Avatar del usuario */}
            <Avatar name={profile?.name || "Admin"} />
          </div>
        </header>

        {/* Contenido dinámico */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

/** 🔹 Botón genérico para el sidebar */
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
