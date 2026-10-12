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
    <div className="min-h-screen bg-gradient-to-b from-[#FDFCFE] via-purple-50/40 to-[#F5F2FA] flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
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
        <Card className="rounded-3xl shadow-xl shadow-purple-950/10 border border-purple-100 bg-white overflow-hidden">
          <CardHeader className="space-y-2 pt-8 pb-4 text-center">
            {/* Logo Guisela Primario en tarjeta de login */}
            <div className="relative h-15 w-52 mx-auto mb-1">
              <Image
                src="/images/brand/guisela-logo-primary.png"
                alt="Guisela Laboratorio Dental"
                fill
                className="object-contain"
                priority
                unoptimized
              />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-[#3C1C6C]">
              Iniciar Sesión
            </CardTitle>
            <p className="text-sm text-slate-500">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </CardHeader>

          <CardContent className="p-8 pt-2">
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
                <label className="text-xs font-bold uppercase tracking-wider text-[#3C1C6C]">
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
