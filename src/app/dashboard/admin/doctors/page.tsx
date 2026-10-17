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
  tipo_tarifa: string;
  descuento_porcentaje: number;
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
    tipo_tarifa: "regular",
    descuento_porcentaje: 0,
  });

  const [editForm, setEditForm] = useState({
    nombre: "",
    telefono: "",
    clinica: "",
    especialidad: "",
    tipo_tarifa: "regular",
    descuento_porcentaje: 0,
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
        tipo_tarifa,
        descuento_porcentaje,
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
      tipo_tarifa: r.tipo_tarifa || "regular",
      descuento_porcentaje: Number(r.descuento_porcentaje) || 0,
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
      const blob = [name, phone, d.clinica, d.especialidad, d.tipo_tarifa, d.created_at]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(s);
    });
  }, [doctores, q]);

  function openCreate() {
    setCreateForm({
      nombre_o_clinica: "",
      especialidad: "",
      tipo_tarifa: "regular",
      descuento_porcentaje: 0,
    });
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
      tipo_tarifa: doc.tipo_tarifa || "regular",
      descuento_porcentaje: doc.descuento_porcentaje || 0,
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
        tipo_tarifa: createForm.tipo_tarifa,
        descuento_porcentaje:
          createForm.tipo_tarifa === "descuento_normal"
            ? Number(createForm.descuento_porcentaje) || 0
            : 0,
      },
    ]);

    if (error) {
      console.error("create doctor error:", error);
      toast.error("❌ No se pudo crear el doctor");
      return;
    }

    toast.success("✅ Doctor creado con tarifa asignada");
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

    // 1) Actualizar doctores (clinica/especialidad/tipo_tarifa/descuento)
    const { error: docErr } = await supabase
      .from("doctores")
      .update({
        clinica: nextClinica || null,
        especialidad: nextEspecialidad || null,
        tipo_tarifa: editForm.tipo_tarifa,
        descuento_porcentaje:
          editForm.tipo_tarifa === "descuento_normal"
            ? Number(editForm.descuento_porcentaje) || 0
            : 0,
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
      }
    } else {
      if (!nextClinica) {
        await supabase.from("doctores").update({ clinica: nextNombre }).eq("id", editing.id);
      }
    }

    toast.success("✅ Cambios y tarifa guardados");
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
          <h1 className="text-2xl sm:text-3xl font-bold text-[#3C1C6C] flex items-center gap-2">
            <Stethoscope className="w-7 h-7 text-[#A57CFA]" /> Gestión de Doctores
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Administra doctores (con cuenta o directorio) y filtra por fecha de registro.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchDoctores} className="rounded-xl border-slate-200">
            <RefreshCcw className="w-4 h-4 mr-2" /> Refrescar
          </Button>
          <Button className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl shadow-md font-bold" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo Doctor
          </Button>
        </div>
      </div>

      {/* Filtros PRO */}
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Buscar */}
            <div className="lg:col-span-5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-2 mb-1.5">
                <Search className="w-4 h-4 text-slate-400" /> Buscar
              </label>
              <Input
                placeholder="Nombre, teléfono, clínica, especialidad..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="rounded-xl border-slate-200 text-sm"
              />
            </div>

            {/* Presets + fechas */}
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-3">
                <Button
                  type="button"
                  size="sm"
                  variant={rangePreset === "hoy" ? "default" : "outline"}
                  onClick={() => applyPreset("hoy")}
                  className={rangePreset === "hoy" ? "bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold" : "rounded-xl border-slate-200 text-xs"}
                >
                  Hoy
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={rangePreset === "semana" ? "default" : "outline"}
                  onClick={() => applyPreset("semana")}
                  className={rangePreset === "semana" ? "bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold" : "rounded-xl border-slate-200 text-xs"}
                >
                  Semana
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={rangePreset === "mes" ? "default" : "outline"}
                  onClick={() => applyPreset("mes")}
                  className={rangePreset === "mes" ? "bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold" : "rounded-xl border-slate-200 text-xs"}
                >
                  Mes
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={rangePreset === "anio" ? "default" : "outline"}
                  onClick={() => applyPreset("anio")}
                  className={rangePreset === "anio" ? "bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold" : "rounded-xl border-slate-200 text-xs"}
                >
                  Año
                </Button>

                <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1" />

                <Button
                  type="button"
                  size="sm"
                  variant={rangePreset === "ult7" ? "default" : "outline"}
                  onClick={() => applyPreset("ult7")}
                  className={rangePreset === "ult7" ? "bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold" : "rounded-xl border-slate-200 text-xs"}
                >
                  Últ 7d
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={rangePreset === "ult30" ? "default" : "outline"}
                  onClick={() => applyPreset("ult30")}
                  className={rangePreset === "ult30" ? "bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold" : "rounded-xl border-slate-200 text-xs"}
                >
                  Últ 30d
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={rangePreset === "ult90" ? "default" : "outline"}
                  onClick={() => applyPreset("ult90")}
                  className={rangePreset === "ult90" ? "bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold" : "rounded-xl border-slate-200 text-xs"}
                >
                  Últ 90d
                </Button>

                <Button type="button" size="sm" variant="outline" onClick={clearFilters} className="rounded-xl border-slate-200 text-xs">
                  <X className="w-3.5 h-3.5 mr-1" /> Limpiar
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
              <Loader2 className="animate-spin w-8 h-8 text-[#3C1C6C]" />
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

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${
                            isAccount ? "bg-purple-50 text-[#3C1C6C] border-purple-200" : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                          title={isAccount ? "Doctor con cuenta (perfil)" : "Doctor directorio (sin cuenta)"}
                        >
                          {isAccount ? "Con cuenta" : "Directorio"}
                        </span>

                        {/* Tarifa Asignada */}
                        {doc.tipo_tarifa === "institucional_unitepc" ? (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 font-extrabold flex items-center gap-1 shadow-2xs">
                            🎓 UNITEPC (Fijo Bs)
                          </span>
                        ) : doc.tipo_tarifa === "institucional_univalle" ? (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 font-extrabold flex items-center gap-1 shadow-2xs">
                            🎓 UNIVALLE (Fijo Bs)
                          </span>
                        ) : doc.tipo_tarifa === "descuento_normal" ? (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-extrabold flex items-center gap-1 shadow-2xs">
                            🏷️ {doc.descuento_porcentaje}% Descuento
                          </span>
                        ) : (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-bold flex items-center gap-1">
                            🏥 Precios Regulares
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer card */}
                    <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      <p className="text-xs text-gray-500">
                        Registrado: <span className="font-medium text-gray-700">{fmtDate(doc.created_at)}</span>
                      </p>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(doc)} className="rounded-xl border-slate-200">
                          <Edit className="w-3.5 h-3.5 mr-1.5" />
                          Editar
                        </Button>

                        <Button variant="destructive" size="sm" onClick={() => handleDelete(doc.id)} className="rounded-xl">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {!isAccount && (
                      <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
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
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#3C1C6C] font-bold text-lg">Nuevo Doctor</DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-slate-600">Nombre / Clínica *</label>
              <Input
                value={createForm.nombre_o_clinica}
                onChange={(e) => setCreateForm((p) => ({ ...p, nombre_o_clinica: e.target.value }))}
                placeholder="Ej: Dr. Juan Pérez / Clínica Central"
                className="rounded-xl border-slate-200 mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Especialidad</label>
              <Input
                value={createForm.especialidad}
                onChange={(e) => setCreateForm((p) => ({ ...p, especialidad: e.target.value }))}
                placeholder="Ej: Rehabilitación oral"
                className="rounded-xl border-slate-200 mt-1"
              />
            </div>

            {/* Asignación de Tarifa / Descuento */}
            <div className="space-y-2 p-3 bg-purple-50/60 border border-purple-200 rounded-2xl">
              <label className="text-xs font-black uppercase tracking-wider text-[#3C1C6C] block">
                Arancel / Tarifa Asignada al Doctor:
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Al crear órdenes para este doctor, el catálogo aplicará automáticamente esta tarifa o descuento.
              </p>

              <div className="space-y-1.5">
                <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                  createForm.tipo_tarifa === "regular" ? "bg-white border-[#3C1C6C] shadow-2xs ring-1 ring-purple-600/20" : "bg-white/60 border-slate-200 hover:bg-white"
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="create_tipo_tarifa"
                      value="regular"
                      checked={createForm.tipo_tarifa === "regular"}
                      onChange={() => setCreateForm(p => ({ ...p, tipo_tarifa: "regular" }))}
                      className="text-[#3C1C6C] focus:ring-[#3C1C6C]"
                    />
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">Precios Regulares ($ USD / Bs)</p>
                      <p className="text-[10px] text-slate-500">Tarifa oficial estándar para clínicas privadas</p>
                    </div>
                  </div>
                  <span className="text-xs">🏥</span>
                </label>

                <div className={`p-2.5 rounded-xl border transition-all ${
                  createForm.tipo_tarifa === "descuento_normal" ? "bg-white border-amber-500 shadow-2xs ring-1 ring-amber-500/20" : "bg-white/60 border-slate-200 hover:bg-white"
                }`}>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="create_tipo_tarifa"
                        value="descuento_normal"
                        checked={createForm.tipo_tarifa === "descuento_normal"}
                        onChange={() => setCreateForm(p => ({ ...p, tipo_tarifa: "descuento_normal" }))}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <p className="text-xs font-extrabold text-slate-800">Descuento Especial Porcentual (%)</p>
                        <p className="text-[10px] text-slate-500">Descuento exclusivo sobre el total de cada orden</p>
                      </div>
                    </div>
                    <span className="text-xs">🏷️</span>
                  </label>

                  {createForm.tipo_tarifa === "descuento_normal" && (
                    <div className="mt-2 pt-2 border-t border-amber-100 flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Porcentaje:</span>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={createForm.descuento_porcentaje || ""}
                        onChange={(e) => setCreateForm(p => ({ ...p, descuento_porcentaje: Number(e.target.value) || 0 }))}
                        placeholder="Ej: 10, 15, 20"
                        className="h-8 text-xs font-black w-24 bg-white"
                      />
                      <span className="text-xs font-black text-amber-700">% de descuento</span>
                    </div>
                  )}
                </div>

                <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                  createForm.tipo_tarifa === "institucional_unitepc" ? "bg-white border-purple-600 shadow-2xs ring-1 ring-purple-600/20" : "bg-white/60 border-slate-200 hover:bg-white"
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="create_tipo_tarifa"
                      value="institucional_unitepc"
                      checked={createForm.tipo_tarifa === "institucional_unitepc"}
                      onChange={() => setCreateForm(p => ({ ...p, tipo_tarifa: "institucional_unitepc" }))}
                      className="text-purple-700 focus:ring-purple-600"
                    />
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">Convenio UNITEPC</p>
                      <p className="text-[10px] text-slate-500">Arancel institucional con precios fijos en Bolivianos (Bs)</p>
                    </div>
                  </div>
                  <span className="text-xs">🎓</span>
                </label>

                <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                  createForm.tipo_tarifa === "institucional_univalle" ? "bg-white border-blue-600 shadow-2xs ring-1 ring-blue-600/20" : "bg-white/60 border-slate-200 hover:bg-white"
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="create_tipo_tarifa"
                      value="institucional_univalle"
                      checked={createForm.tipo_tarifa === "institucional_univalle"}
                      onChange={() => setCreateForm(p => ({ ...p, tipo_tarifa: "institucional_univalle" }))}
                      className="text-blue-700 focus:ring-blue-600"
                    />
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">Convenio UNIVALLE</p>
                      <p className="text-[10px] text-slate-500">Arancel institucional con precios fijos en Bolivianos (Bs)</p>
                    </div>
                  </div>
                  <span className="text-xs">🎓</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl border-slate-200 h-10 w-full sm:w-auto">
              Cancelar
            </Button>
            <Button className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold h-10 w-full sm:w-auto shadow-md" onClick={handleCreate}>
              Guardar Doctor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ Dialog: Editar ============ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#3C1C6C] font-bold text-lg">Editar Doctor y Tarifa</DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-slate-600">Nombre *</label>
              <Input
                value={editForm.nombre}
                onChange={(e) => setEditForm((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="Nombre del doctor"
                className="rounded-xl border-slate-200 mt-1"
              />
              {!editing?.profile_id && (
                <p className="text-xs text-amber-700 mt-1">
                  Este doctor no tiene perfil ligado. Guardaremos el nombre en “clínica” si es necesario.
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Teléfono</label>
              <Input
                value={editForm.telefono}
                onChange={(e) => setEditForm((p) => ({ ...p, telefono: e.target.value }))}
                placeholder="Teléfono"
                disabled={!editing?.profile_id}
                className="rounded-xl border-slate-200 mt-1"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Clínica</label>
                <Input
                  value={editForm.clinica}
                  onChange={(e) => setEditForm((p) => ({ ...p, clinica: e.target.value }))}
                  placeholder="Ej: Clínica Sonrisa"
                  className="rounded-xl border-slate-200 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Especialidad</label>
                <Input
                  value={editForm.especialidad}
                  onChange={(e) => setEditForm((p) => ({ ...p, especialidad: e.target.value }))}
                  placeholder="Ej: Prótesis"
                  className="rounded-xl border-slate-200 mt-1"
                />
              </div>
            </div>

            {/* Asignación de Tarifa / Descuento */}
            <div className="space-y-2 p-3 bg-purple-50/60 border border-purple-200 rounded-2xl">
              <label className="text-xs font-black uppercase tracking-wider text-[#3C1C6C] block">
                Arancel / Tarifa Asignada al Doctor:
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Al crear órdenes para este doctor, el catálogo aplicará automáticamente esta tarifa o descuento.
              </p>

              <div className="space-y-1.5">
                <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                  editForm.tipo_tarifa === "regular" ? "bg-white border-[#3C1C6C] shadow-2xs ring-1 ring-purple-600/20" : "bg-white/60 border-slate-200 hover:bg-white"
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="edit_tipo_tarifa"
                      value="regular"
                      checked={editForm.tipo_tarifa === "regular"}
                      onChange={() => setEditForm(p => ({ ...p, tipo_tarifa: "regular" }))}
                      className="text-[#3C1C6C] focus:ring-[#3C1C6C]"
                    />
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">Precios Regulares ($ USD / Bs)</p>
                      <p className="text-[10px] text-slate-500">Tarifa oficial estándar para clínicas privadas</p>
                    </div>
                  </div>
                  <span className="text-xs">🏥</span>
                </label>

                <div className={`p-2.5 rounded-xl border transition-all ${
                  editForm.tipo_tarifa === "descuento_normal" ? "bg-white border-amber-500 shadow-2xs ring-1 ring-amber-500/20" : "bg-white/60 border-slate-200 hover:bg-white"
                }`}>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="edit_tipo_tarifa"
                        value="descuento_normal"
                        checked={editForm.tipo_tarifa === "descuento_normal"}
                        onChange={() => setEditForm(p => ({ ...p, tipo_tarifa: "descuento_normal" }))}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <p className="text-xs font-extrabold text-slate-800">Descuento Especial Porcentual (%)</p>
                        <p className="text-[10px] text-slate-500">Descuento exclusivo sobre el total de cada orden</p>
                      </div>
                    </div>
                    <span className="text-xs">🏷️</span>
                  </label>

                  {editForm.tipo_tarifa === "descuento_normal" && (
                    <div className="mt-2 pt-2 border-t border-amber-100 flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Porcentaje:</span>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={editForm.descuento_porcentaje || ""}
                        onChange={(e) => setEditForm(p => ({ ...p, descuento_porcentaje: Number(e.target.value) || 0 }))}
                        placeholder="Ej: 10, 15, 20"
                        className="h-8 text-xs font-black w-24 bg-white"
                      />
                      <span className="text-xs font-black text-amber-700">% de descuento</span>
                    </div>
                  )}
                </div>

                <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                  editForm.tipo_tarifa === "institucional_unitepc" ? "bg-white border-purple-600 shadow-2xs ring-1 ring-purple-600/20" : "bg-white/60 border-slate-200 hover:bg-white"
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="edit_tipo_tarifa"
                      value="institucional_unitepc"
                      checked={editForm.tipo_tarifa === "institucional_unitepc"}
                      onChange={() => setEditForm(p => ({ ...p, tipo_tarifa: "institucional_unitepc" }))}
                      className="text-purple-700 focus:ring-purple-600"
                    />
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">Convenio UNITEPC</p>
                      <p className="text-[10px] text-slate-500">Arancel institucional con precios fijos en Bolivianos (Bs)</p>
                    </div>
                  </div>
                  <span className="text-xs">🎓</span>
                </label>

                <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                  editForm.tipo_tarifa === "institucional_univalle" ? "bg-white border-blue-600 shadow-2xs ring-1 ring-blue-600/20" : "bg-white/60 border-slate-200 hover:bg-white"
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="edit_tipo_tarifa"
                      value="institucional_univalle"
                      checked={editForm.tipo_tarifa === "institucional_univalle"}
                      onChange={() => setEditForm(p => ({ ...p, tipo_tarifa: "institucional_univalle" }))}
                      className="text-blue-700 focus:ring-blue-600"
                    />
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">Convenio UNIVALLE</p>
                      <p className="text-[10px] text-slate-500">Arancel institucional con precios fijos en Bolivianos (Bs)</p>
                    </div>
                  </div>
                  <span className="text-xs">🎓</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl border-slate-200 h-10 w-full sm:w-auto">
              Cancelar
            </Button>
            <Button className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold h-10 w-full sm:w-auto shadow-md" onClick={handleSaveEdit}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
