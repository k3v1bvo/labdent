"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";

// Configuración de Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Pedido {
  id: string;
  paciente_nombre: string;
  paciente_genero: string;
  estado: string;
  fecha_creacion: string;
  doctor_id: string | null;
  total: number | null;
}

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const { data, error } = await supabase
          .from("pedidos")
          .select("*")
          .order("fecha_creacion", { ascending: false });

        if (error) throw error;
        setPedidos(data || []);
      } catch (err) {
        console.error("❌ Error cargando pedidos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
  }, []);

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pedidos del Laboratorio</h1>
        <Link href="/pedidos/nuevo">
          <Button>➕ Nuevo Pedido</Button>
        </Link>
      </div>

      <Card className="shadow-md border border-border">
        <CardHeader>
          <CardTitle>Listado de pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : pedidos.length === 0 ? (
            <p className="text-muted-foreground">No hay pedidos registrados.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2">Paciente</th>
                  <th className="py-2">Género</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border hover:bg-muted/30 transition"
                  >
                    <td className="py-2">{p.paciente_nombre}</td>
                    <td className="py-2">{p.paciente_genero === "H" ? "Hombre" : "Mujer"}</td>
                    <td className="py-2 capitalize">{p.estado}</td>
                    <td className="py-2">
                      {new Date(p.fecha_creacion).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      {p.total ? `$${p.total.toFixed(2)}` : "—"}
                    </td>
                    <td className="py-2">
                      <Link href={`/pedidos/${p.id}`}>
                        <Button variant="outline" size="sm">
                          Ver detalles
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
