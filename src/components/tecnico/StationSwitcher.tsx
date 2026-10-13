"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Estacion = {
  id: string;
  nombre: string;
  orden: number;
  descripcion?: string | null;
};

export default function StationSwitcher() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [estacionActualId, setEstacionActualId] = useState<string | null>(null);
  const [seleccionId, setSeleccionId] = useState<string | null>(null);

  const estacionActual = useMemo(
    () => estaciones.find((e) => e.id === estacionActualId) || null,
    [estaciones, estacionActualId]
  );

  async function cargar() {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase.auth.getUser();
    const user = data?.user;
    if (error || !user) {
      setErrorMsg("No autenticado.");
      setLoading(false);
      return;
    }

    const estRes = await supabase
      .from("estaciones")
      .select("id,nombre,orden,descripcion")
      .order("orden", { ascending: true });

    if (estRes.error) {
      setErrorMsg("No pude cargar estaciones: " + estRes.error.message);
      setLoading(false);
      return;
    }

    setEstaciones((estRes.data || []) as Estacion[]);

    const teRes = await supabase
      .from("tecnico_estacion")
      .select("estacion_id")
      .eq("tecnico_id", user.id)
      .maybeSingle();

    if (teRes.error) {
      setErrorMsg("No pude cargar tu estación actual: " + teRes.error.message);
      setLoading(false);
      return;
    }

    const actual = teRes.data?.estacion_id ?? null;
    setEstacionActualId(actual);
    setSeleccionId(actual);

    setLoading(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function guardar() {
    setSaving(true);
    setErrorMsg(null);

    if (!seleccionId) {
      setErrorMsg("Selecciona una estación.");
      setSaving(false);
      return;
    }

    const res = await supabase.rpc("rpc_cambiar_estacion", {
      p_nueva_estacion_id: seleccionId,
    });

    if (res.error) {
      setErrorMsg(res.error.message);
      setSaving(false);
      return;
    }

    setEstacionActualId(seleccionId);
    setSaving(false);
  }

  return (
    <Card className="w-full max-w-md shadow-md rounded-2xl border-slate-200 mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-center text-[#3C1C6C] font-bold text-lg">Mi Estación de Trabajo</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3.5">
        {loading ? (
          <p className="text-sm opacity-70 text-center py-2">Cargando estación...</p>
        ) : (
          <>
            <div className="text-sm text-center bg-purple-50/70 p-3 rounded-xl border border-purple-100">
              <span className="text-slate-500">Estación actual: </span>
              <span className="font-bold text-[#3C1C6C]">
                {estacionActual
                  ? `${estacionActual.orden}. ${estacionActual.nombre}`
                  : "No asignada"}
              </span>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-2.5 text-xs text-center">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-center">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={loading} className="rounded-xl border-slate-200 font-semibold h-10">
                    Cambiar estación
                  </Button>
                </DialogTrigger>

                <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-[#3C1C6C] font-bold text-lg">Selecciona tu estación</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-2 max-h-72 overflow-auto pr-1">
                    {estaciones.map((e) => (
                      <label
                        key={e.id}
                        className={`flex items-center gap-3 rounded-xl p-3 border transition cursor-pointer ${
                          seleccionId === e.id
                            ? "border-[#6329B7] bg-purple-50/80 font-bold text-[#3C1C6C]"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="estacion"
                          checked={seleccionId === e.id}
                          onChange={() => setSeleccionId(e.id)}
                          className="accent-[#3C1C6C]"
                        />
                        <span className="text-sm">
                          {e.orden}. {e.nombre}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
                    <Button variant="outline" onClick={cargar} disabled={saving} className="rounded-xl border-slate-200 h-10">
                      Recargar
                    </Button>
                    <Button
                      onClick={guardar}
                      disabled={saving || !seleccionId}
                      className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold h-10 shadow-md"
                    >
                      {saving ? "Guardando..." : "Guardar Estación"}
                    </Button>
                  </div>

                  <p className="text-xs text-slate-400 pt-1">
                    Nota: si tienes tareas en proceso, el sistema no te dejará cambiar de estación.
                  </p>
                </DialogContent>
              </Dialog>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
