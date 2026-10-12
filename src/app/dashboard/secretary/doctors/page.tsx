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
    <div className="min-h-screen bg-gray-50 p-10 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold text-green-700">🧑‍⚕️ Doctores (del historial de pedidos)</h1>

        <div className="flex gap-2 w-full md:w-[520px]">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o teléfono…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button variant="outline" onClick={fetchDoctors}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refrescar
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-gray-700">
            Catálogo automático (se genera desde los pedidos existentes)
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-600">Cargando doctores…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-700">No hay doctores para mostrar.</p>
          ) : (
            <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-green-700 text-white">
                  <tr>
                    <th className="px-6 py-3">Doctor</th>
                    <th className="px-6 py-3">Teléfono</th>
                    <th className="px-6 py-3">Pedidos</th>
                    <th className="px-6 py-3">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((r, idx) => (
                    <tr key={`${r.doctor_nombre}-${r.doctor_telefono}-${idx}`} className="border-t hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-800">{r.doctor_nombre}</td>
                      <td className="px-6 py-3">{r.doctor_telefono || "—"}</td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                          <Users className="w-4 h-4" />
                          {r.pedidos_count}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Corregir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-3">
            * Esta lista se basa en datos históricos. Si quieres un catálogo real (para seleccionar doctores al crear pedido),
            lo mejor es crear una tabla <b>doctores_catalogo</b> y usarla desde los formularios.
          </p>
        </CardContent>
      </Card>

      {/* MODAL EDITAR */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-green-700">Corregir doctor</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Esto actualizará <b>todos los pedidos</b> que coinciden con:
              <div className="mt-1 font-medium text-gray-800">
                {selected?.doctor_nombre} {selected?.doctor_telefono ? `(${selected.doctor_telefono})` : ""}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600">Nombre</label>
              <Input
                id="doctorNombreEdit"
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                placeholder="Nombre del doctor"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Teléfono</label>
              <Input
                value={newTelefono}
                onChange={(e) => setNewTelefono(e.target.value)}
                placeholder="Ej: 70000000"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-green-700 hover:bg-green-800 text-white"
              onClick={saveEdit}
              disabled={saving}
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
