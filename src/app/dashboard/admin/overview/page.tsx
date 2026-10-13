// src/app/dashboard/admin/overview/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  RefreshCcw,
  LayoutGrid,
  Table2,
  Search,
  Filter,
  Calendar as CalendarIcon,
  X,
  TrendingUp,
  AlertTriangle,
  BadgeDollarSign,
  ClipboardList,
  Users,
  Wrench,
  Timer,
  FileDown,
  Activity,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type ViewMode = "cards" | "table";
type RangePreset = "hoy" | "semana" | "mes" | "anio" | "ult7" | "ult30" | "ult90" | "custom" | "all";

type ResumenRow = {
  pedidos_pendientes: number;
  pedidos_en_proceso: number;
  pedidos_finalizados: number;
  pedidos_entregados: number;
  tiempo_promedio_horas: number | null;
  ingresos_totales: number | null;
  fecha: any; // puede venir string o Date dependiendo de la vista
};

type PedidoLite = {
  id: string;
  numero_requerimiento: string | null;
  paciente_nombre: string | null;
  doctor_nombre: string | null;
  estado: string | null;
  fecha_creacion: string | null;
  fecha_ingreso: string | null;
  fecha_entrega: string | null;
  total: number | null;
  anticipo: number | null;
  creado_por: string | null;
};

type StationBottleneck = {
  estacion: string;
  pedidos_en_cola: number;
  tiempo_promedio_horas: number;
};

type DoctorRank = {
  doctor: string;
  pedidos: number;
  ingresos: number;
  anticipo: number;
  saldo_pendiente: number;
};

type AgingBucket = {
  bucket: string;
  saldo: number;
};

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fmtMoney(n: number) {
  return `$${n.toFixed(2)}`;
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
function parseTime(ts?: string | null) {
  if (!ts) return NaN;
  const t = new Date(ts).getTime();
  return Number.isFinite(t) ? t : NaN;
}
function pickPedidoDate(p: PedidoLite) {
  return p.fecha_creacion || p.fecha_ingreso || null;
}
function withinRange(ts: string | null, desde: string, hasta: string) {
  if (!desde && !hasta) return true;
  const t = ts ? new Date(ts).getTime() : NaN;
  if (!Number.isFinite(t)) return false;

  const d0 = desde ? new Date(`${desde}T00:00:00`).getTime() : null;
  const d1 = hasta ? new Date(`${hasta}T23:59:59`).getTime() : null;

  if (d0 != null && t < d0) return false;
  if (d1 != null && t > d1) return false;
  return true;
}
function clampRangeFromPreset(preset: RangePreset) {
  const now = new Date();
  const today = toYMD(now);

  if (preset === "hoy") return { desde: today, hasta: today };
  if (preset === "semana") return { desde: toYMD(startOfWeekMonday(now)), hasta: toYMD(endOfWeekSunday(now)) };
  if (preset === "mes") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { desde: toYMD(start), hasta: toYMD(end) };
  }
  if (preset === "anio") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return { desde: toYMD(start), hasta: toYMD(end) };
  }
  if (preset === "ult7") {
    const end = startOfDay(now);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return { desde: toYMD(start), hasta: toYMD(end) };
  }
  if (preset === "ult30") {
    const end = startOfDay(now);
    const start = new Date(end);
    start.setDate(end.getDate() - 29);
    return { desde: toYMD(start), hasta: toYMD(end) };
  }
  if (preset === "ult90") {
    const end = startOfDay(now);
    const start = new Date(end);
    start.setDate(end.getDate() - 89);
    return { desde: toYMD(start), hasta: toYMD(end) };
  }
  return { desde: "", hasta: "" };
}

/**
 * ✅ FIX FECHAS: evita "Invalid Date" en gráficas
 * - soporta Date, "YYYY-MM-DD", ISO, etc.
 */
