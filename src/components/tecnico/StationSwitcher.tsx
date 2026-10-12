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
    <Card className="w-full max-w-md shadow-lg mt-4">
      <CardHeader>
        <CardTitle className="text-center text-green-700">Mi estación</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm opacity-70">Cargando estación...</p>
        ) : (
          <>
            <div className="text-sm text-center">
              <span className="opacity-70">Estación actual: </span>
              <span className="font-medium">
                {estacionActual
                  ? `${estacionActual.orden}. ${estacionActual.nombre}`
                  : "No asignada"}
              </span>
            </div>

            {errorMsg && (
              <div className="rounded-md border p-2 text-sm text-center">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-center">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={loading}>
                    Cambiar estación
                  </Button>
                </DialogTrigger>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Selecciona tu estación</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-2 max-h-72 overflow-auto">
                    {estaciones.map((e) => (
                      <label
                        key={e.id}
                        className="flex items-center gap-2 rounded-md p-2 hover:bg-muted cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="estacion"
                          checked={seleccionId === e.id}
                          onChange={() => setSeleccionId(e.id)}
                        />
                        <span>
                          {e.orden}. {e.nombre}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <Button variant="outline" onClick={cargar} disabled={saving}>
                      Recargar
                    </Button>
                    <Button onClick={guardar} disabled={saving || !seleccionId}>
                      {saving ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>

                  <p className="text-xs opacity-70 pt-2">
                    Si tienes tareas en proceso, no te dejará cambiarte.
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
