"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";
import { completeStation } from "@/lib/actions/stations";

export default function TechnicianStationsPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchTasks() {
    setLoading(true);

    const { data, error } = await supabase
      .from("historial_estaciones")
      .select(`
        id,
        estado,
        fecha_inicio,
        pedidos (
          id,
          paciente_nombre,
          estado
        ),
        estaciones (
          id,
          nombre,
          orden
        )
      `)
      .eq("estado", "en_proceso")
      .order("fecha_inicio", { ascending: true });

    if (error) console.error("Error fetching technician tasks:", error);
    setTasks(data || []);
    setLoading(false);
  }

  async function handleCompleteTask(taskId: string, orderId: string, currentOrder: number) {
    const confirmAction = confirm("Mark this station as completed?");
    if (!confirmAction) return;

    await completeStation(taskId, orderId, currentOrder);
    alert("✅ Station completed!");
    fetchTasks();
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🧰 Active Station Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin w-6 h-6 text-green-600" />
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-gray-500 text-center">No active tasks.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Patient</th>
                  <th className="p-2 text-left">Station</th>
                  <th className="p-2 text-left">Started</th>
                  <th className="p-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} className="border-b">
                    <td className="p-2">{t.pedidos?.paciente_nombre}</td>
                    <td className="p-2">{t.estaciones?.nombre}</td>
                    <td className="p-2">
                      {new Date(t.fecha_inicio).toLocaleDateString()}
                    </td>
                    <td className="p-2 text-center">
                      <Button
                        size="sm"
                        onClick={() =>
                          handleCompleteTask(
                            t.id,
                            t.pedidos.id,
                            t.estaciones.orden
                          )
                        }
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Complete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
