// src/app/dashboard/doctors/orders/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCcw,
  CheckCircle2,
  Clock,
  LayoutGrid,
  Table2,
  Search,
  Filter,
  MapPin,
  Calendar as CalendarIcon,
  ChevronDown,
  Cpu,
  Flame,
  Sparkles,
  Sun,
  ShieldCheck,
  PackageCheck,
  AlertCircle,
  CheckCheck,
  Inbox,
  Eye,
  Plus,
  Truck,
  Check,
  X,
  CreditCard,
} from "lucide-react";

type Estacion = {
  id: string;
  nombre: string;
  orden: number;
};

type DoctorOrderRow = {
  pedido_id: string;
  paciente_nombre: string | null;
  numero_requerimiento: string | null;
  numero_caja: string | null;
  trabajo_realizar: string | null;
  pieza_numero: string | null;
  color_pieza: string | null;
  colimetro: string | null;
  observaciones: string | null;
  total: number | null;
  anticipo: number | null;
  estado_pedido: string | null;
  estacion_actual: string | null;
  estado_estacion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  fecha_creacion: string | null;
  fecha_entrega: string | null;
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

function getOrderLifecycleInfo(r: DoctorOrderRow, estaciones: Estacion[]) {
  const estPed = (r.estado_pedido ?? "pendiente").toLowerCase();
  const estEst = (r.estado_estacion ?? "pendiente").toLowerCase();
  const curName = (r.estacion_actual ?? "").trim();

  // 1. Entregado
  if (estPed === "entregado") {
    return {
      macroLabel: "Entregado a tu Clínica",
      macroCls: "bg-emerald-100 text-emerald-800 border-emerald-200",
      macroIcon: CheckCheck,
      locationText: "Trabajo recibido en clínica / consultorio",
      isFinished: true,
      currentStationIndex: 5,
      progressPercent: 100,
      stepStates: ["completed", "completed", "completed", "completed", "completed"],
    };
  }

  // 2. Finalizado (listo para entrega)
  if (estPed === "finalizado") {
    return {
      macroLabel: "Fabricación 100% Terminada",
      macroCls: "bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20",
      macroIcon: CheckCircle2,
      locationText: "Listo para Despacho / Delivery a tu consultorio",
      isFinished: true,
      currentStationIndex: 5,
      progressPercent: 100,
      stepStates: ["completed", "completed", "completed", "completed", "completed"],
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
      currentStationIndex: -1,
      progressPercent: 0,
      stepStates: ["pending", "pending", "pending", "pending", "pending"],
    };
  }

  // 4. Sin asignar (en espera de entrar a taller)
  if (curName === "Sin asignar" || !curName) {
    return {
      macroLabel: "En Cola de Ingreso al Taller",
      macroCls: "bg-amber-100 text-amber-800 border-amber-200",
      macroIcon: Inbox,
      locationText: "Recepción (En espera de entrar a Estación 1: CAD 3D)",
      isFinished: false,
      currentStationIndex: -1,
      progressPercent: 5,
      stepStates: ["waiting", "pending", "pending", "pending", "pending"],
    };
  }

  // 5. En alguna estación (1 a 5)
  let stationIndex = PIPELINE_STATIONS.findIndex(
    (p) => p.name.toLowerCase() === curName.toLowerCase() || curName.toLowerCase().includes(p.short.toLowerCase())
  );
  if (stationIndex === -1) {
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

  if (stationIndex === 4 && estEst === "completado") {
    return {
      macroLabel: "Control de Calidad Aprobado",
      macroCls: "bg-emerald-100 text-emerald-800 border-emerald-300",
      macroIcon: ShieldCheck,
      locationText: "Control de Calidad finalizado • Listo para empaque",
      isFinished: true,
      currentStationIndex: 4,
      progressPercent: 98,
      stepStates: ["completed", "completed", "completed", "completed", "completed"],
    };
  }

  const stationName = PIPELINE_STATIONS[stationIndex]?.short || curName;
  const isEnProceso = estEst === "en_proceso";

  let progress = Math.round(((stationIndex + (isEnProceso ? 0.7 : 0.3)) / 5) * 100);
  if (progress > 95) progress = 95;

  return {
    macroLabel: `En Fabricación: ${stationName}`,
    macroCls: isEnProceso
      ? "bg-purple-100 text-[#3C1C6C] border-purple-300 font-bold"
      : "bg-blue-100 text-blue-800 border-blue-200",
    macroIcon: isEnProceso ? Cpu : Clock,
    locationText: `Estación ${stationIndex + 1} de 5: ${curName} (${isEnProceso ? "En proceso activo" : "En cola de espera"})`,
    isFinished: false,
    currentStationIndex: stationIndex,
    progressPercent: progress,
    stepStates,
  };
}

export default function DoctorOrdersPage() {
  const [rows, setRows] = useState<DoctorOrderRow[]>([]);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [q, setQ] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [estacion, setEstacion] = useState<string>("all");
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");

  // Vista Tarjetas/Tabla
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Modal de Historial / Bitácora
  const [selectedPedido, setSelectedPedido] = useState<DoctorOrderRow | null>(null);
  const [historialItems, setHistorialItems] = useState<HistorialItem[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Evita hydration
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function fetchEstaciones() {
    const res = await supabase.from("estaciones").select("id,nombre,orden").order("orden", { ascending: true });
    if (res.data) setEstaciones(res.data as any);
  }

  async function getDoctorKey(profileId: string) {
    const { data: doctor } = await supabase
      .from("doctores")
      .select("id, nombre")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (doctor?.id) {
      return { primary: String(doctor.id), fallback: profileId, doctorNombre: doctor.nombre };
    }
    return { primary: profileId, fallback: null as string | null, doctorNombre: null };
  }

  async function fetchDoctorOrders() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    await fetchEstaciones();
    const { primary, fallback, doctorNombre } = await getDoctorKey(user.id);

    // Consulta completa con todas las columnas técnicas y financieras
    let query = supabase
      .from("pedidos")
      .select(
        "id, paciente_nombre, numero_requerimiento, numero_caja, trabajo_realizar, pieza_numero, color_pieza, colimetro, observaciones, total, anticipo, estado, fecha_creacion, fecha_entrega"
      )
      .order("fecha_creacion", { ascending: false });

    // Filtrar por doctor_id, creado_por, o nombre del doctor para máxima cobertura
    const filters: string[] = [
      `doctor_id.eq.${primary}`,
      `creado_por.eq.${user.id}`,
    ];
    if (fallback && fallback !== primary) {
      filters.push(`doctor_id.eq.${fallback}`);
    }
    if (doctorNombre) {
      filters.push(`doctor_nombre.ilike.%${doctorNombre}%`);
    }

    query = query.or(filters.join(","));

    const pedidosRes = await query;

    if (pedidosRes.error) {
      console.error(pedidosRes.error);
      toast.error(`❌ Error cargando pedidos: ${pedidosRes.error.message}`);
      setRows([]);
      setLoading(false);
      return;
    }

    const pedidos = pedidosRes.data || [];

    if (pedidos.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    // Unir con telemetría en vivo desde vw_tracking_pedidos
    const pedidoIds = pedidos.map((p) => String(p.id));
    const trackingRes = await supabase
      .from("vw_tracking_pedidos")
      .select("pedido_id, estacion_actual, estado_estacion, fecha_inicio, fecha_fin")
      .in("pedido_id", pedidoIds);

    const trackingMap = new Map<string, any>();
    (trackingRes.data ?? []).forEach((t: any) => {
      trackingMap.set(String(t.pedido_id), t);
    });

    const merged: DoctorOrderRow[] = pedidos.map((p: any) => {
      const pid = String(p.id);
      const trk = trackingMap.get(pid);

      return {
        pedido_id: pid,
        paciente_nombre: s(p.paciente_nombre),
        numero_requerimiento: s(p.numero_requerimiento),
        numero_caja: s(p.numero_caja),
        trabajo_realizar: s(p.trabajo_realizar),
        pieza_numero: s(p.pieza_numero),
        color_pieza: s(p.color_pieza),
        colimetro: s(p.colimetro),
        observaciones: s(p.observaciones),
        total: p.total != null ? Number(p.total) : null,
        anticipo: p.anticipo != null ? Number(p.anticipo) : null,
        estado_pedido: s(p.estado),
        estacion_actual: trk ? s(trk.estacion_actual) : "Sin asignar",
        estado_estacion: trk ? s(trk.estado_estacion) : "pendiente",
        fecha_inicio: trk ? s(trk.fecha_inicio) : null,
        fecha_fin: trk ? s(trk.fecha_fin) : null,
        fecha_creacion: s(p.fecha_creacion),
        fecha_entrega: s(p.fecha_entrega),
      };
    });

    setRows(merged);
    setLoading(false);
  }

  useEffect(() => {
    fetchDoctorOrders();

    const channel = supabase
      .channel("doctor-orders-realtime-enhanced")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => {
        fetchDoctorOrders();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "historial_estaciones" }, () => {
        fetchDoctorOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function openHistorialModal(r: DoctorOrderRow) {
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

  const estacionOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const v = (r.estacion_actual ?? "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

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
    setEstacion("all");
    setDesde("");
    setHasta("");
  }

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

  const filtered = useMemo(() => {
    const squery = q.trim().toLowerCase();
    const desdeMs = desde ? new Date(`${desde}T00:00:00`).getTime() : null;
    const hastaMs = hasta ? new Date(`${hasta}T23:59:59`).getTime() : null;

    return rows.filter((r) => {
      const info = getOrderLifecycleInfo(r, estaciones);

      if (estadoFilter !== "all") {
        if (estadoFilter === "en_fabricacion" && (info.isFinished || info.currentStationIndex < 0)) return false;
        if (estadoFilter === "calidad" && (info.isFinished || info.currentStationIndex !== 4)) return false;
        if (estadoFilter === "finalizado" && !info.isFinished) return false;
        if (estadoFilter === "cola" && info.currentStationIndex >= 0) return false;
      }

      if (estacion !== "all" && (r.estacion_actual ?? "") !== estacion) return false;

      if (desdeMs != null || hastaMs != null) {
        const t = r.fecha_creacion ? new Date(r.fecha_creacion).getTime() : NaN;
        if (!Number.isFinite(t)) return false;
        if (desdeMs != null && t < desdeMs) return false;
        if (hastaMs != null && t > hastaMs) return false;
      }

      if (!squery) return true;

      const blob = [
        r.numero_requerimiento,
        r.paciente_nombre,
        r.trabajo_realizar,
        r.pieza_numero,
        r.color_pieza,
        r.colimetro,
        r.numero_caja,
        r.estacion_actual,
        r.estado_pedido,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return blob.includes(squery);
    });
  }, [rows, q, estadoFilter, estacion, desde, hasta, estaciones]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100/80 text-[#3C1C6C] text-xs font-bold uppercase tracking-wider mb-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#6A2CB0]" />
            Panel Clínico de Taller
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#3C1C6C] tracking-tight">
            Mis Pedidos & Telemetría en Vivo
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Sigue en tiempo real la fabricación CAD/CAM y control de calidad de los trabajos de tus pacientes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/doctors/new-order">
            <Button className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold text-xs h-10 gap-2 shadow-sm">
              <Plus className="w-4 h-4" /> Nuevo Pedido
            </Button>
          </Link>

          <Button
            variant="outline"
            onClick={fetchDoctorOrders}
            className="rounded-xl border-slate-200 hover:border-purple-300 font-semibold text-slate-700 shadow-sm h-10"
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </Button>

          {/* Toggle Tarjetas/Tabla */}
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

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-[#3C1C6C] flex items-center justify-center shrink-0 border border-purple-100">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Mis Trabajos</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900">{metrics.total}</p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">En Fabricación (E1-E4)</p>
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

      {/* Filtros */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <Search className="w-3.5 h-3.5 text-[#3C1C6C]" /> Buscar
            </label>
            <Input
              placeholder="Paciente, trabajo, caja, requerimiento..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="rounded-xl border-slate-200 h-9.5 text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <Filter className="w-3.5 h-3.5 text-[#3C1C6C]" /> Estado de Producción
            </label>
            <div className="relative">
              <select
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-xs sm:text-sm font-medium text-slate-800 shadow-xs hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-[#3C1C6C]/20 transition-all cursor-pointer"
              >
                <option value="all">Todos los estados</option>
                <option value="en_fabricacion">⚡ En Fabricación (E1 - E4)</option>
                <option value="calidad">🛡️ En Control de Calidad (E5)</option>
                <option value="finalizado">✅ Listos para Entrega / Entregados</option>
                <option value="cola">📥 En Cola de Asignación</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#3C1C6C]" /> Estación Actual
            </label>
            <div className="relative">
              <select
                value={estacion}
                onChange={(e) => setEstacion(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-xs sm:text-sm font-medium text-slate-800 shadow-xs hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-[#3C1C6C]/20 transition-all cursor-pointer"
              >
                <option value="all">Todas las estaciones</option>
                {estacionOptions.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>

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

      {/* Contenido */}
      <Card className="border border-slate-200/90 shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 px-5 py-4">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-800 flex items-center justify-between">
            <span>Estado de Tus Pedidos Dentales</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-[#3C1C6C]">
              {filtered.length} órdenes registradas
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="animate-spin w-8 h-8 text-[#3C1C6C]" />
              <p className="text-xs text-slate-500 font-medium">Consultando estaciones en tiempo real...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-base font-bold text-slate-700">No tienes pedidos que coincidan con la búsqueda</p>
              <p className="text-xs text-slate-400 mt-1">Crea una nueva orden dental o limpia los filtros.</p>
              <div className="flex justify-center gap-3 mt-4">
                <Link href="/dashboard/doctors/new-order">
                  <Button className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl text-xs font-bold">
                    Crear Nueva Orden
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={limpiar} className="rounded-xl text-xs">
                  Restablecer Filtros
                </Button>
              </div>
            </div>
          ) : viewMode === "cards" ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {filtered.map((r) => {
                const info = getOrderLifecycleInfo(r, estaciones);
                const MacroIcon = info.macroIcon;
                const saldo = (r.total ?? 0) - (r.anticipo ?? 0);
                const hasDelivery = r.observaciones && r.observaciones.includes("DELIVERY:");

                return (
                  <div
                    key={r.pedido_id}
                    className="rounded-3xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-all p-5 sm:p-6 flex flex-col justify-between space-y-4"
                  >
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
                          {hasDelivery && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                              <Truck className="w-3 h-3" /> Delivery
                            </span>
                          )}
                        </div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                          {r.paciente_nombre || "Paciente sin nombre"}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {r.trabajo_realizar || "Trabajo dental estándar"}
                        </p>
                      </div>

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
                          <Cpu className="w-3.5 h-3.5" /> Pipeline de Fabricación CAD/CAM
                        </span>
                        <span className="font-mono text-purple-700">{info.progressPercent}% completado</span>
                      </div>

                      <div className="relative pt-1 pb-2">
                        <div className="absolute top-4 left-6 right-6 h-1 bg-slate-200 -z-0" />
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

                            if (state === "completed") {
                              nodeBg = "bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-200 border-emerald-500";
                              labelColor = "text-emerald-700 font-bold";
                            } else if (state === "active") {
                              nodeBg =
                                "bg-[#3C1C6C] text-white ring-4 ring-purple-200 shadow-md border-[#3C1C6C] animate-pulse";
                              labelColor = "text-[#3C1C6C] font-extrabold";
                            } else if (state === "waiting") {
                              nodeBg = "bg-amber-100 text-amber-800 ring-2 ring-amber-200 border-amber-300";
                              labelColor = "text-amber-800 font-bold";
                            }

                            return (
                              <div key={step.orden} className="flex flex-col items-center text-center px-1">
                                <div
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs transition-all ${nodeBg}`}
                                  title={step.name}
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

                      <div className="text-[11px] pt-1 text-slate-600 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="font-medium text-slate-800">
                          📍 {info.locationText}
                        </span>
                        {r.fecha_creacion && (
                          <span suppressHydrationWarning className="text-slate-400">
                            Ingreso: {mounted ? fmtLocal(r.fecha_creacion) : "—"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ficha de Detalles y Saldo */}
                    <div className="space-y-2 text-xs bg-white p-3 rounded-2xl border border-slate-100">
                      <div className="flex flex-wrap items-center gap-2 text-slate-600">
                        <span>Pieza: <strong className="text-slate-800">{r.pieza_numero || "—"}</strong></span>
                        <span>•</span>
                        <span>Color: <strong className="text-slate-800">{r.color_pieza || "—"}</strong></span>
                        <span>•</span>
                        <span>Colímetro: <strong className="text-slate-800">{r.colimetro || "—"}</strong></span>
                      </div>

                      {/* Pagos / Saldo */}
                      {r.total != null && (
                        <div className="flex items-center gap-3 pt-1 border-t border-slate-100 text-[11px]">
                          <span className="text-slate-500">Total: <strong>Bs {r.total.toFixed(2)}</strong></span>
                          {r.anticipo != null && r.anticipo > 0 && (
                            <span className="text-slate-500">Anticipo: <strong>Bs {r.anticipo.toFixed(2)}</strong></span>
                          )}
                          <span className={`font-bold ${saldo <= 0 ? "text-emerald-700" : "text-purple-800"}`}>
                            Saldo: Bs {saldo.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {r.observaciones && (
                        <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-100">
                          &ldquo;{r.observaciones}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="pt-1 flex items-center justify-between border-t border-slate-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openHistorialModal(r)}
                        className="text-xs text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded-xl gap-1.5 h-9"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver Bitácora & Tiempos de Taller
                      </Button>

                      {r.fecha_entrega && (
                        <span className="text-xs text-slate-500" suppressHydrationWarning>
                          Entrega prevista: {mounted ? fmtLocal(r.fecha_entrega) : "—"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VISTA TABLA */
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-xs text-slate-700">Req / Caja</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700">Paciente</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700">Trabajo & Pieza</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 min-w-[180px]">Pipeline Técnico</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700">Estación Actual</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700">Estado</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700">Total / Saldo</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 text-right">Bitácora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const info = getOrderLifecycleInfo(r, estaciones);
                    const MacroIcon = info.macroIcon;
                    const saldo = (r.total ?? 0) - (r.anticipo ?? 0);

                    return (
                      <TableRow key={r.pedido_id} className="hover:bg-slate-50/80 transition-colors">
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

                        <TableCell className="align-middle py-3 font-bold text-sm text-slate-900">
                          {r.paciente_nombre || "—"}
                        </TableCell>

                        <TableCell className="align-middle py-3 text-xs">
                          <p className="font-medium text-slate-800">{r.trabajo_realizar || "—"}</p>
                          <p className="text-[11px] text-slate-500">Pieza: {r.pieza_numero || "—"}</p>
                        </TableCell>

                        <TableCell className="align-middle py-3">
                          <div className="flex items-center gap-1">
                            {PIPELINE_STATIONS.map((step, idx) => {
                              const state = info.stepStates[idx];
                              let dotCls = "bg-slate-200 text-slate-400";
                              if (state === "completed") dotCls = "bg-emerald-500 text-white";
                              if (state === "active") dotCls = "bg-[#3C1C6C] text-white animate-pulse ring-2 ring-purple-200";
                              if (state === "waiting") dotCls = "bg-amber-400 text-white";

                              return (
                                <div
                                  key={step.orden}
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${dotCls}`}
                                  title={step.name}
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

                        <TableCell className="align-middle py-3 text-xs font-medium text-slate-800">
                          {r.estacion_actual || "Sin asignar"}
                        </TableCell>

                        <TableCell className="align-middle py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${info.macroCls}`}
                          >
                            <MacroIcon className="w-3.5 h-3.5" />
                            {info.macroLabel}
                          </span>
                        </TableCell>

                        <TableCell className="align-middle py-3 text-xs">
                          {r.total != null ? (
                            <div>
                              <p className="font-semibold text-slate-900">Bs {r.total.toFixed(2)}</p>
                              <p className={`text-[10px] font-bold ${saldo <= 0 ? "text-emerald-700" : "text-purple-700"}`}>
                                Saldo: Bs {saldo.toFixed(2)}
                              </p>
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>

                        <TableCell className="align-middle py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openHistorialModal(r)}
                            className="h-8 px-2 text-xs text-purple-700 hover:bg-purple-50 rounded-lg"
                            title="Ver Bitácora de Taller"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
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

      {/* Modal Bitácora para el Doctor */}
      {selectedPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-xl shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                  Bitácora de Fabricación Dental
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {selectedPedido.paciente_nombre}
                </h3>
                <p className="text-xs text-slate-500">
                  Req: {selectedPedido.numero_requerimiento} • Caja #{selectedPedido.numero_caja} • {selectedPedido.trabajo_realizar}
                </p>
              </div>
              <button
                onClick={() => setSelectedPedido(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" /> Registro de Estaciones Técnicas
              </h4>

              {loadingHistorial ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="animate-spin w-6 h-6 text-[#3C1C6C]" />
                </div>
              ) : historialItems.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-xl">
                  Aún no se han registrado transiciones manuales en la bitácora de este trabajo.
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
