"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Progress } from "@/components/ui/progress";
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
  Hash,
  User,
  Ruler,
} from "lucide-react";

type Estacion = {
  id: string;
  nombre: string;
  orden: number;
};

type PedidoBase = {
  id: string;
  paciente_nombre: string | null;
  numero_requerimiento: string | null;
  estado: string | null;
  fecha_creacion: string | null;
  fecha_entrega: string | null;
};

type TrackingLite = {
  pedido_id: string;
  estacion_actual: string | null;
  estado_estacion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
};

type DoctorOrderRow = {
  pedido_id: string;

  paciente_nombre: string | null;
  numero_requerimiento: string | null;

  estado_pedido: string | null;

  estacion_actual: string | null;
  estado_estacion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;

  fecha_creacion: string | null;
  fecha_entrega: string | null;
};

function s(v: any) {
  return v == null ? null : String(v);
}

function badgeEstacion(estado?: string | null) {
  const e = (estado ?? "").toLowerCase();
  if (e === "completado")
    return { label: "Completado", Icon: CheckCircle2, cls: "bg-green-100 text-green-800" };
  if (e === "en_proceso")
    return { label: "En proceso", Icon: Clock, cls: "bg-blue-100 text-blue-800" };
  if (e === "pendiente")
    return { label: "Pendiente", Icon: Clock, cls: "bg-yellow-100 text-yellow-800" };
  if (e === "devuelto")
    return { label: "Devuelto", Icon: Clock, cls: "bg-red-100 text-red-800" };

  return { label: estado || "—", Icon: Clock, cls: "bg-gray-100 text-gray-700" };
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

// Semana: Lunes → Domingo
function startOfWeekMonday(d: Date) {
  const day = d.getDay(); // 0 dom ... 6 sáb
  const diff = (day === 0 ? -6 : 1) - day; // lunes = 1
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

function fmtLocalDate(ts?: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function fmtLocal(ts?: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function DoctorOrdersPage() {
  const [rows, setRows] = useState<DoctorOrderRow[]>([]);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ filtros (igual tracking)
  const [q, setQ] = useState("");
  const [estadoEstacion, setEstadoEstacion] = useState<string>("all");
  const [estacion, setEstacion] = useState<string>("all");
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");

  // ✅ vista Tarjetas/Tabla
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // ✅ evita hydration por fechas/locale
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function fetchEstaciones() {
    const res = await supabase
      .from("estaciones")
      .select("id,nombre,orden")
      .order("orden", { ascending: true });

    if (res.error) {
      console.error(res.error);
      toast.error("❌ Error cargando estaciones");
      setEstaciones([]);
      return [] as Estacion[];
    }

    const list = ((res.data as any) || []) as Estacion[];
    setEstaciones(list);
    return list;
  }

  async function getDoctorKey(profileId: string) {
    const { data: doctor, error: doctorError } = await supabase
      .from("doctores")
      .select("id")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (doctorError) console.warn("⚠️ Error buscando doctor en doctores:", doctorError);

    if (doctor?.id) return { primary: String(doctor.id), fallback: profileId };

    console.warn("⚠️ No se encontró doctor en doctores. Usando fallback: user.id");
    return { primary: profileId, fallback: null as string | null };
  }

  function getProgressByNombre(estacion_actual: string | null) {
    const name = (estacion_actual ?? "").trim();
    const index = estaciones.findIndex((e) => e.nombre === name);
    if (index === -1 || estaciones.length === 0) return 0;
    return Math.round(((index + 1) / estaciones.length) * 100);
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

    // ✅ estaciones primero (para progreso)
    await fetchEstaciones();

    const { primary, fallback } = await getDoctorKey(user.id);

    // Buscar pedidos por doctor_id o creado_por para máxima fiabilidad
    let query = supabase
      .from("pedidos")
      .select("id,paciente_nombre,numero_requerimiento,estado,fecha_creacion,fecha_entrega")
      .order("fecha_creacion", { ascending: false });

    if (fallback && fallback !== primary) {
      query = query.or(`doctor_id.eq.${primary},doctor_id.eq.${fallback},creado_por.eq.${user.id}`);
    } else {
      query = query.or(`doctor_id.eq.${primary},creado_por.eq.${user.id}`);
    }

    let pedidosRes = await query;

    if (pedidosRes.error) {
      console.error(pedidosRes.error);
      toast.error(`❌ Error cargando pedidos: ${pedidosRes.error.message}`);
      setRows([]);
      setLoading(false);
      return;
    }

    const pedidos = ((pedidosRes.data as any) || []) as PedidoBase[];

    if (pedidos.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    // ✅ TRACKING REAL (igual que tracking admin) usando vw_tracking_pedidos
    // Solo para los pedidos del doctor (IN)
    const pedidoIds = pedidos.map((p) => String(p.id));

    const trackingRes = await supabase
      .from("vw_tracking_pedidos")
      .select("pedido_id,estacion_actual,estado_estacion,fecha_inicio,fecha_fin")
      .in("pedido_id", pedidoIds);

    if (trackingRes.error) {
      console.error(trackingRes.error);
      toast.error(`❌ Error cargando tracking: ${trackingRes.error.message}`);
      // Aun así mostramos pedidos sin tracking
    }

    const trackingList: TrackingLite[] = ((trackingRes.data as any) || []).map((r: any) => ({
      pedido_id: String(r.pedido_id),
      estacion_actual: s(r.estacion_actual),
      estado_estacion: s(r.estado_estacion),
      fecha_inicio: s(r.fecha_inicio),
      fecha_fin: s(r.fecha_fin),
    }));

    const trackingMap = new Map<string, TrackingLite>();
    trackingList.forEach((t) => trackingMap.set(String(t.pedido_id), t));

    const merged: DoctorOrderRow[] = pedidos.map((p) => {
      const t = trackingMap.get(String(p.id));

      return {
        pedido_id: String(p.id),

        paciente_nombre: s(p.paciente_nombre),
        numero_requerimiento: s((p as any).numero_requerimiento),

        estado_pedido: s((p as any).estado),

        estacion_actual: t?.estacion_actual ?? "Pendiente",
        estado_estacion: t?.estado_estacion ?? "pendiente",
        fecha_inicio: t?.fecha_inicio ?? null,
        fecha_fin: t?.fecha_fin ?? null,

        fecha_creacion: s((p as any).fecha_creacion),
        fecha_entrega: s((p as any).fecha_entrega),
      };
    });

    setRows(merged);
    setLoading(false);
  }

  useEffect(() => {
    fetchDoctorOrders();

    const channel = supabase
      .channel("doctor-orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "historial_estaciones" }, () => {
        fetchDoctorOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ opciones select estación (de datos)
  const estacionOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const v = (r.estacion_actual ?? "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  // ✅ acciones rápidas
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
  function setUltDias(n: number) {
    const now = new Date();
    const end = startOfDay(now);
    const start = new Date(end);
    start.setDate(end.getDate() - (n - 1));
    setDesde(toYMD(start));
    setHasta(toYMD(end));
  }
  function limpiar() {
    setQ("");
    setEstadoEstacion("all");
    setEstacion("all");
    setDesde("");
    setHasta("");
  }

  const filtered = useMemo(() => {
    const squery = q.trim().toLowerCase();

    const desdeMs = desde ? new Date(`${desde}T00:00:00`).getTime() : null;
    const hastaMs = hasta ? new Date(`${hasta}T23:59:59`).getTime() : null;

    return rows.filter((r) => {
      // estado estación
      if (estadoEstacion !== "all" && (r.estado_estacion ?? "").toLowerCase() !== estadoEstacion) {
        return false;
      }

      // estación
      if (estacion !== "all" && (r.estacion_actual ?? "") !== estacion) {
        return false;
      }

      // rango fechas por fecha_creacion
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
        r.estacion_actual,
        r.estado_estacion,
        r.estado_pedido,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return blob.includes(squery);
    });
  }, [rows, q, estadoEstacion, estacion, desde, hasta]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#3C1C6C] flex items-center gap-2">
            📋 Mis Órdenes y Trabajos en Curso
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Seguimiento clínico en tiempo real por estación, avance y fecha de entrega.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={fetchDoctorOrders} className="rounded-xl border-slate-200">
            <RefreshCcw className="w-4 h-4 mr-2" /> Actualizar
          </Button>

          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === "cards" ? "bg-[#3C1C6C] text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
              aria-pressed={viewMode === "cards"}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Tarjetas
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === "table" ? "bg-[#3C1C6C] text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
              aria-pressed={viewMode === "table"}
            >
              <Table2 className="w-3.5 h-3.5" /> Tabla
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border rounded-2xl shadow-sm p-5 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <label className="text-sm text-gray-700 flex items-center gap-2 mb-2">
              <Search className="w-4 h-4" /> Buscar
            </label>
            <Input
              placeholder="Paciente, requerimiento, estación, estado..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-gray-700 flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4" /> Estado estación
            </label>
            <select
              value={estadoEstacion}
              onChange={(e) => setEstadoEstacion(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 bg-white text-sm"
            >
              <option value="all">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_proceso">En proceso</option>
              <option value="completado">Completado</option>
              <option value="devuelto">Devuelto</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-700 flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4" /> Estación
            </label>
            <select
              value={estacion}
              onChange={(e) => setEstacion(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 bg-white text-sm"
            >
              <option value="all">Todas</option>
              {estacionOptions.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          <div className="lg:col-span-2 flex flex-wrap gap-2">
            <Button variant="outline" onClick={setHoy}>
              Hoy
            </Button>
            <Button variant="outline" onClick={setSemana}>
              Semana
            </Button>
            <Button className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white font-bold rounded-xl" onClick={setMes}>
              Mes
            </Button>
            <Button variant="outline" onClick={setAnio}>
              Año
            </Button>

            <div className="w-px h-9 bg-gray-200 mx-2 hidden sm:block" />

            <Button variant="outline" onClick={() => setUltDias(7)}>
              Últ 7d
            </Button>
            <Button variant="outline" onClick={() => setUltDias(30)}>
              Últ 30d
            </Button>
            <Button variant="outline" onClick={() => setUltDias(90)}>
              Últ 90d
            </Button>

            <Button variant="outline" onClick={limpiar} className="flex items-center gap-2">
              ✕ Limpiar
            </Button>
          </div>

          <div>
            <label className="text-sm text-gray-700 flex items-center gap-2 mb-2">
              <CalendarIcon className="w-4 h-4" /> Desde
            </label>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>

          <div>
            <label className="text-sm text-gray-700 flex items-center gap-2 mb-2">
              <CalendarIcon className="w-4 h-4" /> Hasta
            </label>
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-3">Mostrando: {filtered.length} pedidos</p>
      </div>

      {/* Contenido */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Progreso de Producción</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin w-8 h-8 text-green-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border rounded-2xl p-8 text-gray-600 text-center">
              No hay pedidos para mostrar.
            </div>
          ) : viewMode === "table" ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Req</TableHead>
                    <TableHead>Estación</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead>Inicio estación</TableHead>
                    <TableHead>Fin estación</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filtered.map((r) => {
                    const progress = getProgressByNombre(r.estacion_actual);
                    const b = badgeEstacion(r.estado_estacion);
                    const Icon = b.Icon;

                    return (
                      <TableRow key={r.pedido_id}>
                        <TableCell className="font-medium">{r.paciente_nombre || "—"}</TableCell>

                        <TableCell>
                          {r.numero_requerimiento ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                              <Hash className="w-3 h-3" /> {r.numero_requerimiento}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>

                        <TableCell>{r.estacion_actual || "—"}</TableCell>

                        <TableCell className="min-w-[220px]">
                          <Progress value={progress} className="h-2 bg-green-100" />
                          <p className="text-xs text-gray-600 mt-1">{progress}%</p>
                        </TableCell>

                        <TableCell>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${b.cls}`}>
                            <Icon className="w-4 h-4" /> {b.label}
                          </span>
                        </TableCell>

                        <TableCell className="text-xs" suppressHydrationWarning>
                          {mounted ? fmtLocalDate(r.fecha_creacion) : "—"}
                        </TableCell>

                        <TableCell className="text-xs" suppressHydrationWarning>
                          {mounted ? fmtLocal(r.fecha_inicio) : "—"}
                        </TableCell>

                        <TableCell className="text-xs" suppressHydrationWarning>
                          {mounted ? fmtLocal(r.fecha_fin) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map((r) => {
                const progress = getProgressByNombre(r.estacion_actual);
                const b = badgeEstacion(r.estado_estacion);
                const Icon = b.Icon;

                return (
                  <div
                    key={r.pedido_id}
                    className="bg-white border rounded-2xl shadow-sm hover:shadow-md transition-shadow p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {r.paciente_nombre || "—"}
                        </p>

                        <p className="text-xs text-gray-600 mt-1 flex flex-wrap gap-2 items-center">
                          {r.numero_requerimiento ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                              <Hash className="w-3 h-3" /> {r.numero_requerimiento}
                            </span>
                          ) : null}

                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                            <Ruler className="w-3 h-3" /> {r.estacion_actual || "—"}
                          </span>
                        </p>
                      </div>

                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${b.cls}`}>
                        <Icon className="w-4 h-4" /> {b.label}
                      </span>
                    </div>

                    <div className="mt-4 rounded-xl border bg-gray-50 p-3">
                      <p className="text-xs font-semibold text-gray-700">Progreso</p>

                      <div className="mt-2">
                        <Progress value={progress} className="h-2 bg-green-100" />
                        <p className="text-xs text-gray-600 mt-1">{progress}% completado</p>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-500" suppressHydrationWarning>
                      Creado: {mounted ? fmtLocalDate(r.fecha_creacion) : "—"} • Inicio estación:{" "}
                      {mounted ? fmtLocal(r.fecha_inicio) : "—"} • Fin estación:{" "}
                      {mounted ? fmtLocal(r.fecha_fin) : "—"}
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
