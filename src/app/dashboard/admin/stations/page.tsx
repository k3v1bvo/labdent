"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Plus,
  Save,
  Trash2,
  RefreshCcw,
  Pencil,
  X,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Layers,
  Timer,
  CheckCircle2,
} from "lucide-react";

interface Estacion {
  id: string;
  nombre: string;
  orden: number;
  descripcion: string | null;
}

type StationStats = {
  total_historial: number;
  en_cola: number; // sin fecha_fin
  completadas_7d: number; // finalizadas/completadas en últimos 7 días
};

function toNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isCompletedState(raw: any) {
  const s = String(raw ?? "").toLowerCase().trim();
  return s === "completado" || s === "finalizado" || s === "terminado";
}

export default function AdminStationsPage() {
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [original, setOriginal] = useState<Estacion[]>([]);
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Estacion | null>(null);

  // form
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  // stats
  const [stats, setStats] = useState<Record<string, StationStats>>({});
  const [statsLoading, setStatsLoading] = useState(false);

  // DnD
  const dragIdRef = useRef<string | null>(null);

  const orderDirty = useMemo(() => {
    if (original.length !== estaciones.length) return false;
    const a = estaciones.map((s) => s.id).join("|");
    const b = original.map((s) => s.id).join("|");
    return a !== b;
  }, [estaciones, original]);

  async function fetchEstaciones() {
    setLoading(true);
    const { data, error } = await supabase
      .from("estaciones")
      .select("id, nombre, orden, descripcion")
      .order("orden", { ascending: true });

    if (!error) {
      const list = (data || []) as Estacion[];
      setEstaciones(list);
      setOriginal(list);
    }
    setLoading(false);
  }

  async function fetchStationStats() {
    setStatsLoading(true);

    const { data, error } = await supabase
      .from("historial_estaciones")
      .select("estacion_id,estado,fecha_fin")
      .order("fecha_fin", { ascending: false })
      .limit(12000);

    if (error) {
      console.warn("No se pudieron cargar stats de estaciones:", error);
      setStats({});
      setStatsLoading(false);
      return;
    }

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const agg: Record<string, StationStats> = {};
    for (const r of (data || []) as any[]) {
      const sid = r?.estacion_id ? String(r.estacion_id) : null;
      if (!sid) continue;

      if (!agg[sid]) {
        agg[sid] = { total_historial: 0, en_cola: 0, completadas_7d: 0 };
      }

      agg[sid].total_historial += 1;

      const fin = r?.fecha_fin ? new Date(String(r.fecha_fin)).getTime() : NaN;
      const hasFin = Number.isFinite(fin);

      if (!hasFin) {
        agg[sid].en_cola += 1;
      } else if (isCompletedState(r?.estado) && fin >= sevenDaysAgo) {
        agg[sid].completadas_7d += 1;
      }
    }

    setStats(agg);
    setStatsLoading(false);
  }

  async function refreshAll() {
    await fetchEstaciones();
    await fetchStationStats();
  }

  useEffect(() => {
    refreshAll();
  }, []);

  function openNew() {
    setEditing(null);
    setNombre("");
    setDescripcion("");
    setOpen(true);
  }

  function openEdit(est: Estacion) {
    setEditing(est);
    setNombre(est.nombre);
    setDescripcion(est.descripcion || "");
    setOpen(true);
  }

  async function saveStation() {
    if (!nombre.trim()) return;

    setSaving(true);

    if (editing) {
      await supabase
        .from("estaciones")
        .update({ nombre: nombre.trim(), descripcion })
        .eq("id", editing.id);
    } else {
      await supabase.from("estaciones").insert([
        {
          nombre: nombre.trim(),
          descripcion,
          orden: estaciones.length + 1,
        },
      ]);
    }

    setSaving(false);
    setOpen(false);
    await refreshAll();
  }

  async function handleDelete(est: Estacion) {
    if (!confirm(`¿Eliminar la estación "${est.nombre}"?`)) return;
    await supabase.from("estaciones").delete().eq("id", est.id);
    await refreshAll();
  }

  function reorderByIds(dragId: string, dropId: string) {
    if (dragId === dropId) return;

    setEstaciones((prev) => {
      const copy = [...prev];
      const from = copy.findIndex((x) => x.id === dragId);
      const to = copy.findIndex((x) => x.id === dropId);
      if (from < 0 || to < 0) return prev;

      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  }

  function moveStation(id: string, dir: -1 | 1) {
    setEstaciones((prev) => {
      const copy = [...prev];
      const idx = copy.findIndex((x) => x.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= copy.length) return prev;

      const tmp = copy[idx];
      copy[idx] = copy[next];
      copy[next] = tmp;
      return copy;
    });
  }

  async function persistOrder() {
    setSavingOrder(true);

    const updates = estaciones.map((s, i) =>
      supabase.from("estaciones").update({ orden: i + 1 }).eq("id", s.id)
    );

    const results = await Promise.all(updates);
    const anyErr = results.find((r) => r.error);

    setSavingOrder(false);

    if (anyErr?.error) {
      console.error("Error guardando orden:", anyErr.error);
      await fetchEstaciones();
      return;
    }

    await fetchEstaciones();
  }

  const totals = useMemo(() => {
    let enCola = 0;
    let totalHist = 0;
    let comp7 = 0;

    for (const e of estaciones) {
      const s = stats[e.id];
      if (!s) continue;
      enCola += toNum(s.en_cola);
      totalHist += toNum(s.total_historial);
      comp7 += toNum(s.completadas_7d);
    }
    return { enCola, totalHist, comp7 };
  }, [estaciones, stats]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-green-700">
            ⚙️ Gestión de Estaciones
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Reordena por drag & drop (o con botones) + estadísticas por estación.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refreshAll}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>

          <Button
            onClick={openNew}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva estación
          </Button>

          <Button
            onClick={persistOrder}
            disabled={!orderDirty || savingOrder}
            className={`${
              orderDirty ? "bg-slate-900 hover:bg-slate-800 text-white" : ""
            }`}
            variant={orderDirty ? "default" : "outline"}
          >
            {savingOrder ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando orden...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar orden
              </>
            )}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="py-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="w-4 h-4" /> Total historial (todas)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="text-2xl font-bold">
              {statsLoading ? "…" : totals.totalHist}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Registros en historial_estaciones
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="py-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Timer className="w-4 h-4" /> En cola (todas)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="text-2xl font-bold">
              {statsLoading ? "…" : totals.enCola}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Sin fecha_fin (trabajo abierto)
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="py-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Completadas (7 días)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="text-2xl font-bold">
              {statsLoading ? "…" : totals.comp7}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Estado completado/finalizado
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLE */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <CardTitle>Listado (arrastra para reordenar)</CardTitle>

          {orderDirty ? (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
              Cambios sin guardar: presiona <b>Guardar orden</b>
            </div>
          ) : (
            <div className="text-xs text-gray-500">
              Tip: también puedes usar ↑ ↓ para mover estaciones
            </div>
          )}
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          ) : estaciones.length === 0 ? (
            <p className="text-gray-500">No hay estaciones registradas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-24">Orden</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-[260px]">Métricas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {estaciones.map((est, idx) => {
                  const s = stats[est.id];
                  return (
                    <TableRow
                      key={est.id}
                      draggable
                      onDragStart={() => (dragIdRef.current = est.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        const dragId = dragIdRef.current;
                        if (dragId) reorderByIds(dragId, est.id);
                        dragIdRef.current = null;
                      }}
                      className="hover:bg-gray-50"
                    >
                      <TableCell className="text-gray-400">
                        <GripVertical className="w-4 h-4" />
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gray-100 text-sm font-semibold">
                            {idx + 1}
                          </span>

                          <div className="flex flex-col gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => moveStation(est.id, -1)}
                              disabled={idx === 0}
                              aria-label="Mover arriba"
                              title="Mover arriba"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => moveStation(est.id, 1)}
                              disabled={idx === estaciones.length - 1}
                              aria-label="Mover abajo"
                              title="Mover abajo"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="font-medium">{est.nombre}</TableCell>

                      <TableCell className="text-gray-600">
                        {est.descripcion || "—"}
                      </TableCell>

                      <TableCell>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="border rounded-xl p-2 bg-white">
                            <div className="text-[11px] text-gray-500">Hist</div>
                            <div className="font-semibold">
                              {statsLoading ? "…" : toNum(s?.total_historial)}
                            </div>
                          </div>
                          <div className="border rounded-xl p-2 bg-white">
                            <div className="text-[11px] text-gray-500">En cola</div>
                            <div className="font-semibold text-amber-700">
                              {statsLoading ? "…" : toNum(s?.en_cola)}
                            </div>
                          </div>
                          <div className="border rounded-xl p-2 bg-white">
                            <div className="text-[11px] text-gray-500">7d</div>
                            <div className="font-semibold text-green-700">
                              {statsLoading ? "…" : toNum(s?.completadas_7d)}
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-2">
                          Historial / abiertos / completadas últimos 7 días
                        </div>
                      </TableCell>

                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(est)}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(est)}
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <div className="mt-4 text-xs text-gray-500">
            ✅ Drag & drop sirve en mouse. Para táctil/teclado usa los botones ↑ ↓ y luego{" "}
            <b>Guardar orden</b>.
          </div>
        </CardContent>
      </Card>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-lg">
                {editing ? "Editar estación" : "Nueva estación"}
              </h2>

              {/* ⬇️ aquí también quitamos size="icon" */}
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium">Nombre *</label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Diseño CAD"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Descripción</label>
                <Textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={saveStation}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
