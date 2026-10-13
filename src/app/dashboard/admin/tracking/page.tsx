// src/app/dashboard/admin/tracking/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";

type Estacion = {
  id: string;
  nombre: string;
  orden: number;
};

type TrackingRow = {
  pedido_id: string;

  // pedido
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

  // tracking
  estacion_actual: string | null;
  estado_estacion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
};

function s(v: any) {
  return v == null ? null : String(v);
}

function badgeEstacion(estado?: string | null) {
  const e = (estado ?? "").toLowerCase();
  if (e === "completado") return { label: "Completado", Icon: CheckCircle2, cls: "bg-green-100 text-green-800" };
  if (e === "en_proceso") return { label: "En proceso", Icon: Clock, cls: "bg-blue-100 text-blue-800" };
  if (e === "pendiente") return { label: "Pendiente", Icon: Clock, cls: "bg-yellow-100 text-yellow-800" };
  if (e === "devuelto") return { label: "Devuelto", Icon: Clock, cls: "bg-red-100 text-red-800" };
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

// Semana: Lunes → Domingo (más “pro” para LatAm/EU)
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

function fmtLocal(ts?: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function TrackingPage() {
  const [rows, setRows] = useState<TrackingRow[]>([]);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ filtros como la imagen
  const [q, setQ] = useState("");
  const [estadoEstacion, setEstadoEstacion] = useState<string>("all");
  const [doctor, setDoctor] = useState<string>("all");
  const [estacion, setEstacion] = useState<string>("all");
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");

  // ✅ vista (Tarjetas/Tabla)
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // ✅ evita hydration por fechas/locale
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function fetchEstaciones() {
    const res = await supabase.from("estaciones").select("id,nombre,orden").order("orden", { ascending: true });
    if (res.error) {
      console.error(res.error);
      toast.error("❌ Error cargando estaciones");
      return;
    }
    setEstaciones((res.data as any) || []);
  }

  async function fetchTracking() {
    setLoading(true);

    // Si tu view aún no tiene algunos campos, cámbialo a select("*")
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
      toast.error("❌ Error cargando tracking");
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
      .channel("tracking-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "historial_estaciones" }, () => {
        fetchTracking();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getProgressByNombre(estacion_actual: string | null) {
    const name = estacion_actual ?? "";
    const index = estaciones.findIndex((e) => e.nombre === name);
    if (index === -1 || estaciones.length === 0) return 0;
    return Math.round(((index + 1) / estaciones.length) * 100);
  }

  async function handleAvanzar(pedido_id: string, estacion_actual: string | null) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const currentName = estacion_actual ?? "";
    const i = estaciones.findIndex((e) => e.nombre === currentName);
    if (i === -1) {
      toast.warning("No se encontró la estación actual.");
      return;
    }

    const siguiente = estaciones[i + 1];
    if (!siguiente) {
      toast.success("✅ Ya está en la última estación.");
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
      toast.error(`Error al avanzar: ${error.message}`);
      return;
    }

    toast.success("Estación avanzada correctamente.");
    fetchTracking();
  }

  // ✅ opciones para selects (de los datos actuales)
  const doctorOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const v = (r.doctor_nombre ?? "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const estacionOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const v = (r.estacion_actual ?? "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  // ✅ acciones rápidas como tu imagen
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
    setDoctor("all");
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
      if (estadoEstacion !== "all" && (r.estado_estacion ?? "").toLowerCase() !== estadoEstacion) return false;

      // doctor
      if (doctor !== "all" && (r.doctor_nombre ?? "") !== doctor) return false;

      // estación
      if (estacion !== "all" && (r.estacion_actual ?? "") !== estacion) return false;

      // rango fechas (usamos fecha_inicio)
      if (desdeMs != null || hastaMs != null) {
        const t = r.fecha_inicio ? new Date(r.fecha_inicio).getTime() : NaN;
        if (!Number.isFinite(t)) return false;
        if (desdeMs != null && t < desdeMs) return false;
        if (hastaMs != null && t > hastaMs) return false;
      }

      // búsqueda libre
      if (!squery) return true;

      const blob = [
        r.numero_requerimiento,
        r.paciente_nombre,
        r.doctor_nombre,
        r.estacion_actual,
        r.estado_estacion,
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
  }, [rows, q, estadoEstacion, doctor, estacion, desde, hasta]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#3C1C6C] flex items-center gap-2">
            📦 Seguimiento de Producción en Vivo
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Flujo de órdenes por estación técnica, avance porcentual y control operativo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={fetchTracking} className="rounded-xl border-slate-200">
            <RefreshCcw className="w-4 h-4 mr-2" /> Actualizar
          </Button>

          {/* Toggle Tarjetas/Tabla */}
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

      {/* Filtros (IGUAL idea a tu screenshot) */}
      <div className="bg-white border rounded-2xl shadow-sm p-5 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Buscar */}
          <div className="lg:col-span-1">
            <label className="text-sm text-gray-700 flex items-center gap-2 mb-2">
              <Search className="w-4 h-4" /> Buscar
            </label>
            <Input
              placeholder="Paciente, doctor, estación, estado..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {/* Estado estación */}
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

          {/* Doctor */}
          <div>
            <label className="text-sm text-gray-700 flex items-center gap-2 mb-2">
              <Stethoscope className="w-4 h-4" /> Doctor
            </label>
            <select
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 bg-white text-sm"
            >
              <option value="all">Todos</option>
              {doctorOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Estación */}
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

        {/* botones rango + desde/hasta */}
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
                    <TableHead>Doctor</TableHead>
                    <TableHead>Req</TableHead>
                    <TableHead>Estación</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
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
                        <TableCell>{r.doctor_nombre || "—"}</TableCell>
                        <TableCell>{r.numero_requerimiento || "—"}</TableCell>
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
                          {mounted ? fmtLocal(r.fecha_inicio) : "—"}
                        </TableCell>
                        <TableCell className="text-xs" suppressHydrationWarning>
                          {mounted ? fmtLocal(r.fecha_fin) : "—"}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            className="flex items-center gap-2 ml-auto"
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
                        <p className="text-lg font-semibold text-gray-900">
                          {r.paciente_nombre || "—"}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Doctor: <span className="font-medium">{r.doctor_nombre || "—"}</span>
                          {r.numero_requerimiento ? (
                            <>
                              {" "}
                              • Req: <span className="font-medium">{r.numero_requerimiento}</span>
                            </>
                          ) : null}
                        </p>
                      </div>

                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${b.cls}`}>
                        <Icon className="w-4 h-4" /> {b.label}
                      </span>
                    </div>

                    <div className="mt-4 rounded-xl border bg-gray-50 p-3">
                      <p className="text-xs font-semibold text-gray-700">Estación actual</p>
                      <p className="text-sm text-gray-900 mt-1">{r.estacion_actual || "—"}</p>

                      <div className="mt-3">
                        <Progress value={progress} className="h-2 bg-green-100" />
                        <p className="text-xs text-gray-600 mt-1">{progress}% completado</p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {r.trabajo_realizar || "—"}
                      </p>

                      <p className="text-xs text-gray-600">
                        Pieza: <span className="font-medium">{r.pieza_numero || "—"}</span> • Color:{" "}
                        <span className="font-medium">{r.color_pieza || "—"}</span> • Colímetro:{" "}
                        <span className="font-medium">{r.colimetro || "—"}</span> • Caja:{" "}
                        <span className="font-medium">{r.numero_caja || "—"}</span>
                      </p>

                      {r.observaciones && (
                        <p className="text-xs text-gray-700 whitespace-pre-wrap">{r.observaciones}</p>
                      )}

                      <p className="text-xs text-gray-500" suppressHydrationWarning>
                        Inicio: {mounted ? fmtLocal(r.fecha_inicio) : "—"} • Fin:{" "}
                        {mounted ? fmtLocal(r.fecha_fin) : "—"}
                      </p>
                    </div>

                    <div className="pt-3 flex justify-end">
                      <Button
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={() => handleAvanzar(r.pedido_id, r.estacion_actual)}
                      >
                        <ArrowRight className="w-4 h-4" /> Avanzar
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
