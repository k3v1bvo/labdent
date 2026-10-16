"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
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
  ArrowLeft,
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.length >= 6 && !loading && !googleLoading;
  }, [email, password, loading, googleLoading]);

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(`Error con Google: ${error.message}`);
        setGoogleLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Error al iniciar sesión con Google");
      setGoogleLoading(false);
    }
  }

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

    // Redirigir según el rol
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
    <div className="min-h-screen bg-gradient-to-b from-[#FDFCFE] via-purple-50/40 to-[#F5F2FA] flex items-center justify-center p-3 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
        {/* Panel branding oficial Guisela con fondo Púrpura y Logo Blanco Secundario */}
        <div className="hidden lg:flex flex-col justify-between rounded-3xl border border-purple-900/40 bg-gradient-to-br from-[#3C1C6C] via-[#2E1553] to-[#1C0B33] p-10 shadow-2xl shadow-purple-950/20 min-h-[550px] text-white relative overflow-hidden">
          <div className="relative z-10">
            {/* Logo Secundario Blanco para Fondo Púrpura */}
            <div className="relative h-18 w-52 mb-6">
              <Image
                src="/images/brand/guisela-logo-secondary-dark.png"
                alt="Guisela Laboratorio Dental"
                fill
                className="object-contain"
                priority
                unoptimized
              />
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3.5 py-1 text-xs font-semibold text-[#D0B9FF] bg-white/10 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-[#A57CFA]" />
              Portal Oficial de Gestión Clínica
            </div>

            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-white leading-tight">
              Precisión, estética y flujo 100% digital
            </h1>

            <p className="mt-3.5 text-sm leading-relaxed text-purple-200">
              Control integral de órdenes de trabajo, seguimiento por estación técnica y trazabilidad en tiempo real para clínicas dentales, secretaría y taller.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-3.5">
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5">
                <div className="mt-0.5 rounded-lg bg-white/10 p-2 text-[#D0B9FF]">
                  <Cpu className="w-4 h-4 text-[#A57CFA]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Crown & Bridge + Flujo Digital</p>
                  <p className="text-xs text-purple-200 mt-0.5 leading-relaxed">Zirconio multicapa, E.max e integración directa con escáneres intraorales.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5">
                <div className="mt-0.5 rounded-lg bg-white/10 p-2 text-[#D0B9FF]">
                  <ScanLine className="w-4 h-4 text-[#A57CFA]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Trazabilidad en 5 Estaciones</p>
                  <p className="text-xs text-purple-200 mt-0.5 leading-relaxed">Seguimiento paso a paso desde el moldeado hasta el control final de calidad.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5">
                <div className="mt-0.5 rounded-lg bg-white/10 p-2 text-[#D0B9FF]">
                  <ShieldCheck className="w-4 h-4 text-[#A57CFA]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Acceso Exclusivo por Rol</p>
                  <p className="text-xs text-purple-200 mt-0.5 leading-relaxed">Vistas dedicadas para Odontólogos, Secretaría, Técnicos y Administrador.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-purple-300 mt-6 pt-4 border-t border-white/10 flex justify-between items-center relative z-10">
            <span>© {new Date().getFullYear()} Guisela Laboratorio Dental</span>
            <Link href="/" className="font-semibold text-white hover:text-[#A57CFA] flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3 h-3" />
              Volver al inicio
            </Link>
          </div>
        </div>

        {/* Login Card con Logo Primario a Color */}
        <div className="w-full">
          <div className="lg:hidden mb-2 text-left">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3C1C6C] hover:text-[#A57CFA] p-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
            </Link>
          </div>

          <Card className="rounded-3xl shadow-xl shadow-purple-950/10 border border-purple-100 bg-white overflow-hidden">
            <CardHeader className="space-y-2 pt-6 sm:pt-8 pb-3 sm:pb-4 text-center px-4 sm:px-8">
              {/* Logo Guisela Primario en tarjeta de login */}
              <div className="relative h-14 sm:h-16 w-48 sm:w-52 mx-auto mb-1">
                <Image
                  src="/images/brand/guisela-logo-primary.png"
                  alt="Guisela Laboratorio Dental"
                  fill
                  className="object-contain"
                  priority
                  unoptimized
                />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-black tracking-tight text-[#3C1C6C]">
                Iniciar Sesión
              </CardTitle>
              <p className="text-xs sm:text-sm text-slate-500">
                Ingresa tus credenciales para acceder al sistema
              </p>
            </CardHeader>

            <CardContent className="p-4 sm:p-8 pt-2">
              {/* Botón de Google OAuth */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || googleLoading}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm flex items-center justify-center gap-3 transition-all shadow-sm hover:shadow hover:border-slate-300 disabled:opacity-50 mb-5"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#3C1C6C]" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continuar con Google</span>
              </button>

              <div className="relative mb-5 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <span className="relative bg-white px-3 text-xs text-slate-400 font-medium">
                  o ingresar con correo
                </span>
              </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#3C1C6C]">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="doctor@clinica.com"
                    className="pl-10 h-11 rounded-xl border-purple-100 focus-visible:ring-[#3C1C6C] text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#3C1C6C]">
                    Contraseña
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-purple-700 hover:text-purple-900 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-11 rounded-xl border-purple-100 focus-visible:ring-[#3C1C6C] text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPass ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Botón de Submit */}
              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full h-11 rounded-xl font-bold text-white bg-[#3C1C6C] hover:bg-[#2C1450] shadow-md shadow-purple-950/20 hover:shadow-lg transition-all text-sm mt-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verificando...
                  </span>
                ) : (
                  "Ingresar al Portal"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-purple-50 text-center">
              <p className="text-xs text-slate-500">
                ¿Aún no tienes cuenta para tu clínica?{" "}
                <Link
                  href="/register"
                  className="font-bold text-[#3C1C6C] hover:text-[#A57CFA] transition-colors"
                >
                  Registrar Clínica
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
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
    <div className="flex items-start gap-3 rounded-2xl border border-purple-50 bg-white/60 p-3.5">
      <div className="mt-0.5 rounded-lg bg-purple-50 p-2 text-[#3C1C6C]">{icon}</div>
      <div>
        <p className="text-xs font-bold text-[#3C1C6C]">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
