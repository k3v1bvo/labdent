"use client";

import { useEffect, useState } from "react";
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
import { Clock, CheckCircle, PackageCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion"; // 👈 animación

export default function SecretaryOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [notaEntrega, setNotaEntrega] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    const { data, error } = await supabase
      .from("pedidos")
      .select("id, paciente_nombre, estado, fecha_creacion, fecha_entrega, numero_nota_entrega")
      .order("fecha_creacion", { ascending: false });

    if (error) console.error(error);
    else setOrders(data || []);
  }

  async function handleStatusChange(id: string, newStatus: string) {
    if (newStatus === "entregado") {
      const order = orders.find((o) => o.id === id);
      setSelectedOrder(order);
      setModalOpen(true);
    } else {
      toast.error("⚠️ Solo puedes cambiar de Finalizado → Entregado");
    }
  }

  async function handleConfirmEntrega() {
    if (!notaEntrega.trim()) {
      toast.warning("Debes ingresar una nota de entrega");
      return;
    }

    const now = new Date();
    const { error } = await supabase
      .from("pedidos")
      .update({
        estado: "entregado",
        numero_nota_entrega: notaEntrega,
        fecha_entrega: now.toISOString(),
        hora_entrega: now.toTimeString().slice(0, 8),
      })
      .eq("id", selectedOrder.id);

    if (error) toast.error("Error al registrar entrega");
    else {
      setSuccessAnim(true);
      setNotaEntrega("");
      fetchOrders();
      setTimeout(() => {
        setSuccessAnim(false);
        setModalOpen(false);
      }, 1500);
    }
  }

  const renderBadge = (estado: string) => {
    switch (estado) {
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
            <Clock className="w-3 h-3" /> En Espera
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <h1 className="text-3xl font-bold text-amber-700 mb-6">📋 Pedidos (Secretaría)</h1>

      <div className="overflow-x-auto bg-white rounded-2xl shadow border border-gray-100">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-amber-700 text-white">
            <tr>
              <th className="px-6 py-3">Paciente</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3">Creado</th>
              <th className="px-6 py-3">Entrega</th>
              <th className="px-6 py-3">Nota</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-3 font-medium">{o.paciente_nombre}</td>
                <td className="px-6 py-3 flex items-center gap-2">
                  {renderBadge(o.estado)}
                  <select
                    value={o.estado}
                    onChange={(e) => handleStatusChange(o.id, e.target.value)}
                    className="ml-2 border rounded px-2 py-1 text-xs"
                  >
                    <option value="finalizado">finalizado</option>
                    <option value="entregado">entregado</option>
                  </select>
                </td>
                <td className="px-6 py-3">
                  {new Date(o.fecha_creacion).toLocaleDateString()}
                </td>
                <td className="px-6 py-3">
                  {o.fecha_entrega
                    ? new Date(o.fecha_entrega).toLocaleString()
                    : "—"}
                </td>
                <td className="px-6 py-3">{o.numero_nota_entrega || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL con animación */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md text-center">
          <AnimatePresence>
            {!successAnim ? (
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
                  <Button variant="outline" onClick={() => setModalOpen(false)}>
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
