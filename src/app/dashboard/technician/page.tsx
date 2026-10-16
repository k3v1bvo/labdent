"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import StationPickerDialog, { Station } from "@/components/stations/StationPickerDialog";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

import { motion, AnimatePresence } from "framer-motion";

import TaskDetailsDialog, {
  type TaskRowLite,
} from "@/components/technician/TaskDetailsDialog";

import {
  Clock,
  Phone,
  User,
  Stethoscope,
  Hash,
  Palette,
  Box,
  Ruler,
  CheckCircle2,
  Timer,
  PlayCircle,
  Copy,
  Info,
  AlertTriangle,
  CalendarDays,
  Filter,
  RefreshCcw,
} from "lucide-react";

type PedidoLite = {
  id: string;
  paciente_nombre: string | null;
  paciente_telefono?: string | null;

  doctor_nombre?: string | null;
  doctor_telefono?: string | null;

  numero_requerimiento?: string | null;

  trabajo_realizar?: string | null;
  pieza_numero?: string | null;
  color_pieza?: string | null;
  colimetro?: string | null;
  numero_caja?: string | null;

  total?: number | null;
  anticipo?: number | null;

  observaciones?: string | null;

  fecha_ingreso?: string | null;
  hora_ingreso?: string | null;
};

type EstacionLite = { nombre: string; descripcion?: string | null };

type TaskRow = {
  id: string;
  estado: "pendiente" | "en_proceso" | "completado" | "devuelto";
  comentarios: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estaciones?: EstacionLite | null;
  pedidos?: PedidoLite | null;
};

