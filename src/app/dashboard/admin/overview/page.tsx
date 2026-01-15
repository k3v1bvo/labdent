"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface DashboardResumen {
  pedidos_pendientes: number;
  pedidos_en_proceso: number;
  pedidos_finalizados: number;
  pedidos_entregados: number;
  tiempo_promedio_horas: number | null;
  ingresos_totales: number | null;
  fecha: string;
}

export default function AdminOverviewPage() {
  const [resumen, setResumen] = useState<DashboardResumen[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchResumen() {
    setLoading(true);
    const { data, error } = await supabase
      .from("vw_dashboard_resumen")
      .select("*")
      .order("fecha", { ascending: false });

    if (error) {
      console.error("❌ Error al obtener resumen del dashboard:", error);
    } else {
      setResumen(data || []);
    }
    setLoading(false);
  }

  // Auto-refresco cada 30 s
  useEffect(() => {
    fetchResumen();
    const interval = setInterval(fetchResumen, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        Cargando resumen...
      </div>
    );
  }

  if (!resumen.length) {
    return (
      <div className="text-center py-20 text-gray-500">
        No hay pedidos registrados aún.
      </div>
    );
  }

  const latest = resumen[0];

  return (
    <div className="space-y-8">
      {/* ENCABEZADO */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-green-700">
          📊 Resumen General
        </h1>
        <Button
          variant="outline"
          onClick={fetchResumen}
          className="flex items-center gap-2"
        >
          <RefreshCcw className="w-4 h-4" />
          Actualizar
        </Button>
      </div>

      {/* TARJETAS DE ESTADOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-yellow-500">
          <CardHeader>
            <CardTitle className="text-yellow-700 font-semibold">
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{latest.pedidos_pendientes}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-blue-500">
          <CardHeader>
            <CardTitle className="text-blue-700 font-semibold">
              En proceso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{latest.pedidos_en_proceso}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-green-500">
          <CardHeader>
            <CardTitle className="text-green-700 font-semibold">
              Finalizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{latest.pedidos_finalizados}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <CardHeader>
            <CardTitle className="text-purple-700 font-semibold">
              Entregados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{latest.pedidos_entregados}</p>
          </CardContent>
        </Card>
      </div>

      {/* MÉTRICAS EXTRA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tiempo promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-800">
              {latest.tiempo_promedio_horas
                ? `${latest.tiempo_promedio_horas} h`
                : "—"}
            </p>
            <p className="text-sm text-gray-500">
              Horas promedio desde creación hasta entrega
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingresos totales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-800">
              {latest.ingresos_totales
                ? `$${latest.ingresos_totales.toFixed(2)}`
                : "$0.00"}
            </p>
            <p className="text-sm text-gray-500">Suma total de pedidos</p>
          </CardContent>
        </Card>
      </div>

      {/* GRÁFICO DE BARRAS */}
      <Card>
        <CardHeader>
          <CardTitle>Evolución de pedidos por día</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={resumen
                .map((r) => ({
                  fecha: new Date(r.fecha).toLocaleDateString(),
                  pendientes: r.pedidos_pendientes,
                  proceso: r.pedidos_en_proceso,
                  finalizados: r.pedidos_finalizados,
                  entregados: r.pedidos_entregados,
                }))
                .reverse()}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="pendientes" stackId="a" fill="#facc15" />
              <Bar dataKey="proceso" stackId="a" fill="#3b82f6" />
              <Bar dataKey="finalizados" stackId="a" fill="#22c55e" />
              <Bar dataKey="entregados" stackId="a" fill="#a855f7" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
