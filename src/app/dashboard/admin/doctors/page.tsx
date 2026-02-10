"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Edit,
  Trash2,
  Search,
  Calendar,
  Phone,
  User,
  Building2,
  Stethoscope,
  RefreshCcw,
  X,
} from "lucide-react";

/** ======================
 * Helpers fecha presets
 * ====================== */
function toYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type RangePreset = "custom" | "hoy" | "semana" | "mes" | "anio" | "ult7" | "ult30" | "ult90";

function getPresetRange(p: Exclude<RangePreset, "custom">) {
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());

  if (p === "hoy") {
    const d = startOfDay(now);
    return { desde: toYYYYMMDD(d), hasta: toYYYYMMDD(d) };
  }

  if (p === "semana") {
    // Semana Lunes-Domingo
    const d = startOfDay(now);
    const day = d.getDay(); // 0=Dom,1=Lun...
    const diffToMonday = (day + 6) % 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return { desde: toYYYYMMDD(monday), hasta: toYYYYMMDD(sunday) };
  }

  if (p === "mes") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { desde: toYYYYMMDD(first), hasta: toYYYYMMDD(last) };
  }

  if (p === "anio") {
    const first = new Date(now.getFullYear(), 0, 1);
    const last = new Date(now.getFullYear(), 11, 31);
    return { desde: toYYYYMMDD(first), hasta: toYYYYMMDD(last) };
  }

  // últimos X días
  const daysMap: Record<"ult7" | "ult30" | "ult90", number> = { ult7: 7, ult30: 30, ult90: 90 };
  const days = daysMap[p as "ult7" | "ult30" | "ult90"];
  const start = startOfDay(now);
  start.setDate(start.getDate() - (days - 1));
  const end = startOfDay(now);
  return { desde: toYYYYMMDD(start), hasta: toYYYYMMDD(end) };
}

/** ======================
 * Tipos
 * ====================== */
type DoctorRow = {
  id: string;
  profile_id: string | null;
  clinica: string | null;
  especialidad: string | null;
  created_at: string;

  profiles: {
    id: string;
    nombre: string;
    telefono: string | null;
  } | null;
};

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("es-ES");
  } catch {
    return d;
  }
}

