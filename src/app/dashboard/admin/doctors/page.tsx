"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Edit, Trash2 } from "lucide-react";

interface Doctor {
  id: string;
  clinica: string | null;
  especialidad: string | null;
  created_at: string;
  profiles: {
    id: string;
    nombre: string;
    telefono: string | null;
  }[] | null;
}

export default function AdminDoctorsPage() {
  const [doctores, setDoctores] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchDoctores() {
    setLoading(true);
    const { data, error } = await supabase
      .from("doctores")
      .select(`
        id,
        clinica,
        especialidad,
        created_at,
        profiles (
          id,
          nombre,
          telefono
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error al obtener doctores:", error);
    } else {
      setDoctores(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchDoctores();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("¿Seguro que deseas eliminar este doctor?")) return;
    const { error } = await supabase.from("doctores").delete().eq("id", id);
    if (error) alert("Error al eliminar");
    else {
      alert("✅ Doctor eliminado");
      fetchDoctores();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-green-700">👨‍⚕️ Gestión de Doctores</h1>
        <Button className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Doctor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Doctores</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin w-8 h-8 text-green-600" />
            </div>
          ) : doctores.length === 0 ? (
            <p className="text-gray-500">No hay doctores registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Clínica</TableHead>
                  <TableHead>Especialidad</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctores.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{doc.profiles?.[0]?.nombre || "Sin nombre"}</TableCell>
                    <TableCell>{doc.clinica || "—"}</TableCell>
                    <TableCell>{doc.especialidad || "—"}</TableCell>
                    <TableCell>{doc.profiles?.[0]?.telefono || "—"}</TableCell>
                    <TableCell>
                      {new Date(doc.created_at).toLocaleDateString("es-ES")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="mr-2">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
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
