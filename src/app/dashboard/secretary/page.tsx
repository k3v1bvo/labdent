"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function SecretariaDashboard() {
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: notifData } = await supabase
        .from("notificaciones")
        .select("*")
        .eq("destinatario_rol", "secretaria")
        .eq("leido", false)
        .order("created_at", { ascending: false });

      const { data: pedidosData } = await supabase
        .from("pedidos")
        .select("id, paciente_nombre, estado, fecha_creacion")
        .eq("estado", "pendiente")
        .order("fecha_creacion", { ascending: false });

      setNotificaciones(notifData || []);
      setPedidos(pedidosData || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  const marcarLeidas = async () => {
    await supabase.from("notificaciones").update({ leido: true }).eq("destinatario_rol", "secretaria");
    setNotificaciones([]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>📢 Notificaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="animate-spin w-6 h-6" />
          ) : notificaciones.length > 0 ? (
            <>
              <ul className="space-y-2">
                {notificaciones.map((n) => (
                  <li key={n.id} className="border p-2 rounded-md">
                    {n.mensaje}
                  </li>
                ))}
              </ul>
              <Button onClick={marcarLeidas} className="mt-3">
                Marcar como leídas
              </Button>
            </>
          ) : (
            <p className="text-sm text-gray-500">Sin notificaciones nuevas.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🧾 Pedidos Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          {pedidos.length > 0 ? (
            <ul className="divide-y">
              {pedidos.map((p) => (
                <li key={p.id} className="py-2 flex justify-between">
                  <span>{p.paciente_nombre}</span>
                  <span className="text-gray-600">{p.estado}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No hay pedidos pendientes.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
