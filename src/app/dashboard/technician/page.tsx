"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import StationPickerDialog, { Station } from "@/components/stations/StationPickerDialog";
import TaskDetailsDialog, {
  type TaskRowLite,
} from "@/components/technician/TaskDetailsDialog";
import {
  ControlComponentes,
  type ComponenteItem,
  parseComponentesFromObservaciones,
  formatComponentesForObservaciones,
} from "@/components/orders/ControlComponentes";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
  Sparkles,
  Cpu,
  Flame,
  Sun,
  ShieldCheck,
  Truck,
  Wrench,
  Inbox,
  Play,
  Undo2,
  Search,
  CheckCheck,
  Check,
  ChevronRight,
  ExternalLink,
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

type EstacionLite = { nombre: string; descripcion?: string | null; orden?: number };

type TaskRow = {
  id: string;
  estado: "pendiente" | "en_proceso" | "completado" | "devuelto";
  comentarios: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estaciones?: EstacionLite | null;
  pedidos?: PedidoLite | null;
};

const STATION_ICONS: Record<number, any> = {
  1: Cpu,
  2: Flame,
  3: Sparkles,
  4: Sun,
  5: ShieldCheck,
};

function formatDateTime(d: string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  });
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

function statusBadge(estado: TaskRow["estado"]) {
  switch (estado) {
    case "pendiente":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3" /> En espera
        </span>
      );
    case "en_proceso":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-[#3C1C6C] border border-purple-300 animate-pulse">
          <PlayCircle className="w-3 h-3" /> En mesa activa
        </span>
      );
    case "completado":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" /> Completado
        </span>
      );
    case "devuelto":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          ❌ Devuelto
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          {estado}
        </span>
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
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const [stations, setStations] = useState<Station[]>([]);
  const [stationId, setStationId] = useState<string | null>(null);
  const [stationName, setStationName] = useState<string | null>(null);
  const [switchingStation, setSwitchingStation] = useState(false);

  const [queueTasks, setQueueTasks] = useState<TaskRow[]>([]);
  const [myTasks, setMyTasks] = useState<TaskRow[]>([]);

  // Tabs de navegación interna
  const [activeTab, setActiveTab] = useState<"queue" | "in_process" | "all">("in_process");
  const [searchQuery, setSearchQuery] = useState("");

  // Overlay éxito
  const [successOverlay, setSuccessOverlay] = useState<null | string>(null);
  function showSuccess(msg: string) {
    setSuccessOverlay(msg);
    setTimeout(() => setSuccessOverlay(null), 1400);
  }

  // Filtros "Todas mis tareas"
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [myStatus, setMyStatus] = useState<"" | TaskRow["estado"]>("");

  // Dialog comentario técnico
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentTaskId, setCommentTaskId] = useState<string | null>(null);
  const [commentPedidoId, setCommentPedidoId] = useState<string | null>(null);
  const [advanceComponents, setAdvanceComponents] = useState<ComponenteItem[]>([]);
  const [targetStationId, setTargetStationId] = useState<string>("");
  const [commentAction, setCommentAction] = useState<"save" | "advance">("save");
  const commentRef = useRef<HTMLTextAreaElement | null>(null);

  // Dialog detalles
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<TaskRowLite | null>(null);

  function openDetail(task: TaskRow) {
    setDetailTask(task as any);
    setDetailOpen(true);
  }

  function openCommentDialog(task: TaskRow, action: "save" | "advance") {
    setCommentTaskId(task.id);
    setCommentPedidoId((task.pedidos as any)?.id ?? null);
    setCommentAction(action);
    setCommentText(task.comentarios ?? "");

    // Cargar componentes de la caja desde observaciones
    const parsedComps = parseComponentesFromObservaciones(task.pedidos?.observaciones);
    setAdvanceComponents(parsedComps);

    setTargetStationId("");
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
      toast.warning("Escribe una anotación antes de guardar.");
      return;
    }

    const { error } = await supabase
      .from("historial_estaciones")
      .update({ comentarios: txt })
      .eq("id", commentTaskId);

    if (error) {
      console.error(error);
      toast.error(`Error guardando anotación: ${error.message}`);
      return;
    }

    setCommentOpen(false);
    showSuccess("✅ Anotación técnica guardada");
    await refreshAll();
  }

  async function completeWithComment() {
    if (!commentTaskId) return;
    const txt = commentText.trim() || null;

    // 1. Guardar componentes en observaciones del pedido
    if (commentPedidoId && advanceComponents.length > 0) {
      const currentTask =
        myTasks.find((t) => t.id === commentTaskId) ||
        queueTasks.find((t) => t.id === commentTaskId);
      const existingObs = currentTask?.pedidos?.observaciones || "";
      const updatedObs = formatComponentesForObservaciones(advanceComponents, existingObs);
      await supabase
        .from("pedidos")
        .update({ observaciones: updatedObs || null })
        .eq("id", commentPedidoId);
    }

    // 2. Construir bitácora con componentes y estación destino
    const compChecked = advanceComponents.filter((c) => c.checked);
    const compText =
      compChecked.length > 0
        ? `[COMPONENTES: ${compChecked.map((c) => `${c.cantidad}x ${c.nombre}`).join(", ")}]`
        : "";
    const targetStation = stations.find((s) => s.id === targetStationId);
    const targetText = targetStation ? `[ENVIAR A: ${targetStation.nombre}]` : "";

    const combinedComentario = [txt, compText, targetText].filter(Boolean).join(" | ") || null;

    const { error } = await supabase.rpc("rpc_completar_y_avanzar", {
      p_historial_id: commentTaskId,
      p_comentario: combinedComentario,
    });

    if (error) {
      console.error(error);
      toast.error(`❌ No se pudo completar: ${error.message}`);
      return;
    }

    setCommentOpen(false);
    showSuccess("✅ Trabajo completado y avanzado a la siguiente estación");
    await refreshAll();
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

    showSuccess("⚡ Tarea tomada a tu mesa de trabajo");
    setActiveTab("in_process");
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

    showSuccess("Tarea devuelta a la cola");
    await refreshAll();
  }

  // 1-Click Switch de Estación
  async function handleQuickStationSwitch(targetStationId: string) {
    if (targetStationId === stationId) return;
    setSwitchingStation(true);
    try {
      const { error } = await supabase.rpc("rpc_cambiar_estacion", {
        p_nueva_estacion_id: targetStationId,
      });

      if (error) {
        toast.error(`Error cambiando estación: ${error.message}`);
        return;
      }

      const st = stations.find((s) => s.id === targetStationId);
      setStationId(targetStationId);
      setStationName(st?.nombre ?? null);
      toast.success(`⚡ Estación activa cambiada a: ${st?.nombre || "Estación"}`);
      await refreshAll();
    } catch (err: any) {
      toast.error("Error al cambiar de estación");
    } finally {
      setSwitchingStation(false);
    }
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

      setUserId(user.id);
      setUserName(profile?.nombre || "Técnico Dental");

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
    setRefreshing(true);

    // 1) Mis tareas
    let mineQuery = supabase
      .from("historial_estaciones")
      .select(
        `
        id, estado, comentarios, fecha_inicio, fecha_fin,
        estaciones ( nombre, descripcion, orden ),
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
    if (mineErr) console.error("mineErr:", mineErr);
    setMyTasks((mine as any) || []);

    // 2) Cola de estación
    if (stationId) {
      const { data: queue, error: qErr } = await supabase
        .from("historial_estaciones")
        .select(
          `
          id, estado, comentarios, fecha_inicio, fecha_fin,
          estaciones ( nombre, descripcion, orden ),
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
        .order("fecha_inicio", { ascending: true });

      if (qErr) console.error("qErr:", qErr);
      setQueueTasks((queue as any) || []);
    } else {
      setQueueTasks([]);
    }

    setRefreshing(false);
  }

  // Tareas en proceso activo de mi mesa
  const activeTasks = useMemo(() => {
    return myTasks.filter((t) => t.estado === "en_proceso");
  }, [myTasks]);

  // Completadas hoy
  const completedTodayCount = useMemo(() => {
    const today = todayISO();
    return myTasks.filter(
      (t) => t.estado === "completado" && t.fecha_fin && t.fecha_fin.startsWith(today)
    ).length;
  }, [myTasks]);

  // Filtro de búsqueda
  function filterTasksBySearch(list: TaskRow[]) {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((t) => {
      const p = t.pedidos;
      const blob = [
        p?.paciente_nombre,
        p?.numero_requerimiento,
        p?.numero_caja,
        p?.doctor_nombre,
        p?.trabajo_realizar,
        p?.pieza_numero,
        p?.color_pieza,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }

  const filteredQueue = useMemo(
    () => filterTasksBySearch(queueTasks),
    [queueTasks, searchQuery]
  );
  const filteredActive = useMemo(
    () => filterTasksBySearch(activeTasks),
    [activeTasks, searchQuery]
  );
  const filteredAll = useMemo(
    () => filterTasksBySearch(myTasks),
    [myTasks, searchQuery]
  );

  const currentStationObj = useMemo(
    () => stations.find((s) => s.id === stationId),
    [stations, stationId]
  );
  const CurrentStationIcon = currentStationObj?.orden
    ? STATION_ICONS[currentStationObj.orden] || Wrench
    : Wrench;

  // COMPONENTE TARJETA DE TAREA DENTAL
  function DentalTaskCard({
    task,
    mode,
  }: {
    task: TaskRow;
    mode: "queue" | "active" | "history";
  }) {
    const p = task.pedidos;
    const req = p?.numero_requerimiento || null;
    const hasDelivery = p?.observaciones && p?.observaciones.includes("DELIVERY");

    const now = Date.now();
    const startedAt = task.fecha_inicio ? new Date(task.fecha_inicio).getTime() : null;
    const finishedAt = task.fecha_fin ? new Date(task.fecha_fin).getTime() : null;

    const waitingMs = startedAt && task.estado === "pendiente" ? now - startedAt : null;
    const inProcessMs = startedAt && task.estado === "en_proceso" ? now - startedAt : null;
    const durationMs = startedAt && finishedAt && task.estado === "completado" ? finishedAt - startedAt : null;

    const isOld = waitingMs != null ? waitingMs > 24 * 3600 * 1000 : false;
    const title = p?.paciente_nombre?.trim() || "Trabajo Dental";

    return (
      <div
        className={`rounded-3xl border bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-4 ${
          mode === "active"
            ? "border-purple-300 ring-2 ring-purple-500/10"
            : "border-slate-200/90"
        }`}
      >
        {/* Cabecera de la orden */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {p?.numero_caja && (
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-md bg-purple-900 text-white shadow-xs">
                  Caja #{p.numero_caja}
                </span>
              )}
              {req && (
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  {req}
                </span>
              )}
              {hasDelivery && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Delivery
                </span>
              )}
              {isOld && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-600" /> &gt;24h en espera
                </span>
              )}
            </div>

            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {title}
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-[#3C1C6C] mt-0.5">
              {p?.trabajo_realizar || "Rehabilitación Protésica"}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {statusBadge(task.estado)}
            {inProcessMs != null && (
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
                <Timer className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                {msToHuman(inProcessMs)}
              </span>
            )}
            {waitingMs != null && mode === "queue" && (
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Espera: {msToHuman(waitingMs)}
              </span>
            )}
            {durationMs != null && (
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Duración: {msToHuman(durationMs)}
              </span>
            )}
          </div>
        </div>

        {/* Ficha técnica del trabajo protésico */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-50/70 border border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Ruler className="w-3 h-3 text-slate-400" /> Pieza(s)
            </span>
            <span className="font-bold text-slate-800 text-sm">{p?.pieza_numero || "—"}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Palette className="w-3 h-3 text-[#3C1C6C]" /> Color / Tono
            </span>
            <span className="font-bold text-[#3C1C6C] text-sm">{p?.color_pieza || "—"}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Colímetro
            </span>
            <span className="font-bold text-slate-800">{p?.colimetro || "Estándar"}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Stethoscope className="w-3 h-3 text-slate-400" /> Odontólogo
            </span>
            <span className="font-bold text-slate-800 truncate block">
              {p?.doctor_nombre || "—"}
            </span>
          </div>
        </div>

        {/* Observaciones clínicas */}
        {p?.observaciones && (
          <div className="p-3 rounded-2xl bg-purple-50/40 border border-purple-100 text-xs text-slate-700 space-y-1">
            <span className="font-bold text-[#3C1C6C] text-[11px] block">
              Instrucciones & Especificaciones Clínicas:
            </span>
            <p className="italic text-slate-600 line-clamp-3">&ldquo;{p.observaciones}&rdquo;</p>
          </div>
        )}

        {/* Comentario de estación previa o actual */}
        {task.comentarios && (
          <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <span className="font-bold shrink-0">💬 Bitácora:</span>
            <span>{task.comentarios}</span>
          </div>
        )}

        {/* Barra de Acciones */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-t border-slate-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDetail(task)}
              className="text-xs rounded-xl border-slate-200 h-9 font-semibold gap-1.5 hover:bg-purple-50 text-slate-700"
            >
              <Info className="w-3.5 h-3.5 text-[#3C1C6C]" /> Ver Ficha Técnica
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const ok = await copyToClipboard(req || p?.paciente_nombre || "");
                if (ok) showSuccess("📋 Copiado al portapapeles");
              }}
              className="h-9 px-2 text-xs text-slate-400 hover:text-slate-700"
              title="Copiar datos rápidos"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-2 justify-end flex-wrap">
            {mode === "queue" && (
              <Button
                size="sm"
                onClick={() => tomarTarea(task.id)}
                className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white font-bold rounded-xl text-xs h-9 px-4 gap-2 shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Tomar a Mi Mesa
              </Button>
            )}

            {mode === "active" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => soltarTarea(task.id)}
                  className="rounded-xl border-slate-200 text-xs text-slate-500 hover:text-slate-800 h-9 gap-1"
                >
                  <Undo2 className="w-3.5 h-3.5" /> Soltar a cola
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openCommentDialog(task, "save")}
                  className="rounded-xl border-purple-200 text-xs font-semibold text-[#3C1C6C] hover:bg-purple-50 h-9"
                >
                  💬 Nota
                </Button>

                <Button
                  size="sm"
                  onClick={() => openCommentDialog(task, "advance")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" /> Completar & Avanzar
                </Button>
              </>
            )}

            {mode === "history" && task.estado === "completado" && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Etapa Terminada
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <RefreshCcw className="animate-spin w-8 h-8 text-[#3C1C6C]" />
        <p className="text-xs text-slate-500 font-medium">Iniciando mesa de trabajo técnico...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Animado Flotante */}
      <AnimatePresence>
        {successOverlay && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-6 right-6 z-50 bg-[#3C1C6C] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-purple-300 font-bold text-sm"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{successOverlay}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Banner Ejecutivo Guisela */}
      <div className="rounded-3xl border border-purple-200/80 bg-gradient-to-br from-[#3C1C6C] via-[#482084] to-[#5a2a9e] p-6 sm:p-8 text-white shadow-xl shadow-purple-950/15 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-[#D0B9FF] border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-[#A57CFA]" /> Taller Dental CAD/CAM & Biomimética
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Mesa de Trabajo · {userName}
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/90 max-w-xl">
              Control de producción, estratificación cerámica y registro de tiempos de laboratorio en vivo.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link href="/dashboard/attendance">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs h-10 px-4 gap-2 shadow-md">
                <Clock className="w-4 h-4" /> Marcar Asistencia
              </Button>
            </Link>

            <Button
              variant="outline"
              onClick={refreshAll}
              disabled={refreshing}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl text-xs font-bold h-10 px-3 gap-1.5"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Selector de Estación Rápido en 1 Clic */}
        <div className="pt-4 border-t border-white/15 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-200 flex items-center gap-1.5">
              <CurrentStationIcon className="w-4 h-4 text-purple-300" />
              Estación Activa de Taller:{" "}
              <span className="text-white font-black underline underline-offset-4">
                {stationName || "Sin Asignar"}
              </span>
            </span>
            <span className="text-[11px] text-purple-300/80 hidden sm:inline">
              Haz clic en cualquier estación para cambiar al instante
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {stations.map((s) => {
              const isSelected = s.id === stationId;
              const IconComp = STATION_ICONS[s.orden] || Wrench;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleQuickStationSwitch(s.id)}
                  disabled={switchingStation}
                  className={`p-2.5 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                    isSelected
                      ? "bg-white text-[#3C1C6C] border-white font-black shadow-lg ring-2 ring-white/50"
                      : "bg-white/10 hover:bg-white/15 text-white/90 border-white/15 font-semibold"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-[#3C1C6C] text-white" : "bg-white/10 text-white"
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-[10px] uppercase tracking-wider opacity-75">
                      Estación {s.orden}
                    </p>
                    <p className="text-xs truncate font-bold">{s.nombre}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* KPI Cards Ejecutivas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setActiveTab("in_process")}
          className={`p-5 rounded-3xl border transition-all cursor-pointer ${
            activeTab === "in_process"
              ? "bg-purple-50/80 border-purple-300 shadow-md ring-2 ring-purple-500/20"
              : "bg-white border-slate-200/90 shadow-sm hover:border-purple-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              En Mi Mesa de Trabajo
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-[#3C1C6C] flex items-center justify-center">
              <Play className="w-4 h-4 fill-current" />
            </div>
          </div>
          <p className="text-3xl font-black text-[#3C1C6C] mt-2">{activeTasks.length}</p>
          <p className="text-xs text-slate-400 mt-1">Órdenes en fabricación activa</p>
        </div>

        <div
          onClick={() => setActiveTab("queue")}
          className={`p-5 rounded-3xl border transition-all cursor-pointer ${
            activeTab === "queue"
              ? "bg-amber-50/80 border-amber-300 shadow-md ring-2 ring-amber-500/20"
              : "bg-white border-slate-200/90 shadow-sm hover:border-amber-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cola de Mi Estación
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-700 mt-2">{queueTasks.length}</p>
          <p className="text-xs text-slate-400 mt-1">En espera de ser tomadas</p>
        </div>

        <div
          onClick={() => setActiveTab("all")}
          className={`p-5 rounded-3xl border transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-emerald-50/80 border-emerald-300 shadow-md ring-2 ring-emerald-500/20"
              : "bg-white border-slate-200/90 shadow-sm hover:border-emerald-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Completadas Hoy
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-700 mt-2">{completedTodayCount}</p>
          <p className="text-xs text-slate-400 mt-1">Avanzadas a la siguiente fase</p>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Navegación por Tabs */}
          <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100/80 w-fit">
            <button
              onClick={() => setActiveTab("in_process")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "in_process"
                  ? "bg-[#3C1C6C] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              En Mi Mesa ({activeTasks.length})
            </button>

            <button
              onClick={() => setActiveTab("queue")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "queue"
                  ? "bg-[#3C1C6C] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              Cola de Espera ({queueTasks.length})
            </button>

            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "all"
                  ? "bg-[#3C1C6C] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Historial & Filtros ({myTasks.length})
            </button>
          </div>

          {/* Buscador Rápido */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar paciente, caja, pieza..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9.5 text-xs rounded-xl border-slate-200"
            />
          </div>
        </div>

        {/* Filtros de Fecha solo cuando está en "Historial & Filtros" */}
        {activeTab === "all" && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500 font-medium">Rango:</span>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-32 h-8 text-xs rounded-xl"
              />
              <span className="text-slate-400">a</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-32 h-8 text-xs rounded-xl"
              />

              <select
                value={myStatus}
                onChange={(e) => setMyStatus(e.target.value as any)}
                className="h-8 px-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 cursor-pointer"
              >
                <option value="">Todos los estados</option>
                <option value="en_proceso">En proceso</option>
                <option value="completado">Completados</option>
                <option value="devuelto">Devueltos</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const t = todayISO();
                  setFromDate(t);
                  setToDate(t);
                }}
                className="h-7 text-[11px] rounded-lg"
              >
                Hoy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFromDate(addDaysISO(-7));
                  setToDate(todayISO());
                }}
                className="h-7 text-[11px] rounded-lg"
              >
                7 días
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFromDate(monthStartISO());
                  setToDate(todayISO());
                }}
                className="h-7 text-[11px] rounded-lg"
              >
                Mes
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                  setMyStatus("");
                }}
                className="h-7 text-[11px] text-slate-400"
              >
                Limpiar
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* CONTENIDO PRINCIPAL SEGÚN EL TAB ACTIVO */}
      <div>
        {activeTab === "in_process" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#3C1C6C]" />
                Trabajos en Mi Mesa de Trabajo ({filteredActive.length})
              </h2>
              <span className="text-xs text-slate-400">
                Paso activo de fabricación
              </span>
            </div>

            {filteredActive.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-3">
                <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-base font-bold text-slate-800">
                  No tienes trabajos en proceso en este momento
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Revisa la pestaña &ldquo;Cola de Espera&rdquo; para tomar las órdenes asignadas a tu estación.
                </p>
                <Button
                  onClick={() => setActiveTab("queue")}
                  className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white font-bold rounded-xl text-xs h-9"
                >
                  Ver Cola de Espera ({queueTasks.length})
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredActive.map((t) => (
                  <DentalTaskCard key={t.id} task={t} mode="active" />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "queue" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <Inbox className="w-5 h-5 text-amber-600" />
                Cola de Espera en: {stationName || "Mi Estación"} ({filteredQueue.length})
              </h2>
              <span className="text-xs text-slate-400">
                Órdenes listas para ser iniciadas
              </span>
            </div>

            {!stationId ? (
              <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                <p className="text-base font-bold text-slate-800">
                  Selecciona una estación arriba para ver los trabajos en cola
                </p>
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <p className="text-base font-bold text-slate-800">
                  ¡Al día! No hay órdenes pendientes en la cola de esta estación
                </p>
                <p className="text-xs text-slate-400">
                  Aparecerán automáticamente aquí en cuanto la estación anterior finalice un trabajo.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredQueue.map((t) => (
                  <DentalTaskCard key={t.id} task={t} mode="queue" />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "all" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <Filter className="w-5 h-5 text-[#3C1C6C]" />
                Historial de Mis Trabajos ({filteredAll.length})
              </h2>
            </div>

            {filteredAll.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-2">
                <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-base font-bold text-slate-800">
                  No se encontraron trabajos con los filtros seleccionados
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAll.map((t) => (
                  <DentalTaskCard key={t.id} task={t} mode="history" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Comentario Técnico & Control de Avance */}
      <Dialog open={commentOpen} onOpenChange={setCommentOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#3C1C6C] font-black text-lg flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#3C1C6C]" />
              {commentAction === "advance"
                ? "Control de Avance & Envío de Trabajo"
                : "Añadir Anotación Técnica a la Bitácora"}
            </DialogTitle>
          </DialogHeader>

          {commentAction === "advance" ? (
            <div className="space-y-4 pt-2">
              {/* CONTROL DE COMPONENTES EN CAJA (15 COMPONENTES) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <ControlComponentes
                  value={advanceComponents}
                  onChange={setAdvanceComponents}
                />
              </div>

              {/* ENVIAR TRABAJO A: (ÁREAS TÉCNICAS) */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200">
                <label className="text-xs font-black uppercase tracking-wider text-[#3C1C6C] block">
                  ENVIAR TRABAJO A:
                </label>
                <select
                  value={targetStationId}
                  onChange={(e) => setTargetStationId(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-purple-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="">Siguiente Estación en Secuencia de Taller</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} {s.descripcion ? `— ${s.descripcion}` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  Selecciona la estación técnica de destino en el laboratorio o déjalo en secuencia automática.
                </p>
              </div>

              {/* NOTA ADICIONAL (AVANCE): */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                  NOTA ADICIONAL (AVANCE):
                </label>
                <Textarea
                  ref={commentRef}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Ej. Ajuste de márgenes oclusales verificado, pulido fino completado, listo para glaseado..."
                  className="min-h-[90px] rounded-2xl border-slate-200 text-xs leading-relaxed"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-slate-500">
                Guarda una anotación interna sobre el estado de la pieza dental en tu bitácora de trabajo.
              </p>
              <Textarea
                ref={commentRef}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Anotaciones de laboratorio..."
                className="min-h-[120px] rounded-2xl border-slate-200 text-xs leading-relaxed"
              />
            </div>
          )}

          <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setCommentOpen(false)}
              className="rounded-xl border-slate-200 h-10 w-full sm:w-auto text-xs"
            >
              Cancelar
            </Button>

            <Button
              onClick={commentAction === "advance" ? completeWithComment : saveCommentOnly}
              className={`rounded-xl text-xs font-bold h-10 px-5 text-white shadow-sm ${
                commentAction === "advance"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-[#3C1C6C] hover:bg-[#2E1553]"
              }`}
            >
              {commentAction === "advance" ? "✓ Completar y Enviar a Taller" : "Guardar Nota"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Reutilizable de Ficha Técnica Completa */}
      {detailOpen && detailTask && (
        <TaskDetailsDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          row={detailTask}
        />
      )}
    </div>
  );
}
