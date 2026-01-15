"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Save, Trash2, RefreshCcw } from "lucide-react";

interface Estacion {
  id: string;
  nombre: string;
  orden: number;
  descripcion: string | null;
}

export default function AdminStationsPage() {
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Estacion | null>(null);

  async function fetchEstaciones() {
    setLoading(true);
    const { data, error } = await supabase
      .from("estaciones")
      .select("id, nombre, orden, descripcion")
      .order("orden", { ascending: true });

    if (error) {
      console.error("Error al obtener estaciones:", error);
    } else {
      setEstaciones(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchEstaciones();
  }, []);

  async function handleAdd() {
    const nombre = prompt("Nombre de la nueva estación:");
    if (!nombre) return;

    const orden = estaciones.length + 1;
    setCreating(true);

    const { error } = await supabase.from("estaciones").insert([
      {
        nombre,
        orden,
        descripcion: "",
      },
    ]);

    if (error) alert("❌ Error al crear estación");
    else {
      alert("✅ Estación creada correctamente");
      fetchEstaciones();
    }

    setCreating(false);
  }

  async function handleEdit(est: Estacion) {
    const nombre = prompt("Nuevo nombre de estación:", est.nombre);
    if (!nombre) return;

    const descripcion = prompt("Descripción (opcional):", est.descripcion || "");

    const { error } = await supabase
      .from("estaciones")
      .update({ nombre, descripcion })
      .eq("id", est.id);

    if (error) alert("❌ Error al actualizar estación");
    else {
      alert("✅ Estación actualizada");
      fetchEstaciones();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Seguro que deseas eliminar esta estación?")) return;

    const { error } = await supabase.from("estaciones").delete().eq("id", id);

    if (error) alert("❌ Error al eliminar estación");
    else {
      alert("✅ Estación eliminada");
      fetchEstaciones();
    }
  }

  async function handleChangeOrder(id: string, newOrder: number) {
    const { error } = await supabase
      .from("estaciones")
      .update({ orden: newOrder })
      .eq("id", id);

    if (error) console.error("Error al cambiar orden:", error);
    else fetchEstaciones();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-green-700">
          ⚙️ Gestión de Estaciones
        </h1>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={fetchEstaciones}
            className="flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" /> Actualizar
          </Button>

          <Button
            onClick={handleAdd}
            disabled={creating}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            {creating ? "Creando..." : "Nueva Estación"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Estaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin w-8 h-8 text-green-600" />
            </div>
          ) : estaciones.length === 0 ? (
            <p className="text-gray-500">No hay estaciones registradas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estaciones.map((est) => (
                  <TableRow key={est.id}>
                    <TableCell>
                      <Input
                        type="number"
                        defaultValue={est.orden}
                        onBlur={(e) =>
                          handleChangeOrder(est.id, Number(e.target.value))
                        }
                        className="w-20 text-center"
                      />
                    </TableCell>
                    <TableCell>{est.nombre}</TableCell>
                    <TableCell>{est.descripcion || "—"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(est)}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(est.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
