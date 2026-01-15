"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  FilePlus,
  LogOut,
  Menu,
  User,
} from "lucide-react";
import DoctorNotifications from "@/components/notifications/DoctorNotifications";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const [profile, setProfile] = useState<{ name?: string; role?: string }>({});
  const router = useRouter();

  // ✅ Cargar datos del perfil del doctor autenticado
  useEffect(() => {
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

    loadProfile();
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
        } bg-blue-700 text-white flex flex-col justify-between transition-all duration-300`}
      >
        {/* Logo + toggle */}
        <div>
          <div className="flex items-center justify-between p-4">
            <h1 className={`font-bold text-lg ${!open && "hidden"}`}>
              DoctorApp
            </h1>
            <Menu
              className="cursor-pointer hover:opacity-80"
              onClick={() => setOpen(!open)}
            />
          </div>

          {/* Menú lateral del doctor */}
          <nav className="space-y-2 px-3">
            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-blue-600"
              onClick={() => router.push("/dashboard/doctors")}
            >
              <User className="w-4 h-4 mr-2" /> {open && "Perfil"}
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-blue-600"
              onClick={() => router.push("/dashboard/doctors/orders")}
            >
              <ClipboardList className="w-4 h-4 mr-2" /> {open && "Mis Órdenes"}
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-blue-600"
              onClick={() => router.push("/dashboard/doctors/new-order")}
            >
              <FilePlus className="w-4 h-4 mr-2" /> {open && "Nueva Orden"}
            </Button>
          </nav>
        </div>

        {/* Footer con datos del usuario */}
        <div className="border-t border-blue-600 p-4">
          {open && (
            <div className="truncate mb-3">
              <p className="font-semibold text-sm">
                {profile?.name || "Cargando..."}
              </p>
              <p className="text-xs text-blue-200 capitalize">
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
      <div className="flex-1 flex flex-col">
        {/* Header fijo con notificaciones */}
        <header className="flex justify-between items-center p-4 bg-white border-b shadow-sm">
          <h2 className="text-lg font-semibold text-gray-700">
            Panel del Doctor
          </h2>
          <div className="flex items-center gap-4">
            <DoctorNotifications children={undefined} />
          </div>
        </header>

        {/* Contenido dinámico */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
