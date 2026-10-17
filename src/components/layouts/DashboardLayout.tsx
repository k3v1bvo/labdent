"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import dynamic from "next/dynamic";
import {
  Menu,
  ChevronLeft,
  X,
  LayoutDashboard,
  Users,
  Package,
  Layers,
  LogOut,
  User,
  MapPin,
  ClipboardList,
  Sparkles,
  Shield,
  ShieldAlert,
  UserCheck,
  Clock,
  Coins,
  Tag,
} from "lucide-react";
import Image from "next/image";
import AdminNotifications from "@/components/notifications/AdminNotifications";

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

export default function DashboardLayout({ children }: Props) {
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<{ name?: string; role?: string }>({});
  const [profileOpen, setProfileOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  // Close mobile drawer on route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

      if (profileData) {
        setProfile({ name: profileData.nombre, role: profileData.rol });
      }
    }

    loadProfile();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const navGroups = [
    {
      title: "PANEL PRINCIPAL",
      items: [
        { label: "Métricas & Finanzas", path: "/dashboard/admin/overview", icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "Gestión de Pedidos", path: "/dashboard/admin/orders", icon: <Package className="w-5 h-5" /> },
        { label: "Caja Diaria & Arqueo", path: "/dashboard/admin/cash", icon: <Coins className="w-5 h-5 text-amber-400" /> },
        { label: "Catálogo & Aranceles", path: "/dashboard/admin/catalog", icon: <Tag className="w-5 h-5 text-emerald-400" /> },
        { label: "Doctores & Clínicas", path: "/dashboard/admin/doctors", icon: <Users className="w-5 h-5" /> },
      ],
    },
    {
      title: "PRODUCCIÓN & TALLER",
      items: [
        { label: "5 Estaciones de Taller", path: "/dashboard/admin/stations", icon: <Layers className="w-5 h-5" /> },
        { label: "Taller Técnico en Vivo", path: "/dashboard/technician", icon: <ClipboardList className="w-5 h-5" /> },
        { label: "Seguimiento & Ruta", path: "/dashboard/admin/tracking", icon: <MapPin className="w-5 h-5" /> },
      ],
    },
    {
      title: "SEGURIDAD & CONTROL",
      items: [
        { label: "Auditoría & Anti-Fraude", path: "/dashboard/admin/audit", icon: <ShieldAlert className="w-5 h-5 text-amber-400" /> },
        { label: "Horarios, Reglas & GPS", path: "/dashboard/admin/attendance", icon: <UserCheck className="w-5 h-5 text-purple-400" /> },
        { label: "Marcar Mi Asistencia", path: "/dashboard/attendance", icon: <Clock className="w-5 h-5 text-emerald-400" /> },
        { label: "Usuarios & Permisos", path: "/dashboard/admin/users", icon: <Shield className="w-5 h-5 text-blue-400" /> },
      ],
    },
  ];

  const allNavItems = navGroups.flatMap((g) => g.items);

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
        {/* Brand Logo Oficial Guisela */}
        {open ? (
          <div className="h-18 flex items-center justify-between px-3.5 border-b border-purple-950/60 bg-[#130A24]/70">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs p-1.5 flex items-center justify-center border border-white/15 shadow-md shadow-purple-950/40 shrink-0">
                <Image
                  src="/images/brand/guisela-icon-clean.png"
                  alt="Guisela Dental"
                  width={36}
                  height={36}
                  className="w-full h-full object-contain drop-shadow-sm"
                  unoptimized
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-black text-base tracking-tight text-white flex items-center gap-2 leading-none">
                  Guisela
                  <span className="text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-[#A57CFA]/25 text-[#E0D2FE] border border-[#A57CFA]/40 shadow-xs">
                    ADMIN
                  </span>
                </span>
                <span className="text-[11px] text-purple-200/90 truncate font-semibold mt-1">
                  Control de Laboratorio
                </span>
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="text-purple-300/70 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Colapsar menú lateral"
              aria-label="Colapsar menú lateral"
              type="button"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="h-18 flex items-center justify-center px-2 border-b border-purple-950/60 bg-[#130A24]/70">
            <button
              onClick={() => setOpen(true)}
              className="relative w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs p-1.5 flex items-center justify-center border border-white/15 shadow-md hover:border-[#A57CFA]/50 transition-all cursor-pointer group"
              title="Expandir menú lateral"
              type="button"
            >
              <Image
                src="/images/brand/guisela-icon-clean.png"
                alt="Guisela Dental"
                width={36}
                height={36}
                className="w-full h-full object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
                unoptimized
              />
            </button>
          </div>
        )}

        {/* Nav list con Secciones Claras */}
        <nav className="flex-1 space-y-4 px-3 py-4 overflow-y-auto">
          {navGroups.map((group, gIdx) => (
            <div key={group.title} className="space-y-1">
              {open && (
                <p className="px-3 text-[11px] font-black uppercase tracking-wider text-[#A57CFA] pt-1 pb-1">
                  {group.title}
                </p>
              )}
              {group.items.map((item) => {
                const isActive = pathname === item.path || (item.path !== "/dashboard/admin" && pathname?.startsWith(item.path));
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
            </div>
          ))}

          {/* Acceso a Mi Perfil */}
          <div className="pt-2 border-t border-purple-950/60">
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-2xl text-[14.5px] font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title={!open ? "Mi Perfil" : undefined}
            >
              <User className="w-5 h-5 text-slate-300" />
              {open && <span className="truncate">Mi Perfil & Datos</span>}
            </button>
          </div>
        </nav>

        {/* Tarjeta Ejecutiva de Perfil & Logout */}
        <div className="p-3 border-t border-purple-950/60 bg-[#130A24]/90 mt-auto">
          {open && (
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="w-full mb-2.5 p-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#A57CFA]/50 transition-all flex items-center gap-3 text-left cursor-pointer group"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3C1C6C] to-[#6329B7] border border-[#A57CFA]/50 flex items-center justify-center font-bold text-sm text-white shadow-md">
                  {(profile?.name || "A").charAt(0).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#0F081D] rounded-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate group-hover:text-[#D0B9FF] transition-colors">
                  {profile?.name || "Administrador"}
                </p>
                <span className="text-[11px] text-[#A57CFA] font-semibold">
                  Admin General • Ver Perfil
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
          {/* Backdrop con blur suave */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Menú desplegable lateral */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 text-slate-200 z-50 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Header del Drawer Móvil */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-xl bg-white/10 backdrop-blur-xs p-1 flex items-center justify-center border border-white/20 shadow-md shrink-0">
                  <Image
                    src="/images/brand/guisela-icon-clean.png"
                    alt="Guisela Dental"
                    width={32}
                    height={32}
                    className="w-full h-full object-contain drop-shadow-sm"
                    unoptimized
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-sm text-white flex items-center gap-1.5 leading-none">
                    Guisela
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-[#A57CFA]/25 text-[#E0D2FE] border border-[#A57CFA]/30">
                      ADMIN
                    </span>
                  </span>
                  <span className="text-[11px] text-purple-200/90 mt-0.5">Control de Laboratorio</span>
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

            {/* Lista de navegación táctil móvil */}
            <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
              {allNavItems.map((item) => {
                const isActive = pathname === item.path || (item.path !== "/dashboard/admin" && pathname?.startsWith(item.path));
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
                  <span>Mi Perfil & Datos</span>
                </button>
              </div>
            </nav>

            {/* Perfil & Logout en Drawer */}
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
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3C1C6C] to-[#6329B7] border border-[#A57CFA]/50 flex items-center justify-center font-bold text-sm text-white shadow-md">
                    {(profile?.name || "A").charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#0F081D] rounded-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate group-hover:text-[#D0B9FF]">
                    {profile?.name || "Administrador"}
                  </p>
                  <span className="text-[11px] text-[#A57CFA] font-semibold">
                    Admin General • Ver Perfil
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
        {/* Top Header */}
        <header className="h-16 flex justify-between items-center px-4 sm:px-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-20 shrink-0">
          <div className="flex items-center gap-3">
            {/* Botón Hamburger visible en Móvil (< md) */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Toggle para Desktop (>= md) */}
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="hidden md:flex p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              aria-label={open ? "Colapsar menú lateral" : "Expandir menú lateral"}
              title={open ? "Colapsar menú" : "Expandir menú"}
            >
              <Menu className="w-5 h-5" />
            </button>

            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
              Control de Laboratorio
            </h2>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              ● Sistema Activo
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <AdminNotifications />

            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-[#A57CFA] transition-shadow p-0.5"
              aria-label="Abrir perfil"
            >
              <Avatar name={profile?.name || "Admin"} />
            </button>
          </div>
        </header>

        {/* Content Area con padding responsivo adaptado a pantallas chicas */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}
