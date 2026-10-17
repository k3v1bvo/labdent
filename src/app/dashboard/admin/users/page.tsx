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
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    const targetUser = users.find((u) => u.id === userId);
    const oldRole = targetUser?.rol;

    const { error } = await supabase
      .from("profiles")
      .update({ rol: newRole })
      .eq("id", userId);

    if (error) {
      toast.error(`❌ Error al cambiar rol: ${error.message}`);
      return;
    }

    // 1. Si el nuevo rol es doctor, asegurar que exista registro en 'doctores'
    if (newRole === "doctor") {
      const { data: docExists } = await supabase
        .from("doctores")
        .select("id")
        .eq("profile_id", userId)
        .maybeSingle();

      if (!docExists) {
        await supabase.from("doctores").insert({
          profile_id: userId,
          nombre: targetUser?.nombre || "Doctor",
          clinica: `Clínica Dr(a). ${targetUser?.nombre || "Doctor"}`,
          especialidad: "Rehabilitación Oral",
        });
      }
    }

    // 2. Si ya no es técnico, desasignar de estaciones de taller
    if (newRole !== "tecnico") {
      await supabase.from("tecnico_estacion").delete().eq("tecnico_id", userId);
    }

    // 3. Notificar al usuario por correo y campanita del sistema
    fetch("/api/mailer/role-change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        newRole,
        previousRole: oldRole,
        name: targetUser?.nombre,
      }),
    }).catch((e) => console.warn("No se pudo enviar notificación de cambio de rol:", e));

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, rol: newRole } : u))
    );
    toast.success("✅ Rol actualizado y notificación enviada al usuario");
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

  // Estados para Restablecimiento de Contraseña
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<any>(null);
  const [tempPassword, setTempPassword] = useState("Guisela2026!");
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [showTempPass, setShowTempPass] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  function handleOpenResetModal(u: any) {
    setSelectedUserForReset(u);
    setTempPassword("Guisela2026!");
    setSendEmailNotification(true);
    setShowTempPass(false);
    setResetModalOpen(true);
  }

  function handleGenerateRandomPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let gen = "Guisela";
    for (let i = 0; i < 4; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    gen += "!";
    setTempPassword(gen);
  }

  async function handleConfirmResetPassword() {
    if (!selectedUserForReset) return;
    if (tempPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setResettingPassword(true);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserForReset.id,
          temporaryPassword: tempPassword,
          sendEmail: sendEmailNotification,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo restablecer la contraseña");
      }

      toast.success(
        sendEmailNotification && data.email
          ? `✅ Clave restablecida y enviada a ${data.email}`
          : "✅ Contraseña restablecida con éxito"
      );
      setResetModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(`❌ ${err.message || "Error al restablecer la contraseña"}`);
    } finally {
      setResettingPassword(false);
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
            <Combobox
              size="sm"
              value={roleFilter}
              onChange={setRoleFilter}
              options={[
                { value: "all", label: `Todos los roles (${users.length})` },
                { value: "admin", label: "Administrador", icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> },
                { value: "secretaria", label: "Secretaría", icon: <UserCheck className="w-3.5 h-3.5 text-blue-600" /> },
                { value: "doctor", label: "Doctor", icon: <Stethoscope className="w-3.5 h-3.5 text-emerald-600" /> },
                { value: "tecnico", label: "Técnico", icon: <Wrench className="w-3.5 h-3.5 text-amber-600" /> },
              ]}
              className="w-52"
              searchable={false}
            />
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
            <>
              {/* Vista Móvil: Tarjetas */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const currentRole = roles.find((r) => r.value === u.rol?.toLowerCase()) || roles[3];
                  const RoleIcon = currentRole.icon;

                  return (
                    <div key={u.id} className="p-4 space-y-3 bg-white hover:bg-purple-50/20 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-purple-100 text-[#3C1C6C] font-bold text-sm flex items-center justify-center border border-purple-200 shrink-0">
                            {(u.nombre || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">
                              {u.nombre || "Sin nombre"}
                            </p>
                            <p className="text-xs text-slate-400 font-mono truncate">
                              ID: {u.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenResetModal(u)}
                            className="text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-xl p-2 h-9 w-9 shrink-0"
                            title="Restablecer contraseña temporal"
                          >
                            <KeyRound className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(u.id, u.nombre)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl p-2 h-9 w-9 shrink-0"
                            title="Eliminar perfil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-slate-600">
                          {u.telefono ? `📞 ${u.telefono}` : <span className="text-slate-400 italic">Sin teléfono</span>}
                        </span>
                        <span className="text-slate-400">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                        </span>
                      </div>

                      <div className="pt-1 flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500 font-semibold">Rol Asignado:</span>
                        <Combobox
                          size="sm"
                          value={u.rol || "tecnico"}
                          onChange={(val) => handleRoleChange(u.id, val)}
                          options={[
                            { value: "admin", label: "Administrador", icon: <ShieldCheck className="w-3 h-3 text-purple-600" /> },
                            { value: "secretaria", label: "Secretaría", icon: <UserCheck className="w-3 h-3 text-blue-600" /> },
                            { value: "doctor", label: "Doctor", icon: <Stethoscope className="w-3 h-3 text-emerald-600" /> },
                            { value: "tecnico", label: "Técnico", icon: <Wrench className="w-3 h-3 text-amber-600" /> },
                          ]}
                          className="w-40"
                          searchable={false}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Vista Desktop: Tabla */}
              <div className="hidden md:block overflow-x-auto">
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
                            <Combobox
                              size="sm"
                              value={u.rol || "tecnico"}
                              onChange={(val) => handleRoleChange(u.id, val)}
                              options={[
                                { value: "admin", label: "Administrador", icon: <ShieldCheck className="w-3 h-3 text-purple-600" /> },
                                { value: "secretaria", label: "Secretaría", icon: <UserCheck className="w-3 h-3 text-blue-600" /> },
                                { value: "doctor", label: "Doctor", icon: <Stethoscope className="w-3 h-3 text-emerald-600" /> },
                                { value: "tecnico", label: "Técnico", icon: <Wrench className="w-3 h-3 text-amber-600" /> },
                              ]}
                              className="w-40"
                              searchable={false}
                            />
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenResetModal(u)}
                                className="text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg p-2 h-9 w-9"
                                title="Restablecer contraseña temporal"
                              >
                                <KeyRound className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(u.id, u.nombre)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-2 h-9 w-9"
                                title="Eliminar perfil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal para Restablecer Contraseña por Admin */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl border border-purple-100 p-6 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-[#3C1C6C] flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              Restablecer Contraseña
            </DialogTitle>
          </DialogHeader>

          {selectedUserForReset && (
            <div className="space-y-4 pt-2">
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 text-xs text-slate-700">
                <p>
                  Estás restableciendo la contraseña de:{" "}
                  <strong className="text-[#3C1C6C]">{selectedUserForReset.nombre || "Usuario"}</strong>
                </p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  ID: {selectedUserForReset.id}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Nueva Contraseña Temporal
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPassword}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-[#A57CFA]" /> Generar otra
                  </button>
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    type={showTempPass ? "text" : "password"}
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10 pr-10 h-11 rounded-xl border-purple-100 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTempPass((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showTempPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Por defecto sugerida: <code className="bg-slate-100 px-1 py-0.5 rounded font-bold text-[#3C1C6C]">Guisela2026!</code>
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="sendEmailCheck"
                  checked={sendEmailNotification}
                  onChange={(e) => setSendEmailNotification(e.target.checked)}
                  className="rounded border-purple-300 text-[#3C1C6C] focus:ring-[#3C1C6C] h-4 w-4 cursor-pointer"
                />
                <label
                  htmlFor="sendEmailCheck"
                  className="text-xs text-slate-700 font-medium cursor-pointer"
                >
                  Enviar correo al usuario con la nueva clave temporal
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => setResetModalOpen(false)}
                  className="rounded-xl border-slate-200 text-xs font-bold"
                  disabled={resettingPassword}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmResetPassword}
                  disabled={resettingPassword || tempPassword.length < 6}
                  className="bg-[#3C1C6C] hover:bg-[#2C1450] text-white font-bold rounded-xl text-xs gap-2"
                >
                  {resettingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Restableciendo...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmar Clave
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}