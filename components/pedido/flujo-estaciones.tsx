"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, ArrowRightCircle } from "lucide-react";

// Configuración de Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Estacion {
  id: string;
  nombre: string;
  orden: number;
  descripcion: string;
}

interface Historial {
  id: string;
  estacion_id: string;
  estado: string;
  tecnico_id: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
}

export function FlujoEstaciones({ pedidoId }: { pedidoId: string }) {
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [historial, setHistorial] = useState<Historial[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchFlujo = async () => {
      try {
        const { data: estData } = await supabase
          .from("estaciones")
          .select("*")
          .order("orden", { ascending: true });

        const { data: histData } = await supabase
          .from("historial_estaciones")
          .select("*")
          .eq("pedido_id", pedidoId);

        setEstaciones(estData || []);
        setHistorial(histData || []);
      } catch (err) {
        console.error("Error cargando flujo:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFlujo();
  }, [pedidoId]);

  const completarEstacion = async (estacionId: string) => {
    setUpdating(true);
    try {
      const estacionActual = estaciones.find((e) => e.id === estacionId);
      if (!estacionActual) return;

      // Marcar estación actual como completada
      await supabase
        .from("historial_estaciones")
        .update({
          estado: "completado",
          fecha_fin: new Date().toISOString(),
        })
        .eq("pedido_id", pedidoId)
        .eq("estacion_id", estacionId);

      // Avanzar a la siguiente estación
      const siguiente = estaciones.find(
        (e) => e.orden === estacionActual.orden + 1
      );
      if (siguiente) {
        await supabase.from("historial_estaciones").insert([
          {
            pedido_id: pedidoId,
            estacion_id: siguiente.id,
            estado: "en_proceso",
            fecha_inicio: new Date().toISOString(),
          },
        ]);
      }

      alert("✅ Estación completada correctamente.");
      location.reload();
    } catch (err) {
      console.error("Error completando estación:", err);
      alert("❌ Error al actualizar estación.");
    } finally {
      setUpdating(false);
    }
  };

  const devolverEstacion = async (estacionId: string) => {
    setUpdating(true);
    try {
      const estacionActual = estaciones.find((e) => e.id === estacionId);
      if (!estacionActual) return;

      const anterior = estaciones.find(
        (e) => e.orden === estacionActual.orden - 1
      );
      if (!anterior) {
        alert("🚫 No hay estación anterior para devolver.");
        return;
      }

      await supabase.from("historial_estaciones").insert([
        {
          pedido_id: pedidoId,
          estacion_id: anterior.id,
          estado: "devuelto",
          fecha_inicio: new Date().toISOString(),
        },
      ]);

      alert("🔄 Pedido devuelto a la estación anterior.");
      location.reload();
    } catch (err) {
      console.error("Error devolviendo estación:", err);
      alert("❌ No se pudo devolver el pedido.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="shadow-md border border-border">
      <CardHeader>
        <CardTitle>Flujo de estaciones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {estaciones.map((est) => {
          const estado =
            historial.find((h) => h.estacion_id === est.id)?.estado || "pendiente";

          return (
            <div
              key={est.id}
              className={`flex items-center justify-between p-3 border rounded-md ${
                estado === "completado"
                  ? "bg-green-50 dark:bg-green-950"
                  : estado === "en_proceso"
                  ? "bg-blue-50 dark:bg-blue-950"
                  : estado === "devuelto"
                  ? "bg-red-50 dark:bg-red-950"
                  : "bg-muted/40"
              }`}
            >
              <div>
                <h3 className="font-medium">{est.nombre}</h3>
                <p className="text-xs text-muted-foreground">
                  {est.descripcion}
                </p>
              </div>

              <div className="flex gap-2">
                {estado === "en_proceso" && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => completarEstacion(est.id)}
                      disabled={updating}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" /> Completar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => devolverEstacion(est.id)}
                      disabled={updating}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Devolver
                    </Button>
                  </>
                )}

                {estado === "completado" && (
                  <CheckCircle className="text-green-600 h-5 w-5" />
                )}

                {estado === "devuelto" && (
                  <XCircle className="text-red-600 h-5 w-5" />
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
