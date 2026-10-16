"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function handleAuth() {
      try {
        // 1. Obtener sesión actual después del redireccionamiento OAuth de Google
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          // Esperar un momento por si el listener auth está procesando el hash
          const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
              if (newSession?.user) {
                authListener.subscription.unsubscribe();
                await processUser(newSession.user);
              }
            }
          );
          return;
        }

        await processUser(session.user);
      } catch (err: any) {
        console.error("Error en callback de Google:", err);
        setErrorMsg(err?.message || "No se pudo completar el inicio de sesión con Google");
      }
    }

    async function processUser(user: any) {
      try {
        // 2. Verificar si el usuario ya tiene perfil en 'profiles'
        const { data: profile } = await supabase
          .from("profiles")
          .select("rol, nombre, telefono")
          .eq("id", user.id)
          .maybeSingle();

        const fullName =
          profile?.nombre ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "Doctor";

        const phone = profile?.telefono || user.user_metadata?.phone || null;

        const isGoogleUser =
          user.app_metadata?.provider === "google" ||
          user.identities?.some((id: any) => id.provider === "google");

        // Verificar si tiene asignación de estación técnica oficial
        const { data: techAssignment } = await supabase
          .from("tecnico_estacion")
          .select("id")
          .eq("tecnico_id", user.id)
          .maybeSingle();

        // Verificar si ya tiene registro en la tabla doctores
        const { data: doctorRecord } = await supabase
          .from("doctores")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle();

        let userRole = profile?.rol?.toLowerCase();

        // Si el usuario no tiene perfil, o si tiene rol 'tecnico' pero fue creado por Google sin estación técnica asignada
        // (el trigger de la BD por defecto le asignó 'tecnico' erróneamente en vez de 'doctor')
        const isAccidentalTechnician =
          userRole === "tecnico" &&
          !techAssignment &&
          user.email !== "tecnico@labdent.com" &&
          isGoogleUser;

        if (!profile || !userRole || isAccidentalTechnician) {
          userRole = "doctor";

          // Actualizar/Crear perfil con rol 'doctor'
          await supabase.from("profiles").upsert({
            id: user.id,
            nombre: fullName,
            telefono: phone,
            rol: "doctor",
          });

          // Asegurar registro en la tabla doctores
          if (!doctorRecord) {
            await supabase.from("doctores").upsert({
              profile_id: user.id,
              nombre: fullName,
              clinica: `Clínica Dr(a). ${fullName}`,
              especialidad: "Rehabilitación Oral",
            });
          }

          // Disparar correo de bienvenida asegurando entrega antes de redirigir
          if (user.email && (!profile || isAccidentalTechnician)) {
            try {
              await fetch("/api/mailer/welcome", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                keepalive: true,
                body: JSON.stringify({
                  to: user.email,
                  name: fullName,
                  role: "doctor",
                  clinic: `Clínica Dr(a). ${fullName}`,
                }),
              });
            } catch (mailErr) {
              console.warn("No se pudo enviar bienvenida Google:", mailErr);
            }
          }
        } else if (userRole === "doctor" && !doctorRecord) {
          // Si ya era doctor pero no tenía registro en la tabla doctores
          await supabase.from("doctores").upsert({
            profile_id: user.id,
            nombre: fullName,
            clinica: `Clínica Dr(a). ${fullName}`,
            especialidad: "Rehabilitación Oral",
          });
        }

        // 3. Redirigir según el rol del usuario
        switch (userRole) {
          case "admin":
            router.replace("/dashboard/admin/overview");
            break;
          case "technician":
          case "tecnico":
            router.replace("/dashboard/technician");
            break;
          case "secretary":
          case "secretaria":
            router.replace("/dashboard/secretary/orders");
            break;
          case "doctor":
          default:
            router.replace("/dashboard/doctors/orders");
            break;
        }
      } catch (e: any) {
        console.error("Error procesando perfil de usuario:", e);
        setErrorMsg("Error al vincular el perfil con Google");
      }
    }

    handleAuth();
  }, [router]);

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#FDFCFE] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-rose-100 p-8 shadow-xl text-center">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Error de Autenticación</h2>
          <p className="text-sm text-slate-600 mb-6">{errorMsg}</p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-[#3C1C6C] text-white rounded-xl font-bold text-sm"
          >
            Volver a Intentar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDFCFE] via-[#F8F5FC] to-[#F1ECF8] flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-3xl border border-purple-100 p-8 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#3C1C6C] flex items-center justify-center mx-auto mb-4 border border-purple-100">
          <Loader2 className="w-8 h-8 animate-spin text-[#3C1C6C]" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100/60 text-[#3C1C6C] text-xs font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5" /> Google Sync
        </div>
        <h2 className="text-xl font-black text-[#2E1553] mb-1">Iniciando sesión...</h2>
        <p className="text-xs text-slate-500">
          Validando credenciales y preparando tu espacio de trabajo en Guisela Lab Dental.
        </p>
      </div>
    </div>
  );
}
