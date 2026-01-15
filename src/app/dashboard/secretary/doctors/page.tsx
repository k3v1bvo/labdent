"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDoctor, setNewDoctor] = useState({
    name: "",
    clinic: "",
    specialty: "",
  });
  const [creating, setCreating] = useState(false);

  // 📦 Cargar doctores
  useEffect(() => {
    async function fetchDoctors() {
      setLoading(true);

      const { data, error } = await supabase
        .from("doctores")
        .select(`
          id,
          clinica,
          especialidad,
          profiles (id, nombre),
          kardex (codigo)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error cargando doctores:", error);
      } else {
        setDoctors(data || []);
      }

      setLoading(false);
    }

    fetchDoctors();
  }, []);

  // ➕ Crear nuevo doctor manualmente
  const handleCreateDoctor = async () => {
    if (!newDoctor.name) {
      alert("Por favor, ingresa el nombre del doctor.");
      return;
    }

    setCreating(true);

    try {
      // Crear perfil
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .insert([{ nombre: newDoctor.name, rol: "doctor" }])
        .select()
        .single();

      if (profileError) throw profileError;

      // Crear doctor
      const { data: doctor, error: doctorError } = await supabase
        .from("doctores")
        .insert([
          {
            profile_id: profile.id,
            clinica: newDoctor.clinic,
            especialidad: newDoctor.specialty,
          },
        ])
        .select()
        .single();

      if (doctorError) throw doctorError;

      // Generar código Kardex único
      const { data: kardexCode, error: codeError } = await supabase.rpc(
        "generar_codigo_kardex"
      );

      if (codeError) throw codeError;

      // Insertar en tabla Kardex
      const { error: kardexError } = await supabase.from("kardex").insert([
        {
          doctor_id: doctor.id,
          codigo: kardexCode,
        },
      ]);

      if (kardexError) throw kardexError;

      alert(`✅ Doctor creado con código Kardex: ${kardexCode}`);

      // Recargar lista
      setDoctors([
        {
          ...doctor,
          profiles: { nombre: newDoctor.name },
          kardex: { codigo: kardexCode },
        },
        ...doctors,
      ]);

      // Limpiar campos
      setNewDoctor({ name: "", clinic: "", specialty: "" });
    } catch (error) {
      console.error("Error creando doctor:", error);
      alert("❌ Error al crear el doctor. Revisa la consola.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <h1 className="text-3xl font-bold text-green-700 mb-6">
        🧑‍⚕️ Gestión de Doctores
      </h1>

      {/* Formulario nuevo doctor */}
      <div className="bg-white shadow rounded-2xl p-6 mb-8 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          ➕ Registrar nuevo doctor
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Nombre del doctor"
            value={newDoctor.name}
            onChange={(e) =>
              setNewDoctor({ ...newDoctor, name: e.target.value })
            }
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
          <input
            type="text"
            placeholder="Clínica (opcional)"
            value={newDoctor.clinic}
            onChange={(e) =>
              setNewDoctor({ ...newDoctor, clinic: e.target.value })
            }
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
          <input
            type="text"
            placeholder="Especialidad (opcional)"
            value={newDoctor.specialty}
            onChange={(e) =>
              setNewDoctor({ ...newDoctor, specialty: e.target.value })
            }
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
        <button
          onClick={handleCreateDoctor}
          disabled={creating}
          className={`mt-4 px-6 py-2 rounded-lg font-semibold text-white ${
            creating ? "bg-gray-400" : "bg-green-700 hover:bg-green-800"
          }`}
        >
          {creating ? "Creando..." : "Registrar Doctor"}
        </button>
      </div>

      {/* Lista doctores */}
      {loading ? (
        <p className="text-gray-600">Cargando doctores...</p>
      ) : doctors.length === 0 ? (
        <p className="text-gray-600">No hay doctores registrados.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl shadow border border-gray-100">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-green-700 text-white">
              <tr>
                <th className="px-6 py-3">Nombre</th>
                <th className="px-6 py-3">Clínica</th>
                <th className="px-6 py-3">Especialidad</th>
                <th className="px-6 py-3">Kardex</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doctor) => (
                <tr
                  key={doctor.id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="px-6 py-3 font-medium text-gray-800">
                    {doctor.profiles?.nombre}
                  </td>
                  <td className="px-6 py-3 text-gray-700">
                    {doctor.clinica || "—"}
                  </td>
                  <td className="px-6 py-3 text-gray-700">
                    {doctor.especialidad || "—"}
                  </td>
                  <td className="px-6 py-3 font-mono text-green-700 font-semibold">
                    {doctor.kardex?.codigo || "No asignado"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
