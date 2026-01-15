"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";
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
  ChevronDown,
  Bell,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

interface Props {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: Props) {
  const [open, setOpen] = useState(true);
  const [profile, setProfile] = useState<{ name?: string; role?: string }>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const { notifications, markAsRead } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.leida).length;

  // ✅ Cargar perfil
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
        {/* Logo + toggle */}
        <div>
          <div className="flex items-center justify-between p-4">
            <h1 className={`font-bold text-lg ${!open && "hidden"}`}>
              DentalApp
            </h1>
            <Menu
              className="cursor-pointer hover:opacity-80"
              onClick={() => setOpen(!open)}
            />
          </div>

          {/* Menú principal */}
          <nav className="space-y-2 px-3">
            <SidebarButton
              active={isActive("/dashboard/admin")}
              icon={<Home className="w-4 h-4 mr-2" />}
              label="Inicio"
              open={open}
              onClick={() => router.push("/dashboard/admin")}
            />
            <SidebarButton
              active={isActive("/dashboard/admin/orders")}
              icon={<Package className="w-4 h-4 mr-2" />}
              label="Pedidos"
              open={open}
              onClick={() => router.push("/dashboard/admin/orders")}
            />
            <SidebarButton
              active={isActive("/dashboard/admin/doctors")}
              icon={<Users className="w-4 h-4 mr-2" />}
              label="Doctores"
              open={open}
              onClick={() => router.push("/dashboard/admin/doctors")}
            />
            <SidebarButton
              active={isActive("/dashboard/admin/stations")}
              icon={<Hammer className="w-4 h-4 mr-2" />}
              label="Estaciones"
              open={open}
              onClick={() => router.push("/dashboard/admin/stations")}
            />
            <SidebarButton
              active={isActive("/dashboard/admin/users")}
              icon={<Settings className="w-4 h-4 mr-2" />}
              label="Usuarios"
              open={open}
              onClick={() => router.push("/dashboard/admin/users")}
            />
            <SidebarButton
              active={isActive("/dashboard/profile")}
              icon={<User className="w-4 h-4 mr-2" />}
              label="Perfil"
              open={open}
              onClick={() => router.push("/dashboard/profile")}
            />
          </nav>
        </div>

        {/* Footer fijo */}
        <div className="border-t border-green-600 p-4">
          <div className="truncate mb-3">
            <p className="font-semibold text-sm">
              {profile?.name || "Cargando..."}
            </p>
            <p className="text-xs text-green-200 capitalize">
              {profile?.role || "—"}
            </p>
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

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center p-4 bg-white shadow-sm border-b relative">
          <h2 className="text-lg font-semibold text-gray-700">
            Panel Administrativo
          </h2>

          <div className="flex items-center gap-4 relative">
            {/* 🔔 Notificaciones */}
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-full hover:bg-gray-100"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-14 top-10 w-80 bg-white border shadow-lg rounded-lg p-3 z-20">
                <h3 className="font-semibold text-gray-700 mb-2">
                  Notificaciones
                </h3>
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center">
                    Sin notificaciones
                  </p>
                ) : (
                  <ul className="max-h-64 overflow-y-auto space-y-2">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={`p-2 rounded-md border cursor-pointer ${
                          n.leida
                            ? "bg-gray-50 text-gray-500"
                            : "bg-green-50 border-green-200"
                        }`}
                        onClick={() => markAsRead(n.id)}
                      >
                        <p className="text-sm">{n.mensaje}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(n.creada_en).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Menú usuario */}
            <Button
              onClick={() => setMenuOpen(!menuOpen)}
              variant="outline"
              className="flex items-center gap-2 text-sm"
            >
              {profile?.name || "Usuario"}
              <ChevronDown className="w-4 h-4" />
            </Button>

            {menuOpen && (
              <div className="absolute right-0 top-10 w-44 bg-white border rounded-lg shadow-md z-20">
                <div className="p-2 border-b">
                  <p className="text-sm font-medium text-gray-800">
                    {profile?.name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {profile?.role}
                  </p>
                </div>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/dashboard/profile");
                  }}
                >
                  Ver Perfil
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Contenido dinámico */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

/** 🔹 Botón del menú lateral */
function SidebarButton({
  active,
  icon,
  label,
  open,
  onClick,
}: {
  active: string;
  icon: React.ReactNode;
  label: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      className={`w-full justify-start ${active}`}
      onClick={onClick}
    >
      {icon}
      {open && label}
    </Button>
  );
}
