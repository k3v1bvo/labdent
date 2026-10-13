"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Printer,
  Calendar,
  Hash,
  User,
  Stethoscope,
  Phone,
  Palette,
  Ruler,
  Box,
  DollarSign,
  FileText,
  Clock,
  Hammer,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  History,
  Lock,
} from "lucide-react";

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchOrder() {
      setLoading(true);
      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          id,
          numero_requerimiento,
          paciente_nombre,
          paciente_telefono,
          doctor_nombre,
          doctor_telefono,
          trabajo_realizar,
          pieza_numero,
          color_pieza,
          colimetro,
          numero_caja,
          observaciones,
          estado,
          modelo_3d_link,
          anticipo,
          total,
          fecha_ingreso,
          hora_ingreso,
          fecha_creacion,
          fecha_entrega,
          numero_nota_entrega,
          motivo_rechazo,
          historial_estaciones (
            id,
            fecha_inicio,
            fecha_fin,
            estado,
            comentarios,
            estaciones (nombre, orden),
            tecnico:tecnico_id (nombre)
          ),
          archivos (id, tipo, url_archivo, descripcion, fecha_subida)
        `)
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error cargando pedido:", error);
      } else {
        setOrder(data);
      }

      // Cargar historial forense de auditoría
      try {
        const { data: auditData } = await supabase
          .from("auditoria_pedidos")
          .select("*")
          .eq("pedido_id", id)
          .order("created_at", { ascending: false });

        if (auditData) {
          setAuditLogs(auditData);
        }
      } catch (err) {
        console.warn("Tabla auditoria_pedidos aún no disponible:", err);
      }

      setLoading(false);
    }

    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-10">
        <div className="flex items-center gap-3 text-[#3C1C6C] font-semibold">
          <div className="w-5 h-5 border-2 border-[#3C1C6C] border-t-transparent rounded-full animate-spin" />
          Cargando detalles de la orden clínica...
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-10">
        <p className="text-red-600 font-bold mb-4">No se encontró el requerimiento dental solicitado.</p>
        <Button onClick={() => router.back()} variant="outline">
          ⬅ Volver
        </Button>
      </div>
    );
  }

  const estadoBadges: Record<string, { label: string; cls: string }> = {
    pendiente_revision: { label: "En Revisión Inicial", cls: "bg-amber-100 text-amber-800 border-amber-200" },
    rechazado: { label: "Rechazado", cls: "bg-red-100 text-red-800 border-red-200" },
    pendiente: { label: "En Espera / Cola", cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    en_proceso: { label: "En Fabricación", cls: "bg-blue-100 text-blue-800 border-blue-200" },
    finalizado: { label: "Finalizado / Listo", cls: "bg-green-100 text-green-800 border-green-200" },
    entregado: { label: "Entregado a Clínica", cls: "bg-purple-100 text-purple-800 border-purple-200" },
  };

  const badge = estadoBadges[order.estado] || { label: order.estado, cls: "bg-slate-100 text-slate-800 border-slate-200" };
  const total = Number(order.total || 0);
  const anticipo = Number(order.anticipo || 0);
  const saldoPendiente = Math.max(0, total - anticipo);

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-8 space-y-6">
      {/* Botones de Cabecera (Ocultos en impresión) */}
      <div className="flex items-center justify-between print:hidden">
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="rounded-xl border-slate-200 gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al listado
        </Button>

        <Button
          onClick={() => window.print()}
          className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl gap-2 font-medium shadow-md shadow-purple-950/10"
        >
          <Printer className="w-4 h-4" /> Imprimir Hoja de Ruta / Remisión
        </Button>
      </div>

      {/* Contenedor Principal (Hoja de Trabajo Clínica) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-10 space-y-8 max-w-5xl mx-auto print:shadow-none print:border-none print:p-0">
        {/* Encabezado con logo Guisela */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-2xl bg-purple-50 p-2 flex items-center justify-center border border-purple-200 shrink-0">
              <Image
                src="/images/brand/guisela-symbol-primary.png"
                alt="Guisela"
                width={48}
                height={48}
                className="object-contain"
                unoptimized
              />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#A57CFA]">
                Hoja de Ruta & Control Dental
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#3C1C6C] tracking-tight">
                Requerimiento #{order.numero_requerimiento || order.id.slice(0, 8).toUpperCase()}
              </h1>
              <p className="text-xs text-slate-500">
                Guisela Laboratorio Dental · Sistema CAD/CAM & Estética Biomimética
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2">
            <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold border ${badge.cls}`}>
              {badge.label}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Registrado: {order.fecha_creacion ? new Date(order.fecha_creacion).toLocaleDateString() : "—"}
            </span>
          </div>
        </div>

        {/* Motivo de rechazo (si existe) */}
        {order.motivo_rechazo && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Observación / Motivo de Rechazo:</p>
              <p className="mt-0.5">{order.motivo_rechazo}</p>
            </div>
          </div>
        )}

        {/* Datos Principales en Grilla */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Paciente */}
          <div className="rounded-2xl border border-slate-200/80 p-5 bg-slate-50/50 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <User className="w-4 h-4 text-[#3C1C6C]" /> Paciente
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">{order.paciente_nombre || "—"}</p>
              <p className="text-xs text-slate-500 mt-1">
                Teléfono: <span className="font-semibold text-slate-700">{order.paciente_telefono || "Sin registrar"}</span>
              </p>
            </div>
          </div>

          {/* Card Doctor / Clínica */}
          <div className="rounded-2xl border border-slate-200/80 p-5 bg-slate-50/50 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Stethoscope className="w-4 h-4 text-[#3C1C6C]" /> Odontólogo / Clínica
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">{order.doctor_nombre || "—"}</p>
              <p className="text-xs text-slate-500 mt-1">
                Contacto: <span className="font-semibold text-slate-700">{order.doctor_telefono || "Sin registrar"}</span>
              </p>
            </div>
          </div>

          {/* Card Control Financiero & Caja */}
          <div className="rounded-2xl border border-purple-200 p-5 bg-purple-50/40 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-[#3C1C6C] uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><Box className="w-4 h-4" /> Caja #{order.numero_caja || "00"}</span>
              <span>Finanzas</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total:</span>
                <span className="font-bold text-slate-800">Bs {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Anticipo:</span>
                <span className="font-bold text-green-700">Bs {anticipo.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-purple-200/60 font-bold text-[#3C1C6C]">
                <span>Saldo Pendiente:</span>
                <span>Bs {saldoPendiente.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ficha Técnica Odontológica */}
        <div className="rounded-2xl border border-slate-200/80 p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#3C1C6C] flex items-center gap-2">
            <Hammer className="w-4 h-4 text-[#A57CFA]" /> Especificaciones Técnicas del Caso
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block mb-1">Trabajo a Realizar</span>
              <span className="font-bold text-slate-800 text-sm">{order.trabajo_realizar || "—"}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block mb-1">Pieza(s) Dental</span>
              <span className="font-bold text-slate-800 text-sm">{order.pieza_numero || "—"}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block mb-1">Guía de Color</span>
              <span className="font-bold text-[#3C1C6C] text-sm">{order.color_pieza || "—"}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block mb-1">Colímetro / Ajuste</span>
              <span className="font-bold text-slate-800 text-sm">{order.colimetro || "—"}</span>
            </div>
          </div>

          {order.observaciones && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <span className="text-slate-400 block mb-1 font-semibold">Instrucciones & Observaciones Clínicas:</span>
              <p className="text-slate-700 leading-relaxed">{order.observaciones}</p>
            </div>
          )}

          {order.modelo_3d_link && (
            <div className="flex items-center gap-2 text-xs pt-2">
              <span className="text-slate-500">Modelo Digital 3D (STL/PLY):</span>
              <a
                href={order.modelo_3d_link}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#3C1C6C] hover:underline inline-flex items-center gap-1"
              >
                Abrir archivo digital <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Trazabilidad por Estaciones */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#3C1C6C] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#A57CFA]" /> Trazabilidad & Registro de Estaciones
          </h2>

          {order.historial_estaciones && order.historial_estaciones.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-xs text-left">
                <thead className="bg-[#3C1C6C] text-white uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Estación</th>
                    <th className="px-4 py-3">Técnico Asignado</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Inicio</th>
                    <th className="px-4 py-3">Finalización</th>
                    <th className="px-4 py-3">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {order.historial_estaciones.map((h: any) => (
                    <tr key={h.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {h.estaciones?.nombre || "Estación"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {h.tecnico?.nombre || "En cola de estación"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          h.estado === "completado" ? "bg-green-100 text-green-800" :
                          h.estado === "en_proceso" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {h.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                        {h.fecha_inicio ? new Date(h.fecha_inicio).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                        {h.fecha_fin ? new Date(h.fecha_fin).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {h.comentarios || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No hay historial registrado para esta orden todavía.</p>
          )}
        </div>

        {/* Historial Forense de Auditoría Anti-Fraude */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#3C1C6C] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Registro de Auditoría Forense & Integridad
            </h2>
            {auditLogs.some((l) => l.accion === "MODIFICACION_MONTO") ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> Montos Modificados Tras Creación
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Registro Íntegro
              </span>
            )}
          </div>

          {auditLogs && auditLogs.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
              <table className="min-w-full text-xs text-left">
                <thead className="bg-[#3C1C6C] text-white uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Fecha & Hora</th>
                    <th className="px-4 py-3">Responsable</th>
                    <th className="px-4 py-3">Acción</th>
                    <th className="px-4 py-3">Valores Registrados</th>
                    <th className="px-4 py-3">Motivo / Justificación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-800 block">{log.usuario_nombre || "Usuario"}</span>
                        <span className="text-[10px] text-slate-500 capitalize bg-slate-100 px-1.5 py-0.5 rounded">
                          {log.usuario_rol || "Rol"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.accion === "APROBACION" ? "bg-purple-100 text-[#3C1C6C]" :
                          log.accion === "REGISTRO_ENTREGA" ? "bg-orange-100 text-orange-900" :
                          log.accion === "MODIFICACION_MONTO" ? "bg-amber-100 text-amber-900 font-extrabold" :
                          log.accion === "RECHAZO" ? "bg-red-100 text-red-900" :
                          "bg-blue-100 text-blue-900"
                        }`}>
                          {log.accion}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs font-mono text-[11px] text-slate-600 truncate">
                        {log.valor_nuevo || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700 italic">
                        {log.motivo || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-xs text-slate-500 flex items-center justify-between">
              <span>No se registran eventos adicionales de auditoría para este pedido.</span>
              <span className="text-[11px] text-slate-400 font-mono">auditoria_pedidos</span>
            </div>
          )}
        </div>

        {/* Firmas de Entrega para Impresión */}
        <div className="pt-8 border-t border-slate-200 hidden print:grid grid-cols-2 gap-12 text-center text-xs text-slate-600">
          <div>
            <div className="border-b border-slate-400 h-16 mb-2" />
            <p className="font-bold">Firma del Maestro Ceramista / Técnico</p>
            <p className="text-[10px] text-slate-400">Guisela Laboratorio Dental</p>
          </div>
          <div>
            <div className="border-b border-slate-400 h-16 mb-2" />
            <p className="font-bold">Recibido Conforme por la Clínica</p>
            <p className="text-[10px] text-slate-400">Dr(a) / Firma & Sello</p>
          </div>
        </div>
      </div>
    </div>
  );
}
