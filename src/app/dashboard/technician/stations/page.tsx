"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Estacion = { id: string; nombre: string; orden: number };

export default function TechnicianStationsPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [miEstacionId, setMiEstacionId] = useState<string | null>(null);
  const [miEstacion, setMiEstacion] = useState<Estacion | null>(null);

  const [pendientes, setPendientes] = useState<any[]>([]);
  const [mias, setMias] = useState<any[]>([]);

  const miEstacionLabel = useMemo(() => {
    if (!miEstacion) return "No asignada";
    return `${miEstacion.orden}. ${miEstacion.nombre}`;
  }, [miEstacion]);

  async function fetchAll() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

    // 1) Mi estación
    const { data: te } = await supabase
      .from("tecnico_estacion")
      .select("estacion_id, estaciones(id,nombre,orden)")
      .eq("tecnico_id", user.id)
      .maybeSingle();

    const estId = te?.estacion_id ?? null;
    setMiEstacionId(estId);
    setMiEstacion((te as any)?.estaciones ?? null);

    // 2) Pendientes en mi estación (RLS ya filtra por técnico+estación)
    const { data: pend } = await supabase
      .from("historial_estaciones")
      .select(
        `
        id, estado, fecha_inicio,
        pedidos ( id, paciente_nombre, estado, fecha_creacion ),
        estaciones ( id, nombre, orden )
      `
      )
      .is("tecnico_id", null)
      .eq("estado", "pendiente")
      .order("fecha_inicio", { ascending: true });

    setPendientes(pend || []);

    // 3) Mis tareas en proceso
    const { data: mine } = await supabase
      .from("historial_estaciones")
      .select(
        `
        id, estado, fecha_inicio,
        pedidos ( id, paciente_nombre, estado ),
        estaciones ( id, nombre, orden )
      `
      )
      .eq("tecnico_id", user.id)
      .eq("estado", "en_proceso")
      .order("fecha_inicio", { ascending: true });

    setMias(mine || []);
    setLoading(false);
  }

  async function tomar(historialId: string) {
    const { error } = await supabase.rpc("rpc_tomar_tarea", {
      p_historial_id: historialId,
    });
    if (error) return alert(`❌ ${error.message}`);
    await fetchAll();
  }

  async function soltar(historialId: string) {
    const comentario = prompt("Comentario (opcional):") ?? null;
    const { error } = await supabase.rpc("rpc_soltar_tarea", {
      p_historial_id: historialId,
      p_comentario: comentario,
    });
    if (error) return alert(`❌ ${error.message}`);
    await fetchAll();
  }

  async function completar(historialId: string) {
    const comentario = prompt("Comentario (opcional):") ?? null;
    const { error } = await supabase.rpc("rpc_completar_y_avanzar", {
      p_historial_id: historialId,
      p_comentario: comentario,
    });
    if (error) return alert(`❌ ${error.message}`);
    await fetchAll();
  }

  useEffect(() => {
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin w-6 h-6" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🧑‍🔧 Mi estación</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            <span className="font-medium">Estación actual:</span>{" "}
            {miEstacionLabel}
          </p>
          {!miEstacionId && (
            <p className="text-sm text-red-600 mt-2">
              No tienes estación asignada. Ve a tu Perfil y selecciona una.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📥 Pendientes en mi estación</CardTitle>
        </CardHeader>
        <CardContent>
          {!miEstacionId ? (
            <p className="text-gray-500">Asigna una estación para ver la cola.</p>
          ) : pendientes.length === 0 ? (
            <p className="text-gray-500">No hay pendientes.</p>
          ) : (
            <div className="space-y-2">
              {pendientes.map((t) => (
                <div
                  key={t.id}
                  className="border rounded p-3 flex items-center justify-between"
                >
                  <div className="text-sm">
                    <p className="font-medium">{t.pedidos?.paciente_nombre}</p>
                    <p className="text-gray-500">
                      Pedido: {t.pedidos?.id?.slice(0, 8)} • Estación: {t.estaciones?.nombre}
                    </p>
                  </div>
                  <Button onClick={() => tomar(t.id)}>Tomar</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🧰 Mis tareas en proceso</CardTitle>
        </CardHeader>
        <CardContent>
          {mias.length === 0 ? (
            <p className="text-gray-500">No tienes tareas en proceso.</p>
          ) : (
            <div className="space-y-2">
              {mias.map((t) => (
                <div
                  key={t.id}
                  className="border rounded p-3 flex items-center justify-between"
                >
                  <div className="text-sm">
                    <p className="font-medium">{t.pedidos?.paciente_nombre}</p>
                    <p className="text-gray-500">
                      Estación: {t.estaciones?.nombre} • Estado pedido: {t.pedidos?.estado}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => soltar(t.id)}>
                      Soltar
                    </Button>
                    <Button onClick={() => completar(t.id)}>
                      Completar y avanzar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
