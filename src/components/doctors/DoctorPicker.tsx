"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export type DoctorOption = {
  id: string;
  profile_id: string | null;
  clinica: string | null;
  especialidad: string | null;
  profiles?: { nombre: string; telefono: string | null } | null;
};

type Props = {
  value: {
    doctor_id: string | null;
    doctor_nombre: string;
    doctor_telefono: string;
  };
  onChange: (v: Props["value"]) => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function DoctorPicker({
  value,
  onChange,
  placeholder = "Escribe el nombre del doctor…",
  disabled,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [allDoctors, setAllDoctors] = useState<DoctorOption[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value.doctor_nombre || "");

  useEffect(() => {
    setQuery(value.doctor_nombre || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.doctor_nombre]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("doctores")
        .select("id, profile_id, clinica, especialidad, profiles(nombre, telefono)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        console.error("DoctorPicker load error:", error);
        setAllDoctors([]);
      } else {
        setAllDoctors((data as any) ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return allDoctors.slice(0, 10);

    return allDoctors
      .filter((d) => {
        const name = (d.profiles?.nombre ?? "").toLowerCase();
        const phone = (d.profiles?.telefono ?? "").toLowerCase();
        const clinica = (d.clinica ?? "").toLowerCase();
        return (
          name.includes(q) || phone.includes(q) || clinica.includes(q)
        );
      })
      .slice(0, 10);
  }, [allDoctors, query]);

  function pickDoctor(d: DoctorOption) {
    const nombre = d.profiles?.nombre ?? "";
    const telefono = d.profiles?.telefono ?? "";
    onChange({
      doctor_id: d.id,
      doctor_nombre: nombre,
      doctor_telefono: telefono ?? "",
    });
    setQuery(nombre);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Input
        disabled={disabled}
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          setOpen(true);
          // si escribe manual, NO seteamos doctor_id para evitar “id viejo”
          onChange({
            doctor_id: null,
            doctor_nombre: v,
            doctor_telefono: value.doctor_telefono,
          });
        }}
      />

      {open && (
        <Card className="absolute z-50 mt-2 w-full max-h-64 overflow-auto p-2">
          {loading ? (
            <div className="text-sm text-muted-foreground p-2">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground p-2">
              No se encontraron doctores.
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickDoctor(d)}
                  className="w-full text-left rounded-md px-2 py-2 hover:bg-muted transition"
                >
                  <div className="font-medium">
                    {d.profiles?.nombre ?? "(Sin nombre)"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {d.profiles?.telefono ? `📞 ${d.profiles.telefono} · ` : ""}
                    {d.clinica ? `🏥 ${d.clinica}` : ""}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
