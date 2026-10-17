"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Clock,
  CheckCircle,
  PackageCheck,
  ClipboardCheck,
  XCircle,
  Search,
  Truck,
  Printer,
  FileSpreadsheet,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import {
  ReviewOrderDialog,
  type ReviewOrder,
} from "@/components/orders/ReviewOrderDialog";
import { logAudit } from "@/lib/auditLogger";
import { OrderReportModal } from "@/components/reports/OrderReportModal";
import { DoctorKardexReportModal } from "@/components/reports/DoctorKardexReportModal";
import { DualPrice } from "@/components/common/DualPrice";
import { parseComponentesFromObservaciones } from "@/components/orders/ControlComponentes";

type PedidoRow = {
  id: string;
  paciente_nombre: string;
  paciente_telefono?: string | null;
  doctor_nombre?: string | null;
  doctor_telefono?: string | null;
  numero_requerimiento?: string | null;
  trabajo_realizar?: string | null;
  pieza_numero?: string | null;
  color_pieza?: string | null;
  colimetro?: string | null;
  componentes_caja?: any[] | null;

  estado: string;
  fecha_creacion: string;
  fecha_entrega?: string | null;
  numero_nota_entrega?: string | null;

  total?: number | null;
  anticipo?: number | null;
  numero_caja?: string | null;
  observaciones?: string | null;
  motivo_rechazo?: string | null;
};

type TabKey = "revision" | "produccion" | "finalizados" | "entregados" | "todos";

function cnTab(active: boolean) {
  return active
    ? "bg-[#3C1C6C] hover:bg-[#2E1553] text-white font-bold rounded-xl shadow-sm"
    : "rounded-xl border-slate-200 text-slate-700";
}

