"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, RefreshCw, Pencil, Users, Stethoscope, Tag, GraduationCap, CheckCircle2 } from "lucide-react";

type DoctorFromPedidos = {
  doctor_id?: string;
  doctor_nombre: string;
  doctor_telefono: string | null;
  tipo_tarifa: string;
  descuento_porcentaje: number;
  pedidos_count: number;
};

function normalizeSpaces(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

export default function SecretaryDoctorsFromPedidosPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DoctorFromPedidos[]>([]);
  const [q, setQ] = useState("");

  // modal editar
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<DoctorFromPedidos | null>(null);
  const [newNombre, setNewNombre] = useState("");
  const [newTelefono, setNewTelefono] = useState("");
  const [newTipoTarifa, setNewTipoTarifa] = useState("regular");
  const [newDescuentoPorcentaje, setNewDescuentoPorcentaje] = useState(0);

  useEffect(() => {
    fetchDoctors();
  }, []);

  async function fetchDoctors() {
    setLoading(true);

    try {
      // 1. Obtener doctores registrados en tabla doctores con su tarifa
      const { data: regDocs } = await supabase
        .from("doctores")
        .select(
          `
          id,
          profile_id,
          clinica,
          tipo_tarifa,
          descuento_porcentaje,
          profiles:profile_id (
            id,
            nombre,
            telefono
          )
        `
        );

      const doctorTariffMap = new Map<
        string,
        { id: string; tipo_tarifa: string; descuento_porcentaje: number; tel: string | null }
      >();

      if (regDocs) {
        (regDocs as any[]).forEach((d: any) => {
          const prof = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
          const name = normalizeSpaces(prof?.nombre || d.clinica || "");
          if (name) {
            doctorTariffMap.set(name.toLowerCase(), {
              id: d.id,
              tipo_tarifa: d.tipo_tarifa || "regular",
              descuento_porcentaje: Number(d.descuento_porcentaje) || 0,
              tel: prof?.telefono || null,
            });
          }
        });
      }

      // 2. Traemos doctor_nombre + doctor_telefono de pedidos
      const res = await supabase
        .from("pedidos")
        .select("doctor_nombre, doctor_telefono")
        .not("doctor_nombre", "is", null);

      const pastData = (res.data ?? []) as any[];
      const map = new Map<string, DoctorFromPedidos>();

      for (const r of pastData) {
        const nombre = normalizeSpaces(String(r.doctor_nombre ?? ""));
        if (!nombre) continue;
        const tel = r.doctor_telefono ? normalizeSpaces(String(r.doctor_telefono)) : null;
        const key = nombre.toLowerCase();

        const tariffInfo = doctorTariffMap.get(key);

        const existing = map.get(key);
        if (existing) {
          existing.pedidos_count += 1;
          if (!existing.doctor_telefono && tel) existing.doctor_telefono = tel;
        } else {
          map.set(key, {
            doctor_id: tariffInfo?.id,
            doctor_nombre: nombre,
            doctor_telefono: tel || tariffInfo?.tel || null,
            tipo_tarifa: tariffInfo?.tipo_tarifa || "regular",
            descuento_porcentaje: tariffInfo?.descuento_porcentaje || 0,
            pedidos_count: 1,
          });
        }
      }

      // Agregar doctores registrados que aún no tienen pedidos
      doctorTariffMap.forEach((tariffInfo, lowerName) => {
        if (!map.has(lowerName)) {
          const originalDoc = (regDocs as any[])?.find(
            (d: any) => {
              const prof = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
              return normalizeSpaces(prof?.nombre || d.clinica || "").toLowerCase() === lowerName;
            }
          );
          const prof = Array.isArray(originalDoc?.profiles) ? originalDoc.profiles[0] : originalDoc?.profiles;
          const originalName = normalizeSpaces(
            prof?.nombre || originalDoc?.clinica || lowerName
          );
          map.set(lowerName, {
            doctor_id: tariffInfo.id,
            doctor_nombre: originalName,
            doctor_telefono: tariffInfo.tel,
            tipo_tarifa: tariffInfo.tipo_tarifa,
            descuento_porcentaje: tariffInfo.descuento_porcentaje,
            pedidos_count: 0,
          });
        }
      });

      // ordenar por cantidad de pedidos desc
      const arr = Array.from(map.values()).sort((a, b) => b.pedidos_count - a.pedidos_count);
      setRows(arr);
    } catch (err: any) {
      console.error("fetchDoctors error:", err);
      toast.error(`❌ Error cargando doctores: ${err?.message || ""}`);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    return rows.filter((r) => {
      const blob = [r.doctor_nombre, r.doctor_telefono, r.tipo_tarifa, String(r.pedidos_count)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(s);
    });
  }, [rows, q]);

  function openEdit(r: DoctorFromPedidos) {
    setSelected(r);
    setNewNombre(r.doctor_nombre ?? "");
    setNewTelefono(r.doctor_telefono ?? "");
    setNewTipoTarifa(r.tipo_tarifa || "regular");
    setNewDescuentoPorcentaje(r.descuento_porcentaje || 0);
    setOpen(true);
  }

  async function saveEdit() {
    if (!selected) return;

    const nombreOld = selected.doctor_nombre;
    const telOld = selected.doctor_telefono ?? null;

    const nombreNew = normalizeSpaces(newNombre);
    const telNew = newTelefono ? normalizeSpaces(newTelefono) : null;

    if (!nombreNew) {
      toast.error("El nombre no puede estar vacío.");
      return;
    }

    setSaving(true);

    try {
      // 1. Actualizar tabla doctores con la nueva tarifa
      if (selected.doctor_id) {
        await supabase
          .from("doctores")
          .update({
            tipo_tarifa: newTipoTarifa,
            descuento_porcentaje:
              newTipoTarifa === "descuento_normal" ? Number(newDescuentoPorcentaje) || 0 : 0,
          })
          .eq("id", selected.doctor_id);
      } else {
        // Si no existía en doctores, crearlo en doctores directorio
        await supabase.from("doctores").insert([
          {
            profile_id: null,
            clinica: nombreNew,
            tipo_tarifa: newTipoTarifa,
            descuento_porcentaje:
              newTipoTarifa === "descuento_normal" ? Number(newDescuentoPorcentaje) || 0 : 0,
          },
        ]);
      }

      // 2. Actualizar pedidos históricos si cambió el nombre o teléfono
      if (nombreOld !== nombreNew || telOld !== telNew) {
        let q = supabase
          .from("pedidos")
          .update({
            doctor_nombre: nombreNew,
            doctor_telefono: telNew,
          })
          .eq("doctor_nombre", nombreOld);

        if (telOld === null) {
          q = q.is("doctor_telefono", null);
        } else {
          q = q.eq("doctor_telefono", telOld);
        }
        await q;
      }

      toast.success("✅ Datos y tarifa del doctor guardados con éxito");
      setOpen(false);
      setSelected(null);
      await fetchDoctors();
    } catch (err: any) {
      console.error("saveEdit error:", err);
      toast.error(`❌ Error guardando: ${err?.message || ""}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#3C1C6C] flex items-center gap-2">
            🧑‍⚕️ Catálogo y Tarifas de Doctores
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Asigna tarifas individuales (Precios Regulares, Descuento %, UNITEPC, UNIVALLE) por cada doctor.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-[500px]">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por doctor, tarifa o teléfono…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 text-sm"
            />
          </div>

          <Button variant="outline" onClick={fetchDoctors} className="rounded-xl border-slate-200 shrink-0">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refrescar
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6">
          <CardTitle className="text-sm font-bold text-slate-700">
            Doctores en el sistema y tarifas asignadas ({filtered.length})
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0 sm:p-6">
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <p className="text-sm">Cargando doctores…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p className="text-sm">No hay doctores que coincidan con la búsqueda.</p>
            </div>
          ) : (
            <>
              {/* Vista Móvil: Tarjetas */}
              <div className="md:hidden divide-y divide-slate-100">
                {filtered.map((r, idx) => (
                  <div key={`${r.doctor_nombre}-${idx}`} className="p-4 space-y-3 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{r.doctor_nombre}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {r.doctor_telefono ? `📞 ${r.doctor_telefono}` : "Sin teléfono"}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {r.tipo_tarifa === "institucional_unitepc" ? (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 font-extrabold shadow-2xs">
                            🎓 UNITEPC (Fijo Bs)
                          </span>
                        ) : r.tipo_tarifa === "institucional_univalle" ? (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 font-extrabold shadow-2xs">
                            🎓 UNIVALLE (Fijo Bs)
                          </span>
                        ) : r.tipo_tarifa === "descuento_normal" ? (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-extrabold shadow-2xs">
                            🏷️ {r.descuento_porcentaje}% Descuento
                          </span>
                        ) : (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-bold">
                            🏥 Precios Regulares
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 font-medium">
                          {r.pedidos_count} pedidos
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(r)}
                        className="rounded-xl border-slate-200 text-xs w-full sm:w-auto h-9"
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1.5 text-[#3C1C6C]" />
                        Editar Tarifa y Datos
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vista Desktop: Tabla */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-100">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-[#3C1C6C] text-white uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-4">Doctor</th>
                      <th className="px-6 py-4">Teléfono</th>
                      <th className="px-6 py-4">Tarifa Asignada</th>
                      <th className="px-6 py-4">Pedidos</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filtered.map((r, idx) => (
                      <tr key={`${r.doctor_nombre}-${idx}`} className="hover:bg-purple-50/20 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800">{r.doctor_nombre}</td>
                        <td className="px-6 py-4 text-slate-600">{r.doctor_telefono || "—"}</td>
                        <td className="px-6 py-4">
                          {r.tipo_tarifa === "institucional_unitepc" ? (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-900 border border-purple-300 font-extrabold inline-flex items-center gap-1 shadow-2xs">
                              🎓 Convenio UNITEPC (Fijo Bs)
                            </span>
                          ) : r.tipo_tarifa === "institucional_univalle" ? (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-300 font-extrabold inline-flex items-center gap-1 shadow-2xs">
                              🎓 Convenio UNIVALLE (Fijo Bs)
                            </span>
                          ) : r.tipo_tarifa === "descuento_normal" ? (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-extrabold inline-flex items-center gap-1 shadow-2xs">
                              🏷️ {r.descuento_porcentaje}% Descuento
                            </span>
                          ) : (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-bold inline-flex items-center gap-1">
                              🏥 Precios Regulares
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full bg-purple-50 text-[#3C1C6C] font-semibold border border-purple-100">
                            <Users className="w-3.5 h-3.5 text-[#A57CFA]" />
                            {r.pedidos_count} pedidos
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(r)}
                            className="rounded-xl border-slate-200 text-xs"
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1.5 text-[#3C1C6C]" />
                            Editar Tarifa
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <p className="text-xs text-slate-400 p-4 sm:p-0 sm:mt-3">
            * Al asignar una tarifa a un doctor, cualquier nueva orden creada para él aplicará automáticamente dicho arancel o descuento.
          </p>
        </CardContent>
      </Card>

      {/* MODAL EDITAR TARIFA Y DATOS */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#3C1C6C] font-bold text-lg">
              Asignar Tarifa / Descuento del Doctor
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600">Nombre del Doctor</label>
              <Input
                id="doctorNombreEdit"
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                placeholder="Nombre del doctor"
                className="rounded-xl border-slate-200 mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Teléfono</label>
              <Input
                value={newTelefono}
                onChange={(e) => setNewTelefono(e.target.value)}
                placeholder="Ej: 70000000"
                className="rounded-xl border-slate-200 mt-1"
              />
            </div>

            {/* Asignación de Tarifa / Descuento */}
            <div className="space-y-2 p-3.5 bg-purple-50/60 border border-purple-200 rounded-2xl">
              <label className="text-xs font-black uppercase tracking-wider text-[#3C1C6C] block">
                Arancel / Tarifa Asignada:
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Selecciona la tarifa que se le aplicará a este doctor al crear órdenes:
              </p>

              <div className="space-y-2">
                {/* Opción 1: Precios Regulares */}
                <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                  newTipoTarifa === "regular" ? "bg-white border-[#3C1C6C] shadow-2xs ring-1 ring-purple-600/20" : "bg-white/60 border-slate-200 hover:bg-white"
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="sec_tipo_tarifa"
                      value="regular"
                      checked={newTipoTarifa === "regular"}
                      onChange={() => setNewTipoTarifa("regular")}
                      className="text-[#3C1C6C] focus:ring-[#3C1C6C]"
                    />
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">Precios Regulares ($ USD / Bs)</p>
                      <p className="text-[10px] text-slate-500">Tarifa oficial estándar para clínicas privadas</p>
                    </div>
                  </div>
                  <span className="text-xs">🏥</span>
                </label>

                {/* Opción 2: Descuento Personalizado */}
                <div className={`p-2.5 rounded-xl border transition-all ${
                  newTipoTarifa === "descuento_normal" ? "bg-white border-amber-500 shadow-2xs ring-1 ring-amber-500/20" : "bg-white/60 border-slate-200 hover:bg-white"
                }`}>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="sec_tipo_tarifa"
                        value="descuento_normal"
                        checked={newTipoTarifa === "descuento_normal"}
                        onChange={() => setNewTipoTarifa("descuento_normal")}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <p className="text-xs font-extrabold text-slate-800">Descuento Especial Porcentual (%)</p>
                        <p className="text-[10px] text-slate-500">Descuento exclusivo sobre el total de cada orden</p>
                      </div>
                    </div>
                    <span className="text-xs">🏷️</span>
                  </label>

                  {newTipoTarifa === "descuento_normal" && (
                    <div className="mt-2.5 pt-2 border-t border-amber-100 flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Porcentaje:</span>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={newDescuentoPorcentaje || ""}
                        onChange={(e) => setNewDescuentoPorcentaje(Number(e.target.value) || 0)}
                        placeholder="Ej: 10, 15, 20"
                        className="h-8 text-xs font-black w-24 bg-white"
                      />
                      <span className="text-xs font-black text-amber-700">% de descuento</span>
                    </div>
                  )}
                </div>

                {/* Opción 3: Convenio UNITEPC */}
                <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                  newTipoTarifa === "institucional_unitepc" ? "bg-white border-purple-600 shadow-2xs ring-1 ring-purple-600/20" : "bg-white/60 border-slate-200 hover:bg-white"
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="sec_tipo_tarifa"
                      value="institucional_unitepc"
                      checked={newTipoTarifa === "institucional_unitepc"}
                      onChange={() => setNewTipoTarifa("institucional_unitepc")}
                      className="text-purple-700 focus:ring-purple-600"
                    />
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">Convenio UNITEPC</p>
                      <p className="text-[10px] text-slate-500">Arancel institucional con precios fijos en Bolivianos (Bs)</p>
                    </div>
                  </div>
                  <span className="text-xs">🎓</span>
                </label>

                {/* Opción 4: Convenio UNIVALLE */}
                <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                  newTipoTarifa === "institucional_univalle" ? "bg-white border-blue-600 shadow-2xs ring-1 ring-blue-600/20" : "bg-white/60 border-slate-200 hover:bg-white"
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="sec_tipo_tarifa"
                      value="institucional_univalle"
                      checked={newTipoTarifa === "institucional_univalle"}
                      onChange={() => setNewTipoTarifa("institucional_univalle")}
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
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl border-slate-200 h-10 w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold h-10 w-full sm:w-auto shadow-md"
              onClick={saveEdit}
              disabled={saving}
            >
              {saving ? "Guardando…" : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
