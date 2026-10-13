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
  Award,
  Trophy,
  Flame,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  PackageCheck,
  AlertCircle,
  Briefcase,
  Phone,
  MessageCircle,
  Eye,
  Receipt,
  HelpCircle,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type RangePreset = "hoy" | "semana" | "mes" | "anio" | "ult7" | "ult30" | "ult90" | "custom" | "all";

type ResumenRow = {
  pedidos_pendientes: number;
  pedidos_en_proceso: number;
  pedidos_finalizados: number;
  pedidos_entregados: number;
  tiempo_promedio_horas: number | null;
  ingresos_totales: number | null;
  fecha: any;
};

type PedidoLite = {
  id: string;
  numero_requerimiento: string | null;
  paciente_nombre: string | null;
  doctor_nombre: string | null;
  doctor_telefono: string | null;
  trabajo_realizar: string | null;
  numero_caja: string | null;
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
  orden: number;
  tiempo_estimado_horas: number;
  pedidos_en_cola: number;
  tiempo_promedio_horas: number;
  es_cuello_botella: boolean;
};

type TechMetric = {
  tecnico_id: string;
  tecnico_nombre: string;
  horas: number;
  completadas: number;
  en_proceso: number;
  total_etapas: number;
  pedidos_unicos: number;
  tiempo_promedio_horas: number;
  eficiencia_pct: number;
  estaciones_principales: string[];
};

type DoctorRank = {
  doctor: string;
  doctor_telefono: string | null;
  pedidos: number;
  pedidos_con_deuda: number;
  ingresos: number;
  anticipo: number;
  saldo_pendiente: number;
  deuda_0_7d: number;
  deuda_8_15d: number;
  deuda_16_mas_d: number;
  pedidos_items: PedidoLite[];
};

type TrabajoDemand = {
  trabajo: string;
  cantidad: number;
  ingresos: number;
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
  return `Bs ${n.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function coerceDate(fecha: any): Date | null {
  if (!fecha) return null;
  if (fecha instanceof Date) {
    return Number.isFinite(fecha.getTime()) ? fecha : null;
  }
  const s = String(fecha).trim();
  if (!s) return null;

  const d = new Date(s.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00` : s);
  if (!Number.isFinite(d.getTime())) return null;
  return d;
}

function labelFromFecha(fecha: any) {
  const d = coerceDate(fecha);
  return d ? d.toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit" }) : String(fecha ?? "—");
}

function ymdFromFecha(fecha: any) {
  const d = coerceDate(fecha);
  return d ? toYMD(d) : "";
}

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
  if (key === "en_proceso") return "En Proceso";
  if (key === "finalizado") return "Finalizados";
  if (key === "entregado") return "Entregados";
  return key;
}

function statusColor(key: string) {
  if (key === "pendiente") return "border-amber-500 text-amber-700 bg-amber-50/30";
  if (key === "en_proceso") return "border-blue-500 text-blue-700 bg-blue-50/30";
  if (key === "finalizado") return "border-emerald-500 text-emerald-700 bg-emerald-50/30";
  if (key === "entregado") return "border-purple-500 text-purple-700 bg-purple-50/30";
  return "border-slate-300 text-slate-700 bg-slate-50";
}

