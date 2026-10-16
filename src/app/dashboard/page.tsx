"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";
import Image from "next/image";

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function determineRoleAndRedirect() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("rol, nombre")
        .eq("id", user.id)
        .maybeSingle();

      let role = (profile?.rol || "").toLowerCase();

      // Si es un usuario registrado con Google sin estación técnica asignada
      const isGoogleUser =
        user.app_metadata?.provider === "google" ||
        user.identities?.some((id: any) => id.provider === "google");

      if (role === "tecnico" && isGoogleUser && user.email !== "tecnico@labdent.com") {
        const { data: techStation } = await supabase
          .from("tecnico_estacion")
          .select("id")
          .eq("tecnico_id", user.id)
          .maybeSingle();

        if (!techStation) {
          role = "doctor";
          await supabase.from("profiles").update({ rol: "doctor" }).eq("id", user.id);
          await supabase.from("doctores").upsert({
            profile_id: user.id,
            nombre: profile?.nombre || user.user_metadata?.full_name || "Doctor",
            clinica: `Clínica Dr(a). ${profile?.nombre || user.user_metadata?.full_name || "Doctor"}`,
            especialidad: "Rehabilitación Oral",
          });
        }
      }

      switch (role) {
        case "admin":
          router.replace("/dashboard/admin/overview");
          break;
        case "secretary":
        case "secretaria":
          router.replace("/dashboard/secretary/orders");
          break;
        case "tecnico":
        case "technician":
          router.replace("/dashboard/technician");
          break;
        case "doctor":
        default:
          router.replace("/dashboard/doctors/orders");
          break;
      }
    }

    determineRoleAndRedirect();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDFCFE] via-[#F8F5FC] to-[#F1ECF8] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white shadow-xl shadow-purple-950/10 border border-purple-100 p-3 mb-6 flex items-center justify-center animate-pulse">
        <Image
          src="/images/brand/guisela-symbol-primary.png"
          alt="Guisela Laboratorio Dental"
          width={48}
          height={48}
          className="object-contain"
          priority
        />
      </div>
      <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
        <Loader2 className="w-4 h-4 animate-spin text-[#3C1C6C]" />
        Cargando tu espacio de trabajo...
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Guisela Laboratorio Dental · Sistema Integral
      </p>
    </div>
  );
}
