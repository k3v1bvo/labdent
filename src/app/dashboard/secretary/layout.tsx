"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  Menu,
  ClipboardList,
  FilePlus,
  User,
  LogOut,
  Home,
  Stethoscope,
} from "lucide-react";
import SecretaryNotifications from "@/components/notifications/SecretaryNotifications";
import { ProfileDialog } from "@/components/profile/ProfileDialog";

export default function SecretaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  const [profile, setProfile] = useState<{ name?: string; role?: string }>({});
  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("nombre, rol")
        .eq("id", user.id)
        .single();

      if (error) console.error("loadProfile error:", error);

      if (profileData)
        setProfile({
          name: profileData.nombre,
          role: profileData.rol,
        });
    }

    loadProfile();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside
        className={`${
          open ? "w-64" : "w-16"
        } bg-amber-600 text-white flex flex-col justify-between transition-all duration-300`}
      >
        <div>
          <div className="flex items-center justify-between p-4">
            <h1 className={`font-bold text-lg ${!open && "hidden"}`}>
              Secretaria
            </h1>
            <Menu
              className="cursor-pointer hover:opacity-80"
              onClick={() => setOpen(!open)}
            />
          </div>

          {/* Menú lateral */}
          <nav className="space-y-2 px-3">
            <SidebarButton
              icon={<Home className="w-4 h-4" />}
              label="Inicio"
              open={open}
              onClick={() => router.push("/dashboard/secretary")}
            />
            <SidebarButton
              icon={<ClipboardList className="w-4 h-4" />}
              label="Pedidos"
              open={open}
              onClick={() => router.push("/dashboard/secretary/orders")}
            />
            <SidebarButton
              icon={<FilePlus className="w-4 h-4" />}
              label="Nuevo Pedido"
              open={open}
              onClick={() => router.push("/dashboard/secretary/new-order")}
            />
            <SidebarButton
              icon={<Stethoscope className="w-4 h-4" />}
              label="Doctores"
              open={open}
              onClick={() => router.push("/dashboard/secretary/doctors")}
            />

            {/* ✅ PERFIL COMO MODAL */}
            <SidebarButton
              icon={<User className="w-4 h-4" />}
              label="Perfil"
              open={open}
              onClick={() => setProfileOpen(true)}
            />
          </nav>
        </div>

        {/* Footer */}
        <div className="border-t border-amber-700 p-4">
          {open && (
            <div className="truncate mb-3">
              <p className="font-semibold text-sm">
                {profile?.name || "Cargando..."}
              </p>
              <p className="text-xs text-amber-200 capitalize">
                {profile?.role || "—"}
              </p>
            </div>
          )}
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
      <main className="flex-1 overflow-y-auto p-6">
        <header className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-700">
            Panel de la Secretaria
          </h2>
          <div className="flex items-center gap-4">
            <SecretaryNotifications /> {/* ✅ Solo una campanita */}
          </div>
        </header>

        {children}
      </main>

      {/* ✅ MODAL PERFIL (reusable) */}
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}

/** 🔹 Botón genérico */
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
      className="w-full justify-start text-white hover:bg-amber-700 transition-colors"
      onClick={onClick}
    >
      <span className="mr-3">{icon}</span>
      {open && <span>{label}</span>}
    </Button>
  );
}