function chipCls(key: string) {
  if (key === "pendiente") return "bg-amber-100 text-amber-800 border-amber-200";
  if (key === "en_proceso") return "bg-blue-100 text-blue-800 border-blue-200";
  if (key === "finalizado") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (key === "entregado") return "bg-purple-100 text-purple-800 border-purple-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function cleanPhone(raw?: string | null) {
  if (!raw) return "";
  const num = raw.replace(/\D/g, "");
  if (num.length === 8) return `591${num}`;
  return num;
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50/60 shrink-0">
            <div className="font-semibold text-slate-900 truncate pr-2 text-base flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#3C1C6C]" /> {title}
            </div>
            <Button variant="outline" size="sm" onClick={onClose} className="gap-2 shrink-0">
              <X className="w-4 h-4" /> Cerrar
            </Button>
          </div>
          <div className="p-5 overflow-y-auto">{children}</div>
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

  const [preset, setPreset] = useState<RangePreset>("all");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [q, setQ] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [doctorTab, setDoctorTab] = useState<"todos" | "deudores" | "al_dia">("deudores");

  const [stationBottlenecks, setStationBottlenecks] = useState<StationBottleneck[]>([]);
  const [techMetrics, setTechMetrics] = useState<TechMetric[]>([]);
  const [doctorRank, setDoctorRank] = useState<DoctorRank[]>([]);
  const [trabajoDemand, setTrabajoDemand] = useState<TrabajoDemand[]>([]);

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
        setVwOk(false);
        const fb = buildResumenFallbackFromPedidos(pedidosForFallback || pedidosAll);
        setResumenVW(fb);
        return;
      }

      setVwOk(true);
      setResumenVW((data || []) as any);
    } catch {
      setVwOk(false);
      const fb = buildResumenFallbackFromPedidos(pedidosForFallback || pedidosAll);
      setResumenVW(fb);
    }
  }

  async function fetchPedidosAll() {
    const { data, error } = await supabase
      .from("pedidos")
      .select(
        "id,numero_requerimiento,paciente_nombre,doctor_nombre,doctor_telefono,trabajo_realizar,numero_caja,estado,fecha_creacion,fecha_ingreso,fecha_entrega,total,anticipo,creado_por"
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
      doctor_telefono: p.doctor_telefono == null ? null : String(p.doctor_telefono),
      trabajo_realizar: p.trabajo_realizar == null ? null : String(p.trabajo_realizar),
      numero_caja: p.numero_caja == null ? null : String(p.numero_caja),
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
        .select(
          "estado,fecha_inicio,fecha_fin,tecnico_id,estacion_id,pedido_id,estaciones(nombre,tiempo_estimado_horas,orden)"
        )
        .order("fecha_inicio", { ascending: false })
        .limit(8000);

      if (error) {
        console.warn("historial_estaciones analytics error:", error);
        setStationBottlenecks([]);
        setTechMetrics([]);
        return;
      }

      const rows = (data || []) as any[];
      const filtered = rows.filter((r) =>
        withinRange(r?.fecha_inicio ? String(r.fecha_inicio) : null, desdeLocal, hastaLocal)
      );

      // --- 1. Estaciones & Cuellos de Botella ---
      const stationAgg = new Map<
        string,
        { orden: number; estHoras: number; open: number; sumH: number; cnt: number }
      >();

      for (const r of filtered) {
        const stationName = String(r?.estaciones?.nombre || "Sin Asignar");
        const orden = Number(r?.estaciones?.orden || 99);
        const estH = Number(r?.estaciones?.tiempo_estimado_horas || 2);

        if (!stationAgg.has(stationName)) {
          stationAgg.set(stationName, { orden, estHoras: estH, open: 0, sumH: 0, cnt: 0 });
        }
        const a = stationAgg.get(stationName)!;

        const fi = parseTime(r?.fecha_inicio ? String(r.fecha_inicio) : null);
        const ff = parseTime(r?.fecha_fin ? String(r.fecha_fin) : null);

        if (!Number.isFinite(ff)) {
          a.open += 1;
        } else if (Number.isFinite(fi) && ff >= fi) {
          a.sumH += (ff - fi) / 36e5;
          a.cnt += 1;
        }
      }

      const calculatedStations: StationBottleneck[] = Array.from(stationAgg.entries()).map(
        ([estacion, a]) => {
          const prom = a.cnt ? Math.round((a.sumH / a.cnt) * 10) / 10 : 0;
          return {
            estacion,
            orden: a.orden,
            tiempo_estimado_horas: a.estHoras,
            pedidos_en_cola: a.open,
            tiempo_promedio_horas: prom,
            es_cuello_botella: (a.open >= 2 && prom > a.estHoras) || prom > a.estHoras * 1.5,
          };
        }
      );

      calculatedStations.sort((a, b) => a.orden - b.orden);
      setStationBottlenecks(calculatedStations);

      // --- 2. Técnicos & Productividad ---
      const techAgg = new Map<
        string,
        {
          sumH: number;
          completadas: number;
          enProceso: number;
          orders: Set<string>;
          stations: Set<string>;
        }
      >();

      for (const r of filtered) {
        const techId = r?.tecnico_id ? String(r.tecnico_id) : null;
        if (!techId) continue;

        if (!techAgg.has(techId)) {
          techAgg.set(techId, {
            sumH: 0,
            completadas: 0,
            enProceso: 0,
            orders: new Set(),
            stations: new Set(),
          });
        }
        const a = techAgg.get(techId)!;

        if (r?.pedido_id) a.orders.add(String(r.pedido_id));
        if (r?.estaciones?.nombre) a.stations.add(String(r.estaciones.nombre));

        const fi = parseTime(r?.fecha_inicio ? String(r.fecha_inicio) : null);
        const ff = parseTime(r?.fecha_fin ? String(r.fecha_fin) : null);

        if (Number.isFinite(fi) && Number.isFinite(ff) && ff >= fi) {
          a.sumH += (ff - fi) / 36e5;
        }

        const est = String(r?.estado || "").toLowerCase();
        if (est === "completado" || est === "finalizado") {
          a.completadas += 1;
        } else if (est === "en_proceso") {
          a.enProceso += 1;
        }
      }

      const techIds = Array.from(techAgg.keys());
      let nameMap = new Map<string, string>();
      if (techIds.length) {
        const { data: profs, error: pErr } = await supabase
          .from("profiles")
          .select("id,nombre,rol")
          .in("id", techIds);

        if (!pErr && profs) {
          (profs as any[]).forEach((p) => {
            nameMap.set(String(p.id), String(p.nombre || "Técnico"));
          });
        }
      }

      const calculatedTechs: TechMetric[] = Array.from(techAgg.entries()).map(([id, a]) => {
        const total = a.completadas + a.enProceso;
        const prom = a.completadas > 0 ? Math.round((a.sumH / a.completadas) * 10) / 10 : 0;
        const ef = total > 0 ? Math.round((a.completadas / total) * 100) : 100;
        return {
          tecnico_id: id,
          tecnico_nombre: nameMap.get(id) || "Técnico",
          horas: Math.round(a.sumH * 10) / 10,
          completadas: a.completadas,
          en_proceso: a.enProceso,
          total_etapas: total,
          pedidos_unicos: a.orders.size,
          tiempo_promedio_horas: prom,
          eficiencia_pct: ef,
          estaciones_principales: Array.from(a.stations).slice(0, 2),
        };
      });

      calculatedTechs.sort((a, b) => b.completadas - a.completadas || b.horas - a.horas);
      setTechMetrics(calculatedTechs);
    } catch (e: any) {
      console.warn("analytics exception:", e);
      setStationBottlenecks([]);
      setTechMetrics([]);
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

  function handleSendWhatsApp(doc: DoctorRank) {
    const phone = cleanPhone(doc.doctor_telefono);
    if (!phone) {
      toast.error(`El doctor(a) ${doc.doctor} no tiene número telefónico registrado.`);
      return;
    }
    const msg = `Estimado(a) ${doc.doctor}, le saludamos cordialmente de Guisela Laboratorio Dental.\n\nLe compartimos su resumen de estado de cuenta actual:\n- Saldo pendiente de pago: ${fmtMoney(doc.saldo_pendiente)}\n- Pedidos con saldo pendiente: ${doc.pedidos_con_deuda} trabajo(s)\n\nQuedamos atentos para coordinar la cancelación o entrega de sus trabajos. ¡Muchas gracias por su preferencia!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const pedidosFiltered = useMemo(() => {
    const sQ = q.trim().toLowerCase();
    return pedidosAll.filter((p) => {
      const baseDate = pickPedidoDate(p);
      if (!withinRange(baseDate, desde, hasta)) return false;

      const est = mapEstado(p.estado);
      if (estadoFilter !== "all" && est !== estadoFilter) return false;

      if (!sQ) return true;
      const blob = [
        p.numero_requerimiento,
        p.paciente_nombre,
        p.doctor_nombre,
        p.trabajo_realizar,
        p.numero_caja,
        p.estado,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(sQ);
    });
  }, [pedidosAll, q, estadoFilter, desde, hasta]);

  const globalMetrics = useMemo(() => {
    let pendientes = 0,
      en_proceso = 0,
      finalizados = 0,
      entregados = 0;
    let ingresos = 0,
      anticipo = 0,
      saldoPendiente = 0;
    let sumHoras = 0,
      cntHoras = 0;
    let saldoEnListos = 0;
    let pedidosListosConSaldo = 0;

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
      const saldo = Math.max(0, t - a);
      ingresos += t;
      anticipo += a;
      saldoPendiente += saldo;

      if (est === "finalizado" && saldo > 0) {
        saldoEnListos += saldo;
        pedidosListosConSaldo++;
      }

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
    const tiempoPromDias = tiempoProm ? Math.round((tiempoProm / 24) * 10) / 10 : null;
    const totalTerminados = finalizados + entregados;
    const cumplimientoPct =
      pedidosAll.length > 0 ? Math.round(((pedidosAll.length - atrasados) / pedidosAll.length) * 100) : 100;
    const ticketPromedio = pedidosAll.length > 0 ? Math.round(ingresos / pedidosAll.length) : 0;
    const tasaCobroPct = ingresos > 0 ? Math.round((anticipo / ingresos) * 100) : 100;

    return {
      count: pedidosAll.length,
      pendientes,
      en_proceso,
      finalizados,
      entregados,
      totalTerminados,
      ingresos,
      anticipo,
      saldoPendiente,
      saldoEnListos,
      pedidosListosConSaldo,
      ticketPromedio,
      tasaCobroPct,
      tiempoProm,
      tiempoPromDias,
      atrasados,
      cumplimientoPct,
    };
  }, [pedidosAll]);

  // Ranking Doctores & Análisis de Deuda por Períodos
  useEffect(() => {
    const agg = new Map<
      string,
      {
        doctor_telefono: string | null;
        pedidos: number;
        pedidos_con_deuda: number;
        ingresos: number;
        anticipo: number;
        saldo: number;
        deuda_0_7d: number;
        deuda_8_15d: number;
        deuda_16_mas_d: number;
        items: PedidoLite[];
      }
    >();

    const now = Date.now();

    for (const p of pedidosFiltered) {
      const d = (p.doctor_nombre || "—").trim() || "—";
      if (!agg.has(d)) {
        agg.set(d, {
          doctor_telefono: p.doctor_telefono || null,
          pedidos: 0,
          pedidos_con_deuda: 0,
          ingresos: 0,
          anticipo: 0,
          saldo: 0,
          deuda_0_7d: 0,
          deuda_8_15d: 0,
          deuda_16_mas_d: 0,
          items: [],
        });
      }
      const a = agg.get(d)!;
      if (!a.doctor_telefono && p.doctor_telefono) a.doctor_telefono = p.doctor_telefono;

      a.pedidos += 1;
      a.items.push(p);

      const t = safeNum(p.total);
      const an = safeNum(p.anticipo);
      const saldo = Math.max(0, t - an);
      a.ingresos += t;
      a.anticipo += an;
      a.saldo += saldo;

      if (saldo > 0) {
        a.pedidos_con_deuda += 1;
        const base = parseTime(p.fecha_creacion || p.fecha_ingreso || null);
        const days = Number.isFinite(base) ? Math.floor((now - base) / 86400000) : 0;
        if (days <= 7) a.deuda_0_7d += saldo;
        else if (days <= 15) a.deuda_8_15d += saldo;
        else a.deuda_16_mas_d += saldo;
      }
    }

    setDoctorRank(
      Array.from(agg.entries())
        .map(([doctor, a]) => ({
          doctor,
          doctor_telefono: a.doctor_telefono,
          pedidos: a.pedidos,
          pedidos_con_deuda: a.pedidos_con_deuda,
          ingresos: Math.round(a.ingresos * 100) / 100,
          anticipo: Math.round(a.anticipo * 100) / 100,
          saldo_pendiente: Math.round(a.saldo * 100) / 100,
          deuda_0_7d: Math.round(a.deuda_0_7d * 100) / 100,
          deuda_8_15d: Math.round(a.deuda_8_15d * 100) / 100,
          deuda_16_mas_d: Math.round(a.deuda_16_mas_d * 100) / 100,
          pedidos_items: a.items,
        }))
        .sort((a, b) => b.saldo_pendiente - a.saldo_pendiente || b.ingresos - a.ingresos)
    );
  }, [pedidosFiltered]);

  // Demanda de Trabajos / Materiales
  useEffect(() => {
    const agg = new Map<string, { cantidad: number; ingresos: number }>();
    for (const p of pedidosFiltered) {
      const trab = (p.trabajo_realizar || "Otros Trabajos").trim();
      if (!agg.has(trab)) agg.set(trab, { cantidad: 0, ingresos: 0 });
      const a = agg.get(trab)!;
      a.cantidad += 1;
      a.ingresos += safeNum(p.total);
    }
    setTrabajoDemand(
      Array.from(agg.entries())
        .map(([trabajo, a]) => ({ trabajo, cantidad: a.cantidad, ingresos: a.ingresos }))
        .sort((a, b) => b.cantidad - a.cantidad || b.ingresos - a.ingresos)
        .slice(0, 6)
    );
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

  const modalFiltered = useMemo(() => {
    const sQ = modalSearch.trim().toLowerCase();
    if (!sQ) return modalItems;
    return modalItems.filter((p) => {
      const blob = [
        p.numero_requerimiento,
        p.paciente_nombre,
        p.doctor_nombre,
        p.trabajo_realizar,
        p.numero_caja,
        p.estado,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(sQ);
    });
  }, [modalItems, modalSearch]);

  const topTech = techMetrics[0] || null;

  // Filtrado de la tabla de doctores por pestaña
  const displayedDoctors = useMemo(() => {
    if (doctorTab === "deudores") return doctorRank.filter((d) => d.saldo_pendiente > 0);
    if (doctorTab === "al_dia") return doctorRank.filter((d) => d.saldo_pendiente === 0);
    return doctorRank;
  }, [doctorRank, doctorTab]);

  const totalDeudoresCount = useMemo(() => doctorRank.filter((d) => d.saldo_pendiente > 0).length, [doctorRank]);
  const totalAlDiaCount = useMemo(() => doctorRank.filter((d) => d.saldo_pendiente === 0).length, [doctorRank]);

  return (
    <div className="min-h-screen bg-[#FDFCFE] p-4 sm:p-6 lg:p-8 space-y-7 text-slate-800">
      {/* ── HEADER EJECUTIVO ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-purple-100/60">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100/80 text-[#3C1C6C] text-xs font-semibold mb-2 border border-purple-200">
            <Sparkles className="w-3.5 h-3.5 text-[#6329B7]" />
            Panel Ejecutivo del Propietario · LabDent
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#190B2E] tracking-tight flex items-center gap-3">
            📊 Centro de Control & Analítica Dental
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Métricas de técnicos, cartera de doctores deudores por períodos, cuellos de botella y finanzas en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={refreshAll}
            className="flex items-center gap-2 border-purple-200 bg-white hover:bg-purple-50 text-slate-700 shadow-xs"
          >
            <RefreshCcw className="w-4 h-4 text-[#6329B7]" /> Actualizar Datos
          </Button>
        </div>
      </div>

      {!vwOk && (
        <div className="border border-amber-300 bg-amber-50 text-amber-900 rounded-2xl p-4 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            Vista analítica en modo cálculo dinámico directo desde las tablas de producción y órdenes.
          </span>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-purple-100 rounded-3xl shadow-sm p-14 text-center text-slate-500">
          <div className="w-10 h-10 border-4 border-[#3C1C6C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-medium text-slate-700">Analizando métricas del taller, finanzas y cartera de doctores...</p>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════
              HERO CARDS: EL PULSO DEL NEGOCIO (LO QUE EL DUEÑO VE PRIMERO)
             ══════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. TÉCNICO LÍDER (TOP PRODUCER) */}
            <Card className="border-2 border-amber-300/80 bg-gradient-to-br from-amber-500/10 via-amber-50/40 to-white shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-15">
                <Trophy className="w-20 h-20 text-amber-600" />
              </div>
              <CardHeader className="pb-1 pt-4 px-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-600" /> Técnico Más Productivo
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-xs">
                    #1 TALLER
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-2 pb-4 px-5 space-y-2">
                <div className="text-xl font-black text-slate-900 truncate">
                  {topTech ? topTech.tecnico_nombre : "Sin Asignar"}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-200/70">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Etapas Terminadas</span>
                    <span className="text-lg font-black text-amber-700">
                      {topTech ? topTech.completadas : 0}{" "}
                      <span className="text-xs font-semibold text-slate-500">etapas</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Tiempo Dedicado</span>
                    <span className="text-lg font-black text-slate-800">
                      {topTech ? `${topTech.horas}h` : "0h"}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
                  <Flame className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  {topTech && topTech.en_proceso > 0
                    ? `${topTech.en_proceso} trabajo(s) en su mesa actualmente`
                    : "Líder de rendimiento del taller"}
                </p>
              </CardContent>
            </Card>

            {/* 2. TIEMPO PROMEDIO DE ENTREGA & SLA */}
            <Card className="border border-purple-200/80 bg-white shadow-xs hover:shadow-md transition">
              <CardHeader className="pb-1 pt-4 px-5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#3C1C6C] flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-[#6329B7]" /> Tiempo Promedio de Fabricación
                </span>
              </CardHeader>
              <CardContent className="pt-2 pb-4 px-5 space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">
                    {globalMetrics.tiempoProm != null ? `${globalMetrics.tiempoProm}h` : "—"}
                  </span>
                  {globalMetrics.tiempoPromDias != null && (
                    <span className="text-xs font-semibold text-slate-500">
                      (~{globalMetrics.tiempoPromDias} días laborables)
                    </span>
                  )}
                </div>
                <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Cumplimiento On-Time:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {globalMetrics.cumplimientoPct}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Calculado desde el ingreso del modelo hasta la salida final
                </p>
              </CardContent>
            </Card>

            {/* 3. SALUD FINANCIERA & COBRANZAS */}
            <Card className="border border-slate-200 bg-white shadow-xs hover:shadow-md transition">
              <CardHeader className="pb-1 pt-4 px-5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <BadgeDollarSign className="w-4 h-4 text-emerald-600" /> Facturación & Cobranza
                </span>
              </CardHeader>
              <CardContent className="pt-2 pb-4 px-5 space-y-2">
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-black text-slate-900">
                    {fmtMoney(globalMetrics.ingresos)}
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {globalMetrics.tasaCobroPct}% cobrado
                  </span>
                </div>
                <div className="space-y-1 pt-1 border-t border-slate-100 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Anticipos cobrados:</span>
                    <span className="font-semibold text-emerald-600">
                      {fmtMoney(globalMetrics.anticipo)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Saldo por cobrar (Total):</span>
                    <span className="font-bold text-rose-600">
                      {fmtMoney(globalMetrics.saldoPendiente)}
                    </span>
                  </div>
                  {globalMetrics.saldoEnListos > 0 && (
                    <div className="flex justify-between font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded-md border border-amber-200/60 mt-1">
                      <span>A cobrar al entregar:</span>
                      <span>{fmtMoney(globalMetrics.saldoEnListos)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 4. FLUJO DE TRABAJOS & ALERTAS */}
            <Card
              className="border border-slate-200 bg-white shadow-xs hover:shadow-md transition cursor-pointer"
              onClick={() => {
                const now = Date.now();
                const items = pedidosAll.filter((p) => {
                  const promised = parseTime(p.fecha_entrega);
                  const est = mapEstado(p.estado);
                  return Number.isFinite(promised) && promised < now && est !== "entregado";
                });
                openDrilldown(`⚠️ Pedidos Atrasados • ${items.length}`, items);
              }}
            >
              <CardHeader className="pb-1 pt-4 px-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-blue-600" /> Producción Activa & Ticket
                  </span>
                  {globalMetrics.atrasados > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                      {globalMetrics.atrasados} Retrasado(s)
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-2 pb-4 px-5 space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">
                    {globalMetrics.en_proceso}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">en taller ahora</span>
                </div>
                <div className="pt-1 border-t border-slate-100 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Terminados / Listos:</span>
                    <span className="font-bold text-emerald-600">
                      {globalMetrics.totalTerminados} pedidos
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ticket promedio:</span>
                    <span className="font-bold text-[#3C1C6C]">
                      {fmtMoney(globalMetrics.ticketPromedio)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ══════════════════════════════════════════════════════════
              SECCIÓN 1: PRODUCTIVIDAD DEL EQUIPO TÉCNICO (EL RANKING)
             ══════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-[#190B2E] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#3C1C6C]" />
                  Rendimiento & Podio de Técnicos Dentales
                </h2>
                <p className="text-xs text-slate-500">
                  Quién produjo más, cantidad de etapas culminadas, horas dedicadas y promedio por trabajo.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {techMetrics.map((tm, idx) => {
                const isGold = idx === 0;
                const isSilver = idx === 1;
                const isBronze = idx === 2;

                return (
                  <Card
                    key={tm.tecnico_id}
                    className={`transition relative overflow-hidden ${
                      isGold
                        ? "border-2 border-amber-300 bg-gradient-to-b from-amber-50/40 via-white to-white shadow-sm"
                        : isSilver
                        ? "border border-slate-300 bg-white shadow-xs"
                        : "border border-slate-200 bg-white shadow-xs"
                    }`}
                  >
                    <CardHeader className="py-3 px-4 border-b bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-xs ${
                              isGold
                                ? "bg-amber-400 text-amber-950"
                                : isSilver
                                ? "bg-slate-300 text-slate-800"
                                : isBronze
                                ? "bg-amber-700 text-white"
                                : "bg-purple-100 text-[#3C1C6C]"
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <CardTitle className="text-sm font-bold text-slate-900 truncate">
                              {tm.tecnico_nombre}
                            </CardTitle>
                            <span className="text-[11px] text-slate-500">
                              {tm.estaciones_principales.join(" · ") || "Especialista Dental"}
                            </span>
                          </div>
                        </div>

                        {isGold && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                            <Trophy className="w-3 h-3 text-amber-600" /> Líder
                          </span>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-xl bg-purple-50/60 border border-purple-100/60">
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                            Terminados
                          </span>
                          <span className="text-base font-black text-[#3C1C6C]">
                            {tm.completadas}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-100/60">
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                            En Mesa
                          </span>
                          <span className="text-base font-black text-blue-700">
                            {tm.en_proceso}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-100/60">
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                            Horas
                          </span>
                          <span className="text-base font-black text-amber-800">
                            {tm.horas}h
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Tiempo prom. por etapa:</span>
                          <span className="font-bold text-slate-800">
                            {tm.tiempo_promedio_horas > 0 ? `${tm.tiempo_promedio_horas} hrs` : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Casos distintos atendidos:</span>
                          <span className="font-bold text-slate-800">{tm.pedidos_unicos}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Tasa de resolución:</span>
                          <span className="font-bold text-emerald-600">{tm.eficiencia_pct}%</span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#6329B7] to-amber-500 h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (tm.completadas / (topTech?.completadas || 1)) * 100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              SECCIÓN 2: CUELLOS DE BOTELLA DEL TALLER (ESTACIONES)
             ══════════════════════════════════════════════════════════ */}
          <Card className="border border-purple-100/80 shadow-xs bg-white">
            <CardHeader className="pb-2">
              <div>
                <CardTitle className="text-base font-extrabold text-[#190B2E] flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#6329B7]" />
                  Cuellos de Botella & Tiempo por Estación de Producción
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permite identificar en qué fase de la prótesis (CAD, Fresado, Cerámica, Calidad) se estancan los pedidos.
                </p>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {stationBottlenecks.map((st) => (
                  <div
                    key={st.estacion}
                    className={`p-3.5 rounded-2xl border transition ${
                      st.es_cuello_botella
                        ? "border-rose-300 bg-rose-50/40 text-rose-950 shadow-xs"
                        : "border-slate-200 bg-slate-50/50 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-6 h-6 rounded-full bg-white border text-xs font-bold flex items-center justify-center text-slate-700 shadow-2xs">
                        {st.orden}
                      </span>
                      {st.es_cuello_botella ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                          ⚠️ Lento
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Fluido
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 line-clamp-2 h-8 leading-tight">
                      {st.estacion}
                    </h4>

                    <div className="mt-3 space-y-1 text-xs border-t border-slate-200/60 pt-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">En cola actual:</span>
                        <span className="font-extrabold text-slate-900">{st.pedidos_en_cola}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tiempo prom:</span>
                        <span className="font-extrabold text-[#3C1C6C]">
                          {st.tiempo_promedio_horas}h
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Meta est:</span>
                        <span>{st.tiempo_estimado_horas}h</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ══════════════════════════════════════════════════════════
              SECCIÓN 3: CONTROL DE DEUDAS DE DOCTORES & CARTERA POR PERÍODOS
             ══════════════════════════════════════════════════════════ */}
          <Card className="border border-purple-200/80 bg-white shadow-xs">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-rose-600" />
                      Cartera de Doctores & Cuentas por Cobrar por Períodos
                    </CardTitle>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      Bs {globalMetrics.saldoPendiente.toFixed(2)} por cobrar
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Antigüedad de deudas por períodos, órdenes impagas y botón de recordatorio de cobro por WhatsApp.
                  </p>
                </div>

                {/* Selector de Pestaña de Doctores */}
                <div className="inline-flex items-center rounded-xl border bg-white p-1 shadow-2xs text-xs">
                  <button
                    type="button"
                    onClick={() => setDoctorTab("deudores")}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                      doctorTab === "deudores"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Con Saldo Deudor ({totalDeudoresCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDoctorTab("al_dia")}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                      doctorTab === "al_dia"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Al Día ({totalAlDiaCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDoctorTab("todos")}
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${
                      doctorTab === "todos"
                        ? "bg-[#3C1C6C] text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Todos ({doctorRank.length})
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Doctor / Clínica</th>
                      <th className="py-2.5 px-2 text-center">Pedidos</th>
                      <th className="py-2.5 px-3 text-right">Total Facturado</th>
                      <th className="py-2.5 px-3 text-center">Deuda 0–7 días</th>
                      <th className="py-2.5 px-3 text-center">Deuda 8–15 días</th>
                      <th className="py-2.5 px-3 text-center">Deuda +16 días</th>
                      <th className="py-2.5 px-3 text-right">Saldo Deudor Total</th>
                      <th className="py-2.5 px-3 text-center">Acciones de Cobro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedDoctors.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-400">
                          No hay doctores en esta categoría.
                        </td>
                      </tr>
                    ) : (
                      displayedDoctors.map((doc, i) => {
                        const hasDebt = doc.saldo_pendiente > 0;
                        const unpaidOrders = doc.pedidos_items.filter(
                          (p) => safeNum(p.total) - safeNum(p.anticipo) > 0
                        );

                        return (
                          <tr key={doc.doctor} className="hover:bg-slate-50/70 transition">
                            {/* Doctor y Teléfono */}
                            <td className="py-3 px-3 font-semibold text-slate-900">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-purple-100 text-[#3C1C6C] text-[10px] font-black flex items-center justify-center">
                                  {i + 1}
                                </div>
                                <div>
                                  <span className="font-bold block text-slate-900">{doc.doctor}</span>
                                  {doc.doctor_telefono ? (
                                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                                      <Phone className="w-3 h-3 text-slate-400" /> {doc.doctor_telefono}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">Sin teléfono</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Pedidos */}
                            <td className="py-3 px-2 text-center">
                              <span className="font-bold text-slate-800">{doc.pedidos}</span>
                              {hasDebt && (
                                <span className="block text-[10px] text-rose-600 font-semibold">
                                  ({doc.pedidos_con_deuda} con saldo)
                                </span>
                              )}
                            </td>

                            {/* Facturado */}
                            <td className="py-3 px-3 text-right font-medium text-slate-900">
                              {fmtMoney(doc.ingresos)}
                            </td>

                            {/* Deuda 0-7d */}
                            <td className="py-3 px-3 text-center">
                              {doc.deuda_0_7d > 0 ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  {fmtMoney(doc.deuda_0_7d)}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>

                            {/* Deuda 8-15d */}
                            <td className="py-3 px-3 text-center">
                              {doc.deuda_8_15d > 0 ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-50 text-orange-800 border border-orange-200">
                                  {fmtMoney(doc.deuda_8_15d)}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>

                            {/* Deuda +16d */}
                            <td className="py-3 px-3 text-center">
                              {doc.deuda_16_mas_d > 0 ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                                  {fmtMoney(doc.deuda_16_mas_d)}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>

                            {/* Saldo Deudor Total */}
                            <td className="py-3 px-3 text-right">
                              {hasDebt ? (
                                <span className="font-extrabold text-sm text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 block">
                                  {fmtMoney(doc.saldo_pendiente)}
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  Al día ✅
                                </span>
                              )}
                            </td>

                            {/* Acciones */}
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {hasDebt && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-[11px] border-purple-200 text-[#3C1C6C] hover:bg-purple-50 gap-1"
                                      onClick={() =>
                                        openDrilldown(
                                          `Órdenes Impagas · ${doc.doctor} (Bs ${doc.saldo_pendiente})`,
                                          unpaidOrders
                                        )
                                      }
                                      title="Ver pedidos con saldo pendiente"
                                    >
                                      <Eye className="w-3.5 h-3.5" /> Impagos
                                    </Button>

                                    <Button
                                      size="sm"
                                      className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-xs"
                                      onClick={() => handleSendWhatsApp(doc)}
                                      title="Enviar estado de cuenta a WhatsApp"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                                    </Button>
                                  </>
                                )}
                                {!hasDebt && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-[11px] text-slate-600"
                                    onClick={() =>
                                      openDrilldown(`Historial de Pedidos · ${doc.doctor}`, doc.pedidos_items)
                                    }
                                  >
                                    Ver Casos
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ══════════════════════════════════════════════════════════
              SECCIÓN 4: DEMANDA DE PRÓTESIS & MATERIALES DEL LABORATORIO
             ══════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PRÓTESIS MÁS SOLICITADAS */}
            <Card className="border border-slate-200 bg-white shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-amber-600" />
                  Prótesis & Materiales Más Solicitados
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Desglose por tipo de restauración dental y facturación generada para el taller.
                </p>
              </CardHeader>
              <CardContent className="pt-2 space-y-3">
                {trabajoDemand.map((td) => {
                  const maxCant = trabajoDemand[0]?.cantidad || 1;
                  const pct = Math.round((td.cantidad / maxCant) * 100);

                  return (
                    <div key={td.trabajo} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-800 truncate max-w-[260px]">
                          {td.trabajo}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-medium">{td.cantidad} un.</span>
                          <span className="font-bold text-[#3C1C6C]">{fmtMoney(td.ingresos)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#6329B7] to-purple-400 h-2 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* AGING DE COBRANZA GENERAL */}
            <Card className="border border-slate-200 bg-white shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-rose-600" />
                  Antigüedad de la Cartera Total (Aging)
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Distribución temporal de los saldos pendientes por cobrar en el laboratorio.
                </p>
              </CardHeader>
              <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aging} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="saldo" name="Saldo Deudor (Bs)" fill="#F43F5E" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* ══════════════════════════════════════════════════════════
              SECCIÓN 5: FILTROS DINÁMICOS Y BANDEJA OPERATIVA
             ══════════════════════════════════════════════════════════ */}
          <Card className="shadow-xs border border-purple-100 bg-white">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#6329B7]" />
                  Filtros de Análisis & Búsqueda
                </CardTitle>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant={preset === "all" ? "default" : "outline"}
                    onClick={() => {
                      setPreset("all");
                      setDesde("");
                      setHasta("");
                    }}
                    className={preset === "all" ? "bg-[#3C1C6C] text-white" : ""}
                  >
                    Todo
                  </Button>
                  <Button
                    size="sm"
                    variant={preset === "hoy" ? "default" : "outline"}
                    onClick={() => setPreset("hoy")}
                    className={preset === "hoy" ? "bg-[#3C1C6C] text-white" : ""}
                  >
                    Hoy
                  </Button>
                  <Button
                    size="sm"
                    variant={preset === "semana" ? "default" : "outline"}
                    onClick={() => setPreset("semana")}
                    className={preset === "semana" ? "bg-[#3C1C6C] text-white" : ""}
                  >
                    Esta Semana
                  </Button>
                  <Button
                    size="sm"
                    variant={preset === "mes" ? "default" : "outline"}
                    onClick={() => setPreset("mes")}
                    className={preset === "mes" ? "bg-[#3C1C6C] text-white" : ""}
                  >
                    Este Mes
                  </Button>
                  <Button
                    size="sm"
                    variant={preset === "ult30" ? "default" : "outline"}
                    onClick={() => setPreset("ult30")}
                    className={preset === "ult30" ? "bg-[#3C1C6C] text-white" : ""}
                  >
                    Últimos 30d
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-1.5">
                    <Search className="w-3.5 h-3.5 text-slate-400" /> Buscar Caso
                  </label>
                  <Input
                    placeholder="Req, paciente, doctor, prótesis..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-400" /> Estado
                  </label>
                  <select
                    value={estadoFilter}
                    onChange={(e) => setEstadoFilter(e.target.value)}
                    className="w-full border rounded-lg px-3 py-1.5 bg-white text-xs h-9 focus:ring-1 focus:ring-purple-400"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="en_proceso">En Proceso</option>
                    <option value="finalizado">Finalizado</option>
                    <option value="entregado">Entregado</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-400" /> Desde
                  </label>
                  <Input
                    type="date"
                    value={desde}
                    onChange={(e) => {
                      setPreset("custom");
                      setDesde(e.target.value);
                    }}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-400" /> Hasta
                  </label>
                  <Input
                    type="date"
                    value={hasta}
                    onChange={(e) => {
                      setPreset("custom");
                      setHasta(e.target.value);
                    }}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Conteo de estados filtrados */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {(["pendiente", "en_proceso", "finalizado", "entregado"] as const).map((k) => {
                  const filteredCount = pedidosFiltered.filter(
                    (p) => mapEstado(p.estado) === k
                  ).length;

                  return (
                    <div
                      key={k}
                      className={`p-3 rounded-xl border-l-4 cursor-pointer hover:shadow-xs transition ${statusColor(
                        k
                      )}`}
                      onClick={() => {
                        const items = pedidosFiltered.filter((p) => mapEstado(p.estado) === k);
                        openDrilldown(`${statusLabel(k)} • ${items.length}`, items);
                      }}
                    >
                      <span className="text-xs font-semibold block">{statusLabel(k)}</span>
                      <span className="text-2xl font-black mt-1 block">{filteredCount}</span>
                      <span className="text-[10px] text-slate-500">Click para ver listado</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ══════════════════════════════════════════════════════════
              SECCIÓN 6: MODAL DETALLE (DRILL-DOWN CON CSV)
             ══════════════════════════════════════════════════════════ */}
          <Modal open={modalOpen} title={modalTitle} onClose={() => setModalOpen(false)}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div className="flex-1">
                <Input
                  placeholder="Filtrar por paciente, doctor, prótesis, caja..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 text-xs"
                  onClick={() => {
                    downloadCSV(
                      `labdent_${modalTitle.replace(/\s+/g, "_")}.csv`,
                      modalFiltered.map((p) => ({
                        id: p.id,
                        numero_requerimiento: p.numero_requerimiento,
                        paciente: p.paciente_nombre,
                        doctor: p.doctor_nombre,
                        trabajo: p.trabajo_realizar,
                        caja: p.numero_caja,
                        estado: p.estado,
                        fecha_ingreso: p.fecha_ingreso,
                        total: p.total,
                        anticipo: p.anticipo,
                        saldo: Math.max(0, safeNum(p.total) - safeNum(p.anticipo)),
                      }))
                    );
                    toast.success("Listado descargado en CSV ✅");
                  }}
                >
                  <FileDown className="w-4 h-4" /> Exportar CSV
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-xs">
                <thead className="text-left text-slate-600 bg-slate-50 border-b">
                  <tr>
                    <th className="py-2.5 px-3">Req</th>
                    <th className="py-2.5 px-3">Caja</th>
                    <th className="py-2.5 px-3">Paciente</th>
                    <th className="py-2.5 px-3">Doctor</th>
                    <th className="py-2.5 px-3">Trabajo / Prótesis</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {modalFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400">
                        No hay pedidos en este grupo.
                      </td>
                    </tr>
                  ) : (
                    modalFiltered.map((p) => {
                      const est = mapEstado(p.estado);
                      const total = safeNum(p.total);
                      const anti = safeNum(p.anticipo);
                      const saldo = Math.max(0, total - anti);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-2 px-3 font-mono font-bold text-[#3C1C6C]">
                            {p.numero_requerimiento || "—"}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-700">
                            {p.numero_caja ? `#${p.numero_caja}` : "—"}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            {p.paciente_nombre || "—"}
                          </td>
                          <td className="py-2 px-3 text-slate-700">{p.doctor_nombre || "—"}</td>
                          <td className="py-2 px-3 font-medium text-slate-800">
                            {p.trabajo_realizar || "—"}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${chipCls(
                                est
                              )}`}
                            >
                              {statusLabel(est)}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-slate-900">
                            {fmtMoney(total)}
                          </td>
                          <td className="py-2 px-3 text-right font-extrabold text-rose-600">
                            {saldo > 0 ? fmtMoney(saldo) : "Bs 0.00"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
