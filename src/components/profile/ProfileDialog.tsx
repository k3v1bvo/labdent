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
import {
  Pencil,
  LogOut,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Clock,
  Sparkles,
  CheckCircle2,
  X,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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

    toast.success("✅ Perfil actualizado exitosamente");
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

  const roleMeta = useMemo(() => {
    switch (profile?.rol) {
      case "admin":
        return {
          label: "Administrador General",
          badgeColor: "bg-purple-100 text-[#3C1C6C] border-purple-300",
          desc: "Acceso total a finanzas, auditoría, taller y gestión",
          icon: "👑",
        };
      case "tecnico":
        return {
          label: "Técnico Dental de Taller",
          badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
          desc: "Control de estaciones técnicas, tareas y asistencia",
          icon: "🔧",
        };
      case "secretaria":
        return {
          label: "Recepción & Secretaría",
          badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
          desc: "Recepción de órdenes, doctores y facturación clínica",
          icon: "📋",
        };
      case "doctor":
        return {
          label: "Odontólogo / Clínica",
          badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
          desc: "Registro de pedidos digitales y seguimiento de casos",
          icon: "🩺",
        };
      default:
        return {
          label: "Usuario del Sistema",
          badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
          desc: "Cuenta autenticada en Guisela Dental",
          icon: "👤",
        };
    }
  }, [profile?.rol]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-3xl border border-purple-200 shadow-2xl bg-white">
        <DialogHeader className="sr-only">
          <DialogTitle>Perfil del Usuario</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <div className="w-8 h-8 border-3 border-[#A57CFA] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-semibold">Cargando perfil seguro...</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* 1. Header Banner Superior con Gradiente Real Guisela */}
            <div className="relative h-28 bg-gradient-to-r from-[#1B0B2E] via-[#3C1C6C] to-[#6329B7] p-5 flex items-start justify-between text-white overflow-hidden">
              {/* Círculo decorativo */}
              <div className="absolute -top-10 -right-10 w-36 h-36 bg-[#A57CFA]/20 rounded-full blur-xl pointer-events-none" />

              {/* Marca Guisela */}
              <div className="flex items-center gap-2 relative z-10">
                <div className="relative w-7 h-7 rounded-lg bg-white/10 p-1 flex items-center justify-center border border-white/20">
                  <Image
                    src="/images/brand/guisela-symbol-white.png"
                    alt="Guisela"
                    width={24}
                    height={24}
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <span className="text-xs font-black tracking-wider text-purple-200 uppercase">
                  Guisela Dental
                </span>
              </div>

              <div className="flex items-center gap-2 relative z-10">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-bold text-white border border-white/20 backdrop-blur-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Sesión Activa
                </span>
              </div>
            </div>

            {/* 2. Avatar Flotante e Identidad */}
            <div className="px-6 pt-0 pb-6 relative">
              <div className="flex items-end justify-between -mt-12 mb-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-22 h-22 rounded-3xl bg-gradient-to-br from-[#3C1C6C] to-[#6329B7] text-white flex items-center justify-center text-3xl font-black border-4 border-white shadow-xl shadow-purple-950/30">
                    {initial}
                  </div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-md flex items-center justify-center" title="En línea">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white stroke-[3]" />
                  </div>
                </div>

                {/* Botón de Edición Rápida */}
                {!editMode && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={startEdit}
                    className="rounded-xl border-purple-200 text-[#3C1C6C] hover:bg-purple-50 font-bold text-xs gap-1.5 shadow-2xs h-9"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar Datos
                  </Button>
                )}
              </div>

              {/* Nombre y Rol */}
              <div className="text-left">
                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
                  {profile?.nombre || "Usuario"}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${roleMeta.badgeColor}`}>
                    <span>{roleMeta.icon}</span>
                    <span>{roleMeta.label}</span>
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {email}
                  </span>
                </div>
              </div>

              {/* 3. Formulario de Edición si está activo */}
              {editMode ? (
                <div className="mt-5 p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-3.5 text-left">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#A57CFA]" />
                      Nombre Completo
                    </label>
                    <Input
                      id="profileNombre"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Tu nombre completo"
                      className="rounded-xl border-slate-200 focus:border-[#3C1C6C] bg-white text-sm h-11"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#A57CFA]" />
                      Teléfono / WhatsApp
                    </label>
                    <Input
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Ej: 71234567"
                      className="rounded-xl border-slate-200 focus:border-[#3C1C6C] bg-white text-sm h-11"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <Button
                      variant="outline"
                      className="w-1/2 rounded-xl h-11 text-xs font-bold border-slate-300 hover:bg-slate-100"
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
              ) : (
                /* 4. Tarjetas de Información Detallada */
                <div className="mt-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-left">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Teléfono / Contacto
                      </span>
                      <p className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-purple-600" />
                        {profile?.telefono || <span className="text-slate-400 font-normal italic">Sin registrar</span>}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Permisos Asignados
                      </span>
                      <p className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Verificado</span>
                      </p>
                    </div>
                  </div>

                  {/* Acceso Rápido a Horarios si aplica */}
                  {(profile?.rol === "tecnico" || profile?.rol === "secretaria" || profile?.rol === "admin") && (
                    <Link
                      href="/dashboard/attendance"
                      onClick={() => onOpenChange(false)}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-purple-50/80 hover:bg-purple-100 border border-purple-200 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#3C1C6C] text-[#D0B9FF] flex items-center justify-center font-bold">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#3C1C6C]">Mi Control de Asistencia & Horario</p>
                          <p className="text-[11px] text-slate-600">Ver horas registradas, tolerancia y GPS</p>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-[#A57CFA] group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  )}

                  {/* Botón de Cerrar Sesión */}
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      onClick={logout}
                      disabled={loggingOut}
                      className="w-full h-11 rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 font-bold text-xs shadow-2xs gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      {loggingOut ? "Cerrando sesión segura…" : "Cerrar Sesión"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