export default function AdminDoctorsPage() {
  const [loading, setLoading] = useState(true);
  const [doctores, setDoctores] = useState<DoctorRow[]>([]);

  // filtros
  const [q, setQ] = useState("");
  const [rangePreset, setRangePreset] = useState<RangePreset>("custom");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<DoctorRow | null>(null);

  // forms
  const [createForm, setCreateForm] = useState({
    nombre_o_clinica: "",
    especialidad: "",
  });

  const [editForm, setEditForm] = useState({
    nombre: "",
    telefono: "",
    clinica: "",
    especialidad: "",
  });

  useEffect(() => {
    // preset por defecto: mes actual (se ve PRO y útil)
    const r = getPresetRange("mes");
    setRangePreset("mes");
    setDesde(r.desde);
    setHasta(r.hasta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchDoctores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta]);

  function applyPreset(p: Exclude<RangePreset, "custom">) {
    const r = getPresetRange(p);
    setRangePreset(p);
    setDesde(r.desde);
    setHasta(r.hasta);
  }

  async function fetchDoctores() {
    setLoading(true);

    let query = supabase
      .from("doctores")
      .select(
        `
        id,
        profile_id,
        clinica,
        especialidad,
        created_at,
        profiles:profile_id (
          id,
          nombre,
          telefono
        )
      `
      )
      .order("created_at", { ascending: false });

    // rango fechas (created_at)
    if (desde) query = query.gte("created_at", `${desde}T00:00:00`);
    if (hasta) query = query.lte("created_at", `${hasta}T23:59:59`);

    const { data, error } = await query;

    if (error) {
      console.error("fetchDoctores error:", error);
      toast.error("❌ Error al obtener doctores");
      setLoading(false);
      return;
    }

    const typed: DoctorRow[] = (data ?? []).map((r: any) => ({
      id: String(r.id),
      profile_id: r.profile_id ?? null,
      clinica: r.clinica ?? null,
      especialidad: r.especialidad ?? null,
      created_at: String(r.created_at ?? ""),
      profiles: r.profiles
        ? {
            id: String(r.profiles.id),
            nombre: String(r.profiles.nombre ?? ""),
            telefono: r.profiles.telefono ?? null,
          }
        : null,
    }));

    setDoctores(typed);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return doctores;

    return doctores.filter((d) => {
      const name = d.profiles?.nombre ?? d.clinica ?? "";
      const phone = d.profiles?.telefono ?? "";
      const blob = [name, phone, d.clinica, d.especialidad, d.created_at]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(s);
    });
  }, [doctores, q]);

  function openCreate() {
    setCreateForm({ nombre_o_clinica: "", especialidad: "" });
    setCreateOpen(true);
  }

  function openEdit(doc: DoctorRow) {
    setEditing(doc);

    const displayName = doc.profiles?.nombre ?? doc.clinica ?? "";
    const displayPhone = doc.profiles?.telefono ?? "";

    setEditForm({
      nombre: displayName,
      telefono: displayPhone,
      clinica: doc.clinica ?? "",
      especialidad: doc.especialidad ?? "",
    });

    setEditOpen(true);
  }

  async function handleCreate() {
    const name = createForm.nombre_o_clinica.trim();
    if (!name) {
      toast.error("Escribe el nombre o clínica del doctor");
      return;
    }

    // Creamos un doctor “directorio” (sin cuenta), usando clinica como nombre/clinica
    const { error } = await supabase.from("doctores").insert([
      {
        profile_id: null,
        clinica: name,
        especialidad: createForm.especialidad.trim() || null,
      },
    ]);

    if (error) {
      console.error("create doctor error:", error);
      toast.error("❌ No se pudo crear el doctor");
      return;
    }

    toast.success("✅ Doctor creado");
    setCreateOpen(false);
    fetchDoctores();
  }

  async function handleSaveEdit() {
    if (!editing) return;

    const nextNombre = editForm.nombre.trim();
    const nextTelefono = editForm.telefono.trim();
    const nextClinica = editForm.clinica.trim();
    const nextEspecialidad = editForm.especialidad.trim();

    if (!nextNombre) {
      toast.error("El nombre no puede estar vacío");
      return;
    }

    // 1) Actualizar doctores (clinica/especialidad)
    const { error: docErr } = await supabase
      .from("doctores")
      .update({
        clinica: nextClinica || null,
        especialidad: nextEspecialidad || null,
      })
      .eq("id", editing.id);

    if (docErr) {
      console.error("update doctores error:", docErr);
      toast.error("❌ Error guardando doctor");
      return;
    }

    // 2) Si está ligado a profiles (doctor con cuenta), actualizar nombre/telefono en profiles
    if (editing.profile_id) {
      const { error: профErr } = await supabase
        .from("profiles")
        .update({
          nombre: nextNombre,
          telefono: nextTelefono || null,
        })
        .eq("id", editing.profile_id);

      if (профErr) {
        console.error("update profiles error:", профErr);
        toast.error("⚠️ Se guardó doctor, pero falló actualizar el perfil");
        // igual cerramos, porque doctores ya se actualizó
      }
    } else {
      // doctor sin cuenta: guardamos el nombre en clinica si clinica estaba vacío
      // (para que no se pierda lo que editó)
      if (!nextClinica) {
        await supabase.from("doctores").update({ clinica: nextNombre }).eq("id", editing.id);
      }
    }

    toast.success("✅ Cambios guardados");
    setEditOpen(false);
    setEditing(null);
    fetchDoctores();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Seguro que deseas eliminar este doctor?")) return;

    const { error } = await supabase.from("doctores").delete().eq("id", id);

    if (error) {
      console.error("delete doctor error:", error);
      toast.error("❌ Error al eliminar");
      return;
    }

    toast.success("✅ Doctor eliminado");
    fetchDoctores();
  }

  function clearFilters() {
    setQ("");
    setRangePreset("custom");
    setDesde("");
    setHasta("");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-green-700 flex items-center gap-2">
            <Stethoscope className="w-7 h-7" /> Gestión de Doctores
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Administra doctores (con cuenta o directorio) y filtra por fecha de registro.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDoctores}>
            <RefreshCcw className="w-4 h-4 mr-2" /> Refrescar
          </Button>
          <Button className="bg-green-700 hover:bg-green-800 text-white" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo Doctor
          </Button>
        </div>
      </div>

      {/* Filtros PRO */}
      <Card className="border shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Buscar */}
            <div className="lg:col-span-5">
              <label className="text-xs text-gray-600 flex items-center gap-2 mb-1">
                <Search className="w-4 h-4" /> Buscar
              </label>
              <Input
                placeholder="Nombre, teléfono, clínica, especialidad..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {/* Presets + fechas */}
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Button
                  type="button"
                  variant={rangePreset === "hoy" ? "default" : "outline"}
                  onClick={() => applyPreset("hoy")}
                  className={rangePreset === "hoy" ? "bg-green-700 hover:bg-green-800 text-white" : ""}
                >
                  Hoy
                </Button>

                <Button
                  type="button"
                  variant={rangePreset === "semana" ? "default" : "outline"}
                  onClick={() => applyPreset("semana")}
                  className={rangePreset === "semana" ? "bg-green-700 hover:bg-green-800 text-white" : ""}
                >
                  Semana
                </Button>

                <Button
                  type="button"
                  variant={rangePreset === "mes" ? "default" : "outline"}
                  onClick={() => applyPreset("mes")}
                  className={rangePreset === "mes" ? "bg-green-700 hover:bg-green-800 text-white" : ""}
                >
                  Mes
                </Button>

                <Button
                  type="button"
                  variant={rangePreset === "anio" ? "default" : "outline"}
                  onClick={() => applyPreset("anio")}
                  className={rangePreset === "anio" ? "bg-green-700 hover:bg-green-800 text-white" : ""}
                >
                  Año
                </Button>

                <div className="w-px h-6 bg-gray-200 mx-1" />

                <Button
                  type="button"
                  variant={rangePreset === "ult7" ? "default" : "outline"}
                  onClick={() => applyPreset("ult7")}
                  className={rangePreset === "ult7" ? "bg-green-700 hover:bg-green-800 text-white" : ""}
                >
                  Últ 7d
                </Button>

                <Button
                  type="button"
                  variant={rangePreset === "ult30" ? "default" : "outline"}
                  onClick={() => applyPreset("ult30")}
                  className={rangePreset === "ult30" ? "bg-green-700 hover:bg-green-800 text-white" : ""}
                >
                  Últ 30d
                </Button>

                <Button
                  type="button"
                  variant={rangePreset === "ult90" ? "default" : "outline"}
                  onClick={() => applyPreset("ult90")}
                  className={rangePreset === "ult90" ? "bg-green-700 hover:bg-green-800 text-white" : ""}
                >
                  Últ 90d
                </Button>

                <Button type="button" variant="outline" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-2" /> Limpiar
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4" /> Desde
                  </label>
                  <Input
                    type="date"
                    value={desde}
                    onChange={(e) => {
                      setRangePreset("custom");
                      setDesde(e.target.value);
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4" /> Hasta
                  </label>
                  <Input
                    type="date"
                    value={hasta}
                    onChange={(e) => {
                      setRangePreset("custom");
                      setHasta(e.target.value);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* contador */}
          <div className="text-xs text-gray-500">
            Mostrando: <span className="font-semibold text-gray-700">{filtered.length}</span> doctores
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Listado</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin w-8 h-8 text-green-600" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-gray-500">No hay doctores para mostrar.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map((doc) => {
                const displayName = doc.profiles?.nombre ?? doc.clinica ?? "—";
                const displayPhone = doc.profiles?.telefono ?? "—";
                const isAccount = !!doc.profile_id;

                return (
                  <div
                    key={doc.id}
                    className="border rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Header card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="truncate">{displayName}</span>
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {displayPhone}
                          </span>

                          <span className="inline-flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {doc.clinica || "—"}
                          </span>

                          <span className="inline-flex items-center gap-1">
                            <Stethoscope className="w-3.5 h-3.5" />
                            {doc.especialidad || "—"}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-xs px-2 py-1 rounded-full border ${
                          isAccount ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700"
                        }`}
                        title={isAccount ? "Doctor con cuenta (perfil)" : "Doctor directorio (sin cuenta)"}
                      >
                        {isAccount ? "Con cuenta" : "Directorio"}
                      </span>
                    </div>

                    {/* Footer card */}
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-500">
                        Registrado: <span className="font-medium text-gray-700">{fmtDate(doc.created_at)}</span>
                      </p>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(doc)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </Button>

                        <Button variant="destructive" size="sm" onClick={() => handleDelete(doc.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {!isAccount && (
                      <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                        ℹ️ Este doctor no tiene cuenta ligada (profile). El teléfono suele venir de los pedidos.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============ Dialog: Crear ============ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Doctor</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-sm">Nombre / Clínica *</label>
              <Input
                value={createForm.nombre_o_clinica}
                onChange={(e) => setCreateForm((p) => ({ ...p, nombre_o_clinica: e.target.value }))}
                placeholder="Ej: Dr. Juan Pérez / Clínica Central"
              />
            </div>

            <div>
              <label className="text-sm">Especialidad</label>
              <Input
                value={createForm.especialidad}
                onChange={(e) => setCreateForm((p) => ({ ...p, especialidad: e.target.value }))}
                placeholder="Ej: Rehabilitación oral"
              />
            </div>

            <p className="text-xs text-gray-500">
              Nota: Si quieres teléfono aquí, lo ideal es agregarlo a tu BD (tabla doctores directorio). Con el schema
              actual, el teléfono vive en <b>profiles</b> (solo doctores con cuenta).
            </p>
          </div>

          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-green-700 hover:bg-green-800 text-white" onClick={handleCreate}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ Dialog: Editar ============ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Doctor</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-sm">Nombre *</label>
              <Input
                value={editForm.nombre}
                onChange={(e) => setEditForm((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="Nombre del doctor"
              />
              {!editing?.profile_id && (
                <p className="text-xs text-amber-700 mt-1">
                  Este doctor no tiene perfil ligado. Guardaremos el nombre en “clínica” si es necesario.
                </p>
              )}
            </div>

            <div>
              <label className="text-sm">Teléfono</label>
              <Input
                value={editForm.telefono}
                onChange={(e) => setEditForm((p) => ({ ...p, telefono: e.target.value }))}
                placeholder="Teléfono"
                disabled={!editing?.profile_id}
              />
              {!editing?.profile_id && (
                <p className="text-xs text-gray-500 mt-1">
                  Para editar teléfono aquí, el doctor debe tener cuenta (profile_id). Si no, el teléfono se registra
                  normalmente en pedidos.
                </p>
              )}
            </div>

            <div>
              <label className="text-sm">Clínica</label>
              <Input
                value={editForm.clinica}
                onChange={(e) => setEditForm((p) => ({ ...p, clinica: e.target.value }))}
                placeholder="Ej: Clínica Sonrisa"
              />
            </div>

            <div>
              <label className="text-sm">Especialidad</label>
              <Input
                value={editForm.especialidad}
                onChange={(e) => setEditForm((p) => ({ ...p, especialidad: e.target.value }))}
                placeholder="Ej: Prótesis"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-green-700 hover:bg-green-800 text-white" onClick={handleSaveEdit}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