export default function SecretaryOrdersPage() {
  const [orders, setOrders] = useState<PedidoRow[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PedidoRow | null>(null);

  // Modales de Reporte Oficial y Kardex
  const [selectedReportOrder, setSelectedReportOrder] = useState<any | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [kardexModalOpen, setKardexModalOpen] = useState(false);
  const [kardexDoctor, setKardexDoctor] = useState<string>("");

  // filtros
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<TabKey>("revision");

  // Modal entrega
  const [notaEntrega, setNotaEntrega] = useState("");
  const [modalEntregaOpen, setModalEntregaOpen] = useState(false);
  const [successEntregaAnim, setSuccessEntregaAnim] = useState(false);

  // Modal revisión (componente)
  const [modalReviewOpen, setModalReviewOpen] = useState(false);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel("secretary-orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => {
          fetchOrders();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "historial_estaciones" },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchOrders() {
    const res = await supabase
      .from("pedidos")
      .select(
        [
          "id",
          "paciente_nombre",
          "paciente_telefono",
          "doctor_nombre",
          "doctor_telefono",
          "numero_requerimiento",
          "estado",
          "fecha_creacion",
          "fecha_entrega",
          "numero_nota_entrega",
          "total",
          "anticipo",
          "numero_caja",
          "observaciones",
          "motivo_rechazo",
          "trabajo_realizar",
          "pieza_numero",
          "color_pieza",
          "colimetro",
        ].join(",")
      )
      .order("fecha_creacion", { ascending: false });

    if (res.error) {
      console.error(res.error);
      toast.error("Error cargando pedidos");
      return;
    }

    // ✅ fuerza el tipo desde aquí (TS ya no se confunde)
    const typed: PedidoRow[] = (res.data ?? []).map((r: any) => ({
      id: String(r.id),
      paciente_nombre: String(r.paciente_nombre ?? ""),
      paciente_telefono: r.paciente_telefono ?? null,
      doctor_nombre: r.doctor_nombre ?? null,
      doctor_telefono: r.doctor_telefono ?? null,
      numero_requerimiento: r.numero_requerimiento ?? null,
      trabajo_realizar: r.trabajo_realizar ?? null,
      pieza_numero: r.pieza_numero ?? null,
      color_pieza: r.color_pieza ?? null,
      colimetro: r.colimetro ?? null,
      componentes_caja: parseComponentesFromObservaciones(r.observaciones),
      estado: String(r.estado ?? ""),
      fecha_creacion: String(r.fecha_creacion ?? ""),
      fecha_entrega: r.fecha_entrega ?? null,
      numero_nota_entrega: r.numero_nota_entrega ?? null,
      total: r.total != null ? Number(r.total) : null,
      anticipo: r.anticipo != null ? Number(r.anticipo) : null,
      numero_caja: r.numero_caja ?? null,
      motivo_rechazo: r.motivo_rechazo ?? null,
    }));

    setOrders(typed);
  }

  // contadores pro
  const counters = useMemo(() => {
    const c = {
      revision: 0,
      produccion: 0,
      finalizados: 0,
      entregados: 0,
      todos: orders.length,
    };

    for (const o of orders) {
      if (o.estado === "pendiente_revision") c.revision++;
      if (o.estado === "pendiente" || o.estado === "en_proceso") c.produccion++;
      if (o.estado === "finalizado") c.finalizados++;
      if (o.estado === "entregado") c.entregados++;
    }

    return c;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const s = q.trim().toLowerCase();

    const byTab = orders.filter((o) => {
      if (tab === "todos") return true;
      if (tab === "revision") return o.estado === "pendiente_revision";
      if (tab === "produccion")
        return o.estado === "pendiente" || o.estado === "en_proceso";
      if (tab === "finalizados") return o.estado === "finalizado";
      if (tab === "entregados") return o.estado === "entregado";
      return true;
    });

    if (!s) return byTab;

    return byTab.filter((o) => {
      const blob = [
        o.numero_requerimiento,
        o.paciente_nombre,
        o.doctor_nombre,
        o.estado,
        o.numero_nota_entrega,
        o.motivo_rechazo,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return blob.includes(s);
    });
  }, [orders, q, tab]);

  function openEntregaModal(order: PedidoRow) {
    setSelectedOrder(order);
    setNotaEntrega("");
    setSuccessEntregaAnim(false);
    setModalEntregaOpen(true);
  }

  function openReviewModal(order: PedidoRow) {
    setSelectedOrder(order);
    setModalReviewOpen(true);
  }

  async function handleConfirmEntrega() {
    if (!selectedOrder) return;

    if (!notaEntrega.trim()) {
      toast.warning("Debes ingresar una nota de entrega");
      return;
    }

    const now = new Date();
    const { error } = await supabase
      .from("pedidos")
      .update({
        estado: "entregado",
        numero_nota_entrega: notaEntrega.trim(),
        fecha_entrega: now.toISOString(),
        hora_entrega: now.toTimeString().slice(0, 8),
      })
      .eq("id", selectedOrder.id);

    if (error) {
      console.error(error);
      toast.error("Error al registrar entrega");
      return;
    }

    // REGISTRO DE AUDITORÍA FORENSE INMUTABLE
    await logAudit({
      pedidoId: selectedOrder.id,
      accion: "REGISTRO_ENTREGA",
      campoModificado: "estado, numero_nota_entrega, fecha_entrega",
      valorAnterior: selectedOrder.estado,
      valorNuevo: "entregado",
      motivo: `Entrega física registrada bajo Nota N°: ${notaEntrega.trim()}`,
    });

    // 🔔 Notificación in-app y correo de entrega al doctor
    try {
      const { data: pedInfo } = await supabase
        .from("pedidos")
        .select("creado_por, doctor_nombre, paciente_nombre, numero_requerimiento, numero_caja, trabajo_realizar")
        .eq("id", selectedOrder.id)
        .single();

      if (pedInfo?.creado_por) {
        await supabase.from("notificaciones").insert({
          tipo: "doctor",
          receptor_id: pedInfo.creado_por,
          pedido_id: selectedOrder.id,
          mensaje: `Tu pedido #${selectedOrder.numero_requerimiento || ""} (${selectedOrder.paciente_nombre}) ha sido entregado exitosamente bajo la Nota N° ${notaEntrega.trim()}.`,
          leida: false,
        });
      }

      fetch("/api/mailer/order-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedidoId: selectedOrder.id,
          doctorName: selectedOrder.doctor_nombre || pedInfo?.doctor_nombre,
          pacienteNombre: selectedOrder.paciente_nombre,
          numeroRequerimiento: selectedOrder.numero_requerimiento,
          numeroCaja: selectedOrder.numero_caja || pedInfo?.numero_caja,
          estado: "entregado",
          trabajoRealizar: pedInfo?.trabajo_realizar,
        }),
      }).catch((e) => console.warn("Aviso email entrega:", e));
    } catch (e) {
      console.warn("Aviso notificacion entrega:", e);
    }

    toast.success("✅ Entrega registrada y notificada al doctor.");
    setSuccessEntregaAnim(true);
    setNotaEntrega("");
    fetchOrders();

    setTimeout(() => {
      setSuccessEntregaAnim(false);
      setModalEntregaOpen(false);
    }, 1500);
  }

  const renderBadge = (estado: string) => {
    switch (estado) {
      case "pendiente_revision":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
            <ClipboardCheck className="w-3 h-3" /> En revisión
          </span>
        );
      case "rechazado":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">
            <XCircle className="w-3 h-3" /> Rechazado
          </span>
        );
      case "finalizado":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
            <CheckCircle className="w-3 h-3" /> Finalizado
          </span>
        );
      case "entregado":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-medium">
            <PackageCheck className="w-3 h-3" /> Entregado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
            <Clock className="w-3 h-3" /> {estado || "En espera"}
          </span>
        );
    }
  };

  function TabButton(props: { k: TabKey; label: string; count: number }) {
    const active = tab === props.k;
    return (
      <Button
        size="sm"
        variant={active ? "default" : "outline"}
        className={cnTab(active)}
        onClick={() => setTab(props.k)}
      >
        {props.label}
        <span className="ml-2 inline-flex items-center justify-center text-[11px] px-2 py-[2px] rounded-full bg-white/20">
          {props.count}
        </span>
      </Button>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#3C1C6C] flex items-center gap-2">
            📋 Gestión de Pedidos (Secretaría)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Revisión, cotización, aprobación y entrega de trabajos protésicos.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-[480px]">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por paciente, doctor, estado, nota, motivo..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 text-sm"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setKardexDoctor("");
              setKardexModalOpen(true);
            }}
            className="rounded-xl border-purple-200 text-purple-900 bg-purple-50 hover:bg-purple-100 font-bold text-xs h-10 gap-1.5 shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 text-purple-700" /> Kardex / Estado de Cuenta
          </Button>

          <Button variant="outline" onClick={fetchOrders} className="rounded-xl border-slate-200 shrink-0">
            Refrescar
          </Button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-2">
        <TabButton k="revision" label="En revisión" count={counters.revision} />
        <TabButton
          k="produccion"
          label="En producción"
          count={counters.produccion}
        />
        <TabButton
          k="finalizados"
          label="Finalizados"
          count={counters.finalizados}
        />
        <TabButton
          k="entregados"
          label="Entregados"
          count={counters.entregados}
        />
        <TabButton k="todos" label="Todos" count={counters.todos} />
      </div>

      <div className="overflow-x-auto bg-white rounded-3xl shadow-sm border border-slate-100">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-[#3C1C6C] text-white uppercase text-xs font-semibold">
            <tr>
              <th className="px-5 py-4">Paciente</th>
              <th className="px-5 py-4">Doctor</th>
              <th className="px-5 py-4">N° Req / Caja</th>
              <th className="px-5 py-4">Estado</th>
              <th className="px-5 py-4">Total / Saldo</th>
              <th className="px-5 py-4">Creado</th>
              <th className="px-5 py-4">Entrega</th>
              <th className="px-5 py-4">Nota</th>
              <th className="px-5 py-4 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filteredOrders.map((o) => {
              const saldo = (o.total ?? 0) - (o.anticipo ?? 0);
              const hasDelivery = o.observaciones && o.observaciones.includes("DELIVERY");

              return (
              <tr key={o.id} className="border-t hover:bg-gray-50/80 transition-colors">
                <td className="px-5 py-3 font-semibold text-slate-900">{o.paciente_nombre}</td>
                <td className="px-5 py-3 text-slate-700">{o.doctor_nombre || "—"}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-col gap-1 items-start">
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {o.numero_requerimiento || "—"}
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {o.numero_caja && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-900 text-white">
                          Caja #{o.numero_caja}
                        </span>
                      )}
                      {hasDelivery && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-0.5">
                          <Truck className="w-2.5 h-2.5" /> Delivery
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    {renderBadge(o.estado)}
                  </div>
                  {o.estado === "rechazado" && (
                    <p className="text-xs text-red-700 mt-1">
                      {o.motivo_rechazo || "Rechazado (sin motivo)"}
                    </p>
                  )}
                </td>

                <td className="px-5 py-3 text-xs">
                  {o.total != null ? (
                    <div className="space-y-0.5">
                      <DualPrice amountBs={o.total} size="sm" />
                      <div>
                        {saldo <= 0 ? (
                          <span className="text-[11px] font-bold text-emerald-700">✓ Pagado</span>
                        ) : (
                          <DualPrice amountBs={saldo} isDebt={true} size="sm" />
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                <td className="px-5 py-3 text-xs text-slate-600">
                  {o.fecha_creacion
                    ? new Date(o.fecha_creacion).toLocaleDateString()
                    : "—"}
                </td>

                <td className="px-5 py-3 text-xs text-slate-600">
                  {o.fecha_entrega
                    ? new Date(o.fecha_entrega).toLocaleString()
                    : "—"}
                </td>

                <td className="px-5 py-3 text-xs font-mono text-slate-600">{o.numero_nota_entrega || "—"}</td>

                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-200 text-xs font-bold rounded-xl text-purple-900 bg-purple-50/60 hover:bg-purple-100 h-8 gap-1"
                      onClick={() => {
                        setSelectedReportOrder(o);
                        setReportModalOpen(true);
                      }}
                      title="Imprimir Nota Oficial de Entrega con Marca de Agua"
                    >
                      <Printer className="w-3.5 h-3.5" /> Reporte
                    </Button>

                    {o.estado === "pendiente_revision" && (
                      <Button
                        size="sm"
                        className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold shadow-sm h-8"
                        onClick={() => openReviewModal(o)}
                      >
                        Revisar
                      </Button>
                    )}

                    {o.estado === "finalizado" && (
                      <Button
                        size="sm"
                        className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold shadow-sm h-8"
                        onClick={() => openEntregaModal(o)}
                      >
                        Entregar
                      </Button>
                    )}

                    {(o.estado === "entregado" ||
                      o.estado === "en_proceso" ||
                      o.estado === "pendiente" ||
                      o.estado === "rechazado") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-500 hover:text-[#3C1C6C] hover:bg-purple-50 rounded-xl text-xs font-semibold h-8"
                        onClick={() => openReviewModal(o)}
                      >
                        Ficha
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}

            {filteredOrders.length === 0 && (
              <tr>
                <td className="px-6 py-12 text-center text-sm text-slate-500" colSpan={9}>
                  No hay pedidos para mostrar en esta categoría.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL REVISIÓN (componente reusable) */}
      <ReviewOrderDialog
        open={modalReviewOpen}
        onOpenChange={setModalReviewOpen}
        order={selectedOrder ? (selectedOrder as ReviewOrder) : null}
        onUpdated={fetchOrders}
      />

      {/* MODAL ENTREGA */}
      <Dialog open={modalEntregaOpen} onOpenChange={setModalEntregaOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl text-center">
          <AnimatePresence>
            {!successEntregaAnim ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-[#3C1C6C] font-bold text-lg sm:text-xl">
                    Confirmar Entrega de Pedido
                  </DialogTitle>
                </DialogHeader>

                <p className="text-xs text-slate-500 mb-3 text-left">
                  Ingresa el número o código de remisión / nota de entrega física:
                </p>

                <Input
                  placeholder="Número de nota de entrega"
                  value={notaEntrega}
                  onChange={(e) => setNotaEntrega(e.target.value)}
                  className="rounded-xl border-slate-200 text-center font-mono font-bold text-lg h-12"
                />

                <DialogFooter className="mt-5 flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button
                    variant="outline"
                    onClick={() => setModalEntregaOpen(false)}
                    className="rounded-xl border-slate-200 h-11 w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold h-11 w-full sm:w-auto shadow-md"
                    onClick={handleConfirmEntrega}
                  >
                    Confirmar Entrega
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center py-6"
              >
                <motion.div
                  initial={{ rotate: -90 }}
                  animate={{ rotate: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-green-100 text-green-700 rounded-full p-4 mb-3"
                >
                  <CheckCircle className="w-10 h-10" />
                </motion.div>
                <p className="text-green-700 font-semibold text-lg">
                  Entrega registrada con éxito
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Modal Oficial de Impresión y Remisión con Marca de Agua */}
      <OrderReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        order={selectedReportOrder}
      />

      {/* Modal Oficial de Estado de Cuenta / Kardex */}
      <DoctorKardexReportModal
        open={kardexModalOpen}
        onOpenChange={setKardexModalOpen}
        doctorNombre={kardexDoctor || "Todos los Doctores"}
        orders={orders.filter((o) => !kardexDoctor || o.doctor_nombre === kardexDoctor)}
      />
    </div>
  );
}
