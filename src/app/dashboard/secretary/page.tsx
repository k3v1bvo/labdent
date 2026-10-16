"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Bell,
  RefreshCcw,
  CheckCircle2,
  ClipboardList,
  Search,
  Clock,
  PlusCircle,
  FileCheck,
  PackageCheck,
  Stethoscope,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

type Notificacion = {
  id: string;
  mensaje: string | null;
  creada_en: string | null;
  created_at?: string | null;
  leida: boolean | null;
  tipo?: string | null;
};

type PedidoRow = {
  id: string;
  paciente_nombre: string | null;
  doctor_nombre: string | null;
  numero_requerimiento: string | null;
  estado: string | null;
  fecha_creacion: string | null;
  total: number | null;
  anticipo: number | null;
};

function timeAgo(ts?: string | null) {
  if (!ts) return "—";
  const t = new Date(ts).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days} d`;
}

function formatDateTime(ts?: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isFinite(d.getTime())) return d.toLocaleString();
  return "—";
}

export default function SecretariaDashboard() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [pedidos, setPedidos] = useState<PedidoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [qNotif, setQNotif] = useState("");
  const [qPedidos, setQPedidos] = useState("");

  async function fetchData(showToast = false) {
    try {
      setRefreshing(true);

      // Notificaciones secretaría (usando columnas reales del schema: tipo, leida, creada_en)
      const { data: notifData, error: notifErr } = await supabase
        .from("notificaciones")
        .select("id, mensaje, creada_en, leida, tipo")
        .eq("tipo", "secretaria")
        .eq("leida", false)
        .order("creada_en", { ascending: false });

      if (notifErr) {
        console.error("notifErr:", notifErr);
      }

      // Pedidos activos (revisión y producción)
      const { data: pedidosData, error: pedidosErr } = await supabase
        .from("pedidos")
        .select("id, paciente_nombre, doctor_nombre, numero_requerimiento, estado, fecha_creacion, total, anticipo")
        .order("fecha_creacion", { ascending: false })
        .limit(100);

      if (pedidosErr) {
        console.error("pedidosErr:", pedidosErr);
        toast.error("No se pudieron cargar pedidos");
      }

      setNotificaciones((notifData || []) as Notificacion[]);
      setPedidos((pedidosData || []) as PedidoRow[]);

      if (showToast) toast.success("Panel actualizado ✅");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchData(false);
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const marcarLeidas = async () => {
    const ids = notificaciones.map((n) => n.id);
    if (ids.length === 0) return;

    const { error } = await supabase
      .from("notificaciones")
      .update({ leida: true })
      .in("id", ids);

    if (error) {
      toast.error("No se pudieron marcar como leídas");
      return;
    }

    setNotificaciones([]);
    toast.success("Notificaciones marcadas como leídas ✅");
  };

  const stats = useMemo(() => {
    let rev = 0;
    let prod = 0;
    let fin = 0;

    for (const p of pedidos) {
      if (p.estado === "pendiente_revision") rev++;
      else if (p.estado === "pendiente" || p.estado === "en_proceso") prod++;
      else if (p.estado === "finalizado") fin++;
    }

    return { rev, prod, fin, notif: notificaciones.length };
  }, [pedidos, notificaciones]);

  const notificacionesFiltradas = useMemo(() => {
    const s = qNotif.trim().toLowerCase();
    if (!s) return notificaciones;
    return notificaciones.filter((n) => (n.mensaje || "").toLowerCase().includes(s));
  }, [notificaciones, qNotif]);

  const pedidosRevision = useMemo(() => {
    const s = qPedidos.trim().toLowerCase();
    const list = pedidos.filter((p) => p.estado === "pendiente_revision");
    if (!s) return list;
    return list.filter((p) =>
      [p.paciente_nombre, p.doctor_nombre, p.numero_requerimiento]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [pedidos, qPedidos]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#3C1C6C] flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-[#A57CFA]" /> Panel de Recepción & Secretaría
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Guisela Laboratorio Dental · Revisión de requerimientos, cotizaciones y entregas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => fetchData(true)}
            className="gap-2 rounded-xl border-slate-200"
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            Actualizar
          </Button>

          <Link href="/dashboard/secretary/new-order">
            <Button className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white gap-2 rounded-xl shadow-md">
              <PlusCircle className="w-4 h-4" /> Nuevo Pedido
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/secretary/orders">
          <Card className="rounded-2xl border-l-4 border-amber-500 shadow-sm hover:shadow-md transition cursor-pointer">
            <CardHeader className="py-4 px-5">
              <CardTitle className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center justify-between">
                <span>Por Revisar</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-5 pb-4">
              <div className="text-3xl font-extrabold text-amber-600">{stats.rev}</div>
              <div className="text-xs text-slate-500 mt-1">Nuevos pedidos de clínicas</div>
            </CardContent>
          </Card>
        </Link>

        <Card className="rounded-2xl border-l-4 border-purple-500 shadow-sm">
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-xs font-bold text-[#3C1C6C] uppercase tracking-wider flex items-center justify-between">
              <span>En Producción</span>
              <FileCheck className="w-4 h-4 text-[#A57CFA]" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-5 pb-4">
            <div className="text-3xl font-extrabold text-[#3C1C6C]">{stats.prod}</div>
            <div className="text-xs text-slate-500 mt-1">Aprobados en estaciones</div>
          </CardContent>
        </Card>

        <Link href="/dashboard/secretary/orders">
          <Card className="rounded-2xl border-l-4 border-green-500 shadow-sm hover:shadow-md transition cursor-pointer">
            <CardHeader className="py-4 px-5">
              <CardTitle className="text-xs font-bold text-green-700 uppercase tracking-wider flex items-center justify-between">
                <span>Listos para Entrega</span>
                <PackageCheck className="w-4 h-4 text-green-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-5 pb-4">
              <div className="text-3xl font-extrabold text-green-600">{stats.fin}</div>
              <div className="text-xs text-slate-500 mt-1">Generar remisión & despachar</div>
            </CardContent>
          </Card>
        </Link>

        <Card className="rounded-2xl border-l-4 border-blue-500 shadow-sm">
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center justify-between">
              <span>Notificaciones</span>
              <Bell className="w-4 h-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-5 pb-4">
            <div className="text-3xl font-extrabold text-blue-600">{stats.notif}</div>
            <div className="text-xs text-slate-500 mt-1">Alertas no leídas</div>
          </CardContent>
        </Card>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PEDIDOS PENDIENTES DE REVISIÓN */}
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" /> Pedidos por Cotizar / Revisar
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingresados por doctores esperando validación de precio y caja.
              </p>
            </div>
            <Link href="/dashboard/secretary/orders">
              <Button variant="ghost" size="sm" className="text-xs text-[#3C1C6C] font-semibold">
                Ver todos <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#3C1C6C]" /> Cargando pedidos...
              </div>
            ) : pedidosRevision.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                ✅ No hay pedidos pendientes de revisión en este momento.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {pedidosRevision.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-[#A57CFA] transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm truncate">
                          {p.paciente_nombre || "Paciente"}
                        </span>
                        {p.numero_requerimiento && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-100 text-[#3C1C6C] font-bold">
                            #{p.numero_requerimiento}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        Doctor: <span className="font-medium text-slate-700">{p.doctor_nombre || "Clínica"}</span> · {timeAgo(p.fecha_creacion)}
                      </p>
                    </div>

                    <Link href="/dashboard/secretary/orders">
                      <Button size="sm" className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white text-xs rounded-xl h-8 px-3">
                        Revisar
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* NOTIFICACIONES */}
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#3C1C6C]" /> Notificaciones en Vivo
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Cambios de estación, nuevos pedidos y alertas del taller.
              </p>
            </div>

            {notificaciones.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={marcarLeidas}
                className="text-xs text-slate-600 rounded-xl"
              >
                Marcar leídas
              </Button>
            )}
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#3C1C6C]" /> Cargando notificaciones...
              </div>
            ) : notificaciones.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No tienes notificaciones pendientes.
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {notificacionesFiltradas.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-2xl border border-slate-100 bg-purple-50/30 text-xs space-y-1"
                  >
                    <p className="font-medium text-slate-800 leading-snug">{n.mensaje || "—"}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{formatDateTime(n.creada_en || n.created_at)}</span>
                      <span>{timeAgo(n.creada_en || n.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
