"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface Estacion {
  id: string;
  nombre: string;
}

interface Historial {
  id: string;
  estacion_id: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string | null;
}

export function FlujoEstaciones({ pedidoId }: { pedidoId: string }) {
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [historial, setHistorial] = useState<Historial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlujo = async () => {
      try {
        const { data: estacionesData } = await supabase
          .from("estaciones")
          .select("id, nombre")
          .order("orden", { ascending: true });

        const { data: historialData } = await supabase
          .from("historial_estaciones")
          .select("id, estacion_id, estado, fecha_inicio, fecha_fin")
          .eq("pedido_id", pedidoId);

        setEstaciones(estacionesData || []);
        setHistorial(historialData || []);
      } catch (err) {
        console.error("❌ Error cargando flujo:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFlujo();
  }, [pedidoId]);

  const avanzarEstacion = async (estacionId: string) => {
    try {
      await supabase
        .from("historial_estaciones")
        .update({ estado: "completado", fecha_fin: new Date().toISOString() })
        .eq("pedido_id", pedidoId)
        .eq("estacion_id", estacionId);

      alert("✅ Estación marcada como completada");
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("❌ Error al actualizar estación");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="animate-spin text-primary h-6 w-6" />
      </div>
    );
  }

  return (
    <Card className="shadow border border-border mt-6">
      <CardHeader>
        <CardTitle>Flujo de estaciones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4">
          {estaciones.map((e) => {
            const estadoActual = historial.find((h) => h.estacion_id === e.id);
            const completado = estadoActual?.estado === "completado";

            return (
              <div
                key={e.id}
                className={`p-4 rounded-lg border text-center transition ${
                  completado
                    ? "bg-green-600 text-white"
                    : "bg-gray-800 text-gray-200"
                }`}
              >
                <h3 className="font-semibold mb-2">{e.nombre}</h3>
                <p className="text-sm mb-2">
                  {completado ? "✅ Completado" : "⏳ Pendiente"}
                </p>
                {!completado && (
                  <Button
                    size="sm"
                    onClick={() => avanzarEstacion(e.id)}
                    className="bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    Marcar como lista
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
