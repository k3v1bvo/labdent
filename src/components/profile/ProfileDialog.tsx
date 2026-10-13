"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Pencil, LogOut } from "lucide-react";

type ProfileRow = {
  id: string;
  nombre: string;
  telefono: string | null;
  rol: "admin" | "secretaria" | "doctor" | "tecnico";
};

export function ProfileDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [email, setEmail] = useState<string>("");

  const [editMode, setEditMode] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  const initial = useMemo(() => {
    const n = (profile?.nombre || "").trim();
    return n ? n.charAt(0).toUpperCase() : "U";
  }, [profile?.nombre]);

  useEffect(() => {
    if (!open) return;

    (async () => {
      setLoading(true);
      setEditMode(false);

      const {
        data: { user },
        error: uErr,
      } = await supabase.auth.getUser();

      if (uErr || !user) {
        setLoading(false);
        toast.error("Sesión inválida. Vuelve a iniciar sesión.");
        onOpenChange(false);
        return;
      }

      setEmail(user.email ?? "");

      const res = await supabase
        .from("profiles")
        .select("id,nombre,telefono,rol")
        .eq("id", user.id)
        .single();

      setLoading(false);

      if (res.error) {
        console.error("load profile error:", res.error);
        toast.error(`No se pudo cargar perfil: ${res.error.message}`);
        return;
      }

      const p = res.data as any;
      const typed: ProfileRow = {
        id: String(p.id),
        nombre: String(p.nombre ?? ""),
        telefono: p.telefono ?? null,
        rol: p.rol,
      };

      setProfile(typed);
      setNombre(typed.nombre);
      setTelefono(typed.telefono ?? "");
    })();
  }, [open, onOpenChange]);

  function startEdit() {
    setEditMode(true);
    setTimeout(() => {
      const el = document.getElementById("profileNombre") as HTMLInputElement | null;
      el?.focus();
      el?.select();
    }, 50);
  }

  async function save() {
    if (!profile) return;

    const nombreClean = nombre.trim().replace(/\s+/g, " ");
    const telClean = telefono.trim();

    if (!nombreClean) {
      toast.error("El nombre no puede estar vacío.");
      return;
    }

    setSaving(true);

    const res = await supabase
      .from("profiles")
      .update({
        nombre: nombreClean,
        telefono: telClean ? telClean : null,
      })
      .eq("id", profile.id);

    setSaving(false);

    if (res.error) {
      console.error("save profile error:", res.error);
      toast.error(`No se pudo guardar: ${res.error.message}`);
      return;
    }

    toast.success("✅ Perfil actualizado");
    setProfile((prev) =>
      prev ? { ...prev, nombre: nombreClean, telefono: telClean ? telClean : null } : prev
    );
    setEditMode(false);
    onSaved?.();
  }

  async function logout() {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    setLoggingOut(false);

    if (error) {
      console.error("logout error:", error);
      toast.error(`No se pudo cerrar sesión: ${error.message}`);
      return;
    }

    onOpenChange(false);
    window.location.href = "/login";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* ✅ Requerido por accesibilidad (oculto) */}
        <DialogHeader className="sr-only">
          <DialogTitle>Perfil del usuario</DialogTitle>
        </DialogHeader>

        {/* Contenedor blanco estilizado y responsivo */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl">
          {loading ? (
            <div className="text-sm text-slate-500 text-center py-8">Cargando perfil…</div>
          ) : (
            <div className="flex flex-col items-center text-center">
              {/* Avatar con gradiente oficial */}
              <div className="w-16 h-16 rounded-2xl bg-[#3C1C6C] text-white flex items-center justify-center text-2xl font-black border-2 border-[#A57CFA]/40 shadow-lg shadow-purple-950/20">
                {initial}
              </div>

              {/* Nombre */}
              <div className="mt-3.5 text-lg font-bold text-slate-900 tracking-tight">
                {profile?.nombre || "—"}
              </div>

              {/* Email */}
              <div className="mt-1 text-xs text-slate-500">{email || "—"}</div>

              {/* Rol */}
              <div className="mt-2.5">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-[#3C1C6C] border border-purple-200 text-[11px] font-bold uppercase tracking-wider">
                  Rol: {profile?.rol || "—"}
                </span>
              </div>

              {/* Editor */}
              {editMode && (
                <div className="w-full mt-6 space-y-3.5 text-left">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Nombre Completo</label>
                    <Input
                      id="profileNombre"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Tu nombre"
                      className="rounded-xl border-slate-200 focus:border-[#3C1C6C] text-sm h-11"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Teléfono</label>
                    <Input
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Ej: 70000000"
                      className="rounded-xl border-slate-200 focus:border-[#3C1C6C] text-sm h-11"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <Button
                      variant="outline"
                      className="w-1/2 rounded-xl h-11 text-xs font-semibold border-slate-200 hover:bg-slate-50"
                      onClick={() => {
                        setNombre(profile?.nombre ?? "");
                        setTelefono(profile?.telefono ?? "");
                        setEditMode(false);
                      }}
                      disabled={saving}
                    >
                      Cancelar
                    </Button>

                    <Button
                      className="w-1/2 bg-[#3C1C6C] hover:bg-[#2C1550] text-white font-bold rounded-xl h-11 text-xs shadow-md shadow-purple-950/20"
                      onClick={save}
                      disabled={saving}
                    >
                      {saving ? "Guardando…" : "Guardar Cambios"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Botones */}
              {!editMode && (
                <div className="w-full mt-7 space-y-2.5">
                  <Button
                    className="w-full bg-[#3C1C6C] hover:bg-[#2C1550] text-white font-bold h-11 sm:h-12 rounded-xl shadow-md shadow-purple-950/20 text-sm"
                    onClick={startEdit}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar Perfil
                  </Button>

                  <Button
                    className="w-full h-11 sm:h-12 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 font-semibold text-sm"
                    variant="outline"
                    onClick={logout}
                    disabled={loggingOut}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
