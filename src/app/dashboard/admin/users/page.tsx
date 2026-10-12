"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Users,
  ShieldCheck,
  UserCheck,
  Stethoscope,
  Wrench,
  Search,
  RefreshCcw,
  Loader2,
  Trash2,
  Mail,
  User,
  Calendar,
} from "lucide-react";

export default function UsersAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const roles = [
    { value: "admin", label: "Administrador", icon: ShieldCheck, color: "bg-purple-100 text-[#3C1C6C] border-purple-200" },
    { value: "secretaria", label: "Secretaría", icon: UserCheck, color: "bg-blue-100 text-blue-800 border-blue-200" },
    { value: "doctor", label: "Doctor / Clínica", icon: Stethoscope, color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    { value: "tecnico", label: "Técnico Dental", icon: Wrench, color: "bg-amber-100 text-amber-800 border-amber-200" },
  ];

  async function loadUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nombre, telefono, rol, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error("Error al cargar lista de usuarios");
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleRoleChange(userId: string, newRole: string) {
    const { error } = await supabase
      .from("profiles")
      .update({ rol: newRole })
      .eq("id", userId);

    if (error) {
      toast.error(`❌ Error al cambiar rol: ${error.message}`);
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, rol: newRole } : u))
      );
      toast.success("✅ Rol actualizado correctamente");
    }
  }

  async function handleDelete(userId: string, userName: string) {
    if (!confirm(`¿Seguro que deseas eliminar el perfil de ${userName}?`)) return;

    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (error) {
      toast.error(`❌ Error al eliminar usuario: ${error.message}`);
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("🗑️ Perfil eliminado");
    }
  }

  const filteredUsers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return users.filter((u) => {
      const matchQuery =
        !q ||
        (u.nombre || "").toLowerCase().includes(q) ||
        (u.telefono || "").toLowerCase().includes(q) ||
        (u.rol || "").toLowerCase().includes(q);

      const matchRole = roleFilter === "all" || (u.rol || "").toLowerCase() === roleFilter;

      return matchQuery && matchRole;
    });
  }, [users, searchTerm, roleFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#3C1C6C] flex items-center gap-2">
            <Users className="w-7 h-7 text-[#A57CFA]" /> Gestión de Usuarios y Roles
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Administra los permisos y accesos para Doctores, Técnicos, Secretaría y Administradores.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={loadUsers}
          className="gap-2 self-start sm:self-auto rounded-xl border-slate-200"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          Actualizar
        </Button>
      </div>

      {/* Controles de búsqueda y filtros */}
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar por nombre, teléfono o rol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 whitespace-nowrap">Filtrar por rol:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-[#3C1C6C]"
            >
              <option value="all">Todos los roles ({users.length})</option>
              <option value="admin">Administrador</option>
              <option value="secretaria">Secretaría</option>
              <option value="doctor">Doctor</option>
              <option value="tecnico">Técnico</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Usuarios */}
      <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#3C1C6C]" />
              <p className="text-sm">Cargando usuarios registrados...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm">No se encontraron usuarios con los filtros actuales.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-[#3C1C6C] text-white text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">Usuario / Nombre</th>
                    <th className="px-6 py-4">Teléfono</th>
                    <th className="px-6 py-4">Rol Asignado</th>
                    <th className="px-6 py-4">Fecha Registro</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredUsers.map((u) => {
                    const currentRole = roles.find((r) => r.value === u.rol?.toLowerCase()) || roles[3];
                    const RoleIcon = currentRole.icon;

                    return (
                      <tr key={u.id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-purple-100 text-[#3C1C6C] font-bold text-xs flex items-center justify-center border border-purple-200 shrink-0">
                              {(u.nombre || "U").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate">
                                {u.nombre || "Sin nombre"}
                              </p>
                              <p className="text-xs text-slate-400 font-mono truncate">
                                ID: {u.id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {u.telefono ? (
                            <span className="font-medium text-xs">📞 {u.telefono}</span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">No registrado</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${currentRole.color}">
                            <RoleIcon className="w-3.5 h-3.5" />
                            <select
                              value={u.rol || "tecnico"}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="bg-transparent font-semibold border-none focus:outline-none cursor-pointer"
                            >
                              <option value="admin">Administrador</option>
                              <option value="secretaria">Secretaría</option>
                              <option value="doctor">Doctor</option>
                              <option value="tecnico">Técnico</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(u.id, u.nombre)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-2"
                            title="Eliminar perfil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}