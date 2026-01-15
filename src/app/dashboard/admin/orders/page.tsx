"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [notaEntrega, setNotaEntrega] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  async function fetchOrders() {
    setLoading(true);
    let query = supabase
      .from("pedidos")
      .select(`
        id,
        paciente_nombre,
        estado,
        fecha_creacion,
        fecha_entrega,
        numero_nota_entrega,
        doctores (id, profiles (nombre))
      `)
      .order("fecha_creacion", { ascending: false });

    if (filter !== "all") query = query.eq("estado", filter);
    const { data, error } = await query;
    if (error) console.error(error);
    else setOrders(data || []);
    setLoading(false);
  }

  async function handleStatusChange(id: string, newStatus: string) {
    if (newStatus === "entregado") {
      const order = orders.find((o) => o.id === id);
      setSelectedOrder(order);
      setModalOpen(true);
      return;
    }
    await updateOrderStatus(id, newStatus);
  }

  async function updateOrderStatus(id: string, newStatus: string, nota?: string) {
    const now = new Date();
    const updateData: any = { estado: newStatus };

    if (newStatus === "entregado" && nota) {
      updateData.numero_nota_entrega = nota;
      updateData.fecha_entrega = now.toISOString();
      updateData.hora_entrega = now.toTimeString().slice(0, 8);
    }

    const { error } = await supabase.from("pedidos").update(updateData).eq("id", id);
    if (error) toast.error("❌ Error al actualizar estado");
    else {
      setSuccessAnim(true);
      fetchOrders();
      setTimeout(() => {
        setSuccessAnim(false);
        setModalOpen(false);
        toast.success("✅ Pedido actualizado correctamente");
      }, 1500);
    }
  }

  async function handleConfirmEntrega() {
    if (!notaEntrega.trim()) {
      toast.warning("⚠️ Ingresa un número de nota de entrega");
      return;
    }
    await updateOrderStatus(selectedOrder.id, "entregado", notaEntrega);
    setNotaEntrega("");
  }

  const renderBadge = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
            <Clock className="w-3 h-3" /> Pendiente
          </span>
        );
      case "en_proceso":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
            <Hammer className="w-3 h-3" /> En Proceso
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
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <h1 className="text-3xl font-bold text-green-800 mb-6">📦 Control de Pedidos (Admin)</h1>

      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-gray-700 font-medium">Filtrar:</label>
          <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="border rounded-lg px-3 py-2"
          >
        <option value="all">Todos</option>
        <option value="pendiente">Pendiente</option>
        <option value="en_proceso">En Proceso</option>
        <option value="finalizado">Finalizado</option>
        <option value="entregado">Entregado</option>
          </select>
        </div>
        <Button
          onClick={() => router.push("/dashboard/admin/new-order")}
          className="bg-green-700 hover:bg-green-800 text-white"
        >
          ➕ Agregar Pedido
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-600">Cargando pedidos...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl shadow border">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-green-700 text-white">
              <tr>
                <th className="px-6 py-3">Paciente</th>
                <th className="px-6 py-3">Doctor</th>
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
                  <td className="px-6 py-3">{o.doctores?.profiles?.nombre || "—"}</td>
                  <td className="px-6 py-3 flex items-center gap-2">
                    {renderBadge(o.estado)}
                    <select
                      value={o.estado}
                      onChange={(e) => handleStatusChange(o.id, e.target.value)}
                      className="border rounded px-2 py-1 text-xs"
                    >
                      <option value="pendiente">pendiente</option>
                      <option value="en_proceso">en_proceso</option>
                      <option value="finalizado">finalizado</option>
                      <option value="entregado">entregado</option>
                    </select>
                    
                  </td>
                  <td className="px-6 py-3">
                    {new Date(o.fecha_creacion).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    {o.fecha_entrega ? new Date(o.fecha_entrega).toLocaleString() : "—"}
                  </td>
                  <td className="px-6 py-3">{o.numero_nota_entrega || "—"}</td>
                </tr>
                
              ))}
            </tbody>
            
          </table>
          
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md text-center">
          <AnimatePresence>
            {!successAnim ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-green-700">
                    Registrar nota de entrega
                  </DialogTitle>
                </DialogHeader>
                <Input
                  placeholder="Ej: 00045"
                  value={notaEntrega}
                  onChange={(e) => setNotaEntrega(e.target.value)}
                />
                <DialogFooter className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    className="bg-green-700 hover:bg-green-800 text-white"
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
                  Pedido actualizado con éxito
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
