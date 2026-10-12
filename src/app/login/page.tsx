"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  Cpu,
  ScanLine,
  Loader2,
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.length >= 6 && !loading;
  }, [email, password, loading]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      toast.error("Credenciales incorrectas o usuario no encontrado");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", data.user?.id)
      .single();

    if (profileError || !profile) {
      toast.error("No se pudo obtener el rol del usuario");
      setLoading(false);
      return;
    }

    toast.success("Inicio de sesión exitoso");
    setLoading(false);

    // ✅ Redirigir según el rol (tu lógica)
    switch (profile.rol?.toLowerCase()) {
      case "admin":
        router.push("/dashboard/admin/overview");
        break;
      case "doctor":
        router.push("/dashboard/doctors/orders");
        break;
      case "technician":
      case "tecnico":
        router.push("/dashboard/technician");
        break;
      case "secretary":
      case "secretaria":
        router.push("/dashboard/secretary/orders");
        break;
      default:
        toast.error("Rol desconocido. Contacta al administrador.");
        await supabase.auth.signOut();
        router.push("/login");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Panel branding */}
        <div className="hidden lg:flex flex-col justify-between rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl p-10 shadow-sm min-h-[520px]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 px-3.5 py-1 text-xs font-semibold text-cyan-800 dark:text-cyan-300 bg-cyan-50/70 dark:bg-cyan-950/40">
              <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
              LabDent • Dental Intelligence & Control
            </div>

            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Gestión moderna para prótesis y mecánica dental
            </h1>

            <p className="mt-3.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Controla pedidos, flujo de estaciones de producción y trazabilidad clínica
              con accesos dedicados para doctores, secretaría, técnicos y administración.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-3.5">
              <Feature
                icon={<Cpu className="w-4 h-4 text-cyan-600" />}
                title="Odontología Digital + Artesanía"
                desc="Integración de fresado, escaneo 3D y procesos protésicos manuales."
              />
              <Feature
                icon={<ScanLine className="w-4 h-4 text-cyan-600" />}
                title="Trazabilidad por Estación"
                desc="Registro paso a paso: operador, fecha, tiempos y control de calidad."
              />
              <Feature
                icon={<ShieldCheck className="w-4 h-4 text-cyan-600" />}
                title="Seguridad y Control por Roles"
                desc="Privacidad estricta y vistas enfocadas para cada área de trabajo."
              />
            </div>
          </div>

          <div className="text-xs text-slate-400 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between">
            <span>© {new Date().getFullYear()} LabDent • Sistema Pro</span>
            <span className="font-semibold text-cyan-600">v2.0 Clínico</span>
          </div>
        </div>

        {/* Login Card */}
        <Card className="rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="space-y-1.5 pt-8 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center mx-auto mb-2 shadow-md shadow-cyan-600/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <CardTitle className="text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Iniciar sesión
            </CardTitle>
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Accede al portal de tu laboratorio dental
            </p>
          </CardHeader>

          <CardContent className="p-8 pt-2">
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="usuario@laboratorio.com"
                    className="pl-10 h-11 rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-cyan-500 text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-11 rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-cyan-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-md shadow-cyan-600/25 transition-all text-sm mt-2"
                disabled={!canSubmit}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Iniciando sesión...
                  </span>
                ) : (
                  "Ingresar al sistema"
                )}
              </Button>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500 dark:text-slate-400">
                  ¿No tienes una cuenta aún?
                </span>
                <a
                  href="/register"
                  className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
                >
                  Registrarse aquí
                </a>
              </div>

              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-3.5 text-xs text-slate-500 dark:text-slate-400">
                <p className="font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                  Asignación de Roles
                </p>
                <p>
                  Si necesitas permisos de Administrador, Técnico o Secretaría, contacta al supervisor de tu laboratorio.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border bg-white/60 dark:bg-gray-900/40 p-4">
      <div className="mt-0.5 text-green-700">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {title}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{desc}</p>
      </div>
    </div>
  );
}
