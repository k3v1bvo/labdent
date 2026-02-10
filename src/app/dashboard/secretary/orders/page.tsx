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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import {
  ReviewOrderDialog,
  type ReviewOrder,
} from "@/components/orders/ReviewOrderDialog";

type PedidoRow = {
  id: string;
  paciente_nombre: string;
  doctor_nombre?: string | null;
  numero_requerimiento?: string | null;

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
    ? "bg-amber-700 hover:bg-amber-800 text-white"
    : "";
}

export default function SecretaryOrdersPage() {
  const [orders, setOrders] = useState<PedidoRow[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PedidoRow | null>(null);

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
  }, []);

  async function fetchOrders() {
    const res = await supabase
      .from("pedidos")
      .select(
        [
          "id",
          "paciente_nombre",
          "doctor_nombre",
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
      doctor_nombre: r.doctor_nombre ?? null,
      numero_requerimiento: r.numero_requerimiento ?? null,
      estado: String(r.estado ?? ""),
      fecha_creacion: String(r.fecha_creacion ?? ""),
      fecha_entrega: r.fecha_entrega ?? null,
      numero_nota_entrega: r.numero_nota_entrega ?? null,
      total: r.total ?? null,
      anticipo: r.anticipo ?? null,
      numero_caja: r.numero_caja ?? null,
      observaciones: r.observaciones ?? null,
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
    <div className="min-h-screen bg-gray-50 p-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <h1 className="text-3xl font-bold text-amber-700">
          📋 Pedidos (Secretaría)
        </h1>

        <div className="flex gap-2 w-full md:w-[520px]">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por paciente, doctor, estado, nota, motivo..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button variant="outline" onClick={fetchOrders}>
            Refrescar
          </Button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-2 mb-6">
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

      <div className="overflow-x-auto bg-white rounded-2xl shadow border border-gray-100">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-amber-700 text-white">
            <tr>
              <th className="px-6 py-3">Paciente</th>
              <th className="px-6 py-3">Doctor</th>
              <th className="px-6 py-3">N° Req</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3">Creado</th>
              <th className="px-6 py-3">Entrega</th>
              <th className="px-6 py-3">Nota</th>
              <th className="px-6 py-3">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filteredOrders.map((o) => (
              <tr key={o.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-3 font-medium">{o.paciente_nombre}</td>
                <td className="px-6 py-3">{o.doctor_nombre || "—"}</td>
                <td className="px-6 py-3">{o.numero_requerimiento || "—"}</td>

                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    {renderBadge(o.estado)}
                  </div>
                  {o.estado === "rechazado" && (
                    <p className="text-xs text-red-700 mt-1">
                      {o.motivo_rechazo || "Rechazado (sin motivo)"}
                    </p>
                  )}
                </td>

                <td className="px-6 py-3">
                  {o.fecha_creacion
                    ? new Date(o.fecha_creacion).toLocaleDateString()
                    : "—"}
                </td>

                <td className="px-6 py-3">
                  {o.fecha_entrega
                    ? new Date(o.fecha_entrega).toLocaleString()
                    : "—"}
                </td>

                <td className="px-6 py-3">{o.numero_nota_entrega || "—"}</td>

                <td className="px-6 py-3">
                  {o.estado === "pendiente_revision" && (
                    <Button
                      className="bg-blue-700 hover:bg-blue-800 text-white"
                      onClick={() => openReviewModal(o)}
                    >
                      Revisar / Completar
                    </Button>
                  )}

                  {o.estado === "finalizado" && (
                    <Button
                      className="bg-amber-700 hover:bg-amber-800 text-white"
                      onClick={() => openEntregaModal(o)}
                    >
                      Registrar entrega
                    </Button>
                  )}

                  {(o.estado === "entregado" ||
                    o.estado === "en_proceso" ||
                    o.estado === "pendiente" ||
                    o.estado === "rechazado") && (
                    <span className="text-xs text-gray-500">—</span>
                  )}
                </td>
              </tr>
            ))}

            {filteredOrders.length === 0 && (
              <tr>
                <td className="px-6 py-6 text-sm text-gray-600" colSpan={8}>
                  No hay pedidos para mostrar.
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
        <DialogContent className="sm:max-w-md text-center">
          <AnimatePresence>
            {!successEntregaAnim ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-amber-700">
                    Confirmar Entrega
                  </DialogTitle>
                </DialogHeader>

                <Input
                  placeholder="Número de nota de entrega"
                  value={notaEntrega}
                  onChange={(e) => setNotaEntrega(e.target.value)}
                />

                <DialogFooter className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setModalEntregaOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="bg-amber-700 hover:bg-amber-800 text-white"
                    onClick={handleConfirmEntrega}
                  >
                    Confirmar
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
    </div>
  );
}
