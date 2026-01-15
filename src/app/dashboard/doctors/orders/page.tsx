"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, Clock, CheckCircle, RefreshCcw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface Pedido {
  id: string;
  paciente_nombre: string;
  estado: string;
  fecha_creacion: string;
  fecha_entrega: string | null;
  estacion_actual: string;
  estado_estacion: string;
  progreso: number;
}

interface Estacion {
  id: string;
  nombre: string;
  orden: number;
}

export default function DoctorOrdersPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);

  // ✅ Cargar estaciones
  async function fetchEstaciones() {
    const { data, error } = await supabase
      .from("estaciones")
      .select("id, nombre, orden")
      .order("orden", { ascending: true });

    if (error) {
      console.error("Error al obtener estaciones:", error);
    } else {
      setEstaciones(data || []);
    }
  }

  // ✅ Cargar pedidos del doctor
  async function fetchPedidos() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Buscar el ID del doctor vinculado al perfil
    const { data: doctor, error: doctorError } = await supabase
      .from("doctores")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (doctorError || !doctor) {
      console.warn("⚠️ No se encontró doctor asociado a este usuario.");
      setLoading(false);
      return;
    }

    // Obtener pedidos del doctor
    const { data: pedidosData, error: pedidosError } = await supabase
      .from("pedidos")
      .select(`
        id,
        paciente_nombre,
        estado,
        fecha_creacion,
        fecha_entrega,
        historial_estaciones(
          estado,
          fecha_inicio,
          fecha_fin,
          estacion_id,
          estaciones(nombre, orden)
        )
      `)
      .eq("doctor_id", doctor.id);

    if (pedidosError) {
      console.error("Error al obtener pedidos:", pedidosError);
      setLoading(false);
      return;
    }

    // ✅ Calcular progreso de cada pedido
    const pedidosConProgreso: Pedido[] = (pedidosData || []).map((p: any) => {
      const historial = p.historial_estaciones || [];
      const ultima = historial.find((h: any) => !h.fecha_fin);

      const estacion_actual = ultima
        ? ultima.estaciones?.nombre
        : historial.at(-1)?.estaciones?.nombre || "Pendiente";

      const indexActual = estaciones.findIndex((e) => e.nombre === estacion_actual);
      const progreso = estaciones.length
        ? Math.round(((indexActual + 1) / estaciones.length) * 100)
        : 0;

      return {
        id: p.id,
        paciente_nombre: p.paciente_nombre,
        estado: p.estado,
        fecha_creacion: p.fecha_creacion,
        fecha_entrega: p.fecha_entrega,
        estacion_actual,
        estado_estacion: ultima?.estado || "pendiente",
        progreso,
      };
    });

    setPedidos(pedidosConProgreso);
    setLoading(false);
  }

  // ✅ Efecto inicial y suscripción en tiempo real
  useEffect(() => {
    fetchEstaciones();
    fetchPedidos();

    const channel = supabase
      .channel("doctor-pedidos-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "historial_estaciones" },
        fetchPedidos
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-green-700">📋 Mis Pedidos</h1>
        <Button onClick={fetchPedidos} className="flex items-center gap-2">
          <RefreshCcw className="w-4 h-4" /> Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progreso de tus pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin w-8 h-8 text-green-600" />
            </div>
          ) : pedidos.length === 0 ? (
            <p className="text-gray-500 text-center">
              No tienes pedidos registrados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Estación Actual</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead>Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.paciente_nombre}</TableCell>
                    <TableCell>
                      {p.estado_estacion === "completado" ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" /> Completado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <Clock className="w-4 h-4" /> {p.estado_estacion}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{p.estacion_actual}</TableCell>
                    <TableCell className="w-64">
                      <Progress value={p.progreso} className="h-2 bg-green-100" />
                      <p className="text-xs text-gray-600 mt-1">
                        {p.progreso}% completado
                      </p>
                    </TableCell>
                    <TableCell>
                      {new Date(p.fecha_creacion).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
