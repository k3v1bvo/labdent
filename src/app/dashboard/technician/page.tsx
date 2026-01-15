"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function TechnicianDashboard() {
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchTechnicianTasks() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      // Obtenemos pedidos asignados a este técnico
      const { data, error } = await supabase
        .from("historial_estaciones")
        .select(`
          id,
          estado,
          comentarios,
          fecha_inicio,
          fecha_fin,
          pedidos (
            id,
            paciente_nombre,
            estado,
            doctores (profiles (nombre))
          ),
          estaciones (nombre)
        `)
        .eq("tecnico_id", user.id)
        .order("fecha_inicio", { ascending: false });

      if (error) {
        console.error("Error al obtener tareas:", error);
      } else {
        setTasks(data || []);
      }

      setLoading(false);
    }

    fetchTechnicianTasks();
  }, [router]);

  async function updateTaskStatus(id: string, newStatus: string) {
    const { error } = await supabase
      .from("historial_estaciones")
      .update({
        estado: newStatus,
        fecha_fin: newStatus === "finalizado" ? new Date().toISOString() : null,
      })
      .eq("id", id);

    if (error) {
      alert("❌ Error al actualizar estado");
    } else {
      alert("✅ Estado actualizado correctamente");
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, estado: newStatus } : t
        )
      );
    }
  }

  async function addComment(id: string) {
    const comment = prompt("Escribe un comentario:");
    if (!comment) return;

    const { error } = await supabase
      .from("historial_estaciones")
      .update({ comentarios: comment })
      .eq("id", id);

    if (error) {
      alert("❌ Error al guardar comentario");
    } else {
      alert("💬 Comentario guardado");
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, comentarios: comment } : t))
      );
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* MAIN */}
      <main className="flex-1 p-10">
        <h1 className="text-3xl font-bold text-green-800">
          Bienvenido, {user?.email || "Técnico"}
        </h1>
        <p className="text-gray-600 mt-2">
          Aquí puedes ver tus pedidos asignados y actualizar su progreso.
        </p>

        {loading ? (
          <p className="text-gray-600 mt-10">Cargando tareas...</p>
        ) : tasks.length === 0 ? (
          <p className="text-gray-600 mt-10">No tienes tareas asignadas.</p>
        ) : (
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-2xl shadow p-6 border border-gray-100"
              >
                <h3 className="text-lg font-semibold text-green-700 mb-2">
                  {task.estaciones?.nombre}
                </h3>
                <p className="text-gray-700">
                  Paciente:{" "}
                  <strong>{task.pedidos?.paciente_nombre || "—"}</strong>
                </p>
                <p className="text-gray-700">
                  Doctor: {task.pedidos?.doctores?.profiles?.nombre || "—"}
                </p>
                <p className="text-gray-600 text-sm mt-2">
                  Estado actual:{" "}
                  <span
                    className={`font-semibold ${
                      task.estado === "en_proceso"
                        ? "text-blue-600"
                        : task.estado === "finalizado"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {task.estado}
                  </span>
                </p>
                <p className="text-gray-600 text-sm">
                  Comentarios: {task.comentarios || "—"}
                </p>

                <div className="flex justify-between mt-4">
                  <button
                    onClick={() =>
                      updateTaskStatus(task.id, "en_proceso")
                    }
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    En proceso
                  </button>
                  <button
                    onClick={() =>
                      updateTaskStatus(task.id, "finalizado")
                    }
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                  >
                    Finalizar
                  </button>
                </div>

                <button
                  onClick={() => addComment(task.id)}
                  className="mt-3 text-green-600 hover:underline text-sm"
                >
                  💬 Agregar comentario
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
