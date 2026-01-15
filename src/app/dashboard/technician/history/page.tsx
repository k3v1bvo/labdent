"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";

interface Historial {
  id: string;
  pedido_id: string;
  paciente_nombre: string;
  estacion_nombre: string;
  fecha_fin: string;
  comentarios: string | null;
}

export default function TechnicianHistoryPage() {
  const [historial, setHistorial] = useState<Historial[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchHistorial() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // 🔹 Cargar tareas completadas del técnico logueado
    const { data, error } = await supabase
      .from("historial_estaciones")
      .select(`
        id,
        pedido_id,
        estado,
        fecha_fin,
        comentarios,
        estaciones (nombre),
        pedidos (paciente_nombre)
      `)
      .eq("tecnico_id", user.id)
      .eq("estado", "completado")
      .order("fecha_fin", { ascending: false });

    if (error) {
      console.error("Error al cargar historial:", error);
      setLoading(false);
      return;
    }

    const formatted = data.map((t: any) => ({
      id: t.id,
      pedido_id: t.pedido_id,
      estacion_nombre: t.estaciones?.nombre || "—",
      paciente_nombre: t.pedidos?.paciente_nombre || "—",
      fecha_fin: t.fecha_fin,
      comentarios: t.comentarios,
    }));

    setHistorial(formatted);
    setLoading(false);
  }

  useEffect(() => {
    fetchHistorial();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-green-700">
        🧾 Historial de tareas completadas
      </h1>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : historial.length === 0 ? (
        <p className="text-gray-500">No tienes tareas completadas aún.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {historial.map((h) => (
            <Card key={h.id} className="shadow-sm border">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {h.paciente_nombre}
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  <strong>Estación:</strong> {h.estacion_nombre}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Finalizado:</strong>{" "}
                  {new Date(h.fecha_fin).toLocaleDateString("es-ES")}
                </p>
                {h.comentarios && (
                  <p className="text-xs text-gray-500 mt-2 italic">
                    💬 {h.comentarios}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
