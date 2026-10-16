"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2,
  Wrench,
  Inbox,
  Play,
  CheckCircle2,
  Undo2,
  RefreshCcw,
  Sparkles,
  Cpu,
  Flame,
  Sun,
  ShieldCheck,
  Truck,
  Box,
  User,
  Ruler,
  Palette,
  FileText,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

type Estacion = { id: string; nombre: string; orden: number };

const STATION_ICONS: Record<number, any> = {
  1: Cpu,
  2: Flame,
  3: Sparkles,
  4: Sun,
  5: ShieldCheck,
};

export default function TechnicianStationsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [miEstacionId, setMiEstacionId] = useState<string | null>(null);
  const [miEstacion, setMiEstacion] = useState<Estacion | null>(null);

  const [pendientes, setPendientes] = useState<any[]>([]);
  const [mias, setMias] = useState<any[]>([]);

  const miEstacionLabel = useMemo(() => {
    if (!miEstacion) return "No asignada";
    return `Estación ${miEstacion.orden}: ${miEstacion.nombre}`;
  }, [miEstacion]);

  const StationIcon = miEstacion?.orden ? STATION_ICONS[miEstacion.orden] || Wrench : Wrench;

  async function fetchAll(isManual = false) {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setRefreshing(false);
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

    // 2) Pendientes en mi estación
    const { data: pend, error: pendErr } = await supabase
      .from("historial_estaciones")
      .select(
        `
        id, estado, fecha_inicio,
        pedidos (
          id, paciente_nombre, estado, fecha_creacion,
          numero_requerimiento, numero_caja, trabajo_realizar,
          pieza_numero, color_pieza, colimetro, observaciones
        ),
        estaciones ( id, nombre, orden )
      `
      )
      .is("tecnico_id", null)
      .eq("estado", "pendiente")
      .order("fecha_inicio", { ascending: true });

    if (pendErr) console.error("pendErr:", pendErr);
    setPendientes(pend || []);

    // 3) Mis tareas en proceso
    const { data: mine, error: mineErr } = await supabase
      .from("historial_estaciones")
      .select(
        `
        id, estado, fecha_inicio,
        pedidos (
          id, paciente_nombre, estado, fecha_creacion,
          numero_requerimiento, numero_caja, trabajo_realizar,
          pieza_numero, color_pieza, colimetro, observaciones
        ),
        estaciones ( id, nombre, orden )
      `
      )
      .eq("tecnico_id", user.id)
      .eq("estado", "en_proceso")
      .order("fecha_inicio", { ascending: true });

    if (mineErr) console.error("mineErr:", mineErr);
    setMias(mine || []);

    setLoading(false);
    setRefreshing(false);
  }

  async function tomar(historialId: string) {
    const { error } = await supabase.rpc("rpc_tomar_tarea", {
      p_historial_id: historialId,
    });
    if (error) {
      toast.error(`❌ No se pudo tomar la tarea: ${error.message}`);
      return;
    }
    toast.success("⚡ Tarea asignada a tu mesa de trabajo");
    await fetchAll();
  }

  async function soltar(historialId: string) {
    const { error } = await supabase.rpc("rpc_soltar_tarea", {
      p_historial_id: historialId,
      p_comentario: null,
    });
    if (error) {
      toast.error(`❌ No se pudo soltar: ${error.message}`);
      return;
    }
    toast.info("Tarea devuelta a la cola de espera de la estación");
    await fetchAll();
  }

  async function completar(historialId: string) {
    const { error } = await supabase.rpc("rpc_completar_y_avanzar", {
      p_historial_id: historialId,
      p_comentario: null,
    });
    if (error) {
      toast.error(`❌ No se pudo completar: ${error.message}`);
      return;
    }
    toast.success("✅ Estación completada y avanzada al siguiente paso técnico");
    await fetchAll();
  }

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel("technician-stations-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "historial_estaciones" },
        () => {
          fetchAll();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => {
          fetchAll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="animate-spin w-8 h-8 text-[#3C1C6C]" />
        <p className="text-xs text-slate-500 font-medium">Cargando estación y cola de trabajo técnico...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-[#3C1C6C] text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Taller Digital CAD/CAM
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#3C1C6C] tracking-tight">
            Mi Estación Técnica de Trabajo
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestiona las piezas dentales asignadas a tu estación en el flujo de producción.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            className="rounded-xl border-slate-200 text-xs font-bold h-9 gap-1.5"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          <Link href="/dashboard/technician/history">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-200 text-xs font-bold h-9 text-[#3C1C6C] hover:bg-purple-50"
            >
              Ver Mi Historial
            </Button>
          </Link>
        </div>
      </div>

      {/* Banner de Mi Estación Asignada */}
      <div className="rounded-3xl border border-purple-200/80 bg-gradient-to-br from-[#3C1C6C] via-[#482084] to-[#5a2a9e] p-5 sm:p-6 text-white shadow-lg shadow-purple-950/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <StationIcon className="w-7 h-7 text-purple-200" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-200">
              Estación Asignada
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              {miEstacion ? miEstacionLabel : "Sin Estación Configurada"}
            </h2>
            <p className="text-xs text-purple-200/80 mt-1">
              {miEstacion
                ? "Las tareas que ingresen a esta estación aparecerán automáticamente en tu cola."
                : "Debes tener una estación asignada en tu perfil para tomar órdenes del taller."}
            </p>
          </div>
        </div>

        {!miEstacionId && (
          <Link href="/dashboard/profile">
            <Button className="bg-white hover:bg-purple-50 text-[#3C1C6C] font-bold rounded-xl text-xs shrink-0 shadow-md">
              Configurar Mi Estación
            </Button>
          </Link>
        )}
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pendientes en Cola</p>
            <p className="text-2xl font-black text-amber-700">{pendientes.length}</p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-[#3C1C6C] flex items-center justify-center shrink-0 border border-purple-100">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">En Mi Mesa de Trabajo</p>
            <p className="text-2xl font-black text-[#3C1C6C]">{mias.length}</p>
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: MIS TAREAS EN PROCESO */}
      <Card className="rounded-3xl border border-purple-200/90 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-purple-50/60 border-b border-purple-100 px-5 sm:px-6 py-4">
          <CardTitle className="text-base sm:text-lg font-black text-[#3C1C6C] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-purple-700" /> Mis Tareas en Proceso Activo
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-200 text-[#3C1C6C]">
              {mias.length} activas
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {mias.length === 0 ? (
            <div className="py-10 text-center">
              <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No tienes tareas en proceso actualmente</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Toma una de las tareas pendientes de la cola de abajo para comenzar a fabricar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mias.map((t) => {
                const ped = t.pedidos;
                const hasDelivery = ped?.observaciones && ped.observaciones.includes("DELIVERY");

                return (
                  <div
                    key={t.id}
                    className="rounded-2xl border-2 border-purple-300 bg-white p-5 shadow-sm space-y-3 relative hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {ped?.numero_caja && (
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-purple-900 text-white">
                            Caja #{ped.numero_caja}
                          </span>
                        )}
                        {ped?.numero_requerimiento && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono">
                            {ped.numero_requerimiento}
                          </span>
                        )}
                        {hasDelivery && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-0.5">
                            <Truck className="w-3 h-3" /> Delivery
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-[#3C1C6C] animate-pulse">
                        ● EN PROCESO
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        {ped?.paciente_nombre || "Paciente sin nombre"}
                      </h3>
                      <p className="text-xs font-semibold text-[#3C1C6C] mt-0.5">
                        {ped?.trabajo_realizar || "Trabajo dental estándar"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Pieza(s)</span>
                        <span className="font-bold text-slate-800">{ped?.pieza_numero || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Color / Guía</span>
                        <span className="font-bold text-slate-800">
                          {ped?.color_pieza || "—"} {ped?.colimetro ? `(${ped.colimetro})` : ""}
                        </span>
                      </div>
                    </div>

                    {ped?.observaciones && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 italic">
                        &ldquo;{ped.observaciones}&rdquo;
                      </p>
                    )}

                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => soltar(t.id)}
                        className="text-xs text-slate-500 hover:text-slate-800 rounded-xl gap-1 h-9"
                      >
                        <Undo2 className="w-3.5 h-3.5" /> Soltar a cola
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => completar(t.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs gap-1.5 h-9 shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Completar y Avanzar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECCIÓN 2: PENDIENTES EN COLA */}
      <Card className="rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-slate-50 border-b border-slate-100 px-5 sm:px-6 py-4">
          <CardTitle className="text-base sm:text-lg font-black text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-amber-600" /> Cola de Espera en Mi Estación
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {pendientes.length} por tomar
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {!miEstacionId ? (
            <div className="py-8 text-center">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No tienes una estación asignada</p>
              <p className="text-xs text-slate-500 mt-1">
                Ve a tu perfil para seleccionar a qué estación del taller perteneces.
              </p>
            </div>
          ) : pendientes.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">¡Al día! No hay pedidos pendientes en tu cola</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Cuando la estación anterior complete un trabajo, ingresará automáticamente aquí.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendientes.map((t) => {
                const ped = t.pedidos;
                const hasDelivery = ped?.observaciones && ped.observaciones.includes("DELIVERY");

                return (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 hover:border-purple-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {ped?.numero_caja && (
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-purple-900 text-white">
                            Caja #{ped.numero_caja}
                          </span>
                        )}
                        {ped?.numero_requerimiento && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono">
                            {ped.numero_requerimiento}
                          </span>
                        )}
                        {hasDelivery && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-0.5">
                            <Truck className="w-3 h-3" /> Delivery
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        En espera
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        {ped?.paciente_nombre || "Paciente sin nombre"}
                      </h3>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5">
                        {ped?.trabajo_realizar || "Trabajo dental"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Pieza(s)</span>
                        <span className="font-bold text-slate-800">{ped?.pieza_numero || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Color / Guía</span>
                        <span className="font-bold text-slate-800">{ped?.color_pieza || "—"}</span>
                      </div>
                    </div>

                    {ped?.observaciones && (
                      <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100 italic line-clamp-2">
                        &ldquo;{ped.observaciones}&rdquo;
                      </p>
                    )}

                    <div className="pt-2 flex justify-end border-t border-slate-100">
                      <Button
                        size="sm"
                        onClick={() => tomar(t.id)}
                        className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white font-bold rounded-xl text-xs gap-1.5 h-9 shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Tomar a Mi Mesa
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
