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
import { Search, RefreshCw, Pencil, Users } from "lucide-react";

type DoctorFromPedidos = {
  doctor_nombre: string;
  doctor_telefono: string | null;
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

  useEffect(() => {
    fetchDoctors();
  }, []);

  async function fetchDoctors() {
    setLoading(true);

    // Traemos doctor_nombre + doctor_telefono de pedidos, y luego hacemos "unique" en frontend
    const res = await supabase
      .from("pedidos")
      .select("doctor_nombre, doctor_telefono")
      .not("doctor_nombre", "is", null);

    setLoading(false);

    if (res.error) {
      console.error("fetchDoctors error:", res.error);
      toast.error(`❌ Error cargando doctores: ${res.error.message}`);
      return;
    }

    const data = (res.data ?? []) as any[];

    // Agrupar por (nombre + telefono)
    const map = new Map<string, DoctorFromPedidos>();

    for (const r of data) {
      const nombre = normalizeSpaces(String(r.doctor_nombre ?? ""));
      if (!nombre) continue;
      const tel = r.doctor_telefono ? normalizeSpaces(String(r.doctor_telefono)) : null;

      const key = `${nombre}||${tel ?? ""}`;

      const existing = map.get(key);
      if (existing) {
        existing.pedidos_count += 1;
      } else {
        map.set(key, {
          doctor_nombre: nombre,
          doctor_telefono: tel,
          pedidos_count: 1,
        });
      }
    }

    // ordenar por cantidad desc
    const arr = Array.from(map.values()).sort((a, b) => b.pedidos_count - a.pedidos_count);
    setRows(arr);
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    return rows.filter((r) => {
      const blob = [r.doctor_nombre, r.doctor_telefono, String(r.pedidos_count)]
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
    setOpen(true);

    // foco + seleccionar para editar rápido
    setTimeout(() => {
      const el = document.getElementById("doctorNombreEdit") as HTMLInputElement | null;
      el?.focus();
      el?.select();
    }, 50);
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

    // Actualizamos TODOS los pedidos que coinciden con este doctor (nombre + telefono)
    // Nota: si el teléfono era null, filtramos por is null.
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

    const res = await q;

    setSaving(false);

    if (res.error) {
      console.error("saveEdit error:", res.error);
      toast.error(`❌ No se pudo actualizar: ${res.error.message}`);
      return;
    }

    toast.success("✅ Doctor actualizado en todos sus pedidos");
    setOpen(false);
    setSelected(null);
    await fetchDoctors();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#3C1C6C] flex items-center gap-2">
            🧑‍⚕️ Catálogo de Doctores
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Generado automáticamente desde el historial de pedidos y fichas clínicas.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-[500px]">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o teléfono…"
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
            Doctores registrados en órdenes activas e históricas ({filtered.length})
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
                  <div key={`${r.doctor_nombre}-${r.doctor_telefono}-${idx}`} className="p-4 space-y-3 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{r.doctor_nombre}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {r.doctor_telefono ? `📞 ${r.doctor_telefono}` : "Sin teléfono registrado"}
                        </p>
                      </div>

                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-purple-50 text-[#3C1C6C] font-semibold border border-purple-100 shrink-0">
                        <Users className="w-3.5 h-3.5 text-[#A57CFA]" />
                        {r.pedidos_count} pedidos
                      </span>
                    </div>

                    <div className="pt-1 flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)} className="rounded-xl border-slate-200 text-xs w-full sm:w-auto h-9">
                        <Pencil className="w-3.5 h-3.5 mr-1.5 text-[#3C1C6C]" />
                        Corregir Datos
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
                      <th className="px-6 py-4">Pedidos Vinculados</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filtered.map((r, idx) => (
                      <tr key={`${r.doctor_nombre}-${r.doctor_telefono}-${idx}`} className="hover:bg-purple-50/20 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800">{r.doctor_nombre}</td>
                        <td className="px-6 py-4 text-slate-600">{r.doctor_telefono || "—"}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full bg-purple-50 text-[#3C1C6C] font-semibold border border-purple-100">
                            <Users className="w-3.5 h-3.5 text-[#A57CFA]" />
                            {r.pedidos_count} pedidos
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button size="sm" variant="outline" onClick={() => openEdit(r)} className="rounded-xl border-slate-200 text-xs">
                            <Pencil className="w-3.5 h-3.5 mr-1.5 text-[#3C1C6C]" />
                            Corregir
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
            * Al corregir el nombre o teléfono de un doctor, se actualizarán automáticamente todos sus pedidos históricos y en curso.
          </p>
        </CardContent>
      </Card>

      {/* MODAL EDITAR */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#3C1C6C] font-bold text-lg">Corregir datos del doctor</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-xs sm:text-sm text-slate-600 p-3 bg-purple-50/70 rounded-xl border border-purple-100">
              Esto actualizará <b>todos los pedidos</b> asociados a:
              <div className="mt-1 font-bold text-[#3C1C6C]">
                {selected?.doctor_nombre} {selected?.doctor_telefono ? `(${selected.doctor_telefono})` : ""}
              </div>
            </div>

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
