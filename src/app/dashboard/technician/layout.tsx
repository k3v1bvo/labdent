"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { ClipboardList, History, LogOut, Menu, User } from "lucide-react";
import TechnicianNotifications from "@/components/notifications/TechnicianNotifications";

// ✅ TU RUTA REAL (named export)
import { ProfileDialog } from "@/components/profile/ProfileDialog";

export default function TechnicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const [profile, setProfile] = useState<{ name?: string; role?: string }>({});
  const [profileOpen, setProfileOpen] = useState(false);

  const router = useRouter();

  // ✅ Verificar sesión y cargar datos del perfil
  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("nombre, rol")
      .eq("id", user.id)
      .single();

    if (profileData)
      setProfile({
        name: profileData.nombre,
        role: profileData.rol,
      });
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ✅ Cerrar sesión
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
        } bg-amber-700 text-white flex flex-col justify-between transition-all duration-300`}
      >
        {/* Logo + toggle */}
        <div>
          <div className="flex items-center justify-between p-4">
            <h1 className={`font-bold text-lg ${!open && "hidden"}`}>TechLab</h1>

            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="hover:opacity-80"
              aria-label="Abrir/cerrar menú"
            >
              <Menu />
            </button>
          </div>

          {/* Menú lateral del técnico */}
          <nav className="space-y-2 px-3">
            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-amber-600"
              onClick={() => router.push("/dashboard/technician")}
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              {open && "Tareas Activas"}
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-amber-600"
              onClick={() => router.push("/dashboard/technician/history")}
            >
              <History className="w-4 h-4 mr-2" />
              {open && "Historial"}
            </Button>

            {/* ✅ PERFIL: abre modal (NO navega) */}
            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-amber-600"
              onClick={() => setProfileOpen(true)}
            >
              <User className="w-4 h-4 mr-2" />
              {open && "Perfil"}
            </Button>
          </nav>
        </div>

        {/* Footer */}
        <div className="border-t border-amber-600 p-4">
          {open && (
            <div className="truncate mb-3">
              <p className="font-semibold text-sm">{profile?.name || "Cargando..."}</p>
              <p className="text-xs text-amber-200 capitalize">{profile?.role || "—"}</p>
            </div>
          )}

          <Button variant="destructive" className="w-full" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> {open && "Cerrar sesión"}
          </Button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col">
        {/* Header fijo con notificaciones */}
        <header className="flex justify-between items-center p-4 bg-white border-b shadow-sm">
          <h2 className="text-lg font-semibold text-gray-700">Panel del Técnico</h2>
          <div className="flex items-center gap-4">
            <TechnicianNotifications />
          </div>
        </header>

        {/* Contenido dinámico */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      {/* ✅ MODAL PERFIL (usa tu componente ya hecho) */}
      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        onSaved={loadProfile} // ✅ si edita nombre/teléfono, se actualiza sidebar
      />
    </div>
  );
}
