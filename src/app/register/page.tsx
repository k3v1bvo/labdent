"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  BadgeCheck,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      nombre.trim().length >= 3 &&
      email.trim().length > 3 &&
      password.length >= 6 &&
      !loading
    );
  }, [nombre, email, password, loading]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { nombre: nombre.trim() }, // raw_user_meta_data
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("✅ Usuario registrado. Revisa tu correo para confirmar.");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-6">
      <Card className="w-full max-w-xl rounded-3xl shadow-sm border bg-white dark:bg-gray-900">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold text-green-700">
            Crear cuenta
          </CardTitle>
          <p className="text-center text-sm text-gray-600 dark:text-gray-300">
            Registro para el sistema interno del laboratorio
          </p>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Nombre */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Nombre completo
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  placeholder="usuario@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
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
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
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
                  Registrando...
                </span>
              ) : (
                "Registrarse"
              )}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                ¿Ya tienes cuenta?
              </span>
              <a href="/login" className="font-medium text-green-700 hover:underline">
                Iniciar sesión
              </a>
            </div>

            <div className="rounded-2xl border bg-gray-50 dark:bg-gray-950 p-4 text-xs text-gray-600 dark:text-gray-300">
              <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1 inline-flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-green-700" />
                Nota
              </p>
              <p>
                Después del registro, revisa tu correo para confirmar (si está habilitado).
                El administrador asignará el rol adecuado dentro del sistema.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
