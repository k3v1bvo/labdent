"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

interface Tarea {
  id: string;
  pedido_id: string;
  paciente_nombre: string;
  estacion_nombre: string;
  estado: string;
  fecha_inicio: string;
}

export default function TechnicianTasksPage() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  async function fetchTareas() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // 🔹 Buscar tareas asignadas al técnico logueado
    const { data, error } = await supabase
      .from("historial_estaciones")
      .select(`
        id,
        pedido_id,
        estado,
        fecha_inicio,
        estaciones (nombre),
        pedidos (paciente_nombre)
      `)
      .eq("tecnico_id", user.id)
      .order("fecha_inicio", { ascending: false });

    if (error) {
      console.error("Error al cargar tareas:", error);
      setLoading(false);
      return;
    }

    const formatted = data.map((t: any) => ({
      id: t.id,
      pedido_id: t.pedido_id,
      estado: t.estado,
      fecha_inicio: t.fecha_inicio,
      estacion_nombre: t.estaciones?.nombre || "—",
      paciente_nombre: t.pedidos?.paciente_nombre || "—",
    }));

    setTareas(formatted);
    setLoading(false);
  }

  useEffect(() => {
    fetchTareas();
  }, []);

  async function updateEstado(id: string, nuevoEstado: string) {
    setUpdating(id);
    const { error } = await supabase
      .from("historial_estaciones")
      .update({ estado: nuevoEstado })
      .eq("id", id);

    if (error) console.error("Error al actualizar estado:", error);
    await fetchTareas();
    setUpdating(null);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-green-700">
        ⚙️ Mis tareas asignadas
      </h1>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : tareas.length === 0 ? (
        <p className="text-gray-500">No tienes tareas asignadas.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tareas.map((t) => (
            <Card key={t.id} className="shadow-sm border">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {t.paciente_nombre}
                  {t.estado === "pendiente" && (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                  {t.estado === "en_proceso" && (
                    <Clock className="w-5 h-5 text-blue-500" />
                  )}
                  {t.estado === "completado" && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  <strong>Estación:</strong> {t.estacion_nombre}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Estado:</strong>{" "}
                  <span className="capitalize">{t.estado}</span>
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Asignado:{" "}
                  {new Date(t.fecha_inicio).toLocaleDateString("es-ES")}
                </p>

                <div className="flex gap-2 mt-4">
                  {t.estado !== "en_proceso" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!!updating}
                      onClick={() => updateEstado(t.id, "en_proceso")}
                    >
                      {updating === t.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "En proceso"
                      )}
                    </Button>
                  )}
                  {t.estado !== "completado" && (
                    <Button
                      size="sm"
                      disabled={!!updating}
                      onClick={() => updateEstado(t.id, "completado")}
                    >
                      {updating === t.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Completar"
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
