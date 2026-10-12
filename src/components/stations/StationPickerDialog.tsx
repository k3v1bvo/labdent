"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type Station = {
  id: string;
  nombre: string;
  orden: number;
  descripcion?: string | null;
};

type Props = {
  stations: Station[];
  currentStationId: string | null;
  triggerLabel?: string; // texto del botón
  onChanged?: (newStationId: string) => void; // callback opcional
};

export default function StationPickerDialog({
  stations,
  currentStationId,
  triggerLabel = "Cambiar estación",
  onChanged,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    currentStationId
  );
  const [loadingStation, setLoadingStation] = useState(false);

  const currentLabel = useMemo(() => {
    if (!currentStationId) return "(no asignada)";
    const st = stations.find((s) => s.id === currentStationId);
    return st ? `${st.orden}. ${st.nombre}` : "(no asignada)";
  }, [currentStationId, stations]);

  // Mantener seleccionado “lo actual” cuando el padre cambie
  // (sin useEffect para no marear; esto es suficiente en práctica)
  const initialSelected = useMemo(() => currentStationId, [currentStationId]);
  if (selectedStationId === null && initialSelected) {
    setSelectedStationId(initialSelected);
  }

  async function handleSaveStation() {
    if (!selectedStationId) return;

    try {
      setLoadingStation(true);

      const { error } = await supabase.rpc("rpc_cambiar_estacion", {
        p_nueva_estacion_id: selectedStationId,
      });

      if (error) {
        console.error("rpc_cambiar_estacion error:", error);
        alert(
          error.message ||
            "No se pudo cambiar la estación. Revisa consola para más detalle."
        );
        return;
      }

      onChanged?.(selectedStationId);
      setOpen(false);
    } finally {
      setLoadingStation(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setSelectedStationId(currentStationId); // al abrir, que apunte a la actual
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecciona tu estación</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
          {stations.map((s) => {
            const active = selectedStationId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStationId(s.id)}
                className={[
                  "w-full text-left rounded-md border px-3 py-2 transition",
                  active
                    ? "border-green-600 bg-green-50"
                    : "border-gray-200 hover:bg-gray-50",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    {s.orden}. {s.nombre}
                  </div>
                  {active ? (
                    <span className="text-xs text-green-700 font-semibold">
                      Seleccionada
                    </span>
                  ) : null}
                </div>
                {s.descripcion ? (
                  <div className="text-xs text-gray-600 mt-1">
                    {s.descripcion}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setOpen(false)}
            disabled={loadingStation}
          >
            Cancelar
          </Button>
          <Button
            className="w-full"
            onClick={handleSaveStation}
            disabled={loadingStation || !selectedStationId}
          >
            {loadingStation ? "Guardando..." : "Guardar"}
          </Button>
        </div>

        <p className="text-xs text-gray-500 pt-1">
          Nota: si tienes tareas en proceso, el sistema no te dejará cambiar de
          estación.
        </p>

        <p className="text-xs text-gray-500">
          Actual: <span className="font-medium">{currentLabel}</span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