function formatDateTime(d: string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function msToHuman(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function money(n: number | null | undefined) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return `Bs ${Number(n).toFixed(2)}`;
}

function statusBadge(estado: TaskRow["estado"]) {
  const base =
    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium";
  switch (estado) {
    case "pendiente":
      return (
        <span className={`${base} bg-gray-100 text-gray-700`}>
          <Clock className="w-3 h-3" /> Pendiente
        </span>
      );
    case "en_proceso":
      return (
        <span className={`${base} bg-blue-100 text-blue-800`}>
          <PlayCircle className="w-3 h-3" /> En proceso
        </span>
      );
    case "completado":
      return (
        <span className={`${base} bg-green-100 text-green-800`}>
          <CheckCircle2 className="w-3 h-3" /> Completado
        </span>
      );
    case "devuelto":
      return (
        <span className={`${base} bg-red-100 text-red-800`}>❌ Devuelto</span>
      );
    default:
      return (
        <span className={`${base} bg-gray-100 text-gray-700`}>{estado}</span>
      );
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function monthStartISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export default function TechnicianDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [stations, setStations] = useState<Station[]>([]);
  const [stationId, setStationId] = useState<string | null>(null);
  const [stationName, setStationName] = useState<string | null>(null);

  const [queueTasks, setQueueTasks] = useState<TaskRow[]>([]);
  const [myTasks, setMyTasks] = useState<TaskRow[]>([]);

  const canUseQueue = useMemo(
    () => !!userId && !!stationId,
    [userId, stationId]
  );

  // ✅ Overlay éxito
  const [successOverlay, setSuccessOverlay] = useState<null | string>(null);
  function showSuccess(msg: string) {
    setSuccessOverlay(msg);
    setTimeout(() => setSuccessOverlay(null), 1400);
  }

  // ✅ filtros "Mis tareas"
  const [fromDate, setFromDate] = useState<string>(""); // YYYY-MM-DD
  const [toDate, setToDate] = useState<string>(""); // YYYY-MM-DD
  const [myStatus, setMyStatus] = useState<"" | TaskRow["estado"]>(""); // opcional

  // ✅ Dialog comentario
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentTaskId, setCommentTaskId] = useState<string | null>(null);
  const [commentAction, setCommentAction] = useState<"save" | "advance">("save");
  const commentRef = useRef<HTMLTextAreaElement | null>(null);

  function openCommentDialog(task: TaskRow, action: "save" | "advance") {
    setCommentTaskId(task.id);
    setCommentAction(action);
    setCommentText(task.comentarios ?? "");
    setCommentOpen(true);

    setTimeout(() => {
      commentRef.current?.focus();
      commentRef.current?.select();
    }, 60);
  }

  async function saveCommentOnly() {
    if (!commentTaskId) return;
    const txt = commentText.trim();
    if (!txt) {
      toast.warning("Escribe un comentario antes de guardar.");
      return;
    }

    const { error } = await supabase
      .from("historial_estaciones")
      .update({ comentarios: txt })
      .eq("id", commentTaskId);

    if (error) {
      console.error(error);
      toast.error(`Error guardando comentario: ${error.message}`);
      return;
    }

    setCommentOpen(false);
    showSuccess("✅ Comentario guardado");
    await refreshAll();
  }

  async function completeWithComment() {
    if (!commentTaskId) return;
    const txt = commentText.trim() || null;

    const { error } = await supabase.rpc("rpc_completar_y_avanzar", {
      p_historial_id: commentTaskId,
      p_comentario: txt,
    });

    if (error) {
      console.error(error);
      toast.error(`❌ No se pudo completar: ${error.message}`);
      return;
    }

    setCommentOpen(false);
    showSuccess("✅ Avanzado a la siguiente estación");
    await refreshAll();
  }

  // ✅ Detalles (ahora con componente reutilizable)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<TaskRowLite | null>(null);
  function openDetail(task: TaskRow) {
    setDetailTask(task as any);
    setDetailOpen(true);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Validar rol de usuario para proteger el área técnica
      const { data: profile } = await supabase
        .from("profiles")
        .select("rol, nombre")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.rol === "doctor") {
        router.replace("/dashboard/doctors/orders");
        return;
      }

      if (profile?.rol === "secretaria") {
        router.replace("/dashboard/secretary/orders");
        return;
      }

      // Si es un usuario de Google sin estación asignada que cayó aquí por error
      const isGoogleUser =
        user.app_metadata?.provider === "google" ||
        user.identities?.some((id: any) => id.provider === "google");

      if (isGoogleUser && user.email !== "tecnico@labdent.com") {
        const { data: teCheck } = await supabase
          .from("tecnico_estacion")
          .select("id")
          .eq("tecnico_id", user.id)
          .maybeSingle();

        if (!teCheck) {
          // Auto-reparar a Doctor
          await supabase.from("profiles").update({ rol: "doctor" }).eq("id", user.id);
          await supabase.from("doctores").upsert({
            profile_id: user.id,
            nombre: profile?.nombre || user.user_metadata?.full_name || "Doctor",
            clinica: `Clínica Dr(a). ${profile?.nombre || user.user_metadata?.full_name || "Doctor"}`,
            especialidad: "Rehabilitación Oral",
          });
          router.replace("/dashboard/doctors/orders");
          return;
        }
      }

      setUserId(user.id);

      const { data: ests, error: estErr } = await supabase
        .from("estaciones")
        .select("id,nombre,orden,descripcion")
        .order("orden", { ascending: true });

      if (estErr) {
        console.error("estErr:", estErr);
        toast.error("❌ Error cargando estaciones");
        setLoading(false);
        return;
      }
      setStations((ests as Station[]) || []);

      const { data: te, error: teErr } = await supabase
        .from("tecnico_estacion")
        .select("estacion_id, estaciones(nombre)")
        .eq("tecnico_id", user.id)
        .maybeSingle();

      if (teErr) console.error("teErr:", teErr);

      const currentStationId = (te as any)?.estacion_id ?? null;
      const currentStationName = (te as any)?.estaciones?.nombre ?? null;

      setStationId(currentStationId);
      setStationName(currentStationName);

      // ✅ defaults pro: últimos 7 días para "Mis tareas"
      const today = todayISO();
      const from = addDaysISO(-7);
      setFromDate(from);
      setToDate(today);

      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    refreshAll();

    const channel = supabase
      .channel(`tech-tasks-realtime-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "historial_estaciones" },
        () => {
          refreshAll();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => {
          refreshAll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, stationId, fromDate, toDate, myStatus]);

  async function refreshAll() {
    if (!userId) return;

    // ✅ Mis tareas con filtros
    let mineQuery = supabase
      .from("historial_estaciones")
      .select(
        `
        id, estado, comentarios, fecha_inicio, fecha_fin,
        estaciones ( nombre, descripcion ),
        pedidos (
          id,
          paciente_nombre,
          paciente_telefono,
          doctor_nombre,
          doctor_telefono,
          numero_requerimiento,
          trabajo_realizar,
          pieza_numero,
          color_pieza,
          colimetro,
          numero_caja,
          total,
          anticipo,
          observaciones,
          fecha_ingreso,
          hora_ingreso
        )
      `
      )
      .eq("tecnico_id", userId)
      .order("fecha_inicio", { ascending: false });

    if (fromDate) {
      mineQuery = mineQuery.gte("fecha_inicio", `${fromDate}T00:00:00`);
    }
    if (toDate) {
      mineQuery = mineQuery.lte("fecha_inicio", `${toDate}T23:59:59`);
    }
    if (myStatus) {
      mineQuery = mineQuery.eq("estado", myStatus);
    }

    const { data: mine, error: mineErr } = await mineQuery;

    if (mineErr) {
      console.error("mineErr:", mineErr);
      toast.error("❌ Error cargando tus tareas");
      return;
    }
    setMyTasks((mine as any) || []);

    // ✅ Cola estación
    if (!stationId) {
      setQueueTasks([]);
      return;
    }

    const { data: queue, error: qErr } = await supabase
      .from("historial_estaciones")
      .select(
        `
        id, estado, comentarios, fecha_inicio, fecha_fin,
        estaciones ( nombre, descripcion ),
        pedidos (
          id,
          paciente_nombre,
          paciente_telefono,
          doctor_nombre,
          doctor_telefono,
          numero_requerimiento,
          trabajo_realizar,
          pieza_numero,
          color_pieza,
          colimetro,
          numero_caja,
          total,
          anticipo,
          observaciones,
          fecha_ingreso,
          hora_ingreso
        )
      `
      )
      .is("tecnico_id", null)
      .eq("estado", "pendiente")
      .eq("estacion_id", stationId)
      .order("fecha_inicio", { ascending: false });

    if (qErr) {
      console.error("qErr:", qErr);
      toast.error("❌ Error cargando cola de tu estación");
      return;
    }
    setQueueTasks((queue as any) || []);
  }

  async function tomarTarea(historialId: string) {
    const { error } = await supabase.rpc("rpc_tomar_tarea", {
      p_historial_id: historialId,
    });

    if (error) {
      console.error("rpc_tomar_tarea error:", error);
      toast.error(`❌ No se pudo tomar: ${error.message}`);
      return;
    }

    showSuccess("✅ Tarea tomada");
    await refreshAll();
  }

  async function soltarTarea(historialId: string) {
    const { error } = await supabase.rpc("rpc_soltar_tarea", {
      p_historial_id: historialId,
      p_comentario: null,
    });

    if (error) {
      console.error("rpc_soltar_tarea error:", error);
      toast.error(`❌ No se pudo soltar: ${error.message}`);
      return;
    }

    showSuccess("✅ Tarea soltada");
    await refreshAll();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function TaskCard({ task, mode }: { task: TaskRow; mode: "queue" | "mine" }) {
    const p = task.pedidos;

    const req = p?.numero_requerimiento
      ? String(p.numero_requerimiento)
      : null;

    const total = p?.total != null ? Number(p.total) : null;
    const anticipo = p?.anticipo != null ? Number(p.anticipo) : 0;
    const saldo = total != null ? total - anticipo : null;

    const now = Date.now();
    const startedAt = task.fecha_inicio
      ? new Date(task.fecha_inicio).getTime()
      : null;
    const finishedAt = task.fecha_fin ? new Date(task.fecha_fin).getTime() : null;

    const waitingMs = useMemo(() => {
      if (!startedAt) return null;
      if (task.estado !== "pendiente") return null;
      return now - startedAt;
    }, [now, startedAt, task.estado]);

    const inProcessMs = useMemo(() => {
      if (!startedAt) return null;
      if (task.estado !== "en_proceso") return null;
      return now - startedAt;
    }, [now, startedAt, task.estado]);

    const durationMs = useMemo(() => {
      if (!startedAt || !finishedAt) return null;
      if (task.estado !== "completado") return null;
      return finishedAt - startedAt;
    }, [startedAt, finishedAt, task.estado]);

    const isOld = waitingMs != null ? waitingMs > 24 * 3600 * 1000 : false;
    const title = p?.paciente_nombre?.trim() || "Pedido";

    async function quickCopy(label: string, value?: string | null) {
      const v = (value ?? "").trim();
      if (!v) return;
      const ok = await copyToClipboard(v);
      if (ok) showSuccess(`📋 Copiado: ${label}`);
    }

    return (
      <div className="border rounded-2xl p-4 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-base">{title}</p>

              {req && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                  <Hash className="w-3 h-3" /> {req}
                </span>
              )}

              {statusBadge(task.estado)}

              {isOld && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
                  <AlertTriangle className="w-3 h-3" /> Antiguo
                </span>
              )}

              {total != null && saldo != null && saldo > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800">
                  <AlertTriangle className="w-3 h-3" /> Saldo pendiente
                </span>
              )}
            </div>

            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <Ruler className="w-3 h-3" />
                Estación: {task.estaciones?.nombre ?? "—"}
              </span>

              {mode === "queue" && (
                <span className="inline-flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  Esperando: {waitingMs != null ? msToHuman(waitingMs) : "—"}
                </span>
              )}

              {mode === "mine" && task.estado === "en_proceso" && (
                <span className="inline-flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  En proceso: {inProcessMs != null ? msToHuman(inProcessMs) : "—"}
                </span>
              )}

              {mode === "mine" && task.estado === "completado" && (
                <span className="inline-flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  Duración: {durationMs != null ? msToHuman(durationMs) : "—"}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap justify-end">
            {/* ✅ Detalles con el componente nuevo */}
            <Button variant="outline" size="sm" onClick={() => openDetail(task)} className="rounded-xl border-slate-200">
              <Info className="w-4 h-4 mr-1 text-[#3C1C6C]" /> Detalles
            </Button>

            {mode === "queue" && (
              <Button size="sm" className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold shadow-sm" onClick={() => tomarTarea(task.id)}>
                Tomar Tarea
              </Button>
            )}

            {mode === "mine" && task.estado === "pendiente" && (
              <Button size="sm" className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold shadow-sm" onClick={() => tomarTarea(task.id)}>
                Iniciar Tarea
              </Button>
            )}

            {mode === "mine" && task.estado === "en_proceso" && (
              <>
                <Button size="sm" variant="outline" onClick={() => soltarTarea(task.id)} className="rounded-xl border-slate-200">
                  Soltar
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openCommentDialog(task, "save")}
                  className="rounded-xl border-slate-200"
                >
                  Comentario
                </Button>

                <Button size="sm" className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold shadow-sm" onClick={() => openCommentDialog(task, "advance")}>
                  ✓ Completar & Avanzar
                </Button>
              </>
            )}

            {mode === "mine" && task.estado === "completado" && (
              <span className="text-xs text-green-700 font-bold bg-green-50 px-2.5 py-1 rounded-full border border-green-200 flex items-center gap-1">
                ✅ Completado
              </span>
            )}

            <Button
              variant="ghost"
              onClick={() => quickCopy("Requerimiento", req)}
              title="Copiar número"
              className="px-2"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => quickCopy("Paciente", p?.paciente_nombre ?? "")}
              title="Copiar paciente"
              className="px-2"
            >
              <User className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => quickCopy("Doctor", p?.doctor_nombre ?? "")}
              title="Copiar doctor"
              className="px-2"
            >
              <Stethoscope className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-semibold">Resumen</p>

            <p className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Doctor:</span>{" "}
              <span className="font-medium">{p?.doctor_nombre || "—"}</span>
            </p>

            {p?.paciente_telefono && (
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Tel:</span>{" "}
                <span className="font-medium">{p.paciente_telefono}</span>
              </p>
            )}

            {task.estaciones?.descripcion && (
              <p className="text-sm text-muted-foreground">
                📌 <span className="font-semibold">Objetivo:</span>{" "}
                {task.estaciones.descripcion}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-semibold">Trabajo</p>

            <p>
              <span className="text-muted-foreground">Trabajo:</span>{" "}
              <span className="font-medium">{p?.trabajo_realizar || "—"}</span>
            </p>

            <p className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <span>
                <span className="text-muted-foreground">Pieza:</span>{" "}
                <span className="font-medium">{p?.pieza_numero || "—"}</span>
              </span>

              <span className="inline-flex items-center gap-1">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Color:</span>{" "}
                <span className="font-medium">{p?.color_pieza || "—"}</span>
              </span>

              <span className="inline-flex items-center gap-1">
                <Ruler className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Colímetro:</span>{" "}
                <span className="font-medium">{p?.colimetro || "—"}</span>
              </span>

              <span className="inline-flex items-center gap-1">
                <Box className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Caja:</span>{" "}
                <span className="font-medium">{p?.numero_caja || "—"}</span>
              </span>
            </p>
          </div>
        </div>

        <div className="mt-3 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
          <span>
            <span className="font-semibold">Inicio estación:</span>{" "}
            {formatDateTime(task.fecha_inicio)}
          </span>
          <span>
            <span className="font-semibold">Fin estación:</span>{" "}
            {formatDateTime(task.fecha_fin)}
          </span>

          {task.comentarios && (
            <span className="block w-full mt-1">
              <span className="font-semibold">💬 Comentario:</span>{" "}
              {task.comentarios}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-6">Cargando...</div>;

  return (
    <div className="p-6 space-y-6">
      <AnimatePresence>
        {successOverlay && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="bg-white border shadow-lg rounded-2xl px-6 py-4 flex items-center gap-3"
            >
              <CheckCircle2 className="w-7 h-7 text-green-600" />
              <p className="font-semibold text-green-700">{successOverlay}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#3C1C6C] flex items-center gap-2">
            🔬 Estación de Trabajo Dental
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestión técnica de tareas, registro de tiempos y avance de órdenes.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/dashboard/attendance">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm gap-2">
              <Clock className="w-4 h-4" /> Marcar Asistencia (GPS & Selfie)
            </Button>
          </Link>
          <Button variant="outline" onClick={refreshAll} className="rounded-xl border-slate-200">
            <RefreshCcw className="w-4 h-4 mr-2" /> Actualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mi estación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            Estación actual:{" "}
            <span className="font-semibold">{stationName ?? "No asignada"}</span>
          </p>

          <div className="max-w-md">
            <StationPickerDialog
              stations={stations}
              currentStationId={stationId}
              triggerLabel="Cambiar estación"
              onChanged={(newId) => {
                const st = stations.find((x) => x.id === newId);
                setStationId(newId);
                setStationName(st?.nombre ?? null);
                refreshAll();
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {stations.map((s) => (
              <Button
                key={s.id}
                variant={s.id === stationId ? "default" : "outline"}
                disabled
                title="Cambia estación usando el botón 'Cambiar estación'"
              >
                {s.orden}. {s.nombre}
              </Button>
            ))}
          </div>

          {!stationId && (
            <p className="text-sm text-red-600">
              ⚠️ Asigna una estación para ver la cola de trabajo.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cola de mi estación (pendientes)</CardTitle>
          <Button variant="outline" onClick={refreshAll}>
            Refrescar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {!canUseQueue ? (
            <p className="text-sm text-muted-foreground">
              Asigna una estación para ver tareas.
            </p>
          ) : queueTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay tareas pendientes.</p>
          ) : (
            <div className="space-y-3">
              {queueTasks.map((t) => (
                <TaskCard key={t.id} task={t} mode="queue" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-row items-center justify-between">
            <CardTitle>Mis tareas</CardTitle>
            <Button variant="outline" onClick={refreshAll}>
              Refrescar
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-2 md:items-end">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Desde</p>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full sm:w-[160px] rounded-xl border-slate-200 text-xs"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hasta</p>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full sm:w-[160px] rounded-xl border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                <select
                  value={myStatus}
                  onChange={(e) => setMyStatus(e.target.value as any)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white font-medium"
                >
                  <option value="">Todos</option>
                  <option value="pendiente">pendiente</option>
                  <option value="en_proceso">en_proceso</option>
                  <option value="completado">completado</option>
                  <option value="devuelto">devuelto</option>
                </select>
              </div>
            </div>

            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-slate-200 text-xs"
                onClick={() => {
                  const t = todayISO();
                  setFromDate(t);
                  setToDate(t);
                }}
              >
                Hoy
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-slate-200 text-xs"
                onClick={() => {
                  setFromDate(addDaysISO(-7));
                  setToDate(todayISO());
                }}
              >
                Últimos 7d
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-slate-200 text-xs"
                onClick={() => {
                  setFromDate(monthStartISO());
                  setToDate(todayISO());
                }}
              >
                Este mes
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-slate-200 text-xs"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                  setMyStatus("");
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Se filtra por <span className="font-semibold">fecha_inicio</span> de
            la estación (historial).
          </p>
        </CardHeader>

        <CardContent className="space-y-3">
          {myTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tienes tareas en ese rango.
            </p>
          ) : (
            <div className="space-y-3">
              {myTasks.map((t) => (
                <TaskCard key={t.id} task={t} mode="mine" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ Dialog: comentario técnico */}
      <Dialog open={commentOpen} onOpenChange={setCommentOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#3C1C6C] font-bold text-lg">
              {commentAction === "advance"
                ? "Completar con comentario técnico"
                : "Guardar anotación técnica"}
            </DialogTitle>
          </DialogHeader>

          <Textarea
            ref={commentRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Describe qué se hizo, ajuste marginal, color, observaciones para la siguiente estación..."
            className="min-h-[140px] rounded-xl border-slate-200 mt-2"
          />

          <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setCommentOpen(false)} className="rounded-xl border-slate-200 h-10 w-full sm:w-auto">
              Cancelar
            </Button>

            {commentAction === "save" ? (
              <Button onClick={saveCommentOnly} className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold h-10 w-full sm:w-auto shadow-md">
                Guardar comentario
              </Button>
            ) : (
              <Button onClick={completeWithComment} className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold h-10 w-full sm:w-auto shadow-md">
                ✓ Guardar y avanzar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ Detalles: componente reutilizable con iconos (igual que history) */}
      <TaskDetailsDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        row={detailTask}
      />
    </div>
  );
}
