"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
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
  ChevronDown,
  LayoutGrid,
  TableProperties,
  Eye,
  Filter,
  Sparkles,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { OrderStatusSelect } from "@/components/orders/OrderStatusSelect";
import { toBoliviaYMD, getBoliviaNow } from "@/lib/dateUtils";

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
        shortLabel: "Revisión",
        Icon: ClipboardCheck,
        className: "bg-blue-50 text-blue-700 border border-blue-200",
      };
    case "rechazado":
      return {
        label: "Rechazado",
        shortLabel: "Rechazado",
        Icon: XCircle,
        className: "bg-rose-50 text-rose-700 border border-rose-200",
      };
    case "pendiente":
      return {
        label: "Pendiente (Taller)",
        shortLabel: "Pendiente",
        Icon: Clock,
        className: "bg-amber-50 text-amber-800 border border-amber-200",
      };
    case "en_proceso":
      return {
        label: "En proceso CAD/CAM",
        shortLabel: "En Proceso",
        Icon: Hammer,
        className: "bg-purple-50 text-[#3C1C6C] border border-purple-200",
      };
    case "finalizado":
      return {
        label: "Finalizado (Control)",
        shortLabel: "Finalizado",
        Icon: CheckCircle,
        className: "bg-emerald-50 text-emerald-800 border border-emerald-200",
      };
    case "entregado":
      return {
        label: "Entregado a Clínica",
        shortLabel: "Entregado",
        Icon: PackageCheck,
        className: "bg-slate-100 text-slate-800 border border-slate-300",
      };
    default:
      return {
        label: estado || "—",
        shortLabel: estado || "—",
        Icon: Clock,
        className: "bg-slate-100 text-slate-700 border border-slate-200",
      };
  }
}

function toISOStartOfDay(dateStr: string) {
  return `${dateStr}T00:00:00.000Z`;
}
function toISOEndOfDay(dateStr: string) {
  return `${dateStr}T23:59:59.999Z`;
}

