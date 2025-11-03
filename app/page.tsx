"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarPedidos() {
      const { data, error } = await supabase.from("pedidos").select("*").limit(5);
      if (error) console.error("❌ Error al conectar con Supabase:", error);
      else console.log("✅ Conectado, datos:", data);
      setPedidos(data || []);
      setLoading(false);
    }

    cargarPedidos();
  }, []);

  if (loading) return <p className="p-8">Cargando conexión...</p>;

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Pedidos recientes</h1>
      {pedidos.length === 0 ? (
        <p>No hay pedidos registrados aún.</p>
      ) : (
        <ul className="list-disc pl-4">
          {pedidos.map((p) => (
            <li key={p.id}>
              {p.paciente_nombre} — Estado: {p.estado}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
