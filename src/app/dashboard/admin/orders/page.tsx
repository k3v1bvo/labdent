"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { logAudit } from "@/lib/auditLogger";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Clock,
  Hammer,
  CheckCircle,
  PackageCheck,
  ClipboardCheck,
  XCircle,
  User,
  Phone,
  Hash,
  Calendar,
  DollarSign,
  Package,
  Palette,
  Ruler,
  Stethoscope,
  MessageSquareText,
  RefreshCcw,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  numero_caja?: string | null;

  observaciones?: string | null;

  estado: string;
  fecha_creacion: string; // timestamptz/ts
  fecha_entrega?: string | null;
  numero_nota_entrega?: string | null;

  anticipo?: number | null;
  total?: number | null;

  motivo_rechazo?: string | null;
};

function money(n?: number | null) {
  const v = Number(n ?? 0);
  return isFinite(v) ? v.toFixed(2) : "0.00";
}

function badgeByEstado(estado: string) {
  switch (estado) {
    case "pendiente_revision":
      return {
        label: "En revisión",
        Icon: ClipboardCheck,
        className: "bg-blue-100 text-blue-800",
      };
    case "rechazado":
      return {
        label: "Rechazado",
        Icon: XCircle,
        className: "bg-red-100 text-red-800",
      };
    case "pendiente":
      return {
        label: "Pendiente",
        Icon: Clock,
        className: "bg-gray-100 text-gray-700",
      };
    case "en_proceso":
      return {
        label: "En proceso",
        Icon: Hammer,
        className: "bg-green-100 text-green-800",
      };
    case "finalizado":
      return {
        label: "Finalizado",
        Icon: CheckCircle,
        className: "bg-yellow-100 text-yellow-800",
      };
    case "entregado":
      return {
        label: "Entregado",
        Icon: PackageCheck,
        className: "bg-orange-100 text-orange-800",
      };
    default:
      return {
        label: estado || "—",
        Icon: Clock,
        className: "bg-gray-100 text-gray-700",
      };
  }
}

function toISOStartOfDay(dateStr: string) {
  // dateStr: "YYYY-MM-DD"
  return `${dateStr}T00:00:00.000Z`;
}
function toISOEndOfDay(dateStr: string) {
  return `${dateStr}T23:59:59.999Z`;
}

