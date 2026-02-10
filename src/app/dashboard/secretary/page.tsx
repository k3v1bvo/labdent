"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Bell, RefreshCcw, CheckCircle2, ClipboardList, Search, Clock } from "lucide-react";
import { toast } from "sonner";

type Notificacion = {
  id: string;
  mensaje: string | null;
  created_at: string | null;
  leido: boolean | null;
};

type PedidoPendiente = {
  id: string;
  paciente_nombre: string | null;
  estado: string | null;
  fecha_creacion: string | null;
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
  const [pedidos, setPedidos] = useState<PedidoPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // UI extras
  const [qNotif, setQNotif] = useState("");
  const [qPedidos, setQPedidos] = useState("");

  async function fetchData(showToast = false) {
    try {
      setRefreshing(true);

      const { data: notifData, error: notifErr } = await supabase
        .from("notificaciones")
        .select("id, mensaje, created_at, leido")
        .eq("destinatario_rol", "secretaria")
        .eq("leido", false)
        .order("created_at", { ascending: false });

      if (notifErr) {
        console.error("notifErr:", notifErr);
        toast.error("No se pudieron cargar notificaciones");
      }

      const { data: pedidosData, error: pedidosErr } = await supabase
        .from("pedidos")
        .select("id, paciente_nombre, estado, fecha_creacion")
        .eq("estado", "pendiente")
        .order("fecha_creacion", { ascending: false });

      if (pedidosErr) {
        console.error("pedidosErr:", pedidosErr);
        toast.error("No se pudieron cargar pedidos");
      }

      setNotificaciones((notifData || []) as Notificacion[]);
      setPedidos((pedidosData || []) as PedidoPendiente[]);

      if (showToast) toast.success("Actualizado ✅");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchData(false);

    // auto-refresh suave
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const marcarLeidas = async () => {
    const { error } = await supabase
      .from("notificaciones")
      .update({ leido: true })
      .eq("destinatario_rol", "secretaria")
      .eq("leido", false);

    if (error) {
      console.error("marcarLeidas error:", error);
      toast.error("No se pudieron marcar como leídas");
      return;
    }

    setNotificaciones([]);
    toast.success("Notificaciones marcadas como leídas ✅");
  };

  const stats = useMemo(() => {
    const pendientes = pedidos.length;
    const notif = notificaciones.length;

    // “Más antiguo” para sensación de urgencia
    let oldestMs: number | null = null;
    for (const p of pedidos) {
      const t = p.fecha_creacion ? new Date(p.fecha_creacion).getTime() : NaN;
      if (!Number.isFinite(t)) continue;
      if (oldestMs == null || t < oldestMs) oldestMs = t;
    }
    const oldestText = oldestMs ? timeAgo(new Date(oldestMs).toISOString()) : "—";

    return { pendientes, notif, oldestText };
  }, [pedidos, notificaciones]);

  const notificacionesFiltradas = useMemo(() => {
    const s = qNotif.trim().toLowerCase();
    if (!s) return notificaciones;
    return notificaciones.filter((n) => (n.mensaje || "").toLowerCase().includes(s));
  }, [notificaciones, qNotif]);

  const pedidosFiltrados = useMemo(() => {
    const s = qPedidos.trim().toLowerCase();
    if (!s) return pedidos;
    return pedidos.filter((p) => (p.paciente_nombre || "").toLowerCase().includes(s));
  }, [pedidos, qPedidos]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-green-700 flex items-center gap-2">
              <CheckCircle2 className="w-7 h-7" />
              Panel Secretaría
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Control rápido: notificaciones, pedidos pendientes y acciones frecuentes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => fetchData(true)}
              className="gap-2"
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCcw className="w-4 h-4" />
              )}
              Actualizar
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-sm border-l-4 border-green-600">
            <CardHeader className="py-4">
              <CardTitle className="text-sm text-gray-700 flex items-center gap-2">
                <ClipboardList className="w-4 h-4" /> Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <div className="text-3xl font-bold">{stats.pendientes}</div>
              <div className="text-xs text-gray-500 mt-1">Pedidos en estado “pendiente”</div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-amber-500">
            <CardHeader className="py-4">
              <CardTitle className="text-sm text-gray-700 flex items-center gap-2">
                <Bell className="w-4 h-4" /> Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <div className="text-3xl font-bold">{stats.notif}</div>
              <div className="text-xs text-gray-500 mt-1">No leídas (Secretaría)</div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-blue-500">
            <CardHeader className="py-4">
              <CardTitle className="text-sm text-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Antigüedad
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <div className="text-2xl font-bold">{stats.oldestText}</div>
              <div className="text-xs text-gray-500 mt-1">Del pedido pendiente más antiguo</div>
            </CardContent>
          </Card>
        </div>

        {/* GRID PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NOTIFICACIONES */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-green-700" />
                  Notificaciones
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1">
                  Solo las no leídas para el rol “secretaria”.
                </p>
              </div>

              <Button
                onClick={marcarLeidas}
                className="bg-green-700 hover:bg-green-800 text-white"
                disabled={loading || notificaciones.length === 0}
              >
                Marcar como leídas
              </Button>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <Loader2 className="animate-spin w-5 h-5" />
                  Cargando notificaciones...
                </div>
              ) : notificaciones.length === 0 ? (
                <div className="text-sm text-gray-500">Sin notificaciones nuevas.</div>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="text-xs text-gray-600 flex items-center gap-2 mb-2">
                      <Search className="w-4 h-4" /> Buscar en notificaciones
                    </label>
                    <Input
                      value={qNotif}
                      onChange={(e) => setQNotif(e.target.value)}
                      placeholder="Ej: entrega, atraso, pago..."
                    />
                  </div>

                  <div className="space-y-2 max-h-[340px] overflow-auto overflow-x-hidden pr-1">
                    {notificacionesFiltradas.map((n) => (
                      <div
                        key={n.id}
                        className="border rounded-xl p-3 bg-white hover:shadow-sm transition"
                      >
                        <div className="text-sm text-gray-900">
                          {n.mensaje || "—"}
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-between">
                          <span>{formatDateTime(n.created_at)}</span>
                          <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                            {timeAgo(n.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {notificacionesFiltradas.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">No hay resultados con ese filtro.</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* PEDIDOS PENDIENTES */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-green-700" />
                Pedidos Pendientes
              </CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                Lista rápida para priorizar atención y seguimiento.
              </p>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <Loader2 className="animate-spin w-5 h-5" />
                  Cargando pedidos...
                </div>
              ) : pedidos.length === 0 ? (
                <div className="text-sm text-gray-500">No hay pedidos pendientes.</div>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="text-xs text-gray-600 flex items-center gap-2 mb-2">
                      <Search className="w-4 h-4" /> Buscar por paciente
                    </label>
                    <Input
                      value={qPedidos}
                      onChange={(e) => setQPedidos(e.target.value)}
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>

                  <div className="divide-y rounded-xl border bg-white max-h-[340px] overflow-auto overflow-x-hidden">
                    {pedidosFiltrados.map((p) => (
                      <div
                        key={p.id}
                        className="px-3 py-3 flex items-start justify-between gap-3 hover:bg-gray-50 transition"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">
                            {p.paciente_nombre || "—"}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Creado:{" "}
                            <span className="font-medium">
                              {p.fecha_creacion ? formatDateTime(p.fecha_creacion) : "—"}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                            {p.estado || "pendiente"}
                          </span>
                          <div className="text-xs text-gray-500 mt-2">
                            {timeAgo(p.fecha_creacion)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {pedidosFiltrados.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">No hay resultados con ese filtro.</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* FOOTER ACCIONES */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Acciones rápidas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto gap-2"
              onClick={() => fetchData(true)}
              disabled={refreshing}
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              Refrescar panel
            </Button>

            <Button
              className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white"
              onClick={() => toast.message("Tip", { description: "Podemos agregar acceso rápido a: Crear pedido, Buscar pedido, Ver pagos, etc." })}
            >
              Sugerir mejoras
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
