"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("tecnico");
  const [msg, setMsg] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre, rol } },
    });

    if (error) setMsg("❌ " + error.message);
    else setMsg("✅ Usuario creado correctamente.");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-xl font-semibold">
            Registrar Usuario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <Input
              placeholder="Nombre completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
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
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="border rounded-md p-2"
            >
              <option value="admin">Administrador</option>
              <option value="secretaria">Secretaria</option>
              <option value="doctor">Doctor</option>
              <option value="tecnico">Técnico</option>
            </select>
            <Button type="submit">Registrar</Button>
            {msg && <p className="text-center text-sm mt-2">{msg}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
