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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel branding */}
        <div className="hidden lg:flex flex-col justify-between rounded-3xl border bg-white/70 dark:bg-gray-900/50 backdrop-blur p-10 shadow-sm">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-gray-700 dark:text-gray-200 bg-white/70 dark:bg-gray-900/50">
              <Sparkles className="w-4 h-4" />
              Laboratorio Dental • Producción y Control
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Gestión moderna para prótesis dentales
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
              Controla pedidos, estaciones de trabajo y seguimiento de producción
              con un flujo claro para doctor, secretaría, técnico y administración.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <Feature
                icon={<Cpu className="w-4 h-4" />}
                title="Tecnología + Artesanía"
                desc="Integración de fresado, impresión 3D y procesos manuales."
              />
              <Feature
                icon={<ScanLine className="w-4 h-4" />}
                title="Trazabilidad por estación"
                desc="Cada paso queda registrado: quién, cuándo y qué se hizo."
              />
              <Feature
                icon={<ShieldCheck className="w-4 h-4" />}
                title="Acceso por roles"
                desc="Permisos y vistas enfocadas para cada área del laboratorio."
              />
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} DentalLab • Sistema interno
          </div>
        </div>

        {/* Login Card */}
        <Card className="rounded-3xl shadow-sm border bg-white dark:bg-gray-900">
          <CardHeader className="space-y-1">
            <CardTitle className="text-center text-2xl font-bold text-green-700">
              Iniciar sesión
            </CardTitle>
            <p className="text-center text-sm text-gray-600 dark:text-gray-300">
              Accede al sistema del laboratorio dental
            </p>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="usuario@correo.com"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="********"
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                    aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-green-700 hover:bg-green-800 text-white rounded-xl"
                disabled={!canSubmit}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Iniciando sesión...
                  </span>
                ) : (
                  "Entrar"
                )}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">
                  ¿No tienes cuenta?
                </span>
                <a
                  href="/register"
                  className="font-medium text-green-700 hover:underline"
                >
                  Crear cuenta
                </a>
              </div>

              <div className="rounded-2xl border bg-gray-50 dark:bg-gray-950 p-4 text-xs text-gray-600 dark:text-gray-300">
                <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Tip rápido
                </p>
                <p>
                  Si no recuerdas tu rol o acceso, contacta al administrador del
                  laboratorio para habilitar permisos.
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