export default function AdminOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<PedidoRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Modo de vista: Kardex (tabla contable) vs Tarjetas
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Filtros
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<string>("all");
  const [doctor, setDoctor] = useState<string>("all");
  const [desde, setDesde] = useState<string>(""); // YYYY-MM-DD
  const [hasta, setHasta] = useState<string>(""); // YYYY-MM-DD

  // Lista global de doctores para el combobox
  const [allRegisteredDoctors, setAllRegisteredDoctors] = useState<string[]>([]);

  // Modal entrega
  const [selectedOrder, setSelectedOrder] = useState<PedidoRow | null>(null);
  const [notaEntrega, setNotaEntrega] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);

  // Cargar lista completa de doctores
  useEffect(() => {
    async function loadDoctors() {
      const { data } = await supabase
        .from("doctores")
        .select("nombre")
        .order("nombre", { ascending: true });
      if (data) {
        setAllRegisteredDoctors(data.map((d: any) => d.nombre).filter(Boolean));
      }
    }
    loadDoctors();
  }, []);

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

    if (estado !== "all") query = query.eq("estado", estado);
    if (doctor !== "all") query = query.eq("doctor_nombre", doctor);

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

  // Lista unificada de doctores para el combobox
  const doctorOptions = useMemo(() => {
    const set = new Set<string>(allRegisteredDoctors);
    orders.forEach((o) => {
      const v = (o.doctor_nombre ?? "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allRegisteredDoctors, orders]);

  const doctorComboboxOptions = useMemo<ComboboxOption[]>(() => {
    return [
      {
        value: "all",
        label: "Todos los Doctores",
        description: "Sin filtro de clínica",
        icon: <Stethoscope className="w-3.5 h-3.5 text-purple-600" />,
      },
      ...doctorOptions.map((d) => ({
        value: d,
        label: `Dr(a). ${d}`,
        icon: <Stethoscope className="w-3.5 h-3.5 text-slate-500" />,
      })),
    ];
  }, [doctorOptions]);

  const statusComboboxOptions: ComboboxOption[] = [
    {
      value: "all",
      label: "Todos los Estados",
      description: "Vista global de órdenes",
      icon: <Clock className="w-3.5 h-3.5 text-purple-600" />,
    },
    {
      value: "pendiente_revision",
      label: "En Revisión (Por Aprobar)",
      badge: "📋 Revisión",
      badgeColor: "bg-amber-100 text-amber-900 border-amber-200",
    },
    {
      value: "pendiente",
      label: "Pendiente (Cola de Taller)",
      badge: "⏳ Pendiente",
      badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
    },
    {
      value: "en_proceso",
      label: "En Proceso CAD/CAM",
      badge: "⚙️ Proceso",
      badgeColor: "bg-blue-100 text-blue-900 border-blue-200",
    },
    {
      value: "finalizado",
      label: "Finalizado (Listo para Entrega)",
      badge: "✨ Finalizado",
      badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-200",
    },
    {
      value: "entregado",
      label: "Entregado a Clínica",
      badge: "📦 Entregado",
      badgeColor: "bg-purple-100 text-purple-900 border-purple-200",
    },
    {
      value: "rechazado",
      label: "Rechazado",
      badge: "❌ Rechazado",
      badgeColor: "bg-rose-100 text-rose-900 border-rose-200",
    },
  ];

  // Buscador local multivariable
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

  // Acciones de fecha rápida (Sincronizadas con Bolivia GMT-4)
  function setHoy() {
    const d = toBoliviaYMD();
    setDesde(d);
    setHasta(d);
  }

  function setSemana() {
    const now = getBoliviaNow();
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diff);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    setDesde(toBoliviaYMD(mon));
    setHasta(toBoliviaYMD(sun));
  }

  function setMes() {
    const now = getBoliviaNow();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDesde(toBoliviaYMD(start));
    setHasta(toBoliviaYMD(end));
  }

  function limpiarFiltros() {
    setQ("");
    setEstado("all");
    setDoctor("all");
    setDesde("");
    setHasta("");
  }

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

    // REGISTRO DE AUDITORÍA INMUTABLE
    const currentOrder = orders.find((o) => o.id === id);
    await logAudit({
      pedidoId: id,
      accion: newStatus === "entregado" ? "REGISTRO_ENTREGA" : "CAMBIO_ESTADO",
      campoModificado: "estado",
      valorAnterior: currentOrder?.estado,
      valorNuevo: newStatus,
      motivo:
        newStatus === "entregado"
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
      {/* 1. Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#3C1C6C] tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-[#3C1C6C]/10 text-[#3C1C6C] border border-[#3C1C6C]/15">
              📦
            </span>
            Control & Kardex de Pedidos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Gestión completa de órdenes, caja técnica, Kardex financiero y despacho clínico.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            onClick={fetchOrders}
            className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs h-10 gap-1.5 shadow-2xs"
          >
            <RefreshCcw className="w-3.5 h-3.5 text-slate-500" />
            Refrescar
          </Button>

          <Button
            onClick={() => router.push("/dashboard/admin/new-order")}
            className="bg-gradient-to-r from-[#3C1C6C] to-[#6329B7] hover:from-[#2E1553] hover:to-[#4D248B] text-white rounded-xl font-bold text-xs h-10 shadow-md shadow-purple-950/20 gap-1.5 cursor-pointer"
          >
            <span>➕</span>
            Registrar Nuevo Pedido
          </Button>
        </div>
      </div>

      {/* 2. Barra de Filtros y Comboboxes Rediseñados */}
      <Card className="rounded-2xl border-slate-200/90 shadow-sm bg-white overflow-hidden">
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Buscador General */}
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <Search className="w-3.5 h-3.5 text-[#A57CFA]" />
                Buscar en Todo el Kardex
              </label>
              <div className="relative">
                <Input
                  placeholder="Paciente, doctor, N° req, trabajo, caja, nota..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="rounded-xl border-slate-200 focus:border-[#3C1C6C] focus:ring-2 focus:ring-[#A57CFA]/20 text-xs sm:text-sm h-10 pl-9"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Combobox de Estado con diseño corporativo */}
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-[#A57CFA]" />
                Estado del Pedido
              </label>
              <Combobox
                value={estado}
                onChange={setEstado}
                options={statusComboboxOptions}
                placeholder="Filtrar por estado..."
                searchable={false}
              />
            </div>

            {/* Combobox de Doctor con diseño corporativo */}
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-[#A57CFA]" />
                Odontólogo / Clínica
              </label>
              <Combobox
                value={doctor}
                onChange={setDoctor}
                options={doctorComboboxOptions}
                placeholder="Buscar doctor..."
                searchPlaceholder="Escribe el nombre del doctor..."
                searchable={true}
              />
            </div>

            {/* Rango de Fechas */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mb-1.5">
                  <Calendar className="w-3 h-3 text-[#A57CFA]" /> Desde
                </label>
                <Input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs h-10 px-2"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mb-1.5">
                  <Calendar className="w-3 h-3 text-[#A57CFA]" /> Hasta
                </label>
                <Input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs h-10 px-2"
                />
              </div>
            </div>
          </div>

          {/* Barra de Presets Rápidos y Limpieza */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" /> Filtro Rápido:
              </span>
              <button
                type="button"
                onClick={limpiarFiltros}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  !desde && !hasta && estado === "all" && doctor === "all" && !q
                    ? "bg-[#3C1C6C] text-white border-[#3C1C6C]"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={setHoy}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={setSemana}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Esta Semana
              </button>
              <button
                type="button"
                onClick={setMes}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Este Mes
              </button>
              {(desde || hasta || estado !== "all" || doctor !== "all" || q) && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition-colors cursor-pointer"
                >
                  ✕ Restablecer Filtros
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Mostrando <span className="font-extrabold text-[#3C1C6C]">{filteredOrders.length}</span>{" "}
              de <span className="font-semibold text-slate-700">{orders.length}</span> pedidos
            </p>
          </div>
        </div>
      </Card>

      {/* 3. Selector de Vista: Lista Kardex vs Tarjetas */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500">
            Modo de Visualización:
          </span>
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-[#3C1C6C] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>Lista tipo Kardex</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "cards"
                  ? "bg-[#3C1C6C] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Tarjetas</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          💡 Puedes cambiar el estado o registrar entrega directamente desde cada fila.
        </p>
      </div>

      {/* 4. Contenido Principal: Kardex Table o Grid Cards */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
          <div className="w-8 h-8 border-3 border-[#A57CFA] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold">Cargando pedidos en tiempo real...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm space-y-2">
          <Package className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-base font-bold text-slate-700">No se encontraron pedidos</p>
          <p className="text-xs text-slate-400">
            Intenta cambiar los filtros de búsqueda o fecha.
          </p>
        </div>
      ) : viewMode === "table" ? (
        /* ========================================================= */
        /* VISTA 1: LISTA TIPO KARDEX (TABLA CONTABLE / OPERATIVA) */
        /* ========================================================= */
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/90 border-b border-slate-200 text-xs">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-20 font-black text-[#3C1C6C] text-xs uppercase tracking-wider">
                    Caja
                  </TableHead>
                  <TableHead className="font-black text-[#3C1C6C] text-xs uppercase tracking-wider min-w-[180px]">
                    Paciente & Req
                  </TableHead>
                  <TableHead className="font-black text-[#3C1C6C] text-xs uppercase tracking-wider min-w-[170px]">
                    Doctor / Clínica
                  </TableHead>
                  <TableHead className="font-black text-[#3C1C6C] text-xs uppercase tracking-wider min-w-[200px]">
                    Trabajo Dental
                  </TableHead>
                  <TableHead className="font-black text-[#3C1C6C] text-xs uppercase tracking-wider min-w-[150px]">
                    Estado Operativo
                  </TableHead>
                  <TableHead className="text-right font-black text-[#3C1C6C] text-xs uppercase tracking-wider">
                    Total
                  </TableHead>
                  <TableHead className="text-right font-black text-[#3C1C6C] text-xs uppercase tracking-wider">
                    Anticipo
                  </TableHead>
                  <TableHead className="text-right font-black text-[#3C1C6C] text-xs uppercase tracking-wider">
                    Saldo
                  </TableHead>
                  <TableHead className="font-black text-[#3C1C6C] text-xs uppercase tracking-wider min-w-[110px]">
                    Ingreso
                  </TableHead>
                  <TableHead className="text-center font-black text-[#3C1C6C] text-xs uppercase tracking-wider min-w-[200px]">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredOrders.map((o) => {
                  const b = badgeByEstado(o.estado);
                  const Icon = b.Icon;

                  const total = Number(o.total ?? 0);
                  const anticipo = Number(o.anticipo ?? 0);
                  const saldo = total - anticipo;

                  return (
                    <TableRow
                      key={o.id}
                      className="hover:bg-purple-50/30 transition-colors group"
                    >
                      {/* 1. Caja */}
                      <TableCell className="font-bold">
                        {o.numero_caja ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-purple-100 text-[#3C1C6C] font-black text-xs border border-purple-200 shadow-2xs">
                            #{o.numero_caja}
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs border border-slate-200">
                            S/C
                          </span>
                        )}
                      </TableCell>

                      {/* 2. Paciente & Req */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-900 text-sm group-hover:text-[#3C1C6C] transition-colors">
                            {o.paciente_nombre}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                            {o.numero_requerimiento ? (
                              <span className="inline-flex items-center gap-1 font-mono font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                <Hash className="w-2.5 h-2.5" />
                                {o.numero_requerimiento}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Sin Req</span>
                            )}
                            {o.paciente_telefono && (
                              <span className="text-slate-400 text-[10px]">
                                • 📞 {o.paciente_telefono}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* 3. Doctor */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <Stethoscope className="w-3 h-3 text-[#A57CFA]" />
                            {o.doctor_nombre || "—"}
                          </span>
                          {o.doctor_telefono && (
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              📞 {o.doctor_telefono}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* 4. Trabajo Dental */}
                      <TableCell>
                        <div className="flex flex-col max-w-[220px]">
                          <span className="font-semibold text-slate-800 truncate" title={o.trabajo_realizar || ""}>
                            {o.trabajo_realizar || "—"}
                          </span>
                          <div className="flex flex-wrap items-center gap-1 mt-1 text-[10px]">
                            {o.pieza_numero && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                                Pz: #{o.pieza_numero}
                              </span>
                            )}
                            {o.color_pieza && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                                Col: {o.color_pieza}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* 5. Estado */}
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${b.className} shadow-2xs`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {b.shortLabel}
                        </span>
                      </TableCell>

                      {/* 6. Total */}
                      <TableCell className="text-right font-extrabold text-slate-900">
                        Bs {money(total)}
                      </TableCell>

                      {/* 7. Anticipo */}
                      <TableCell className="text-right font-semibold text-slate-600">
                        Bs {money(anticipo)}
                      </TableCell>

                      {/* 8. Saldo */}
                      <TableCell className="text-right">
                        {saldo <= 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Bs 0.00
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                            Bs {money(saldo)}
                          </span>
                        )}
                      </TableCell>

                      {/* 9. Fecha */}
                      <TableCell className="text-slate-600 text-[11px] whitespace-nowrap">
                        {o.fecha_creacion
                          ? new Date(o.fecha_creacion).toLocaleDateString()
                          : "—"}
                      </TableCell>

                      {/* 10. Acciones */}
                      <TableCell>
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Botón Ver Detalle */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/dashboard/admin/orders/${o.id}`)}
                            className="h-8 px-2.5 rounded-lg border-purple-200 text-[#3C1C6C] hover:bg-purple-50 font-bold text-xs gap-1 shadow-2xs"
                            title="Ver Ficha y Auditoría"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver</span>
                          </Button>

                          {/* Selector de estado moderno con pastilla y menú */}
                          <OrderStatusSelect
                            status={o.estado}
                            onChange={(newStatus) => {
                              if (newStatus === "entregado") {
                                openEntregaModal(o);
                                return;
                              }
                              updateOrderStatus(o.id, newStatus);
                            }}
                          />

                          {/* Botón Registrar Entrega Rápido */}
                          {o.estado === "finalizado" && (
                            <Button
                              size="sm"
                              className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-lg text-xs font-bold h-8 px-2.5 shadow-xs"
                              onClick={() => openEntregaModal(o)}
                              title="Generar Nota de Entrega"
                            >
                              📦 Despachar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* VISTA 2: TARJETAS EJECUTIVAS */
        /* ========================================================= */
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
                className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-5 space-y-4"
              >
                {/* Header de la Tarjeta */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {o.numero_caja && (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-purple-100 text-[#3C1C6C] font-black text-xs border border-purple-200">
                          Caja #{o.numero_caja}
                        </span>
                      )}
                      <p className="text-base sm:text-lg font-black text-slate-900 truncate">
                        {o.paciente_nombre}
                      </p>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <Stethoscope className="w-3.5 h-3.5 text-[#A57CFA]" /> {doctorName}
                      </span>

                      {o.numero_requerimiento && (
                        <span className="inline-flex items-center gap-1 font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-bold">
                          <Hash className="w-3 h-3" /> Req: {o.numero_requerimiento}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {o.fecha_creacion
                          ? new Date(o.fecha_creacion).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${b.className} shrink-0`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {b.label}
                  </span>
                </div>

                {/* Trabajo Clínico */}
                <div className="rounded-xl bg-purple-50/40 border border-purple-100 p-3 space-y-2">
                  <p className="text-xs font-bold text-[#3C1C6C] flex items-center gap-1.5">
                    <ClipboardCheck className="w-4 h-4 text-[#A57CFA]" /> Trabajo Solicitado:
                  </p>
                  <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap">
                    {o.trabajo_realizar || "—"}
                  </p>

                  <div className="flex flex-wrap gap-2 text-xs pt-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium">
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                      Pieza: <strong className="text-slate-900">{o.pieza_numero || "—"}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium">
                      <Palette className="w-3.5 h-3.5 text-slate-400" />
                      Color: <strong className="text-slate-900">{o.color_pieza || "—"}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium">
                      <Ruler className="w-3.5 h-3.5 text-slate-400" />
                      Colímetro: <strong className="text-slate-900">{o.colimetro || "—"}</strong>
                    </span>
                  </div>
                </div>

                {/* Kardex Financiero & Contacto */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Contacto
                    </p>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p>Paciente: <strong className="text-slate-800">{o.paciente_telefono || "—"}</strong></p>
                      <p>Doctor: <strong className="text-slate-800">{o.doctor_telefono || "—"}</strong></p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Kardex Financiero
                    </p>
                    <div className="text-xs text-slate-700 space-y-1">
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <strong className="text-slate-900">Bs {money(total)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Anticipo:</span>
                        <span className="text-slate-600 font-semibold">Bs {money(anticipo)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        <span>Saldo:</span>
                        {saldo <= 0 ? (
                          <strong className="text-emerald-700 font-black">Bs 0.00 (Pagado)</strong>
                        ) : (
                          <strong className="text-amber-800 font-black">Bs {money(saldo)}</strong>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Observaciones */}
                {o.observaciones && (
                  <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/30 text-xs">
                    <p className="font-bold text-slate-700 flex items-center gap-1 mb-1">
                      <MessageSquareText className="w-3.5 h-3.5 text-slate-400" /> Observaciones:
                    </p>
                    <p className="text-slate-600 whitespace-pre-wrap">{o.observaciones}</p>
                  </div>
                )}

                {/* Acciones de la Tarjeta */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="text-xs text-slate-500">
                    {o.numero_nota_entrega ? (
                      <span>Nota Entrega: <strong className="text-[#3C1C6C] font-mono">#{o.numero_nota_entrega}</strong></span>
                    ) : (
                      <span>Sin Nota de Entrega</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/dashboard/admin/orders/${o.id}`)}
                      className="rounded-xl border-purple-200 text-[#3C1C6C] hover:bg-purple-50 text-xs font-bold gap-1.5 h-9"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver Detalle
                    </Button>

                    <OrderStatusSelect
                      size="md"
                      status={o.estado}
                      onChange={(newStatus) => {
                        if (newStatus === "entregado") {
                          openEntregaModal(o);
                          return;
                        }
                        updateOrderStatus(o.id, newStatus);
                      }}
                    />

                    {o.estado === "finalizado" && (
                      <Button
                        className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl text-xs font-bold h-9 shadow-sm"
                        onClick={() => openEntregaModal(o)}
                      >
                        Registrar Entrega
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Modal de Registro de Entrega */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl text-center border-purple-200 shadow-2xl">
          <AnimatePresence>
            {!successAnim ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-[#3C1C6C] font-black text-xl">
                    📦 Registrar Nota de Entrega
                  </DialogTitle>
                </DialogHeader>

                <p className="text-xs text-slate-500 mb-3 text-left">
                  Ingresa el número o código de remisión/nota entregada a la clínica o transportista:
                </p>

                <Input
                  placeholder="Ej: NE-00045"
                  value={notaEntrega}
                  onChange={(e) => setNotaEntrega(e.target.value)}
                  className="rounded-xl border-slate-200 text-center font-mono font-black text-lg h-12 focus:border-[#3C1C6C] focus:ring-2 focus:ring-[#A57CFA]/20"
                />

                <DialogFooter className="mt-5 flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button
                    variant="outline"
                    onClick={() => setModalOpen(false)}
                    className="rounded-xl border-slate-200 h-11 w-full sm:w-auto font-bold text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-[#3C1C6C] to-[#6329B7] hover:from-[#2E1553] hover:to-[#4D248B] text-white rounded-xl font-bold h-11 w-full sm:w-auto shadow-md text-xs cursor-pointer"
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
                  className="bg-emerald-100 text-emerald-800 rounded-full p-4 mb-3 border border-emerald-200 shadow-lg"
                >
                  <CheckCircle className="w-10 h-10" />
                </motion.div>
                <p className="text-[#3C1C6C] font-black text-lg">
                  ¡Pedido entregado con éxito!
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Nota registrada y archivada en auditoría.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