function coerceDate(fecha: any): Date | null {
  if (!fecha) return null;
  if (fecha instanceof Date) {
    return Number.isFinite(fecha.getTime()) ? fecha : null;
  }
  const s = String(fecha).trim();
  if (!s) return null;

  // si viene YYYY-MM-DD, lo convertimos a ISO del día
  const d = new Date(s.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00` : s);
  if (!Number.isFinite(d.getTime())) return null;
  return d;
}
function labelFromFecha(fecha: any) {
  const d = coerceDate(fecha);
  return d ? d.toLocaleDateString() : String(fecha ?? "—");
}
function ymdFromFecha(fecha: any) {
  const d = coerceDate(fecha);
  return d ? toYMD(d) : "";
}

/**
 * ✅ MAPPING: robusto para estados
 */
function mapEstado(raw?: string | null) {
  const e = String(raw || "").trim().toLowerCase();

  if (e === "pendiente_revision" || e === "pendiente revisión") return "pendiente";
  if (e === "pendiente" || e === "por_hacer" || e === "por hacer") return "pendiente";
  if (e === "en_proceso" || e === "en proceso" || e === "proceso") return "en_proceso";
  if (e === "finalizado" || e === "finalizados" || e === "terminado" || e === "terminados") return "finalizado";
  if (e === "entregado" || e === "entregados" || e === "entrega") return "entregado";

  return e || "pendiente";
}

function statusLabel(key: string) {
  if (key === "pendiente") return "Pendientes";
  if (key === "en_proceso") return "En proceso";
  if (key === "finalizado") return "Finalizados";
  if (key === "entregado") return "Entregados";
  return key;
}
function statusColor(key: string) {
  if (key === "pendiente") return "border-yellow-500 text-yellow-700";
  if (key === "en_proceso") return "border-blue-500 text-blue-700";
  if (key === "finalizado") return "border-green-500 text-green-700";
  if (key === "entregado") return "border-purple-500 text-purple-700";
  return "border-slate-300 text-slate-700";
}
function chipCls(key: string) {
  if (key === "pendiente") return "bg-yellow-100 text-yellow-800";
  if (key === "en_proceso") return "bg-blue-100 text-blue-800";
  if (key === "finalizado") return "bg-green-100 text-green-800";
  if (key === "entregado") return "bg-purple-100 text-purple-800";
  return "bg-slate-100 text-slate-700";
}
function downloadCSV(filename: string, rows: Record<string, any>[]) {
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: any) => {
    const s = v == null ? "" : String(v);
    if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-xl border overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b shrink-0">
            <div className="font-semibold text-slate-900 truncate pr-2">{title}</div>
            <Button variant="outline" size="sm" onClick={onClose} className="gap-2 shrink-0">
              <X className="w-4 h-4" /> Cerrar
            </Button>
          </div>
          <div className="p-4 sm:p-5 overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

function buildResumenFallbackFromPedidos(pedidos: PedidoLite[]): ResumenRow[] {
  const map = new Map<
    string,
    {
      pendientes: number;
      proceso: number;
      finalizados: number;
      entregados: number;
      ingresos: number;
      sumHoras: number;
      cntHoras: number;
    }
  >();

  for (const p of pedidos) {
    const base = pickPedidoDate(p);
    if (!base) continue;
    const d = new Date(base);
    if (Number.isNaN(d.getTime())) continue;
    const key = toYMD(d);

    if (!map.has(key)) {
      map.set(key, {
        pendientes: 0,
        proceso: 0,
        finalizados: 0,
        entregados: 0,
        ingresos: 0,
        sumHoras: 0,
        cntHoras: 0,
      });
    }

    const row = map.get(key)!;
    const est = mapEstado(p.estado);

    if (est === "pendiente") row.pendientes++;
    else if (est === "en_proceso") row.proceso++;
    else if (est === "finalizado") row.finalizados++;
    else if (est === "entregado") row.entregados++;

    row.ingresos += safeNum(p.total);

    const fc = parseTime(p.fecha_creacion || p.fecha_ingreso || null);
    const fe = parseTime(p.fecha_entrega);
    if (Number.isFinite(fc) && Number.isFinite(fe) && fe >= fc) {
      row.sumHoras += (fe - fc) / 36e5;
      row.cntHoras++;
    }
  }

  const rows: ResumenRow[] = Array.from(map.entries()).map(([fecha, a]) => ({
    fecha,
    pedidos_pendientes: a.pendientes,
    pedidos_en_proceso: a.proceso,
    pedidos_finalizados: a.finalizados,
    pedidos_entregados: a.entregados,
    ingresos_totales: Math.round(a.ingresos * 100) / 100,
    tiempo_promedio_horas: a.cntHoras ? Math.round((a.sumHoras / a.cntHoras) * 10) / 10 : null,
  }));

  rows.sort((x, y) => (String(y.fecha) > String(x.fecha) ? 1 : String(y.fecha) < String(x.fecha) ? -1 : 0));
  return rows;
}

export default function AdminOverviewPage() {
  const [loading, setLoading] = useState(true);

  const [resumenVW, setResumenVW] = useState<ResumenRow[]>([]);
  const [pedidosAll, setPedidosAll] = useState<PedidoLite[]>([]);
  const [vwOk, setVwOk] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [preset, setPreset] = useState<RangePreset>("ult30");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [q, setQ] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");

  const [stationBottlenecks, setStationBottlenecks] = useState<StationBottleneck[]>([]);
  const [techHours, setTechHours] = useState<any[]>([]);
  const [doctorRank, setDoctorRank] = useState<DoctorRank[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Detalle");
  const [modalItems, setModalItems] = useState<PedidoLite[]>([]);
  const [modalSearch, setModalSearch] = useState("");

  useEffect(() => {
    if (preset === "custom") return;
    const r = clampRangeFromPreset(preset);
    setDesde(r.desde);
    setHasta(r.hasta);
  }, [preset]);

  async function fetchResumenVW(pedidosForFallback?: PedidoLite[]) {
    try {
      const { data, error } = await supabase
        .from("vw_dashboard_resumen")
        .select("*")
        .order("fecha", { ascending: false });

      if (error) {
        console.warn("vw_dashboard_resumen error:", error);
        setVwOk(false);
        const fb = buildResumenFallbackFromPedidos(pedidosForFallback || pedidosAll);
        setResumenVW(fb);
        return;
      }

      setVwOk(true);
      setResumenVW((data || []) as any);
    } catch (e: any) {
      console.warn("vw_dashboard_resumen exception:", e);
      setVwOk(false);
      const fb = buildResumenFallbackFromPedidos(pedidosForFallback || pedidosAll);
      setResumenVW(fb);
    }
  }

  async function fetchPedidosAll() {
    const { data, error } = await supabase
      .from("pedidos")
      .select(
        "id,numero_requerimiento,paciente_nombre,doctor_nombre,estado,fecha_creacion,fecha_ingreso,fecha_entrega,total,anticipo,creado_por"
      )
      .order("fecha_creacion", { ascending: false })
      .limit(5000);

    if (error) {
      console.error(error);
      toast.error("❌ No se pudieron cargar pedidos para métricas.");
      setPedidosAll([]);
      return [];
    }

    const mapped = ((data || []) as any[]).map((p) => ({
      id: String(p.id),
      numero_requerimiento: p.numero_requerimiento == null ? null : String(p.numero_requerimiento),
      paciente_nombre: p.paciente_nombre == null ? null : String(p.paciente_nombre),
      doctor_nombre: p.doctor_nombre == null ? null : String(p.doctor_nombre),
      estado: p.estado == null ? null : String(p.estado),
      fecha_creacion: p.fecha_creacion == null ? null : String(p.fecha_creacion),
      fecha_ingreso: p.fecha_ingreso == null ? null : String(p.fecha_ingreso),
      fecha_entrega: p.fecha_entrega == null ? null : String(p.fecha_entrega),
      total: p.total == null ? null : Number(p.total),
      anticipo: p.anticipo == null ? null : Number(p.anticipo),
      creado_por: p.creado_por == null ? null : String(p.creado_por),
    })) as PedidoLite[];

    setPedidosAll(mapped);
    return mapped;
  }

  async function fetchStationAndTechAnalytics(desdeLocal: string, hastaLocal: string) {
    try {
      const { data, error } = await supabase
        .from("historial_estaciones")
        .select("estado,fecha_inicio,fecha_fin,tecnico_id,estacion_id,estaciones(nombre)")
        .order("fecha_inicio", { ascending: false })
        .limit(8000);

      if (error) {
        console.warn("historial_estaciones analytics error:", error);
        setStationBottlenecks([]);
        setTechHours([]);
        return;
      }

      const rows = (data || []) as any[];
      const filtered = rows.filter((r) =>
        withinRange(r?.fecha_inicio ? String(r.fecha_inicio) : null, desdeLocal, hastaLocal)
      );

      const stationAgg = new Map<string, { open: number; sumH: number; cnt: number }>();
      for (const r of filtered) {
        const stationName = String(r?.estaciones?.nombre || "—");
        if (!stationAgg.has(stationName)) stationAgg.set(stationName, { open: 0, sumH: 0, cnt: 0 });
        const a = stationAgg.get(stationName)!;

        const fi = parseTime(r?.fecha_inicio ? String(r.fecha_inicio) : null);
        const ff = parseTime(r?.fecha_fin ? String(r.fecha_fin) : null);

        if (!Number.isFinite(ff)) a.open += 1;
        else if (Number.isFinite(fi) && ff >= fi) {
          a.sumH += (ff - fi) / 36e5;
          a.cnt += 1;
        }
      }

      setStationBottlenecks(
        Array.from(stationAgg.entries())
          .map(([estacion, a]) => ({
            estacion,
            pedidos_en_cola: a.open,
            tiempo_promedio_horas: a.cnt ? Math.round((a.sumH / a.cnt) * 10) / 10 : 0,
          }))
          .sort((a, b) => (b.pedidos_en_cola - a.pedidos_en_cola) || (b.tiempo_promedio_horas - a.tiempo_promedio_horas))
          .slice(0, 12)
      );

      const techAgg = new Map<string, { sumH: number; completadas: number }>();
      for (const r of filtered) {
        const techId = r?.tecnico_id ? String(r.tecnico_id) : null;
        if (!techId) continue;

        if (!techAgg.has(techId)) techAgg.set(techId, { sumH: 0, completadas: 0 });
        const a = techAgg.get(techId)!;

        const fi = parseTime(r?.fecha_inicio ? String(r.fecha_inicio) : null);
        const ff = parseTime(r?.fecha_fin ? String(r.fecha_fin) : null);

        if (Number.isFinite(fi) && Number.isFinite(ff) && ff >= fi) a.sumH += (ff - fi) / 36e5;

        const est = String(r?.estado || "").toLowerCase();
        if (est === "completado" || est === "finalizado") a.completadas += 1;
      }

      const techIds = Array.from(techAgg.keys()).slice(0, 50);
      let nameMap = new Map<string, string>();
      if (techIds.length) {
        const { data: profs, error: pErr } = await supabase
          .from("profiles")
          .select("id,nombre")
          .in("id", techIds);

        if (!pErr && profs) (profs as any[]).forEach((p) => nameMap.set(String(p.id), String(p.nombre || "Técnico")));
      }

      setTechHours(
        Array.from(techAgg.entries())
          .map(([id, a]) => ({
            tecnico_id: id,
            tecnico_nombre: nameMap.get(id) || "Técnico",
            horas: Math.round(a.sumH * 10) / 10,
            completadas: a.completadas,
          }))
          .sort((a, b) => b.horas - a.horas)
          .slice(0, 12)
      );
    } catch (e: any) {
      console.warn("analytics exception:", e);
      setStationBottlenecks([]);
      setTechHours([]);
    }
  }

  async function refreshAll() {
    setLoading(true);
    const pedidos = await fetchPedidosAll();
    await fetchResumenVW(pedidos);
    await fetchStationAndTechAnalytics(desde, hasta);
    setLoading(false);
  }

  useEffect(() => {
    refreshAll();

    const interval = setInterval(async () => {
      await fetchResumenVW(pedidosAll);
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchStationAndTechAnalytics(desde, hasta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta]);

  function openDrilldown(title: string, items: PedidoLite[]) {
    setModalTitle(title);
    setModalItems(items);
    setModalSearch("");
    setModalOpen(true);
  }

  const estadosCrudos = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of pedidosAll) {
      const key = (p.estado ?? "NULL").trim() || "VACIO";
      m.set(key, (m.get(key) || 0) + 1);
    }
    return Array.from(m.entries())
      .map(([estado, count]) => ({ estado, count }))
      .sort((a, b) => b.count - a.count);
  }, [pedidosAll]);

  const globalMetrics = useMemo(() => {
    let pendientes = 0, en_proceso = 0, finalizados = 0, entregados = 0;
    let ingresos = 0, anticipo = 0, saldoPendiente = 0;
    let sumHoras = 0, cntHoras = 0;

    const now = Date.now();
    let atrasados = 0;

    for (const p of pedidosAll) {
      const est = mapEstado(p.estado);
      if (est === "pendiente") pendientes++;
      else if (est === "en_proceso") en_proceso++;
      else if (est === "finalizado") finalizados++;
      else if (est === "entregado") entregados++;

      const t = safeNum(p.total);
      const a = safeNum(p.anticipo);
      ingresos += t;
      anticipo += a;
      saldoPendiente += Math.max(0, t - a);

      const fc = parseTime(p.fecha_creacion || p.fecha_ingreso || null);
      const fe = parseTime(p.fecha_entrega);
      if (Number.isFinite(fc) && Number.isFinite(fe) && fe >= fc) {
        sumHoras += (fe - fc) / 36e5;
        cntHoras++;
      }

      const promised = parseTime(p.fecha_entrega);
      if (Number.isFinite(promised) && promised < now && est !== "entregado") atrasados++;
    }

    const tiempoProm = cntHoras ? Math.round((sumHoras / cntHoras) * 10) / 10 : null;

    return {
      count: pedidosAll.length,
      pendientes,
      en_proceso,
      finalizados,
      entregados,
      ingresos,
      anticipo,
      saldoPendiente,
      tiempoProm,
      atrasados,
    };
  }, [pedidosAll]);

  const pedidosFiltered = useMemo(() => {
    const sQ = q.trim().toLowerCase();
    return pedidosAll.filter((p) => {
      const baseDate = pickPedidoDate(p);
      if (!withinRange(baseDate, desde, hasta)) return false;

      const est = mapEstado(p.estado);
      if (estadoFilter !== "all" && est !== estadoFilter) return false;

      if (!sQ) return true;
      const blob = [p.numero_requerimiento, p.paciente_nombre, p.doctor_nombre, p.estado].filter(Boolean).join(" ").toLowerCase();
      return blob.includes(sQ);
    });
  }, [pedidosAll, q, estadoFilter, desde, hasta]);

  const filteredMetrics = useMemo(() => {
    let pendientes = 0, en_proceso = 0, finalizados = 0, entregados = 0;
    let ingresos = 0, anticipo = 0, saldoPendiente = 0;
    let sumHoras = 0, cntHoras = 0;

    for (const p of pedidosFiltered) {
      const est = mapEstado(p.estado);
      if (est === "pendiente") pendientes++;
      else if (est === "en_proceso") en_proceso++;
      else if (est === "finalizado") finalizados++;
      else if (est === "entregado") entregados++;

      const t = safeNum(p.total);
      const a = safeNum(p.anticipo);
      ingresos += t;
      anticipo += a;
      saldoPendiente += Math.max(0, t - a);

      const fc = parseTime(p.fecha_creacion || p.fecha_ingreso || null);
      const fe = parseTime(p.fecha_entrega);
      if (Number.isFinite(fc) && Number.isFinite(fe) && fe >= fc) {
        sumHoras += (fe - fc) / 36e5;
        cntHoras++;
      }
    }

    const tiempoProm = cntHoras ? Math.round((sumHoras / cntHoras) * 10) / 10 : null;

    return {
      count: pedidosFiltered.length,
      pendientes,
      en_proceso,
      finalizados,
      entregados,
      ingresos,
      anticipo,
      saldoPendiente,
      tiempoProm,
    };
  }, [pedidosFiltered]);

  const aging = useMemo(() => {
    const buckets: AgingBucket[] = [
      { bucket: "0–7 días", saldo: 0 },
      { bucket: "8–15 días", saldo: 0 },
      { bucket: "16–30 días", saldo: 0 },
      { bucket: "31+ días", saldo: 0 },
    ];

    const now = Date.now();
    for (const p of pedidosFiltered) {
      const est = mapEstado(p.estado);
      if (est === "entregado") continue;

      const t = safeNum(p.total);
      const a = safeNum(p.anticipo);
      const saldo = Math.max(0, t - a);
      if (saldo <= 0) continue;

      const base = parseTime(p.fecha_creacion || p.fecha_ingreso || null);
      if (!Number.isFinite(base)) continue;

      const days = Math.floor((now - base) / 86400000);
      if (days <= 7) buckets[0].saldo += saldo;
      else if (days <= 15) buckets[1].saldo += saldo;
      else if (days <= 30) buckets[2].saldo += saldo;
      else buckets[3].saldo += saldo;
    }

    return buckets.map((b) => ({ ...b, saldo: Math.round(b.saldo * 100) / 100 }));
  }, [pedidosFiltered]);

  useEffect(() => {
    const agg = new Map<string, { pedidos: number; ingresos: number; anticipo: number; saldo: number }>();
    for (const p of pedidosFiltered) {
      const d = (p.doctor_nombre || "—").trim() || "—";
      if (!agg.has(d)) agg.set(d, { pedidos: 0, ingresos: 0, anticipo: 0, saldo: 0 });
      const a = agg.get(d)!;
      a.pedidos += 1;
      const t = safeNum(p.total);
      const an = safeNum(p.anticipo);
      a.ingresos += t;
      a.anticipo += an;
      a.saldo += Math.max(0, t - an);
    }
    setDoctorRank(
      Array.from(agg.entries())
        .map(([doctor, a]) => ({
          doctor,
          pedidos: a.pedidos,
          ingresos: Math.round(a.ingresos * 100) / 100,
          anticipo: Math.round(a.anticipo * 100) / 100,
          saldo_pendiente: Math.round(a.saldo * 100) / 100,
        }))
        .sort((a, b) => b.pedidos - a.pedidos)
        .slice(0, 12)
    );
  }, [pedidosFiltered]);

  // ✅ FIX: filtro de resumen usa YMD robusto (evita invalid en charts)
  const resumenVWFiltered = useMemo(() => {
    if (!resumenVW.length) return [];
    return resumenVW
      .filter((r) => {
        const ymd = ymdFromFecha(r.fecha);
        if (!ymd) return false;
        return withinRange(`${ymd}T00:00:00`, desde, hasta);
      })
      .slice()
      .reverse();
  }, [resumenVW, desde, hasta]);

  const pieGlobal = useMemo(() => ([
    { name: "Pendientes", value: globalMetrics.pendientes, key: "pendiente" },
    { name: "En proceso", value: globalMetrics.en_proceso, key: "en_proceso" },
    { name: "Finalizados", value: globalMetrics.finalizados, key: "finalizado" },
    { name: "Entregados", value: globalMetrics.entregados, key: "entregado" },
  ]), [globalMetrics]);

  const pieFiltered = useMemo(() => ([
    { name: "Pendientes", value: filteredMetrics.pendientes, key: "pendiente" },
    { name: "En proceso", value: filteredMetrics.en_proceso, key: "en_proceso" },
    { name: "Finalizados", value: filteredMetrics.finalizados, key: "finalizado" },
    { name: "Entregados", value: filteredMetrics.entregados, key: "entregado" },
  ]), [filteredMetrics]);

  const PIE_COLORS = ["#facc15", "#3b82f6", "#22c55e", "#a855f7"];

  const modalFiltered = useMemo(() => {
    const sQ = modalSearch.trim().toLowerCase();
    if (!sQ) return modalItems;
    return modalItems.filter((p) => {
      const blob = [p.numero_requerimiento, p.paciente_nombre, p.doctor_nombre, p.estado].filter(Boolean).join(" ").toLowerCase();
      return blob.includes(sQ);
    });
  }, [modalItems, modalSearch]);

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#3C1C6C] flex items-center gap-2">
            📊 Métricas & Control (Admin)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Estado global + métricas por filtros + finanzas + ranking + técnicos + estaciones + drill-down.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refreshAll} className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" /> Actualizar
          </Button>
        </div>
      </div>

      {!vwOk && (
        <div className="border border-amber-200 bg-amber-50 text-amber-900 rounded-2xl p-4 text-sm">
          ⚠️ <b>vw_dashboard_resumen</b> no está respondiendo (Failed to fetch). Se activó <b>fallback</b> desde <b>pedidos</b>.
        </div>
      )}

      {loading ? (
        <div className="bg-white border rounded-2xl shadow-sm p-10 text-center text-gray-600">
          Cargando métricas...
        </div>
      ) : (
        <>
          {/* 1) GLOBAL */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#3C1C6C]" />
                Estado actual GLOBAL (sin filtros)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(["pendiente", "en_proceso", "finalizado", "entregado"] as const).map((k) => {
                  const val =
                    k === "pendiente" ? globalMetrics.pendientes :
                    k === "en_proceso" ? globalMetrics.en_proceso :
                    k === "finalizado" ? globalMetrics.finalizados :
                    globalMetrics.entregados;

                  return (
                    <Card
                      key={k}
                      className={`border-l-4 ${statusColor(k)} cursor-pointer hover:shadow-md transition`}
                      onClick={() => {
                        const items = pedidosAll.filter((p) => mapEstado(p.estado) === k);
                        openDrilldown(`${statusLabel(k)} (GLOBAL) • ${items.length}`, items);
                      }}
                    >
                      <CardHeader className="py-4">
                        <CardTitle className="text-sm font-semibold">{statusLabel(k)}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 pb-4">
                        <p className="text-3xl font-bold">{val}</p>
                        <p className="text-xs text-gray-500 mt-1">Click para ver listado global</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                <Card className="border">
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Timer className="w-4 h-4 text-slate-700" /> Tiempo promedio (GLOBAL)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {globalMetrics.tiempoProm != null ? `${globalMetrics.tiempoProm} h` : "—"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Promedio desde creación/ingreso hasta entrega
                    </p>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BadgeDollarSign className="w-4 h-4 text-slate-700" /> Finanzas (GLOBAL)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Ingresos</span>
                      <span className="font-semibold">{fmtMoney(globalMetrics.ingresos)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Anticipo</span>
                      <span className="font-semibold">{fmtMoney(globalMetrics.anticipo)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Saldo pendiente</span>
                      <span className="font-semibold text-red-600">{fmtMoney(globalMetrics.saldoPendiente)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="border cursor-pointer hover:shadow-md transition"
                  onClick={() => {
                    const now = Date.now();
                    const items = pedidosAll.filter((p) => {
                      const promised = parseTime(p.fecha_entrega);
                      const est = mapEstado(p.estado);
                      return Number.isFinite(promised) && promised < now && est !== "entregado";
                    });
                    openDrilldown(`⚠️ Atrasados (GLOBAL) • ${items.length}`, items);
                  }}
                >
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> Alertas (GLOBAL)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Atrasados</span>
                      <span className="font-semibold text-amber-700">{globalMetrics.atrasados}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Click para ver detalle</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-4 border">
                <CardHeader className="py-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-slate-700" /> Diagnóstico: estados reales en DB (conteo)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <div className="flex flex-wrap gap-2">
                    {estadosCrudos.slice(0, 18).map((s) => (
                      <span key={s.estado} className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700">
                        <span className="font-semibold">{s.estado}</span>
                        <span className="text-slate-500">({s.count})</span>
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          {/* 2) FILTROS */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-green-700" />
                Filtros (para métricas detalladas)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 flex-1">
                  <div>
                    <label className="text-sm text-gray-700 flex items-center gap-2 mb-2">
                      <Search className="w-4 h-4" /> Buscar
                    </label>
                    <Input
                      placeholder="Req, paciente, doctor, estado..."
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-700 flex items-center gap-2 mb-2">
                      <Filter className="w-4 h-4" /> Estado
                    </label>
                    <select
                      value={estadoFilter}
                      onChange={(e) => setEstadoFilter(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 bg-white text-sm"
                    >
                      <option value="all">Todos</option>
                      <option value="pendiente">Pendiente</option>
                      <option value="en_proceso">En proceso</option>
                      <option value="finalizado">Finalizado</option>
                      <option value="entregado">Entregado</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-700 flex items-center gap-2 mb-2">
                      <CalendarIcon className="w-4 h-4" /> Desde
                    </label>
                    <Input
                      type="date"
                      value={desde}
                      onChange={(e) => {
                        setPreset("custom");
                        setDesde(e.target.value);
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-700 flex items-center gap-2 mb-2">
                      <CalendarIcon className="w-4 h-4" /> Hasta
                    </label>
                    <Input
                      type="date"
                      value={hasta}
                      onChange={(e) => {
                        setPreset("custom");
                        setHasta(e.target.value);
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant={preset === "hoy" ? "default" : "outline"} onClick={() => setPreset("hoy")}>Hoy</Button>
                  <Button variant={preset === "semana" ? "default" : "outline"} onClick={() => setPreset("semana")}>Semana</Button>
                  <Button variant={preset === "mes" ? "default" : "outline"} onClick={() => setPreset("mes")}>Mes</Button>
                  <Button variant={preset === "anio" ? "default" : "outline"} onClick={() => setPreset("anio")}>Año</Button>
                  <div className="w-px h-9 bg-gray-200 mx-1 hidden sm:block" />
                  <Button variant={preset === "ult7" ? "default" : "outline"} onClick={() => setPreset("ult7")}>Últ 7d</Button>
                  <Button variant={preset === "ult30" ? "default" : "outline"} onClick={() => setPreset("ult30")}>Últ 30d</Button>
                  <Button variant={preset === "ult90" ? "default" : "outline"} onClick={() => setPreset("ult90")}>Últ 90d</Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreset("all");
                      setDesde("");
                      setHasta("");
                      setEstadoFilter("all");
                      setQ("");
                    }}
                    className="gap-2"
                  >
                    ✕ Limpiar
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <p className="text-xs text-gray-500">
                  Pedidos en este filtro: <span className="font-semibold">{filteredMetrics.count}</span>
                </p>

                <div className="inline-flex items-center rounded-xl border bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                      viewMode === "cards" ? "bg-green-700 text-white" : "text-gray-700 hover:bg-gray-50"
                    }`}
                    aria-pressed={viewMode === "cards"}
                  >
                    <LayoutGrid className="w-4 h-4" /> Tarjetas
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                      viewMode === "table" ? "bg-green-700 text-white" : "text-gray-700 hover:bg-gray-50"
                    }`}
                    aria-pressed={viewMode === "table"}
                  >
                    <Table2 className="w-4 h-4" /> Tabla
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4) GRÁFICAS (aquí está el FIX real: labelFromFecha en XAxis data) */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Evolución de pedidos por día (Stacked Bar) — vw_dashboard_resumen</CardTitle>
            </CardHeader>
            <CardContent>
              {resumenVWFiltered.length === 0 ? (
                <div className="text-sm text-gray-600">Sin datos en el rango.</div>
              ) : (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={resumenVWFiltered.map((r) => ({
                        fecha: labelFromFecha(r.fecha), // ✅ FIX
                        pendientes: safeNum(r.pedidos_pendientes),
                        proceso: safeNum(r.pedidos_en_proceso),
                        finalizados: safeNum(r.pedidos_finalizados),
                        entregados: safeNum(r.pedidos_entregados),
                      }))}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="pendientes" stackId="a" fill="#facc15" />
                      <Bar dataKey="proceso" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="finalizados" stackId="a" fill="#22c55e" />
                      <Bar dataKey="entregados" stackId="a" fill="#a855f7" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Evolución por día (Line) — vw_dashboard_resumen</CardTitle>
            </CardHeader>
            <CardContent>
              {resumenVWFiltered.length === 0 ? (
                <div className="text-sm text-gray-600">Sin datos en el rango.</div>
              ) : (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={resumenVWFiltered.map((r) => ({
                        fecha: labelFromFecha(r.fecha), // ✅ FIX
                        pendientes: safeNum(r.pedidos_pendientes),
                        proceso: safeNum(r.pedidos_en_proceso),
                        finalizados: safeNum(r.pedidos_finalizados),
                        entregados: safeNum(r.pedidos_entregados),
                      }))}
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line dataKey="pendientes" stroke="#facc15" />
                      <Line dataKey="proceso" stroke="#3b82f6" />
                      <Line dataKey="finalizados" stroke="#22c55e" />
                      <Line dataKey="entregados" stroke="#a855f7" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PIE GLOBAL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Distribución GLOBAL por estado</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieGlobal} dataKey="value" nameKey="name" outerRadius={110} label>
                      {pieGlobal.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Distribución (con filtros) por estado</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieFiltered} dataKey="value" nameKey="name" outerRadius={110} label>
                      {pieFiltered.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* AGING */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Aging (saldo pendiente) — con filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aging} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="saldo" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* (De aquí para abajo deja tu resto tal cual lo tienes: pie charts, aging, rankings, modal, etc.) */}
          {/* Si tu archivo real tiene más secciones debajo, pégalas exactamente igual como estaban. */}

          <Modal open={modalOpen} title={modalTitle} onClose={() => setModalOpen(false)}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div className="flex-1">
                <label className="text-sm text-gray-700 flex items-center gap-2 mb-2">
                  <Search className="w-4 h-4" /> Buscar en este detalle
                </label>
                <Input
                  placeholder="Req, paciente, doctor, estado..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    downloadCSV(
                      `detalle_${modalTitle.replace(/\s+/g, "_")}.csv`,
                      modalFiltered.map((p) => ({
                        id: p.id,
                        numero_requerimiento: p.numero_requerimiento,
                        paciente: p.paciente_nombre,
                        doctor: p.doctor_nombre,
                        estado: p.estado,
                        fecha: pickPedidoDate(p),
                        total: p.total,
                        anticipo: p.anticipo,
                      }))
                    );
                    toast.success("CSV descargado ✅");
                  }}
                >
                  <FileDown className="w-4 h-4" /> Exportar
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-600 bg-gray-50">
                  <tr>
                    <th className="py-2 px-3">Req</th>
                    <th className="py-2 px-3">Paciente</th>
                    <th className="py-2 px-3">Doctor</th>
                    <th className="py-2 px-3">Estado</th>
                    <th className="py-2 px-3">Fecha</th>
                    <th className="py-2 px-3">Total</th>
                    <th className="py-2 px-3">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {modalFiltered.map((p) => {
                    const est = mapEstado(p.estado);
                    const total = safeNum(p.total);
                    const anti = safeNum(p.anticipo);
                    const saldo = Math.max(0, total - anti);
                    return (
                      <tr key={p.id} className="border-t">
                        <td className="py-2 px-3 font-medium">{p.numero_requerimiento || "—"}</td>
                        <td className="py-2 px-3">{p.paciente_nombre || "—"}</td>
                        <td className="py-2 px-3">{p.doctor_nombre || "—"}</td>
                        <td className="py-2 px-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${chipCls(est)}`}>
                            {statusLabel(est)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-600">
                          {pickPedidoDate(p) ? new Date(String(pickPedidoDate(p))).toLocaleString() : "—"}
                        </td>
                        <td className="py-2 px-3">{fmtMoney(total)}</td>
                        <td className="py-2 px-3 text-red-600">{fmtMoney(saldo)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
