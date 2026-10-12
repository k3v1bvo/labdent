"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  Menu,
  Home,
  ClipboardList,
  FilePlus,
  Stethoscope,
  LogOut,
  User,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import SecretaryNotifications from "@/components/notifications/SecretaryNotifications";
import dynamic from "next/dynamic";

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

export default function SecretaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<{ name?: string; role?: string }>({});
  const router = useRouter();
  const pathname = usePathname();

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

      if (profileData) {
        setProfile({
          name: profileData.nombre,
          role: profileData.rol,
        });
      }
    }

    loadProfile();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const navItems = [
    { label: "Panel General", path: "/dashboard/secretary", icon: <Home className="w-4 h-4" /> },
    { label: "Pedidos", path: "/dashboard/secretary/orders", icon: <ClipboardList className="w-4 h-4" /> },
    { label: "Nuevo Pedido", path: "/dashboard/secretary/new-order", icon: <FilePlus className="w-4 h-4" /> },
    { label: "Doctores", path: "/dashboard/secretary/doctors", icon: <Stethoscope className="w-4 h-4" /> },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100">
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

        {/* Brand Logo Oficial Guisela */}
        <div className="h-16 flex items-center px-4 border-b border-slate-800/80 gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-purple-950/60 p-1 flex items-center justify-center border border-[#A57CFA]/30 shrink-0">
            <Image
              src="/images/guisela-symbol.png"
              alt="Guisela"
              width={32}
              height={32}
              className="object-contain"
              unoptimized
            />
          </div>
          {open && (
            <div className="flex flex-col min-w-0">
              <span className="font-black text-base tracking-tight text-white flex items-center gap-1.5">
                Guisela
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-[#A57CFA]/20 text-[#D0B9FF] border border-[#A57CFA]/30">
                  RECEPCIÓN
                </span>
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                Gestión & Secretaría
              </span>
            </div>
          )}
        </div>

        {/* Nav list */}
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
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                }`}
                title={!open ? item.label : undefined}
              >
                <span className={`${isActive ? "text-emerald-400" : "text-slate-400"}`}>
                  {item.icon}
                </span>
                {open && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent transition-all"
              title={!open ? "Mi Perfil" : undefined}
            >
              <User className="w-4 h-4 text-slate-400" />
              {open && <span className="truncate">Mi Perfil</span>}
            </button>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/50 mt-auto">
          {open && (
            <div className="mb-2.5 px-2 py-1.5 rounded-lg flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-emerald-400">
                {(profile?.name || "S").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {profile?.name || "Secretaría"}
                </p>
                <span className="text-[10px] text-emerald-400 font-medium">
                  Atención & Ingresos
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

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex justify-between items-center px-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Gestión de Pedidos & Doctores
            </h2>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              ● Atención al Cliente
            </span>
          </div>

          <div className="flex items-center gap-3">
            <SecretaryNotifications />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}
