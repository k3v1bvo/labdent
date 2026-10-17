"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Wrench,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  User,
  Phone,
  Mail,
  Lock,
  Layers,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EstacionOption {
  id: string;
  nombre: string;
  orden: number;
}

export function SecretTechnicianRegisterModal({ open, onOpenChange }: Props) {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [estacionId, setEstacionId] = useState("");
  const [pinTaller, setPinTaller] = useState("");

  const [estaciones, setEstaciones] = useState<EstacionOption[]>([]);
  const [loadingEstaciones, setLoadingEstaciones] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    async function fetchEstaciones() {
      setLoadingEstaciones(true);
      const { data, error } = await supabase
        .from("estaciones")
        .select("id, nombre, orden")
        .order("orden", { ascending: true });

      if (!error && data && data.length > 0) {
        setEstaciones(data);
        setEstacionId(data[0].id);
      }
      setLoadingEstaciones(false);
    }

    fetchEstaciones();
  }, [open]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    if (!nombre.trim() || !email.trim() || !password.trim()) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    // Validación opcional de PIN de taller (permite GUIS-TECH o vacío si no se configuró)
    if (pinTaller.trim() && pinTaller.trim().toUpperCase() !== "GUIS-TECH" && pinTaller.trim() !== "7663") {
      toast.error("PIN de taller no válido. Solicítalo al administrador.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          email: email.trim().toLowerCase(),
          password,
          rol: "tecnico",
          estacionId: estacionId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Error al crear cuenta técnica");
        setSubmitting(false);
        return;
      }

      toast.success("✅ Cuenta de técnico creada con éxito. Iniciando sesión...");

      // Iniciar sesión automáticamente
      const loginRes = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (loginRes.error) {
        toast.info("Cuenta creada. Ingresa con tus credenciales en el login.");
        onOpenChange(false);
        return;
      }

      onOpenChange(false);
      router.push("/dashboard/technician");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Ocurrió un error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-6 sm:p-7 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900 shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-[#3C1C6C] dark:text-purple-300 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-[10px] font-black text-[#3C1C6C] dark:text-purple-300 uppercase tracking-wider mb-1">
                <ShieldAlert className="w-3 h-3 text-purple-700" /> Acceso Secreto de Taller
              </div>
              <DialogTitle className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                Registro de Técnico Dental
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Crea tu perfil técnico directo para ingresar al sistema de estaciones y seguimiento de producción sin requerir intervención manual del administrador.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleRegister} className="space-y-3.5 py-2">
          {/* Nombre completo */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-purple-700" /> Nombre y Apellidos *
            </label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej: Marcelo Condori"
              className="h-10 rounded-xl border-slate-200 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Teléfono / WhatsApp */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-purple-700" /> WhatsApp / Teléfono
              </label>
              <Input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="70000000"
                className="h-10 rounded-xl border-slate-200 text-sm"
              />
            </div>

            {/* Estación de especialidad */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-purple-700" /> Estación Principal
              </label>
              <select
                value={estacionId}
                onChange={(e) => setEstacionId(e.target.value)}
                disabled={loadingEstaciones}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#3C1C6C]"
              >
                {estaciones.map((est) => (
                  <option key={est.id} value={est.id}>
                    {est.orden}. {est.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-purple-700" /> Correo Electrónico *
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tecnico@laboratorio.com"
              className="h-10 rounded-xl border-slate-200 text-sm"
            />
          </div>

          {/* Contraseña */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-purple-700" /> Contraseña de Acceso (mínimo 6) *
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="h-10 rounded-xl border-slate-200 text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* PIN de Taller (Opcional con default) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-purple-700" /> Código de Seguridad de Taller (Opcional):
              </span>
              <span className="text-[10px] text-purple-700 font-mono">PIN: GUIS-TECH</span>
            </label>
            <Input
              value={pinTaller}
              onChange={(e) => setPinTaller(e.target.value)}
              placeholder="GUIS-TECH (dejar vacío o ingresar pase)"
              className="h-9 rounded-xl border-slate-200 text-xs font-mono"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-slate-200 text-xs h-10"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#3C1C6C] hover:bg-[#2C1450] text-white font-bold text-xs h-10 px-5 shadow-md gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Registrando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Activar Cuenta de Técnico
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