export default function AdminOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<PedidoRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ filtros como la foto
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<string>("all");
  const [doctor, setDoctor] = useState<string>("all");
  const [desde, setDesde] = useState<string>(""); // YYYY-MM-DD
  const [hasta, setHasta] = useState<string>(""); // YYYY-MM-DD

  // modal entrega
  const [selectedOrder, setSelectedOrder] = useState<PedidoRow | null>(null);
  const [notaEntrega, setNotaEntrega] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel("admin-orders-realtime")
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, doctor, desde, hasta]);

  async function fetchOrders() {
    setLoading(true);

    let query = supabase
      .from("pedidos")
      .select(
        [
          "id",
          "paciente_nombre",
          "paciente_telefono",
          "doctor_nombre",
          "doctor_telefono",
          "numero_requerimiento",
          "trabajo_realizar",
          "pieza_numero",
          "color_pieza",
          "colimetro",
          "numero_caja",
          "observaciones",
          "motivo_rechazo",
          "estado",
          "fecha_creacion",
          "fecha_entrega",
          "numero_nota_entrega",
          "anticipo",
          "total",
        ].join(",")
      )
      .order("fecha_creacion", { ascending: false });

    // ✅ filtros server (para que sea rápido)
    if (estado !== "all") query = query.eq("estado", estado);

    if (doctor !== "all") {
      // preferimos doctor_nombre (porque tú guardas doctores por nombre también)
      query = query.eq("doctor_nombre", doctor);
    }

    // ✅ rango de fechas por fecha_creacion
    if (desde) query = query.gte("fecha_creacion", toISOStartOfDay(desde));
    if (hasta) query = query.lte("fecha_creacion", toISOEndOfDay(hasta));

    const res = await query;

    if (res.error) {
      console.error(res.error);
      toast.error("❌ Error cargando pedidos");
      setLoading(false);
      return;
    }

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
      numero_caja: r.numero_caja ?? null,

      observaciones: r.observaciones ?? null,
      motivo_rechazo: r.motivo_rechazo ?? null,

      estado: String(r.estado ?? ""),
      fecha_creacion: String(r.fecha_creacion ?? ""),
      fecha_entrega: r.fecha_entrega ?? null,
      numero_nota_entrega: r.numero_nota_entrega ?? null,

      anticipo: r.anticipo ?? null,
      total: r.total ?? null,
    }));

    setOrders(typed);
    setLoading(false);
  }

  // ✅ lista de doctores (para dropdown)
  const doctorOptions = useMemo(() => {
    const unique = Array.from(
      new Set(
        orders
          .map((o) => (o.doctor_nombre ?? "").trim())
          .filter(Boolean)
      )
    );
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [orders]);

  // ✅ buscador local (para que busque muchas columnas sin complicar SQL)
  const filteredOrders = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return orders;

    return orders.filter((o) => {
      const blob = [
        o.numero_requerimiento,
        o.paciente_nombre,
        o.paciente_telefono,
        o.doctor_nombre,
        o.doctor_telefono,
        o.estado,
        o.numero_nota_entrega,
        o.trabajo_realizar,
        o.pieza_numero,
        o.color_pieza,
        o.colimetro,
        o.numero_caja,
        o.observaciones,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return blob.includes(s);
    });
  }, [orders, q]);

  function openEntregaModal(order: PedidoRow) {
    setSelectedOrder(order);
    setNotaEntrega("");
    setSuccessAnim(false);
    setModalOpen(true);
  }

  async function updateOrderStatus(id: string, newStatus: string, nota?: string) {
    const now = new Date();
    const updateData: any = { estado: newStatus };

    if (newStatus === "entregado") {
      if (!nota?.trim()) {
        toast.warning("⚠️ Ingresa un número de nota de entrega");
        return;
      }
      updateData.numero_nota_entrega = nota.trim();
      updateData.fecha_entrega = now.toISOString();
      updateData.hora_entrega = now.toTimeString().slice(0, 8);
    }

    const { error } = await supabase
      .from("pedidos")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error(error);
      toast.error("❌ Error al actualizar estado");
      return;
    }

    // REGISTRO DE AUDITORÍA FORENSE INMUTABLE
    const currentOrder = orders.find((o) => o.id === id);
    await logAudit({
      pedidoId: id,
      accion: newStatus === "entregado" ? "REGISTRO_ENTREGA" : "CAMBIO_ESTADO",
      campoModificado: "estado",
      valorAnterior: currentOrder?.estado,
      valorNuevo: newStatus,
      motivo: newStatus === "entregado" 
        ? `Entrega física registrada por Admin bajo Nota N°: ${nota?.trim() || "—"}` 
        : `Cambio de estado administrativo a: ${newStatus}`,
    });

    setSuccessAnim(true);
    await fetchOrders();

    setTimeout(() => {
      setSuccessAnim(false);
      setModalOpen(false);
      toast.success("✅ Pedido actualizado correctamente");
    }, 1200);
  }

  async function handleConfirmEntrega() {
    if (!selectedOrder) return;
    await updateOrderStatus(selectedOrder.id, "entregado", notaEntrega);
    setNotaEntrega("");
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#3C1C6C] flex items-center gap-2">
            📦 Control y Seguimiento de Pedidos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Recepción, producción, facturación y despacho final de trabajos dentales.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchOrders} className="rounded-xl border-slate-200">
            <RefreshCcw className="w-4 h-4 mr-2" /> Refrescar
          </Button>
          <Button
            onClick={() => router.push("/dashboard/admin/new-order")}
            className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold shadow-md"
          >
            ➕ Nuevo Pedido
          </Button>
        </div>
      </div>

      {/* ✅ BARRA DE FILTROS */}
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Buscar */}
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-2 mb-1.5">
                <Search className="w-4 h-4 text-slate-400" /> Buscar
              </label>
              <Input
                placeholder="Req, paciente, doctor, nota, trabajo, caja..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="rounded-xl border-slate-200 text-sm"
              />
            </div>

            {/* Estado */}
            <div>
              <label className="text-xs text-gray-600 flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4" /> Estado
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 bg-white"
              >
                <option value="all">Todos</option>
                <option value="pendiente_revision">pendiente_revision</option>
                <option value="rechazado">rechazado</option>
                <option value="pendiente">pendiente</option>
                <option value="en_proceso">en_proceso</option>
                <option value="finalizado">finalizado</option>
                <option value="entregado">entregado</option>
              </select>
            </div>

            {/* Doctor */}
            <div>
              <label className="text-xs text-gray-600 flex items-center gap-2 mb-1">
                <Stethoscope className="w-4 h-4" /> Doctor
              </label>
              <select
                value={doctor}
                onChange={(e) => setDoctor(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 bg-white"
              >
                <option value="all">Todos</option>
                {doctorOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Desde + Hasta */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4" /> Desde
                </label>
                <Input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4" /> Hasta
                </label>
                <Input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
            <p className="text-xs text-gray-600">
              Mostrando <span className="font-semibold">{filteredOrders.length}</span>{" "}
              pedidos
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setQ("");
                  setEstado("all");
                  setDoctor("all");
                  setDesde("");
                  setHasta("");
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <p className="text-gray-600">Cargando pedidos...</p>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border rounded-2xl p-8 text-gray-600">
          No hay pedidos para mostrar.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredOrders.map((o) => {
            const b = badgeByEstado(o.estado);
            const Icon = b.Icon;

            const total = Number(o.total ?? 0);
            const anticipo = Number(o.anticipo ?? 0);
            const saldo = total - anticipo;

            const doctorName = o.doctor_nombre || "—";

            return (
              <div
                key={o.id}
                className="bg-white border rounded-2xl shadow-sm hover:shadow-md transition-shadow p-5"
              >
                {/* header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      {o.paciente_nombre}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Stethoscope className="w-3.5 h-3.5" /> {doctorName}
                      </span>

                      {o.numero_requerimiento && (
                        <span className="inline-flex items-center gap-1">
                          <Hash className="w-3.5 h-3.5" /> Req: {o.numero_requerimiento}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {o.fecha_creacion
                          ? new Date(o.fecha_creacion).toLocaleString()
                          : "—"}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${b.className}`}
                    title={o.estado}
                  >
                    <Icon className="w-3.5 h-3.5" /> {b.label}
                  </span>
                </div>

                {/* body */}
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl bg-gray-50 border p-3">
                    <p className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4" /> Trabajo
                    </p>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                      {o.trabajo_realizar || "—"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border text-gray-700">
                        <Package className="w-3.5 h-3.5" />
                        Pieza: {o.pieza_numero || "—"}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border text-gray-700">
                        <Palette className="w-3.5 h-3.5" />
                        Color: {o.color_pieza || "—"}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border text-gray-700">
                        <Ruler className="w-3.5 h-3.5" />
                        Colímetro: {o.colimetro || "—"}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border text-gray-700">
                        <Package className="w-3.5 h-3.5" />
                        Caja: {o.numero_caja || "—"}
                      </span>
                    </div>
                  </div>

                  {/* contacto + montos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-xl border p-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2">
                        Contacto
                      </p>
                      <div className="text-xs text-gray-700 space-y-1">
                        <p className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-gray-500" />
                          Paciente: {o.paciente_telefono || "—"}
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-gray-500" />
                          Doctor: {o.doctor_telefono || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border p-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2">
                        Montos
                      </p>
                      <div className="text-xs text-gray-700 space-y-1">
                        <p className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-2">
                            <DollarSign className="w-3.5 h-3.5 text-gray-500" />{" "}
                            Total
                          </span>
                          <span className="font-semibold">Bs {money(total)}</span>
                        </p>
                        <p className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-2">
                            <DollarSign className="w-3.5 h-3.5 text-gray-500" />{" "}
                            Anticipo
                          </span>
                          <span className="font-semibold">Bs {money(anticipo)}</span>
                        </p>
                        <p className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-2">
                            <DollarSign className="w-3.5 h-3.5 text-gray-500" />{" "}
                            Saldo
                          </span>
                          <span className="font-semibold">Bs {money(saldo)}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* observaciones */}
                  {o.observaciones && (
                    <div className="rounded-xl border p-3">
                      <p className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                        <MessageSquareText className="w-4 h-4" /> Observaciones
                      </p>
                      <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">
                        {o.observaciones}
                      </p>
                    </div>
                  )}

                  {/* rechazo */}
                  {o.estado === "rechazado" && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                      <p className="text-xs font-semibold text-red-800 flex items-center gap-2">
                        <XCircle className="w-4 h-4" /> Motivo de rechazo
                      </p>
                      <p className="mt-1 text-sm text-red-800 whitespace-pre-wrap">
                        {o.motivo_rechazo || "Rechazado (sin motivo)"}
                      </p>
                    </div>
                  )}

                  {/* footer acciones */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
                    <div className="text-xs text-gray-600">
                      Nota:{" "}
                      <span className="font-medium">
                        {o.numero_nota_entrega || "—"}
                      </span>
                      {o.fecha_entrega && (
                        <>
                          {" "}
                          • Entregado:{" "}
                          <span className="font-medium">
                            {new Date(o.fecha_entrega).toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={o.estado}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          if (newStatus === "entregado") {
                            openEntregaModal(o);
                            return;
                          }
                          updateOrderStatus(o.id, newStatus);
                        }}
                        className="border rounded-lg px-2 py-2 text-xs bg-white"
                      >
                        <option value="pendiente_revision">pendiente_revision</option>
                        <option value="rechazado">rechazado</option>
                        <option value="pendiente">pendiente</option>
                        <option value="en_proceso">en_proceso</option>
                        <option value="finalizado">finalizado</option>
                        <option value="entregado">entregado</option>
                      </select>

                      {o.estado === "finalizado" && (
                        <Button
                          className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl text-xs font-bold"
                          onClick={() => openEntregaModal(o)}
                        >
                          Registrar entrega
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL ENTREGA */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl text-center">
          <AnimatePresence>
            {!successAnim ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-[#3C1C6C] font-bold text-lg sm:text-xl">
                    Registrar Nota de Entrega
                  </DialogTitle>
                </DialogHeader>

                <p className="text-xs text-slate-500 mb-3 text-left">
                  Ingresa el número o código de remisión/nota entregada a la clínica o transportista:
                </p>

                <Input
                  placeholder="Ej: NE-00045"
                  value={notaEntrega}
                  onChange={(e) => setNotaEntrega(e.target.value)}
                  className="rounded-xl border-slate-200 text-center font-mono font-bold text-lg h-12"
                />

                <DialogFooter className="mt-5 flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl border-slate-200 h-11 w-full sm:w-auto">
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
                transition={{ duration: 0.35 }}
                className="flex flex-col items-center justify-center py-6"
              >
                <motion.div
                  initial={{ rotate: -90 }}
                  animate={{ rotate: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-purple-100 text-[#3C1C6C] rounded-full p-4 mb-3 border border-purple-200"
                >
                  <CheckCircle className="w-10 h-10" />
                </motion.div>
                <p className="text-[#3C1C6C] font-bold text-lg">
                  Pedido entregado con éxito
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
