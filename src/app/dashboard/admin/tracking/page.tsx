"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, RefreshCcw, ArrowRight, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface TrackingRow {
  pedido_id: string;
  paciente_nombre: string;
  estado_pedido: string;
  estacion_actual: string;
  estado_estacion: string;
  doctor_nombre: string;
  fecha_inicio: string;
  fecha_fin: string | null;
}

interface Estacion {
  id: string;
  nombre: string;
  orden: number;
}

export default function TrackingPage() {
  const [rows, setRows] = useState<TrackingRow[]>([]);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchTracking() {
    setLoading(true);
    const { data, error } = await supabase.from("vw_tracking_pedidos").select("*");
    if (error) console.error(error);
    else setRows(data || []);
    setLoading(false);
  }

  async function fetchEstaciones() {
    const { data } = await supabase.from("estaciones").select("*").order("orden", { ascending: true });
    setEstaciones(data || []);
  }

  async function handleAvanzar(pedido_id: string, estacion_actual: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const actualIndex = estaciones.findIndex((e) => e.nombre === estacion_actual);
    const siguiente = estaciones[actualIndex + 1];
    if (!siguiente) {
      toast("✅ Este pedido ya está en la última estación.");
      return;
    }

    const { error } = await supabase.rpc("avanzar_estacion", {
      p_pedido_id: pedido_id,
      p_estacion_id: siguiente.id,
      p_tecnico_id: user.id,
      p_comentario: "Avanzado manualmente desde tracking",
    });

    if (error) {
      console.error(error);
      toast.error("Error al avanzar estación.");
    } else {
      toast.success("Estación avanzada correctamente.");
      fetchTracking();
    }
  }

  // 📡 Suscripción en tiempo real
  useEffect(() => {
    fetchTracking();
    fetchEstaciones();

    const channel = supabase
      .channel("tracking-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "historial_estaciones" }, fetchTracking)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function getProgress(estacion_actual: string) {
    const index = estaciones.findIndex((e) => e.nombre === estacion_actual);
    if (index === -1 || estaciones.length === 0) return 0;
    return Math.round(((index + 1) / estaciones.length) * 100);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-green-700">📦 Seguimiento de Pedidos</h1>
        <Button onClick={fetchTracking} className="flex items-center gap-2">
          <RefreshCcw className="w-4 h-4" /> Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progreso de Producción</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin w-8 h-8 text-green-600" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-gray-500 text-center">No hay pedidos en proceso.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Estación Actual</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const progress = getProgress(r.estacion_actual);
                  return (
                    <TableRow key={r.pedido_id}>
                      <TableCell>{r.paciente_nombre}</TableCell>
                      <TableCell>{r.doctor_nombre}</TableCell>
                      <TableCell>{r.estacion_actual}</TableCell>
                      <TableCell className="w-64">
                        <Progress value={progress} className="h-2 bg-green-100" />
                        <p className="text-xs text-gray-600 mt-1">{progress}% completado</p>
                      </TableCell>
                      <TableCell>
                        {r.estado_estacion === "completado" ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" /> Completado
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-yellow-600">
                            <Clock className="w-4 h-4" /> {r.estado_estacion}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          className="flex items-center gap-2"
                          onClick={() => handleAvanzar(r.pedido_id, r.estacion_actual)}
                        >
                          <ArrowRight className="w-4 h-4" /> Avanzar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
