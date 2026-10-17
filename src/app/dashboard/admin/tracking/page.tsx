// src/app/dashboard/admin/tracking/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCcw,
  ArrowRight,
  CheckCircle2,
  Clock,
  LayoutGrid,
  Table2,
  Search,
  Filter,
  Stethoscope,
  MapPin,
  Calendar as CalendarIcon,
  ChevronDown,
  ShieldCheck,
  Cpu,
  Flame,
  Sparkles,
  Sun,
  PackageCheck,
  AlertCircle,
  CheckCheck,
  Inbox,
  Eye,
  FileText,
  ChevronRight,
  Info,
  X,
  Truck,
  Check,
} from "lucide-react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

type Estacion = {
  id: string;
  nombre: string;
  orden: number;
};

type TrackingRow = {
  pedido_id: string;
  paciente_nombre: string | null;
  doctor_nombre: string | null;
  numero_requerimiento: string | null;
  trabajo_realizar: string | null;
  pieza_numero: string | null;
  color_pieza: string | null;
  colimetro: string | null;
  numero_caja: string | null;
  observaciones: string | null;
  estado_pedido: string | null;
  estacion_actual: string | null;
  estado_estacion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
};

type HistorialItem = {
  id: string;
  pedido_id: string;
  estacion_id: string;
  estado: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  comentarios: string | null;
  tecnico_id: string | null;
  estaciones?: {
    nombre: string;
    orden: number;
  } | null;
};

const PIPELINE_STATIONS = [
  { orden: 1, short: "CAD 3D", name: "Recepción & Digitalización CAD 3D", icon: Cpu },
  { orden: 2, short: "Fresado", name: "Fresado Robótico & Sinterizado", icon: Flame },
  { orden: 3, short: "Cerámica", name: "Estratificación Cerámica & Arte", icon: Sparkles },
  { orden: 4, short: "Glaseado", name: "Terminado, Glaseado & Pulido", icon: Sun },
  { orden: 5, short: "Calidad", name: "Control de Calidad Final & Empaque", icon: ShieldCheck },
];

function s(v: any) {
  return v == null ? null : String(v);
}

function toYMD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeekMonday(d: Date) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const res = new Date(d);
  res.setDate(d.getDate() + diff);
  return startOfDay(res);
}

function endOfWeekSunday(d: Date) {
  const start = startOfWeekMonday(d);
  const res = new Date(start);
  res.setDate(start.getDate() + 6);
  return startOfDay(res);
}

