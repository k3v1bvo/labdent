"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
        toast.error(
          error.message ||
            "No se pudo cambiar la estación. Verifica tus permisos."
        );
        return;
      }

      toast.success("✅ Estación de trabajo actualizada");
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
        <Button variant="outline" className="w-full rounded-xl border-slate-200 font-semibold h-11">
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#3C1C6C] font-bold text-lg">Selecciona tu estación</DialogTitle>
        </DialogHeader>

        <div className="space-y-2.5 max-h-[340px] overflow-auto pr-1">
          {stations.map((s) => {
            const active = selectedStationId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStationId(s.id)}
                className={[
                  "w-full text-left rounded-xl border p-3.5 transition flex flex-col justify-center min-h-[52px]",
                  active
                    ? "border-[#6329B7] bg-purple-50/90 shadow-sm ring-1 ring-[#A57CFA]/40"
                    : "border-slate-200 hover:bg-slate-50",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <div className={`font-semibold text-sm ${active ? "text-[#3C1C6C]" : "text-slate-800"}`}>
                    {s.orden}. {s.nombre}
                  </div>
                  {active ? (
                    <span className="text-xs text-[#6329B7] font-bold bg-white px-2 py-0.5 rounded-full border border-purple-200">
                      ✓ Seleccionada
                    </span>
                  ) : null}
                </div>
                {s.descripcion ? (
                  <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {s.descripcion}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            className="w-full rounded-xl border-slate-200 h-11"
            onClick={() => setOpen(false)}
            disabled={loadingStation}
          >
            Cancelar
          </Button>
          <Button
            className="w-full bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold h-11 shadow-md"
            onClick={handleSaveStation}
            disabled={loadingStation || !selectedStationId}
          >
            {loadingStation ? "Guardando..." : "Guardar Estación"}
          </Button>
        </div>

        <p className="text-xs text-slate-400 pt-1">
          Nota: si tienes tareas en proceso, el sistema no te dejará cambiar de estación.
        </p>

        <p className="text-xs text-slate-500">
          Actual: <span className="font-semibold text-slate-700">{currentLabel}</span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
