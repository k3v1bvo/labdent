"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

// Conexión Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardPage() {
  const [resumen, setResumen] = useState<any>(null);
  const [pedidosPorDia, setPedidosPorDia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Resumen general
        const { data: resumenData } = await supabase
          .from("vw_dashboard_resumen")
          .select("*")
          .limit(7)
          .order("fecha", { ascending: true });

        // Total por estado
        const { data: pedidos } = await supabase.from("pedidos").select("*");

        const estados = {
          pendiente: pedidos?.filter((p) => p.estado === "pendiente").length || 0,
          en_proceso: pedidos?.filter((p) => p.estado === "en_proceso").length || 0,
          finalizado: pedidos?.filter((p) => p.estado === "finalizado").length || 0,
          entregado: pedidos?.filter((p) => p.estado === "entregado").length || 0,
        };

        setResumen({
          total: pedidos?.length || 0,
          ingresos_totales:
            pedidos?.reduce((acc, p) => acc + (p.total || 0), 0) || 0,
          ...estados,
        });

        setPedidosPorDia(
          resumenData?.map((r) => ({
            fecha: new Date(r.fecha).toLocaleDateString(),
            ingresos: r.ingresos_totales,
            pedidos:
              r.pedidos_pendientes +
              r.pedidos_en_proceso +
              r.pedidos_finalizados +
              r.pedidos_entregados,
          })) || []
        );
      } catch (err) {
        console.error("Error cargando dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard del Laboratorio</h1>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardHeader>
            <CardTitle>Total Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{resumen.total}</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <CardTitle>Ingresos Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              ${resumen.ingresos_totales.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <CardTitle>En Proceso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-500">
              {resumen.en_proceso}
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <CardTitle>Entregados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-500">
              {resumen.entregado}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de pedidos por día */}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos e Ingresos (últimos días)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pedidosPorDia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="pedidos" fill="#3b82f6" name="Pedidos" />
              <Bar dataKey="ingresos" fill="#10b981" name="Ingresos ($)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de ingresos (línea) */}
      <Card>
        <CardHeader>
          <CardTitle>Tendencia de Ingresos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={pedidosPorDia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="ingresos"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </main>
  );
}