function fmtLocal(ts?: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getOrderLifecycleInfo(r: TrackingRow, estaciones: Estacion[]) {
  const estPed = (r.estado_pedido ?? "pendiente").toLowerCase();
  const estEst = (r.estado_estacion ?? "pendiente").toLowerCase();
  const curName = (r.estacion_actual ?? "").trim();

  // 1. Entregado
  if (estPed === "entregado") {
    return {
      macroLabel: "Entregado a Clínica",
      macroCls: "bg-emerald-100 text-emerald-800 border-emerald-200",
      macroIcon: CheckCheck,
      locationText: "Entregado y recibido por el Doctor",
      isFinished: true,
      isDelivered: true,
      currentStationIndex: 5,
      progressPercent: 100,
      stepStates: ["completed", "completed", "completed", "completed", "completed"],
      actionType: "none" as const,
      actionLabel: "Trabajo Entregado ✓",
    };
  }

  // 2. Finalizado (listo para entrega)
  if (estPed === "finalizado") {
    return {
      macroLabel: "Fabricación 100% Terminada",
      macroCls: "bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20",
      macroIcon: CheckCircle2,
      locationText: "Listo en Recepción / Esperando Entrega o Delivery",
      isFinished: true,
      isDelivered: false,
      currentStationIndex: 5,
      progressPercent: 100,
      stepStates: ["completed", "completed", "completed", "completed", "completed"],
      actionType: "deliver" as const,
      actionLabel: "Despachar / Entregar ➔",
    };
  }

  // 3. Cancelado
  if (estPed === "cancelado") {
    return {
      macroLabel: "Cancelado",
      macroCls: "bg-rose-100 text-rose-800 border-rose-200",
      macroIcon: AlertCircle,
      locationText: "Orden cancelada",
      isFinished: false,
      isDelivered: false,
      currentStationIndex: -1,
      progressPercent: 0,
      stepStates: ["pending", "pending", "pending", "pending", "pending"],
      actionType: "none" as const,
      actionLabel: "Cancelado",
    };
  }

  // 4. Sin asignar (en espera de entrar a estación 1)
  if (curName === "Sin asignar" || !curName) {
    return {
      macroLabel: "En Cola de Ingreso a Taller",
      macroCls: "bg-amber-100 text-amber-800 border-amber-200",
      macroIcon: Inbox,
      locationText: "Recepción (En espera de entrar a Estación 1: CAD 3D)",
      isFinished: false,
      isDelivered: false,
      currentStationIndex: -1,
      progressPercent: 5,
      stepStates: ["waiting", "pending", "pending", "pending", "pending"],
      actionType: "assign_first" as const,
      actionLabel: "Iniciar en Estación 1 (CAD 3D) ➔",
    };
  }

  // 5. En alguna estación (1 a 5)
  // Determinar índice orden (1..5)
  let stationIndex = PIPELINE_STATIONS.findIndex(
    (p) => p.name.toLowerCase() === curName.toLowerCase() || curName.toLowerCase().includes(p.short.toLowerCase())
  );
  if (stationIndex === -1) {
    // Si no coincide con pipeline estándar, buscar en estaciones BD
    const bdIndex = estaciones.findIndex((e) => e.nombre.toLowerCase() === curName.toLowerCase());
    stationIndex = bdIndex !== -1 ? bdIndex : 0;
  }

  const stepStates = [0, 1, 2, 3, 4].map((i) => {
    if (i < stationIndex) return "completed";
    if (i === stationIndex) {
      if (estEst === "completado") return "completed";
      if (estEst === "en_proceso") return "active";
      return "waiting";
    }
    return "pending";
  });

  // Si estación 5 (Control de Calidad) está completada
  if (stationIndex === 4 && estEst === "completado") {
    return {
      macroLabel: "Control de Calidad Aprobado",
      macroCls: "bg-emerald-100 text-emerald-800 border-emerald-300",
      macroIcon: ShieldCheck,
      locationText: "Control de Calidad finalizado • Listo para empaque y cierre",
      isFinished: true,
      isDelivered: false,
      currentStationIndex: 4,
      progressPercent: 98,
      stepStates: ["completed", "completed", "completed", "completed", "completed"],
      actionType: "finalize" as const,
      actionLabel: "Cerrar Orden & Listo para Entrega ➔",
    };
  }

  // Estaciones 0 a 4 intermedias
  const stationName = PIPELINE_STATIONS[stationIndex]?.short || curName;
  const isEnProceso = estEst === "en_proceso";
  const nextStation = PIPELINE_STATIONS[stationIndex + 1]?.short || "Siguiente";

  let progress = Math.round(((stationIndex + (isEnProceso ? 0.7 : 0.3)) / 5) * 100);
  if (progress > 95) progress = 95;

  let macroLabel = `En Fabricación: ${stationName}`;
  let macroCls = isEnProceso
    ? "bg-purple-100 text-[#3C1C6C] border-purple-300 font-bold"
    : "bg-blue-100 text-blue-800 border-blue-200";
  let macroIcon = isEnProceso ? Cpu : Clock;

  let actionType: "advance_next" | "finalize" = "advance_next";
  let actionLabel = `Avanzar a ${nextStation} ➔`;

  if (stationIndex === 4) {
    actionType = "finalize";
    actionLabel = "Aprobar Control de Calidad ➔";
  }

  return {
    macroLabel,
    macroCls,
    macroIcon,
    locationText: `Estación ${stationIndex + 1} de 5: ${curName} (${isEnProceso ? "En proceso activo" : "En cola de espera"})`,
    isFinished: false,
    isDelivered: false,
    currentStationIndex: stationIndex,
    progressPercent: progress,
    stepStates,
    actionType,
    actionLabel,
  };
}

export default function TrackingPage() {
  const [rows, setRows] = useState<TrackingRow[]>([]);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [q, setQ] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [doctor, setDoctor] = useState<string>("all");
  const [estacion, setEstacion] = useState<string>("all");
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");

  // Vista (Tarjetas/Tabla)
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Modal de Historial / Bitácora
  const [selectedPedido, setSelectedPedido] = useState<TrackingRow | null>(null);
  const [historialItems, setHistorialItems] = useState<HistorialItem[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Evita hydration
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function fetchEstaciones() {
    const res = await supabase.from("estaciones").select("id,nombre,orden").order("orden", { ascending: true });
    if (res.data) setEstaciones(res.data as any);
  }

  async function fetchTracking() {
    setLoading(true);

    const res = await supabase
      .from("vw_tracking_pedidos")
      .select(
        [
          "pedido_id",
          "paciente_nombre",
          "doctor_nombre",
          "numero_requerimiento",
          "trabajo_realizar",
          "pieza_numero",
          "color_pieza",
          "colimetro",
          "numero_caja",
          "observaciones",
          "estado_pedido",
          "estacion_actual",
          "estado_estacion",
          "fecha_inicio",
          "fecha_fin",
        ].join(",")
      )
      .order("fecha_inicio", { ascending: false });

    if (res.error) {
      console.error(res.error);
      toast.error("❌ Error cargando el seguimiento en vivo");
      setLoading(false);
      return;
    }

    const typed: TrackingRow[] = (res.data ?? []).map((r: any) => ({
      pedido_id: String(r.pedido_id),
      paciente_nombre: s(r.paciente_nombre),
      doctor_nombre: s(r.doctor_nombre),
      numero_requerimiento: s(r.numero_requerimiento),
      trabajo_realizar: s(r.trabajo_realizar),
      pieza_numero: s(r.pieza_numero),
      color_pieza: s(r.color_pieza),
      colimetro: s(r.colimetro),
      numero_caja: s(r.numero_caja),
      observaciones: s(r.observaciones),
      estado_pedido: s(r.estado_pedido),
      estacion_actual: s(r.estacion_actual),
      estado_estacion: s(r.estado_estacion),
      fecha_inicio: s(r.fecha_inicio),
      fecha_fin: s(r.fecha_fin),
    }));

    setRows(typed);
    setLoading(false);
  }

  useEffect(() => {
    fetchEstaciones();
    fetchTracking();

    const channel = supabase
      .channel("tracking-realtime-enhanced")
      .on("postgres_changes", { event: "*", schema: "public", table: "historial_estaciones" }, () => {
        fetchTracking();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => {
        fetchTracking();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Cargar historial detallado para el modal
  async function openHistorialModal(r: TrackingRow) {
    setSelectedPedido(r);
    setLoadingHistorial(true);
    setHistorialItems([]);

    const { data, error } = await supabase
      .from("historial_estaciones")
      .select("id, pedido_id, estacion_id, estado, fecha_inicio, fecha_fin, comentarios, tecnico_id, estaciones(nombre, orden)")
      .eq("pedido_id", r.pedido_id)
      .order("fecha_inicio", { ascending: true });

    if (!error && data) {
      setHistorialItems(data as any);
    }
    setLoadingHistorial(false);
  }

  // Acción Inteligente: Avanzar, Iniciar o Finalizar
  async function handleSmartAction(r: TrackingRow) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Debes iniciar sesión para realizar cambios.");
      return;
    }

    const info = getOrderLifecycleInfo(r, estaciones);

    // Caso 1: Asignar a Estación 1 (CAD 3D)
    if (info.actionType === "assign_first") {
      const e1 = estaciones.find((e) => e.orden === 1) || estaciones[0];
      if (!e1) {
        toast.error("No se encontró la Estación 1 en la base de datos.");
        return;
      }

      const { error } = await supabase.from("historial_estaciones").insert({
        pedido_id: r.pedido_id,
        estacion_id: e1.id,
        tecnico_id: user.id,
        estado: "en_proceso",
        fecha_inicio: new Date().toISOString(),
        comentarios: "Ingresado al taller e iniciado en CAD 3D",
      });

      await supabase.from("pedidos").update({ estado: "en_proceso" }).eq("id", r.pedido_id);

      if (error) {
        toast.error(`Error al ingresar orden: ${error.message}`);
        return;
      }
      toast.success("✅ Orden ingresada a Estación 1: Recepción & CAD 3D");
      fetchTracking();
      return;
    }

    // Caso 2: Finalizar orden (Completar Control de Calidad)
    if (info.actionType === "finalize") {
      // Marcar historial de estación actual como completada
      await supabase
        .from("historial_estaciones")
        .update({ estado: "completado", fecha_fin: new Date().toISOString() })
        .eq("pedido_id", r.pedido_id)
        .in("estado", ["pendiente", "en_proceso"]);

      // Marcar pedido como finalizado
      const { error } = await supabase
        .from("pedidos")
        .update({
          estado: "finalizado",
          fecha_entrega: new Date().toISOString(),
        })
        .eq("id", r.pedido_id);

      if (error) {
        toast.error(`Error al finalizar orden: ${error.message}`);
        return;
      }
      toast.success("🎉 ¡Control de Calidad Aprobado! Orden marcada como Finalizada y lista para Entrega.");
      fetchTracking();
      return;
    }

    // Caso 3: Despachar / Entregar al doctor
    if (info.actionType === "deliver") {
      const { error } = await supabase
        .from("pedidos")
        .update({
          estado: "entregado",
        })
        .eq("id", r.pedido_id);

      if (error) {
        toast.error(`Error al registrar entrega: ${error.message}`);
        return;
      }
      toast.success("📦 Pedido entregado al Doctor/Clínica con éxito.");
      fetchTracking();
      return;
    }

    // Caso 4: Avanzar a la siguiente estación (Estaciones 1 a 4)
    if (info.actionType === "advance_next") {
      const curIdx = info.currentStationIndex;
      const targetOrden = curIdx + 2; // de orden 1 a orden 2, etc.
      const siguiente = estaciones.find((e) => e.orden === targetOrden) || estaciones[curIdx + 1];

      if (!siguiente) {
        toast.warning("No hay siguiente estación configurada.");
        return;
      }

      const { error } = await supabase.rpc("avanzar_estacion", {
        p_pedido_id: r.pedido_id,
        p_estacion_id: siguiente.id,
        p_tecnico_id: user.id,
        p_comentario: `Avanzado a ${siguiente.nombre} desde panel de control`,
      });

      if (error) {
        toast.error(`Error al avanzar: ${error.message}`);
        return;
      }
      toast.success(`Estación avanzada a: ${siguiente.nombre}`);
      fetchTracking();
    }
  }

  // Opciones para filtros
  const doctorOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const v = (r.doctor_nombre ?? "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const doctorComboboxOptions = useMemo<ComboboxOption[]>(() => {
    return [
      {
        value: "all",
        label: "Todos los doctores",
        description: "Sin filtro de odontólogo",
        icon: <Stethoscope className="w-3.5 h-3.5 text-purple-600" />,
      },
      ...doctorOptions.map((d) => ({
        value: d,
        label: `Dr(a). ${d}`,
        icon: <Stethoscope className="w-3.5 h-3.5 text-slate-500" />,
      })),
    ];
  }, [doctorOptions]);

  const estacionOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const v = (r.estacion_actual ?? "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const estacionComboboxOptions = useMemo<ComboboxOption[]>(() => {
    return [
      {
        value: "all",
        label: "Todas las estaciones",
        description: "Sin filtro de estación",
        icon: <MapPin className="w-3.5 h-3.5 text-purple-600" />,
      },
      ...estacionOptions.map((e) => ({
        value: e,
        label: e,
        icon: <MapPin className="w-3.5 h-3.5 text-slate-500" />,
      })),
    ];
  }, [estacionOptions]);

  const estadoPipelineComboboxOptions: ComboboxOption[] = [
    {
      value: "all",
      label: "Todos los estados",
      description: "Vista de todo el pipeline",
      icon: <Filter className="w-3.5 h-3.5 text-purple-600" />,
    },
    {
      value: "en_fabricacion",
      label: "En Fabricación (E1 - E4)",
      badge: "⚡ Producción",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    },
    {
      value: "calidad",
      label: "En Control de Calidad (E5)",
      badge: "🛡️ Calidad",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    },
    {
      value: "finalizado",
      label: "Terminados / Listos para Entrega",
      badge: "✅ Listo",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    {
      value: "cola",
      label: "En Cola de Asignación",
      badge: "📥 Cola",
      badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
    },
  ];

  // Acciones rápidas de fecha
  function setHoy() {
    const now = new Date();
    const d = toYMD(now);
    setDesde(d);
    setHasta(d);
  }
  function setSemana() {
    const now = new Date();
    setDesde(toYMD(startOfWeekMonday(now)));
    setHasta(toYMD(endOfWeekSunday(now)));
  }
  function setMes() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDesde(toYMD(start));
    setHasta(toYMD(end));
  }
  function setAnio() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    setDesde(toYMD(start));
    setHasta(toYMD(end));
  }
  function limpiar() {
    setQ("");
    setEstadoFilter("all");
    setDoctor("all");
    setEstacion("all");
    setDesde("");
    setHasta("");
  }

  // Métricas para los KPI Cards
  const metrics = useMemo(() => {
    const total = rows.length;
    let enFabricacion = 0;
    let enCalidad = 0;
    let finalizados = 0;

    rows.forEach((r) => {
      const info = getOrderLifecycleInfo(r, estaciones);
      if (info.isFinished) {
        finalizados++;
      } else if (info.currentStationIndex === 4) {
        enCalidad++;
      } else if (info.currentStationIndex >= 0) {
        enFabricacion++;
      }
    });

    return { total, enFabricacion, enCalidad, finalizados };
  }, [rows, estaciones]);

  // Filtrado de pedidos
  const filtered = useMemo(() => {
    const squery = q.trim().toLowerCase();
    const desdeMs = desde ? new Date(`${desde}T00:00:00`).getTime() : null;
    const hastaMs = hasta ? new Date(`${hasta}T23:59:59`).getTime() : null;

    return rows.filter((r) => {
      const info = getOrderLifecycleInfo(r, estaciones);

      // Filtro de estado
      if (estadoFilter !== "all") {
        if (estadoFilter === "en_fabricacion" && (info.isFinished || info.currentStationIndex < 0)) return false;
        if (estadoFilter === "calidad" && (info.isFinished || info.currentStationIndex !== 4)) return false;
        if (estadoFilter === "finalizado" && !info.isFinished) return false;
        if (estadoFilter === "cola" && info.currentStationIndex >= 0) return false;
      }

      // Filtro doctor
      if (doctor !== "all" && (r.doctor_nombre ?? "") !== doctor) return false;

      // Filtro estación
      if (estacion !== "all" && (r.estacion_actual ?? "") !== estacion) return false;

      // Rango fechas
      if (desdeMs != null || hastaMs != null) {
        const t = r.fecha_inicio ? new Date(r.fecha_inicio).getTime() : NaN;
        if (!Number.isFinite(t)) return false;
        if (desdeMs != null && t < desdeMs) return false;
        if (hastaMs != null && t > hastaMs) return false;
      }

      // Búsqueda libre
      if (!squery) return true;

      const blob = [
        r.numero_requerimiento,
        r.paciente_nombre,
        r.doctor_nombre,
        r.estacion_actual,
        r.trabajo_realizar,
        r.pieza_numero,
        r.color_pieza,
        r.colimetro,
        r.numero_caja,
        r.estado_pedido,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return blob.includes(squery);
    });
  }, [rows, q, estadoFilter, doctor, estacion, desde, hasta, estaciones]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100/80 text-[#3C1C6C] text-xs font-bold uppercase tracking-wider mb-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#6A2CB0]" />
            Pipeline CAD/CAM & Calidad
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#3C1C6C] tracking-tight">
            Seguimiento de Producción en Vivo
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Visualización paso a paso de las 5 estaciones técnicas, avance operativo y control de entregas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchTracking}
            className="rounded-xl border-slate-200 hover:border-purple-300 font-semibold text-slate-700 shadow-sm"
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </Button>

          {/* Selector de Vista: Tarjetas vs Tabla */}
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "cards" ? "bg-[#3C1C6C] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Tarjetas
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "table" ? "bg-[#3C1C6C] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Table2 className="w-3.5 h-3.5" /> Tabla Kardex
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPI Cards de Producción */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-[#3C1C6C] flex items-center justify-center shrink-0 border border-purple-100">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Total en Proceso</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900">{metrics.total}</p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Fabricación (E1 a E4)</p>
            <p className="text-xl sm:text-2xl font-black text-blue-700">{metrics.enFabricacion}</p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Control de Calidad (E5)</p>
            <p className="text-xl sm:text-2xl font-black text-amber-700">{metrics.enCalidad}</p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Listos / Entregados</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-700">{metrics.finalizados}</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Buscar */}
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <Search className="w-3.5 h-3.5 text-[#3C1C6C]" /> Buscar
            </label>
            <Input
              placeholder="Paciente, doctor, requerimiento, caja..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="rounded-xl border-slate-200 h-9.5 text-xs sm:text-sm"
            />
          </div>

          {/* Estado de Pipeline */}
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <Filter className="w-3.5 h-3.5 text-[#3C1C6C]" /> Estado de Producción
            </label>
            <Combobox
              value={estadoFilter}
              onChange={setEstadoFilter}
              options={estadoPipelineComboboxOptions}
              placeholder="Todos los estados..."
              searchable={false}
            />
          </div>

          {/* Doctor */}
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-[#3C1C6C]" /> Doctor
            </label>
            <Combobox
              value={doctor}
              onChange={setDoctor}
              options={doctorComboboxOptions}
              placeholder="Buscar doctor..."
              searchPlaceholder="Escribe el nombre del doctor..."
              searchable={true}
            />
          </div>

          {/* Estación Técnica */}
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#3C1C6C]" /> Estación Actual
            </label>
            <Combobox
              value={estacion}
              onChange={setEstacion}
              options={estacionComboboxOptions}
              placeholder="Todas las estaciones..."
              searchable={false}
            />
          </div>
        </div>

        {/* Botones de Fecha y Rango */}
        <div className="pt-2 border-t border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={setHoy} className="rounded-xl border-slate-200 text-xs h-8">
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={setSemana} className="rounded-xl border-slate-200 text-xs h-8">
              Semana
            </Button>
            <Button
              size="sm"
              onClick={setMes}
              className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl text-xs h-8 font-bold"
            >
              Mes
            </Button>
            <Button variant="outline" size="sm" onClick={setAnio} className="rounded-xl border-slate-200 text-xs h-8">
              Año
            </Button>
            <Button variant="ghost" size="sm" onClick={limpiar} className="text-xs text-slate-500 hover:text-slate-800 h-8">
              ✕ Limpiar
            </Button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500">
            <span>Rango:</span>
            <Input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-32 h-8 text-xs rounded-xl"
            />
            <span>a</span>
            <Input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-32 h-8 text-xs rounded-xl"
            />
            <span className="font-semibold text-slate-700 ml-2">({filtered.length} pedidos)</span>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <Card className="border border-slate-200/90 shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 px-5 py-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>Ruta Técnica en Vivo</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-[#3C1C6C]">
              {filtered.length} órdenes
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="animate-spin w-8 h-8 text-[#3C1C6C]" />
              <p className="text-xs text-slate-500 font-medium">Sincronizando estaciones y telemetría de producción...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-base font-bold text-slate-700">No se encontraron pedidos con estos filtros</p>
              <p className="text-xs text-slate-400 mt-1">Prueba limpiando los filtros o seleccionando otro rango de fechas.</p>
              <Button variant="outline" size="sm" onClick={limpiar} className="mt-4 rounded-xl">
                Restablecer Filtros
              </Button>
            </div>
          ) : viewMode === "cards" ? (
            /* VISTA TARJETAS CON ROADMAP VISUAL DE 5 ESTACIONES */
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {filtered.map((r) => {
                const info = getOrderLifecycleInfo(r, estaciones);
                const MacroIcon = info.macroIcon;

                return (
                  <div
                    key={r.pedido_id}
                    className="rounded-3xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-all p-5 sm:p-6 flex flex-col justify-between space-y-4"
                  >
                    {/* Header de la Tarjeta */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {r.numero_caja && (
                            <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-purple-900 text-white">
                              Caja #{r.numero_caja}
                            </span>
                          )}
                          {r.numero_requerimiento && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {r.numero_requerimiento}
                            </span>
                          )}
                        </div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                          {r.paciente_nombre || "Paciente sin registrar"}
                        </h2>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Stethoscope className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>Dr(a). {r.doctor_nombre || "Doctor general"}</span>
                        </p>
                      </div>

                      {/* Macro Estado Pill */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${info.macroCls}`}
                      >
                        <MacroIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{info.macroLabel}</span>
                      </span>
                    </div>

                    {/* ROADMAP VISUAL HORIZONTAL DE 5 ESTACIONES */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <span className="flex items-center gap-1 text-[#3C1C6C]">
                          <Cpu className="w-3.5 h-3.5" /> Pipeline de Producción CAD/CAM
                        </span>
                        <span className="font-mono text-purple-700">{info.progressPercent}% completado</span>
                      </div>

                      {/* Stepper visual interactivo */}
                      <div className="relative pt-1 pb-2">
                        {/* Línea base conectora */}
                        <div className="absolute top-4 left-6 right-6 h-1 bg-slate-200 -z-0" />
                        {/* Línea de progreso verde */}
                        <div
                          className="absolute top-4 left-6 h-1 bg-emerald-500 transition-all duration-500 -z-0"
                          style={{
                            width: `${Math.max(0, Math.min(100, info.progressPercent - 10))}%`,
                          }}
                        />

                        <div className="grid grid-cols-5 relative z-10">
                          {PIPELINE_STATIONS.map((step, idx) => {
                            const state = info.stepStates[idx];
                            const StepIcon = step.icon;

                            let nodeBg = "bg-slate-100 text-slate-400 border-2 border-slate-300";
                            let labelColor = "text-slate-400";
                            let statusText = "En espera";

                            if (state === "completed") {
                              nodeBg = "bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-200 border-emerald-500";
                              labelColor = "text-emerald-700 font-bold";
                              statusText = "Completado ✓";
                            } else if (state === "active") {
                              nodeBg =
                                "bg-[#3C1C6C] text-white ring-4 ring-purple-200 shadow-md border-[#3C1C6C] animate-pulse";
                              labelColor = "text-[#3C1C6C] font-extrabold";
                              statusText = "EN ESTA ESTACIÓN";
                            } else if (state === "waiting") {
                              nodeBg = "bg-amber-100 text-amber-800 ring-2 ring-amber-200 border-amber-300";
                              labelColor = "text-amber-800 font-bold";
                              statusText = "En cola";
                            }

                            return (
                              <div key={step.orden} className="flex flex-col items-center text-center px-1">
                                <div
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs transition-all ${nodeBg}`}
                                  title={`${step.name} - ${statusText}`}
                                >
                                  {state === "completed" ? (
                                    <Check className="w-4 h-4 stroke-[3]" />
                                  ) : (
                                    <StepIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  )}
                                </div>
                                <span className={`text-[10px] sm:text-xs mt-1.5 leading-tight ${labelColor}`}>
                                  {step.short}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 border-t border-slate-200/60">
                        <span className="font-medium text-slate-700">
                          📍 {info.locationText}
                        </span>
                        {r.fecha_inicio && (
                          <span suppressHydrationWarning>
                            Iniciado: {mounted ? fmtLocal(r.fecha_inicio) : "—"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ficha Técnica y Piezas */}
                    <div className="space-y-2 text-xs text-slate-600 bg-white p-3 rounded-2xl border border-slate-100">
                      <p className="font-bold text-slate-900 text-sm">{r.trabajo_realizar || "Trabajo dental estándar"}</p>
                      <div className="flex flex-wrap items-center gap-2 text-slate-600">
                        <span>
                          Pieza: <strong className="text-slate-800">{r.pieza_numero || "—"}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Color: <strong className="text-slate-800">{r.color_pieza || "—"}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Colímetro: <strong className="text-slate-800">{r.colimetro || "—"}</strong>
                        </span>
                      </div>
                      {r.observaciones && (
                        <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-100">
                          &ldquo;{r.observaciones}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Botones de Acción */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openHistorialModal(r)}
                        className="text-xs text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded-xl gap-1.5 h-9"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver Ruta & Bitácora
                      </Button>

                      {info.actionType !== "none" ? (
                        <Button
                          size="sm"
                          onClick={() => handleSmartAction(r)}
                          className={`rounded-xl font-bold text-xs h-9 gap-1.5 shadow-sm transition-all ${
                            info.actionType === "deliver"
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : info.actionType === "finalize"
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-[#3C1C6C] hover:bg-[#2E1553] text-white"
                          }`}
                        >
                          {info.actionType === "deliver" ? (
                            <Truck className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowRight className="w-3.5 h-3.5" />
                          )}
                          {info.actionLabel}
                        </Button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                          {info.actionLabel}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VISTA TABLA TIPO KARDEX DE PRODUCCIÓN */
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-xs text-slate-700">Req / Caja</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700">Paciente & Doctor</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700">Trabajo Dental</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 min-w-[200px]">Pipeline (5 Estaciones)</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700">Estación Actual</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700">Macro Estado</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const info = getOrderLifecycleInfo(r, estaciones);
                    const MacroIcon = info.macroIcon;

                    return (
                      <TableRow key={r.pedido_id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Req y Caja */}
                        <TableCell className="align-middle py-3">
                          <div className="flex flex-col gap-1">
                            {r.numero_caja && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-900 text-white w-fit">
                                Caja #{r.numero_caja}
                              </span>
                            )}
                            <span className="font-mono text-xs font-semibold text-slate-800">
                              {r.numero_requerimiento || "—"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Paciente y Doctor */}
                        <TableCell className="align-middle py-3">
                          <p className="font-bold text-sm text-slate-900">{r.paciente_nombre || "—"}</p>
                          <p className="text-xs text-slate-500">Dr. {r.doctor_nombre || "—"}</p>
                        </TableCell>

                        {/* Trabajo */}
                        <TableCell className="align-middle py-3 text-xs">
                          <p className="font-medium text-slate-800">{r.trabajo_realizar || "—"}</p>
                          <p className="text-[11px] text-slate-500">Pieza: {r.pieza_numero || "—"}</p>
                        </TableCell>

                        {/* Mini Pipeline 5 Puntos */}
                        <TableCell className="align-middle py-3">
                          <div className="flex items-center gap-1.5">
                            {PIPELINE_STATIONS.map((step, idx) => {
                              const state = info.stepStates[idx];
                              let dotCls = "bg-slate-200 text-slate-400";
                              if (state === "completed") dotCls = "bg-emerald-500 text-white";
                              if (state === "active") dotCls = "bg-[#3C1C6C] text-white animate-pulse ring-2 ring-purple-200";
                              if (state === "waiting") dotCls = "bg-amber-400 text-white";

                              return (
                                <div
                                  key={step.orden}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${dotCls}`}
                                  title={`${step.name}`}
                                >
                                  {state === "completed" ? "✓" : step.orden}
                                </div>
                              );
                            })}
                            <span className="text-xs font-mono font-bold text-slate-600 ml-1">
                              {info.progressPercent}%
                            </span>
                          </div>
                        </TableCell>

                        {/* Estación Actual */}
                        <TableCell className="align-middle py-3 text-xs font-medium text-slate-800">
                          {r.estacion_actual || "Sin asignar"}
                        </TableCell>

                        {/* Macro Estado */}
                        <TableCell className="align-middle py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${info.macroCls}`}
                          >
                            <MacroIcon className="w-3.5 h-3.5" />
                            {info.macroLabel}
                          </span>
                        </TableCell>

                        {/* Acciones */}
                        <TableCell className="align-middle py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openHistorialModal(r)}
                              className="h-8 px-2 text-xs text-purple-700 hover:bg-purple-50 rounded-lg"
                              title="Ver Bitácora"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>

                            {info.actionType !== "none" && (
                              <Button
                                size="sm"
                                onClick={() => handleSmartAction(r)}
                                className="h-8 px-2.5 text-xs bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-lg font-bold"
                              >
                                {info.actionType === "deliver" ? "Despachar" : "Avanzar"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL DETALLE DE RUTA TÉCNICA & BITÁCORA */}
      {selectedPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-2xl shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                  Bitácora de Taller Dental
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {selectedPedido.paciente_nombre}
                </h3>
                <p className="text-xs text-slate-500">
                  Doctor: {selectedPedido.doctor_nombre} • Req: {selectedPedido.numero_requerimiento} • Caja #{selectedPedido.numero_caja}
                </p>
              </div>
              <button
                onClick={() => setSelectedPedido(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Timeline vertical de las 5 estaciones */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" /> Historial de Estaciones y Tiempos
              </h4>

              {loadingHistorial ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="animate-spin w-6 h-6 text-[#3C1C6C]" />
                </div>
              ) : historialItems.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-xl">
                  Aún no se han registrado transiciones manuales para este pedido en el historial.
                </p>
              ) : (
                <div className="relative border-l-2 border-purple-200 ml-4 pl-4 space-y-4 py-2">
                  {historialItems.map((h, i) => {
                    const estNombre = h.estaciones?.nombre || "Estación de Taller";
                    const isDone = h.estado === "completado";
                    const isProc = h.estado === "en_proceso";

                    return (
                      <div key={h.id || i} className="relative">
                        <div
                          className={`absolute -left-[25px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                            isDone ? "bg-emerald-500" : isProc ? "bg-[#3C1C6C] animate-pulse" : "bg-amber-400"
                          }`}
                        />
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-slate-900">{estNombre}</span>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                isDone
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isProc
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {h.estado}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-1 pt-1">
                            <span>Inicio: {fmtLocal(h.fecha_inicio)}</span>
                            {h.fecha_fin && <span>Fin: {fmtLocal(h.fecha_fin)}</span>}
                          </div>

                          {h.comentarios && (
                            <p className="text-xs text-slate-700 bg-white p-2 rounded-xl border border-slate-100 mt-1">
                              💬 {h.comentarios}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPedido(null)}
                className="rounded-xl border-slate-200"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
