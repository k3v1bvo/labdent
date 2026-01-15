"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DoctorHome() {
  const [doctor, setDoctor] = useState<any>(null);

  useEffect(() => {
    async function fetchDoctor() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("nombre, telefono, rol")
        .eq("id", user.id)
        .single();

      setDoctor(data);
    }
    fetchDoctor();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-blue-700">
        👨‍⚕️ Bienvenido, {doctor?.nombre || "Doctor"}
      </h1>
      <p className="text-gray-600">
        Aquí podrás crear tus órdenes y hacer seguimiento de su progreso en el
        laboratorio.
      </p>

      <div className="mt-6 p-4 bg-white shadow rounded-xl border">
        <h2 className="text-lg font-semibold mb-2">Datos personales</h2>
        <p>
          <strong>Teléfono:</strong> {doctor?.telefono || "—"}
        </p>
        <p>
          <strong>Rol:</strong> {doctor?.rol || "—"}
        </p>
      </div>
    </div>
  );
}
