"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error("Credenciales incorrectas o usuario no encontrado");
      setLoading(false);
      return;
    }

    // Obtener el perfil del usuario autenticado
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

    // Redirigir según el rol
switch (profile.rol?.toLowerCase()) {
  case "admin":
    router.push("/dashboard/admin/overview");
    break;
  case "doctor":
    router.push("/dashboard/doctors/orders");
    break;
  case "technician":
  case "tecnico": // por si lo guardás en español
    router.push("/dashboard/technician");
    break;
  case "secretary":
  case "secretaria": // también en español
    router.push("/dashboard/secretary/orders");
    break;
  default:
    toast.error("Rol desconocido. Contacta al administrador.");
    await supabase.auth.signOut();
    router.push("/login");
}

    toast.success("Inicio de sesión exitoso");
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle className="text-center text-xl font-semibold text-green-700">
            Iniciar Sesión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Correo electrónico
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="usuario@correo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Contraseña
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="********"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-green-700 hover:bg-green-800 text-white"
              disabled={loading}
            >
              {loading ? "Iniciando sesión..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
