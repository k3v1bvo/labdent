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
  Sparkles,
} from "lucide-react";
import TechnicianNotifications from "@/components/notifications/TechnicianNotifications";

interface Props {
  children: React.ReactNode;
}

export default function TechnicianLayout({ children }: Props) {
  const [open, setOpen] = useState(true);
  const [profile, setProfile] = useState<{ name?: string }>({});
  const router = useRouter();
  const pathname = usePathname();

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

  const navItems = [
    { label: "Mis tareas", path: "/dashboard/technician", icon: <Wrench className="w-4 h-4" /> },
    { label: "Historial", path: "/dashboard/technician/history", icon: <Clock className="w-4 h-4" /> },
    { label: "Mi Perfil", path: "/dashboard/profile", icon: <User className="w-4 h-4" /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100">
      {/* Sidebar */}
      <aside
        className={`relative ${
          open ? "w-64" : "w-20"
        } bg-slate-900 border-r border-slate-800 text-slate-200 transition-all duration-300 flex flex-col z-30 shrink-0`}
      >
        {/* Toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="absolute -right-3.5 top-7 z-40 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-full p-1.5 shadow-md transition-colors"
          aria-label={open ? "Colapsar menú" : "Expandir menú"}
          type="button"
        >
          <Menu className="w-3.5 h-3.5" />
        </button>

        {/* Brand Logo */}
        <div className="h-16 flex items-center px-5 border-b border-slate-800/80 gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          {open && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                LabDent
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  TALLER
                </span>
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                Estación Técnica
              </span>
            </div>
          )}
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                }`}
                title={!open ? item.label : undefined}
              >
                <span className={`${isActive ? "text-amber-400" : "text-slate-400"}`}>
                  {item.icon}
                </span>
                {open && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Pie de menú */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/50 mt-auto">
          {open && (
            <div className="mb-2.5 px-2 py-1.5 rounded-lg flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-amber-400">
                {(profile?.name || "T").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {profile?.name || "Técnico Dental"}
                </p>
                <span className="text-[10px] text-amber-400 font-medium">
                  Operador de Taller
                </span>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors text-xs font-medium"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2 shrink-0" />
            {open && "Cerrar sesión"}
          </Button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex justify-between items-center px-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Flujo de Taller Dental
            </h2>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
              ● En Producción
            </span>
          </div>

          <div className="flex items-center gap-3">
            <TechnicianNotifications />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
