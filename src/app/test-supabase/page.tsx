"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestSupabase() {
  const [message, setMessage] = useState("Conectando con Supabase...");

  useEffect(() => {
    async function testConnection() {
      try {
        // Tu tabla real se llama "profiles"
        const { data, error } = await supabase.from("profiles").select("*").limit(1);
        if (error) {
          setMessage("❌ Error de conexión: " + error.message);
        } else {
          setMessage("✅ Conexión exitosa a Supabase y tabla 'profiles' detectada!");
          console.log("Ejemplo de datos:", data);
        }
      } catch (err: any) {
        setMessage("⚠️ Error inesperado: " + err.message);
      }
    }

    testConnection();
  }, []);

  return (
    <main className="flex h-screen items-center justify-center bg-green-100">
      <h1 className="text-2xl font-semibold text-green-800 text-center px-6">
        {message}
      </h1>
    </main>
  );
}
