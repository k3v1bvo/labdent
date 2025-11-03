"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { FlujoEstaciones } from "@/components/pedido/flujo-estaciones";

// Configuración de Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Pedido {
  id: string;
  paciente_nombre: string;
  paciente_genero: string;
  piezas: string;
  observaciones: string;
  estado: string;
  modelo_3d_link: string | null;
  fecha_creacion: string;
  fecha_entrega: string | null;
  total: number | null;
}

interface EstacionHistorial {
  id: string;
  estacion_nombre: string;
  estado: string;
  tecnico: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
}

export default function PedidoDetallePage() {
  const { id } = useParams();
  const router = useRouter();

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [historial, setHistorial] = useState<EstacionHistorial[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar datos del pedido y su historial
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener pedido
        const { data: pedidoData, error: pedidoError } = await supabase
          .from("pedidos")
          .select("*")
          .eq("id", id)
          .single();

        if (pedidoError) throw pedidoError;
        setPedido(pedidoData);

        // Obtener historial con nombres de estaciones
        const { data: historialData, error: historialError } = await supabase
          .from("historial_estaciones")
          .select(`
            id,
            estado,
            fecha_inicio,
            fecha_fin,
            tecnico_id,
            estacion_id,
            estaciones(nombre)
          `)
          .eq("pedido_id", id)
          .order("fecha_inicio", { ascending: true });

        if (historialError) throw historialError;

        // Procesar historial
        const historialFormateado =
          historialData?.map((h: any) => ({
            id: h.id,
            estacion_nombre: h.estaciones?.nombre || "Desconocida",
            estado: h.estado,
            tecnico: h.tecnico_id || null,
            fecha_inicio: h.fecha_inicio,
            fecha_fin: h.fecha_fin,
          })) || [];

        setHistorial(historialFormateado);
      } catch (err) {
        console.error("❌ Error cargando detalle del pedido:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const avanzarPedido = async () => {
    if (!pedido) return;
    try {
      const { error } = await supabase
        .from("pedidos")
        .update({ estado: "en_proceso" })
        .eq("id", pedido.id);

      if (error) throw error;
      alert("✅ Pedido avanzado a siguiente fase");
      router.refresh();
    } catch (err) {
      console.error("Error al avanzar pedido:", err);
      alert("❌ No se pudo avanzar el pedido");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Pedido no encontrado.
      </div>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Pedido #{pedido.id.slice(0, 8).toUpperCase()}
        </h1>
        <Button onClick={() => router.push("/pedidos")}>← Volver</Button>
      </div>

      {/* DATOS DEL PEDIDO */}
      <Card className="shadow-md border border-border">
        <CardHeader>
          <CardTitle>Datos del pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Paciente:</strong> {pedido.paciente_nombre}</p>
          <p><strong>Género:</strong> {pedido.paciente_genero === "H" ? "Hombre" : "Mujer"}</p>
          <p><strong>Piezas:</strong> {pedido.piezas}</p>
          <p><strong>Estado:</strong> {pedido.estado}</p>
          <p><strong>Fecha:</strong> {new Date(pedido.fecha_creacion).toLocaleDateString()}</p>
          {pedido.total && <p><strong>Total:</strong> ${pedido.total.toFixed(2)}</p>}
          {pedido.modelo_3d_link && (
            <p>
              <strong>Modelo 3D:</strong>{" "}
              <a
                href={pedido.modelo_3d_link}
                target="_blank"
                className="text-blue-500 underline"
              >
                Ver modelo
              </a>
            </p>
          )}
        </CardContent>
      </Card>

      {/* HISTORIAL DE ESTACIONES */}
      <Card className="shadow-md border border-border">
        <CardHeader>
          <CardTitle>Historial de estaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {historial.length === 0 ? (
            <p className="text-muted-foreground">Sin historial disponible.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2">Estación</th>
                  <th className="py-2">Técnico</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2">Inicio</th>
                  <th className="py-2">Fin</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h) => (
                  <tr
                    key={h.id}
                    className="border-b border-border hover:bg-muted/30 transition"
                  >
                    <td className="py-2">{h.estacion_nombre}</td>
                    <td className="py-2">{h.tecnico || "—"}</td>
                    <td className="py-2 capitalize">{h.estado}</td>
                    <td className="py-2">
                      {new Date(h.fecha_inicio).toLocaleString()}
                    </td>
                    <td className="py-2">
                      {h.fecha_fin
                        ? new Date(h.fecha_fin).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* FLUJO INTERACTIVO DE ESTACIONES */}
      <FlujoEstaciones pedidoId={pedido.id} />

      {/* BOTÓN DE AVANCE GENERAL */}
      {pedido.estado !== "entregado" && (
        <div className="flex justify-end">
          <Button onClick={avanzarPedido}>Avanzar pedido</Button>
        </div>
      )}
    </main>
  );
}
