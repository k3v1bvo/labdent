"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  RefreshCcw,
  AlertTriangle,
  PackageCheck,
  DollarSign,
  User,
  Clock,
  ExternalLink,
  Lock,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AuditLog {
  id: string;
  pedido_id: string;
  usuario_id?: string | null;
  usuario_nombre?: string | null;
  usuario_rol?: string | null;
  accion: string;
  campo_modificado?: string | null;
  valor_anterior?: string | null;
  valor_nuevo?: string | null;
  motivo?: string | null;
  created_at: string;
  pedidos?: {
    paciente_nombre?: string | null;
    doctor_nombre?: string | null;
    numero_requerimiento?: string | null;
    total?: number | null;
    anticipo?: number | null;
  } | null;
}

export default function AuditAdminPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("TODAS");
  const [tableExists, setTableExists] = useState(true);
  const [copiedSql, setCopiedSql] = useState(false);

  async function fetchLogs() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("auditoria_pedidos")
        .select(`
          id,
          pedido_id,
          usuario_id,
          usuario_nombre,
          usuario_rol,
          accion,
          campo_modificado,
          valor_anterior,
          valor_nuevo,
          motivo,
          created_at,
          pedidos (
            paciente_nombre,
            doctor_nombre,
            numero_requerimiento,
            total,
            anticipo
          )
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        if (error.code === "42P01") {
          // Table does not exist in Supabase yet
          setTableExists(false);
        } else {
          console.error("Error fetching audit logs:", error);
          toast.error("Error al cargar auditoría: " + error.message);
        }
      } else {
        setTableExists(true);
        setLogs((data as any) || []);
      }
    } catch (err: any) {
      console.error(err);
      setTableExists(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesAction =
        selectedAction === "TODAS" || log.accion === selectedAction;

      const q = searchTerm.toLowerCase().trim();
      if (!q) return matchesAction;

      const userMatch = (log.usuario_nombre || "").toLowerCase().includes(q);
      const roleMatch = (log.usuario_rol || "").toLowerCase().includes(q);
      const motivoMatch = (log.motivo || "").toLowerCase().includes(q);
      const actionMatch = (log.accion || "").toLowerCase().includes(q);
      const pacienteMatch = (log.pedidos?.paciente_nombre || "")
        .toLowerCase()
        .includes(q);
      const doctorMatch = (log.pedidos?.doctor_nombre || "")
        .toLowerCase()
        .includes(q);
      const reqMatch = (log.pedidos?.numero_requerimiento || "")
        .toLowerCase()
        .includes(q);

      return (
        matchesAction &&
        (userMatch ||
          roleMatch ||
          motivoMatch ||
          actionMatch ||
          pacienteMatch ||
          doctorMatch ||
          reqMatch)
      );
    });
  }, [logs, searchTerm, selectedAction]);

  // Métricas
  const totalModificacionesMonto = useMemo(
    () => logs.filter((l) => l.accion === "MODIFICACION_MONTO").length,
    [logs]
  );
  const totalEntregas = useMemo(
    () => logs.filter((l) => l.accion === "REGISTRO_ENTREGA").length,
    [logs]
  );
  const totalAprobaciones = useMemo(
    () => logs.filter((l) => l.accion === "APROBACION").length,
    [logs]
  );

  function copySqlToClipboard() {
    const sql = `-- Ejecutar en Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.auditoria_pedidos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  usuario_nombre varchar,
  usuario_rol varchar,
  accion varchar NOT NULL,
  campo_modificado varchar,
  valor_anterior text,
  valor_nuevo text,
  motivo text,
  ip_address varchar,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auditoria_pedidos_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_auditoria_pedidos_pedido ON public.auditoria_pedidos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_pedidos_usuario ON public.auditoria_pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_pedidos_fecha ON public.auditoria_pedidos(created_at DESC);
ALTER TABLE public.auditoria_pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insertar auditoria usuarios autenticados" ON public.auditoria_pedidos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Ver auditoria autenticados" ON public.auditoria_pedidos FOR SELECT TO authenticated USING (true);`;

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    toast.success("Script SQL copiado al portapapeles. Pégalo en Supabase SQL Editor.");
    setTimeout(() => setCopiedSql(false), 3000);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#3C1C6C] flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-amber-500" /> Auditoría Forense & Anti-Fraude
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitoreo en tiempo real de alteraciones de pedidos, trazabilidad de cobros y control de integridad del laboratorio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchLogs}
            disabled={loading}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 h-10"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Alerta si la tabla aún no existe en Supabase */}
      {!tableExists && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900 space-y-3 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-base">La tabla `auditoria_pedidos` está lista para ser activada en Supabase</h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                El código de auditoría e inmutabilidad ya está 100% implementado en el frontend. Para almacenar los logs en la nube de Supabase, solo necesitas ejecutar el script SQL de creación de tabla.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              size="sm"
              onClick={copySqlToClipboard}
              className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl gap-2 text-xs font-semibold"
            >
              {copiedSql ? <Check className="w-4 h-4 text-green-300" /> : <Copy className="w-4 h-4" />}
              {copiedSql ? "¡Copiado!" : "Copiar SQL para Supabase"}
            </Button>
            <span className="text-xs text-slate-500">
              O revisa el archivo <code className="bg-amber-100 px-2 py-0.5 rounded text-[11px] font-mono text-amber-900">src/lib/sql/auditoria_pedidos.sql</code>
            </span>
          </div>
        </div>
      )}

      {/* Tarjetas de Métricas Anti-Fraude */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Modificaciones de monto (Alerta Crítica) */}
        <Card className={`p-4 rounded-2xl border transition-all ${
          totalModificacionesMonto > 0 
            ? "border-red-300 bg-red-50/70" 
            : "border-slate-200/80 bg-white"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Ajustes de Precios</span>
            <div className={`p-2 rounded-xl ${totalModificacionesMonto > 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">{totalModificacionesMonto}</div>
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
              {totalModificacionesMonto > 0 ? (
                <span className="text-red-700 font-bold flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" /> Requiere revisión administrativa
                </span>
              ) : (
                <span className="text-emerald-700 font-medium">Sin alteraciones no autorizadas</span>
              )}
            </p>
          </div>
        </Card>

        {/* Total Eventos */}
        <Card className="p-4 rounded-2xl border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Eventos Auditados</span>
            <div className="p-2 rounded-xl bg-purple-100 text-[#3C1C6C]">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#3C1C6C]">{logs.length}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Registros forenses inmutables</p>
          </div>
        </Card>

        {/* Entregas Registradas */}
        <Card className="p-4 rounded-2xl border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Entregas con Nota</span>
            <div className="p-2 rounded-xl bg-orange-100 text-orange-700">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">{totalEntregas}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Físicamente entregados a doctores</p>
          </div>
        </Card>

        {/* Aprobaciones */}
        <Card className="p-4 rounded-2xl border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Aprobaciones Iniciales</span>
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">{totalAprobaciones}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Pedidos enviados a producción</p>
          </div>
        </Card>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por responsable, paciente, requerimiento o motivo..."
            className="pl-10 rounded-xl border-slate-200 text-sm"
          />
        </div>

        {/* Filtro por Acción */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "TODAS", label: "Todas" },
            { id: "MODIFICACION_MONTO", label: "⚠️ Ajustes de Monto" },
            { id: "REGISTRO_ENTREGA", label: "📦 Entregas" },
            { id: "APROBACION", label: "✅ Aprobaciones" },
            { id: "RECHAZO", label: "❌ Rechazos" },
            { id: "CAMBIO_ESTADO", label: "🔄 Estados" },
          ].map((action) => (
            <button
              key={action.id}
              onClick={() => setSelectedAction(action.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedAction === action.id
                  ? "bg-[#3C1C6C] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Registros de Auditoría */}
      <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
        <table className="min-w-full text-xs text-left">
          <thead className="bg-[#3C1C6C] text-white uppercase text-[11px] font-semibold">
            <tr>
              <th className="px-5 py-3.5">Fecha & Hora</th>
              <th className="px-5 py-3.5">Responsable</th>
              <th className="px-5 py-3.5">Acción</th>
              <th className="px-5 py-3.5">Pedido / Paciente</th>
              <th className="px-5 py-3.5">Detalles del Evento</th>
              <th className="px-5 py-3.5">Motivo / Justificación</th>
              <th className="px-5 py-3.5 text-right">Ficha</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const isDanger = log.accion === "MODIFICACION_MONTO";
              return (
                <tr
                  key={log.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    isDanger ? "bg-red-50/40" : ""
                  }`}
                >
                  <td className="px-5 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-purple-100 text-[#3C1C6C] font-bold flex items-center justify-center text-xs">
                        {(log.usuario_nombre || "U").slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{log.usuario_nombre || "Usuario"}</p>
                        <span className="text-[10px] text-slate-500 capitalize bg-slate-100 px-1.5 py-0.5 rounded">
                          {log.usuario_rol || "Rol"}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        log.accion === "MODIFICACION_MONTO"
                          ? "bg-red-100 text-red-800 border border-red-200"
                          : log.accion === "REGISTRO_ENTREGA"
                          ? "bg-orange-100 text-orange-800 border border-orange-200"
                          : log.accion === "APROBACION"
                          ? "bg-purple-100 text-[#3C1C6C] border border-purple-200"
                          : log.accion === "RECHAZO"
                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}
                    >
                      {log.accion === "MODIFICACION_MONTO" && <AlertTriangle className="w-3 h-3 text-red-600" />}
                      {log.accion}
                    </span>
                  </td>

                  <td className="px-5 py-3.5">
                    <p className="font-bold text-slate-800">
                      {log.pedidos?.paciente_nombre || "Pedido #" + log.pedido_id.slice(0, 8)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Dr: <span className="font-medium text-slate-700">{log.pedidos?.doctor_nombre || "—"}</span>
                      {log.pedidos?.numero_requerimiento && (
                        <span> · Req: {log.pedidos.numero_requerimiento}</span>
                      )}
                    </p>
                  </td>

                  <td className="px-5 py-3.5 max-w-xs font-mono text-[11px] text-slate-600 truncate">
                    {log.valor_nuevo ? (
                      <span title={log.valor_nuevo}>{log.valor_nuevo}</span>
                    ) : (
                      <span className="text-slate-400 italic">Sin datos</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5 text-slate-700 italic max-w-xs">
                    {log.motivo || <span className="text-slate-400 not-italic">—</span>}
                  </td>

                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <Link
                      href={`/dashboard/admin/orders/${log.pedido_id}`}
                      className="inline-flex items-center gap-1 text-[#3C1C6C] hover:text-[#2E1553] font-bold text-xs p-1 rounded hover:bg-purple-50"
                      title="Ver orden clínica completa"
                    >
                      Ver <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}

            {filteredLogs.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-400 text-xs">
                  {logs.length === 0
                    ? "Aún no se han registrado eventos en la tabla de auditoría."
                    : "No se encontraron eventos que coincidan con la búsqueda o filtro seleccionado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
