"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import TechnicianLayout from "@/components/layouts/TechnicianLayout";
import SecretaryLayout from "@/components/layouts/SecretaryLayout";
import { Loader2 } from "lucide-react";

export default function AttendanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function determineRole() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setRole("admin");
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("rol")
          .eq("id", user.id)
          .maybeSingle();

        const userRole = (profile?.rol || "tecnico").toLowerCase();
        setRole(userRole);
      } catch (err) {
        console.error("Error loading role for attendance layout:", err);
        setRole("tecnico");
      } finally {
        setLoading(false);
      }
    }

    determineRole();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F081D] flex flex-col items-center justify-center text-slate-300 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#A57CFA]" />
        <span className="text-sm font-semibold text-purple-200">
          Cargando entorno de trabajo...
        </span>
      </div>
    );
  }

  if (role?.includes("admin")) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  if (role?.includes("secre") || role?.includes("recep")) {
    return <SecretaryLayout>{children}</SecretaryLayout>;
  }

  // Por defecto (técnico, laboratorista o colaborador)
  return <TechnicianLayout>{children}</TechnicianLayout>;
}
