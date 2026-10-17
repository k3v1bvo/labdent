"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ViewToggle, { type ViewMode } from "@/components/common/ViewToggle";

import TaskDetailsDialog, {
  type TaskRowLite as TaskRow,
} from "@/components/technician/TaskDetailsDialog";

import {
  CalendarDays,
  Filter,
  Search,
  RefreshCcw,
  Hash,
  Ruler,
  Clock,
  Timer,
  Info,
  User,
  Phone,
  Stethoscope,
  Palette,
  Box,
  MessageSquareText,
} from "lucide-react";
import { Combobox } from "@/components/ui/combobox";

type PedidoLite = {
  id: string;
  paciente_nombre: string | null;

  paciente_telefono?: string | null;
  doctor_nombre?: string | null;
  doctor_telefono?: string | null;

  numero_requerimiento?: string | null;

  trabajo_realizar?: string | null;
  pieza_numero?: string | null;
  color_pieza?: string | null;
  colimetro?: string | null;
  numero_caja?: string | null;

  total?: number | null;
  anticipo?: number | null;

  observaciones?: string | null;
};

type RowDB = Omit<TaskRow, "pedidos"> & { pedidos?: PedidoLite | null };

function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function monthStartISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function formatDT(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function msToHuman(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function estadoBadge(estado: TaskRow["estado"]) {
  const base =
    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium";
  switch (estado) {
    case "pendiente":
      return (
        <span className={`${base} bg-gray-100 text-gray-700`}>
          <Clock className="w-3 h-3" /> Pendiente
        </span>
      );
    case "en_proceso":
      return (
        <span className={`${base} bg-blue-100 text-blue-800`}>
          <Timer className="w-3 h-3" /> En proceso
        </span>
      );
    case "completado":
      return (
        <span className={`${base} bg-green-100 text-green-800`}>
          ✅ Completado
        </span>
      );
    case "devuelto":
      return (
        <span className={`${base} bg-red-100 text-red-800`}>❌ Devuelto</span>
      );
    default:
      return (
        <span className={`${base} bg-gray-100 text-gray-700`}>{estado}</span>
      );
  }
}

export default function TechnicianHistoryPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // ✅ Toggle vista
  const [view, setView] = useState<ViewMode>("cards");

  // filtros
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState<"" | TaskRow["estado"]>("");
  const [q, setQ] = useState("");

  const [rows, setRows] = useState<RowDB[]>([]);

  // ✅ Dialog detalles (reutiliza componente)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<TaskRow | null>(null);

  function openDetail(r: RowDB) {
    setDetailRow(r as any);
    setDetailOpen(true);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      // default pro: últimos 30 días
      setFromDate(addDaysISO(-30));
      setToDate(todayISO());

      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, fromDate, toDate, status]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;

    return rows.filter((r) => {
      const p = r.pedidos;
      const blob = [
        p?.paciente_nombre,
        p?.paciente_telefono,
        p?.doctor_nombre,
        p?.doctor_telefono,
        p?.numero_requerimiento,
        p?.trabajo_realizar,
        p?.pieza_numero,
        p?.color_pieza,
        p?.colimetro,
        p?.numero_caja,
        p?.observaciones,
        r.estaciones?.nombre,
        r.comentarios,
        r.estado,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return blob.includes(qq);
    });
  }, [rows, q]);

  async function fetchHistory() {
    if (!userId) return;
    setLoading(true);

    let query = supabase
      .from("historial_estaciones")
      .select(
        `
        id, estado, comentarios, fecha_inicio, fecha_fin,
        estaciones ( nombre ),
        pedidos (
          id,
          paciente_nombre,
          paciente_telefono,
          doctor_nombre,
          doctor_telefono,
          numero_requerimiento,
          trabajo_realizar,
          pieza_numero,
          color_pieza,
          colimetro,
          numero_caja,
          total,
          anticipo,
          observaciones
        )
      `
      )
      .eq("tecnico_id", userId)
      .order("fecha_inicio", { ascending: false });

    if (fromDate) query = query.gte("fecha_inicio", `${fromDate}T00:00:00`);
    if (toDate) query = query.lte("fecha_inicio", `${toDate}T23:59:59`);
    if (status) query = query.eq("estado", status);

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      console.error(error);
      toast.error(`❌ Error cargando historial: ${error.message}`);
      return;
    }

    setRows((data as any) || []);
  }

  function clearFilters() {
    setFromDate("");
    setToDate("");
    setStatus("");
    setQ("");
  }

  if (loading) return <div className="p-6">Cargando...</div>;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            📚 Historial del Técnico
          </h1>
          <p className="text-sm text-muted-foreground">
            Revisa tus tareas anteriores con filtros, búsqueda y vistas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle value={view} onChange={setView} />
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/technician")}
          >
            Volver
          </Button>
          <Button variant="outline" onClick={fetchHistory}>
            <RefreshCcw className="w-4 h-4 mr-1" /> Refrescar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" /> Filtros
          </CardTitle>

          <div className="flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between">
            <div className="flex flex-col md:flex-row gap-2 md:items-end">
              <div>
                <p className="text-xs text-muted-foreground">Desde</p>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-[170px]"
                />
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Hasta</p>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-[170px]"
                />
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Estado</p>
                <Combobox
                  value={status}
                  onChange={(v) => setStatus(v as any)}
                  options={[
                    { value: "", label: "Todos los estados" },
                    { value: "pendiente", label: "Pendiente", badge: "⏳ Pendiente", badgeColor: "bg-slate-100 text-slate-800" },
                    { value: "en_proceso", label: "En proceso", badge: "⚙️ Proceso", badgeColor: "bg-blue-100 text-blue-800" },
                    { value: "completado", label: "Completado", badge: "✅ Conforme", badgeColor: "bg-emerald-100 text-emerald-800" },
                    { value: "devuelto", label: "Devuelto", badge: "❌ Observado", badgeColor: "bg-rose-100 text-rose-800" },
                  ]}
                  className="w-48"
                  searchable={false}
                />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => {
                  const t = todayISO();
                  setFromDate(t);
                  setToDate(t);
                }}
              >
                Hoy
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setFromDate(addDaysISO(-7));
                  setToDate(todayISO());
                }}
              >
                Últimos 7 días
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setFromDate(monthStartISO());
                  setToDate(todayISO());
                }}
              >
                Este mes
              </Button>

              <Button variant="outline" onClick={clearFilters}>
                Limpiar
              </Button>
            </div>
          </div>

          <div className="relative max-w-xl">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar: paciente, doctor, requerimiento, trabajo, pieza, color..."
              className="pl-9"
            />
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Filtra por <span className="font-semibold">fecha_inicio</span> del
            historial.
          </p>
        </CardHeader>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Resultados:{" "}
          <span className="font-semibold text-slate-900">
            {filtered.length}
          </span>
        </p>
      </div>

      {filtered.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No hay registros con esos filtros.
          </CardContent>
        </Card>
      ) : view === "cards" ? (
        <div className="space-y-4">
          {filtered.map((r) => {
            const p = r.pedidos;

            const start = r.fecha_inicio ? new Date(r.fecha_inicio).getTime() : null;
            const end = r.fecha_fin ? new Date(r.fecha_fin).getTime() : null;
            const duration = start && end ? msToHuman(end - start) : "—";

            const req = p?.numero_requerimiento?.trim() || "";

            return (
              <Card
                key={r.id}
                className="shadow-sm hover:shadow-md transition rounded-2xl"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-base">
                          {p?.paciente_nombre?.trim() || "Pedido"}
                        </p>

                        {req && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                            <Hash className="w-3 h-3" /> {req}
                          </span>
                        )}

                        {estadoBadge(r.estado)}

                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                          <Ruler className="w-3 h-3" />{" "}
                          {r.estaciones?.nombre || "—"}
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Inicio: {formatDT(r.fecha_inicio)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Fin: {formatDT(r.fecha_fin)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Timer className="w-3 h-3" /> Duración: {duration}
                        </span>
                      </div>
                    </div>

                    <Button variant="outline" onClick={() => openDetail(r)}>
                      <Info className="w-4 h-4 mr-2" /> Ver detalles
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="border rounded-xl p-3 bg-white">
                      <p className="text-xs text-muted-foreground font-semibold mb-2">
                        Persona
                      </p>

                      <p className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Paciente:</span>{" "}
                        <span className="font-medium">{p?.paciente_nombre || "—"}</span>
                      </p>

                      {p?.paciente_telefono ? (
                        <p className="flex items-center gap-2 mt-1">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Tel:</span>{" "}
                          <span className="font-medium">{p.paciente_telefono}</span>
                        </p>
                      ) : null}

                      <p className="flex items-center gap-2 mt-2">
                        <Stethoscope className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Doctor:</span>{" "}
                        <span className="font-medium">{p?.doctor_nombre || "—"}</span>
                      </p>

                      {p?.doctor_telefono ? (
                        <p className="flex items-center gap-2 mt-1">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Tel:</span>{" "}
                          <span className="font-medium">{p.doctor_telefono}</span>
                        </p>
                      ) : null}
                    </div>

                    <div className="border rounded-xl p-3 bg-white">
                      <p className="text-xs text-muted-foreground font-semibold mb-2">
                        Trabajo
                      </p>

                      <p>
                        <span className="text-muted-foreground">Trabajo:</span>{" "}
                        <span className="font-medium">{p?.trabajo_realizar || "—"}</span>
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <Ruler className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Pieza:</span>{" "}
                          <span className="font-medium">{p?.pieza_numero || "—"}</span>
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <Palette className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Color:</span>{" "}
                          <span className="font-medium">{p?.color_pieza || "—"}</span>
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <Ruler className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Colímetro:</span>{" "}
                          <span className="font-medium">{p?.colimetro || "—"}</span>
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <Box className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Caja:</span>{" "}
                          <span className="font-medium">{p?.numero_caja || "—"}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {(p?.observaciones || r.comentarios) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {p?.observaciones && (
                        <div className="border rounded-xl p-3 bg-slate-50">
                          <p className="text-xs text-muted-foreground font-semibold mb-1">
                            Observaciones del pedido
                          </p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {p.observaciones}
                          </p>
                        </div>
                      )}

                      {r.comentarios && (
                        <div className="border rounded-xl p-3 bg-slate-50">
                          <p className="text-xs text-muted-foreground font-semibold mb-1 flex items-center gap-2">
                            <MessageSquareText className="w-4 h-4" /> Comentario técnico
                          </p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {r.comentarios}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-2xl bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left">
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Req</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Estación</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Inicio</th>
                <th className="px-4 py-3">Fin</th>
                <th className="px-4 py-3">Duración</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const p = r.pedidos;

                const start = r.fecha_inicio ? new Date(r.fecha_inicio).getTime() : null;
                const end = r.fecha_fin ? new Date(r.fecha_fin).getTime() : null;
                const duration = start && end ? msToHuman(end - start) : "—";

                return (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p?.paciente_nombre || "—"}</td>
                    <td className="px-4 py-3">{p?.numero_requerimiento || "—"}</td>
                    <td className="px-4 py-3">{p?.doctor_nombre || "—"}</td>
                    <td className="px-4 py-3">{r.estaciones?.nombre || "—"}</td>
                    <td className="px-4 py-3">{estadoBadge(r.estado)}</td>
                    <td className="px-4 py-3">{formatDT(r.fecha_inicio)}</td>
                    <td className="px-4 py-3">{formatDT(r.fecha_fin)}</td>
                    <td className="px-4 py-3">{duration}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" onClick={() => openDetail(r)}>
                        <Info className="w-4 h-4 mr-2" /> Ver detalles
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ✅ DIALOG DE DETALLES REUSABLE */}
      <TaskDetailsDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        row={detailRow}
      />
    </div>
  );
}
