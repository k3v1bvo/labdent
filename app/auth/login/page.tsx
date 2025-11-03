"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg("❌ " + error.message);
      return;
    }

    const user = data.user;

    if (user) {
      const rol = user.user_metadata?.rol;
      console.log("✅ Sesión iniciada:", rol);

      switch (rol) {
        case "admin":
          router.push("/admin");
          break;
        case "secretaria":
          router.push("/secretaria");
          break;
        case "doctor":
          router.push("/doctor");
          break;
        case "tecnico":
          router.push("/tecnico");
          break;
        default:
          router.push("/dashboard");
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-xl font-semibold">
            Inicio de Sesión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <Input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
            <Button type="submit">Iniciar sesión</Button>
            <p className="text-sm text-center mt-3">
              ¿No tienes cuenta?{" "}
              <a href="/auth/register" className="text-blue-500 hover:underline">
                Regístrate aquí
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
