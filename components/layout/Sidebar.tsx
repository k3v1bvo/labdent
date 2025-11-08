"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { roleNavigation, type UserRole } from "@/lib/roleNavigation";

export function Sidebar() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [name, setName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const pathname = usePathname();

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Intentar leer perfil
      const { data: profile } = await supabase
        .from("profiles")
        .select("rol,nombre")
        .eq("id", user.id)
        .maybeSingle();

      const rol =
        (profile?.rol as UserRole | undefined) ||
        (user.user_metadata?.rol as UserRole | undefined) ||
        "tecnico";

      setRole(rol);
      setName(profile?.nombre || user.email || "Usuario");
      setLoading(false);
    };

    load();
  }, []);

  // No renderizar nada si no hay sesión o está cargando
  if (loading || !role) return null;

  const menu = roleNavigation[role] || [];

  return (
    <aside className="w-64 bg-[#050816] text-gray-100 flex flex-col border-r border-white/10">
      <div className="px-5 py-4 border-b border-white/10">
        <div className="text-sm uppercase tracking-[0.2em] text-violet-400">
          LabDent
        </div>
        <div className="text-xs text-gray-400 mt-1">Workflow Laboratorio</div>
        <div className="mt-3 text-sm">
          <span className="font-semibold">{name}</span>
          <span className="ml-2 px-2 py-0.5 text-[0.65rem] rounded-full bg-violet-500/20 text-violet-300 uppercase">
            {role}
          </span>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-1">
        {menu.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition
                ${
                  active
                    ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
