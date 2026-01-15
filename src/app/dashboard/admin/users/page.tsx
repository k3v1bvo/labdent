"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function UsersAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const roles = ["admin", "secretaria", "doctor", "tecnico"];

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nombre, rol, created_at")
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      else setUsers(data || []);
      setLoading(false);
    }
    loadUsers();
  }, []);

  async function handleRoleChange(userId: string, newRole: string) {
    const { error } = await supabase
      .from("profiles")
      .update({ rol: newRole })
      .eq("id", userId);

    if (error) {
      alert("❌ Error al cambiar rol");
      console.error(error);
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, rol: newRole } : u))
      );
      alert("✅ Rol actualizado correctamente");
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (error) {
      alert("❌ Error al eliminar usuario");
      console.error(error);
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      alert("🗑️ Usuario eliminado");
    }
  }

  async function handlePasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      alert("❌ Error al enviar enlace de restablecimiento");
      console.error(error);
    } else {
      alert(`📧 Se envió un correo de recuperación a ${email}`);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <h1 className="text-3xl font-bold text-green-800 mb-6">👥 Gestión de Usuarios</h1>

      {loading ? (
        <p className="text-gray-600">Cargando usuarios...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl shadow border border-gray-100">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-green-700 text-white">
              <tr>
                <th className="px-6 py-3">Nombre</th>
                <th className="px-6 py-3">Rol</th>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-3">{u.nombre}</td>
                  <td className="px-6 py-3">
                    <select
                      value={u.rol}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="border rounded px-2 py-1"
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-3">
                    {new Date(u.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 space-x-2">
                    <button
                      onClick={() => handlePasswordReset(u.email)}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      🔑 Resetear
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      🗑️ Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}