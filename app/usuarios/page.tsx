"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";

// Conexión a Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type UserRole = "admin" | "secretaria" | "doctor" | "tecnico";

interface Usuario {
  id: string;
  nombre: string;
  telefono: string | null;
  rol: UserRole;
  created_at: string;
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setUsuarios(data);
    setLoading(false);
  };

  const cambiarRol = async (id: string, nuevoRol: UserRole) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ rol: nuevoRol })
        .eq("id", id);

      if (error) throw error;
      alert("✅ Rol actualizado correctamente");
      fetchUsuarios();
    } catch (err) {
      console.error("Error cambiando rol:", err);
      alert("❌ No se pudo actualizar el rol");
    } finally {
      setUpdating(false);
    }
  };

  const eliminarUsuario = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;
    setUpdating(true);
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
      alert("🗑️ Usuario eliminado correctamente");
      fetchUsuarios();
    } catch (err) {
      console.error("Error eliminando usuario:", err);
      alert("❌ No se pudo eliminar el usuario");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios Registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {usuarios.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay usuarios registrados aún.
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2">Nombre</th>
                  <th className="py-2">Teléfono</th>
                  <th className="py-2">Rol</th>
                  <th className="py-2">Creado</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-border hover:bg-muted/30 transition"
                  >
                    <td className="py-2">{u.nombre}</td>
                    <td className="py-2">{u.telefono || "—"}</td>
                    <td className="py-2 capitalize">
                      <select
                        className="border rounded-md bg-background"
                        value={u.rol}
                        disabled={updating}
                        onChange={(e) =>
                          cambiarRol(u.id, e.target.value as UserRole)
                        }
                      >
                        <option value="admin">Admin</option>
                        <option value="secretaria">Secretaria</option>
                        <option value="doctor">Doctor</option>
                        <option value="tecnico">Técnico</option>
                      </select>
                    </td>
                    <td className="py-2">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={updating}
                        onClick={() => eliminarUsuario(u.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
