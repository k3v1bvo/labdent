"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  Wrench,
  Clock,
  User,
  LogOut,
  Sparkles,
  ArrowLeft,
  UserCheck,
} from "lucide-react";
import Image from "next/image";
import TechnicianNotifications from "@/components/notifications/TechnicianNotifications";
import dynamic from "next/dynamic";
import { Avatar } from "@/components/ui/avatar";

const ProfileDialog = dynamic(
  async () => {
    const mod: any = await import("@/components/profile/ProfileDialog");
    return mod.default ?? mod.ProfileDialog;
  },
  { ssr: false }
) as unknown as React.ComponentType<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
}>;

interface Props {
  children: React.ReactNode;
}

export default function TechnicianLayout({ children }: Props) {
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<{ name?: string; role?: string }>({});
  const router = useRouter();
  const pathname = usePathname();

  // Cerrar drawer al navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
        .select("nombre, rol")
        .eq("id", user.id)
        .single();

      if (profileData) setProfile({ name: profileData.nombre, role: profileData.rol });
    }

    loadProfile();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const navItems = [
    { label: "Mis Tareas Asignadas", path: "/dashboard/technician", icon: <Wrench className="w-5 h-5" /> },
    { label: "Historial de Trabajos", path: "/dashboard/technician/history", icon: <Clock className="w-5 h-5" /> },
    { label: "Marcar Mi Asistencia", path: "/dashboard/attendance", icon: <UserCheck className="w-5 h-5 text-emerald-400" /> },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100">
      {/* ========================================================= */}
      {/* 1. SIDEBAR DESKTOP (md: y superior) */}
      {/* ========================================================= */}
      <aside
        className={`hidden md:flex relative ${
          open ? "w-68" : "w-20"
        } bg-[#0F081D] border-r border-purple-950/60 text-slate-200 transition-all duration-300 flex-col z-30 shrink-0 shadow-xl`}
      >
        {/* Toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="absolute -right-3.5 top-7 z-40 bg-[#1E0E38] hover:bg-[#3C1C6C] border border-[#A57CFA]/40 text-white rounded-full p-1.5 shadow-lg transition-colors cursor-pointer"
          aria-label={open ? "Colapsar menú" : "Expandir menú"}
          type="button"
        >
          <Menu className="w-3.5 h-3.5" />
        </button>

        {/* Brand Logo Oficial Guisela */}
        <div className="h-18 flex items-center px-4 border-b border-purple-950/60 gap-3 bg-[#130A24]/60">
          <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-[#3C1C6C] to-[#6329B7] p-1.5 flex items-center justify-center border border-[#A57CFA]/50 shadow-md shadow-purple-950/40 shrink-0">
            <Image
              src="/images/brand/guisela-symbol-primary.png"
              alt="Guisela"
              width={34}
              height={34}
              className="object-contain"
              unoptimized
            />
          </div>
          {open && (
            <div className="flex flex-col min-w-0">
              <span className="font-black text-lg tracking-tight text-white flex items-center gap-2">
                Guisela
                <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  TALLER
                </span>
              </span>
              <span className="text-xs text-purple-200/70 truncate font-medium">
                Estación Técnica
              </span>
            </div>
          )}
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-2 px-3 py-4 overflow-y-auto">
          {profile?.role === "admin" && (
            <div className="mb-3 pb-3 border-b border-purple-900/50">
              <button
                type="button"
                onClick={() => router.push("/dashboard/admin/overview")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-gradient-to-r from-purple-950 to-purple-900 border border-purple-500/50 text-purple-200 text-xs font-bold hover:bg-purple-800 transition-all shadow-md group cursor-pointer"
                title={!open ? "Volver a Administración" : undefined}
              >
                <ArrowLeft className="w-4 h-4 text-purple-300 group-hover:-translate-x-1 transition-transform shrink-0" />
                {open && <span className="truncate">← Volver a Panel Admin</span>}
              </button>
            </div>
          )}

          {open && (
            <p className="px-3 text-[11px] font-black uppercase tracking-wider text-[#A57CFA] pt-1 pb-1">
              OPERACIONES DE TALLER
            </p>
          )}

          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-2xl text-[14.5px] transition-all cursor-pointer group ${
                  isActive
                    ? "bg-gradient-to-r from-[#6329B7]/70 via-[#3C1C6C]/90 to-[#6329B7]/50 text-white font-bold border-l-4 border-l-[#A57CFA] border-y border-r border-[#A57CFA]/40 shadow-lg shadow-purple-950/50"
                    : "text-slate-200 hover:text-white hover:bg-white/10 font-medium border border-transparent"
                }`}
                title={!open ? item.label : undefined}
              >
                <span className={`${isActive ? "text-[#A57CFA] drop-shadow-[0_0_8px_rgba(165,124,250,0.6)]" : "text-slate-300 group-hover:text-white"}`}>
                  {item.icon}
                </span>
                {open && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}

          <div className="pt-3 border-t border-purple-950/60">
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-2xl text-[14.5px] font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title={!open ? "Mi Perfil" : undefined}
            >
              <User className="w-5 h-5 text-slate-300" />
              {open && <span className="truncate">Mi Perfil & Turno</span>}
            </button>
          </div>
        </nav>

        {/* Pie de menú con Tarjeta Ejecutiva */}
        <div className="p-3 border-t border-purple-950/60 bg-[#130A24]/90 mt-auto">
          {open && (
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="w-full mb-2.5 p-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#A57CFA]/50 transition-all flex items-center gap-3 text-left cursor-pointer group"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 border border-emerald-400/50 flex items-center justify-center font-bold text-sm text-white shadow-md">
                  {(profile?.name || "T").charAt(0).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#0F081D] rounded-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate group-hover:text-[#D0B9FF]">
                  {profile?.name || "Técnico Dental"}
                </p>
                <span className="text-[11px] text-emerald-300 font-semibold">
                  Técnico de Laboratorio
                </span>
              </div>
            </button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 rounded-xl transition-colors text-xs font-bold h-9"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2 shrink-0 text-rose-400" />
            {open && "Cerrar sesión"}
          </Button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. DRAWER MÓVIL RESPONSIVE (< md) */}
      {/* ========================================================= */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 text-slate-200 z-50 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-xl bg-purple-950/60 p-1 flex items-center justify-center border border-[#A57CFA]/30 shrink-0">
                  <Image
                    src="/images/brand/guisela-symbol-primary.png"
                    alt="Guisela"
                    width={32}
                    height={32}
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-sm text-white flex items-center gap-1.5">
                    Guisela
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-[#A57CFA]/20 text-[#D0B9FF] border border-[#A57CFA]/30">
                      TALLER
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-400">Estación Técnica</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Cerrar menú móvil"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
              {profile?.role === "admin" && (
                <div className="mb-3 pb-3 border-b border-purple-900/50">
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/dashboard/admin/overview");
                      setMobileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-purple-950 to-purple-900 border border-purple-500/50 text-purple-200 text-sm font-bold hover:bg-purple-800 transition-all shadow-md cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-purple-300 shrink-0" />
                    <span>← Volver al Panel Admin</span>
                  </button>
                </div>
              )}

              {navItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => {
                      router.push(item.path);
                      setMobileOpen(false);
                    }}
                    className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[15px] transition-all cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-[#6329B7]/70 via-[#3C1C6C]/90 to-[#6329B7]/50 text-white font-bold border-l-4 border-l-[#A57CFA] border-y border-r border-[#A57CFA]/40 shadow-md"
                        : "text-slate-200 hover:text-white hover:bg-white/10 font-medium border border-transparent"
                    }`}
                  >
                    <span className={isActive ? "text-[#A57CFA] drop-shadow-[0_0_8px_rgba(165,124,250,0.6)]" : "text-slate-300"}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <div className="pt-3 border-t border-purple-950/60 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(true);
                    setMobileOpen(false);
                  }}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[15px] font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  <User className="w-5 h-5 text-slate-300" />
                  <span>Mi Perfil & Turno</span>
                </button>
              </div>
            </nav>

            <div className="p-4 border-t border-purple-950/60 bg-[#130A24]/90">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(true);
                  setMobileOpen(false);
                }}
                className="w-full mb-3 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-3 text-left cursor-pointer group"
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 border border-emerald-400/50 flex items-center justify-center font-bold text-sm text-white shadow-md">
                    {(profile?.name || "T").charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#0F081D] rounded-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate group-hover:text-[#D0B9FF]">
                    {profile?.name || "Técnico"}
                  </p>
                  <span className="text-[11px] text-emerald-300 font-semibold">
                    Técnico de Laboratorio
                  </span>
                </div>
              </button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 rounded-xl transition-colors text-xs font-bold h-10"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2 shrink-0 text-rose-400" />
                Cerrar sesión
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MAIN CONTAINER & TOPBAR RESPONSIVE */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex justify-between items-center px-4 sm:px-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
              Flujo de Taller Dental
            </h2>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-[#3C1C6C] dark:text-[#D0B9FF] border border-purple-200 dark:border-purple-800/60">
              ● En Producción
            </span>
            {profile?.role === "admin" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/dashboard/admin/overview")}
                className="h-8 gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900 rounded-xl"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">← Volver a Admin</span>
                <span className="sm:hidden">Admin</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/dashboard/attendance")}
              className="h-8 gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-xl"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Marcar Asistencia</span>
              <span className="sm:hidden">Asistencia</span>
            </Button>

            <TechnicianNotifications />

            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-[#A57CFA] transition-shadow p-0.5"
              aria-label="Abrir perfil"
            >
              <Avatar name={profile?.name || "Técnico"} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8">{children}</main>
      </div>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}
