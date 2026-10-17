"use client";

import { useState, useEffect } from "react";
import {
  Tag,
  Search,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Plus,
  Edit2,
  Check,
  Building2,
  GraduationCap,
  Sparkles,
  Layers,
  ArrowRight,
  Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CATALOGO_UNITEPC, CATALOGO_UNIVALLE, ItemCatalogo } from "@/lib/catalog";

interface TrabajoItem {
  id: string;
  nombre: string;
  categoria: string;
  marca?: string;
  precio_usd: number;
  precio_bs: number;
  activo: boolean;
}

export default function AdminCatalogPage() {
  const [activeTab, setActiveTab] = useState<"clinicas" | "unitepc" | "univalle">("clinicas");
  const [loading, setLoading] = useState(true);
  const [trabajos, setTrabajos] = useState<TrabajoItem[]>([]);
  const [tipoCambio, setTipoCambio] = useState<number>(8.0);
  const [savingTc, setSavingTc] = useState(false);
  const [tcInput, setTcInput] = useState<string>("8.00");

  // Filtros
  const [query, setQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("TODAS");

  // Modal Edición de Precio
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TrabajoItem | null>(null);
  const [editPriceUsd, setEditPriceUsd] = useState("");
  const [editPriceBs, setEditPriceBs] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal Nuevo Trabajo
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newCategoria, setNewCategoria] = useState("Prótesis Fija");
  const [newMarca, setNewMarca] = useState("");
  const [newPriceUsd, setNewPriceUsd] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  // Cargar catálogo y tipo de cambio
  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/catalog");
      const data = await res.json();
      if (data.success) {
        setTrabajos(data.trabajos || []);
        const tc = Number(data.tipoCambio) || 8.0;
        setTipoCambio(tc);
        setTcInput(tc.toFixed(2));
      } else {
        toast.error(data.error || "Error cargando catálogo");
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Error de conexión al cargar catálogo");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Guardar nuevo tipo de cambio
  async function handleSaveTipoCambio() {
    const val = parseFloat(tcInput);
    if (isNaN(val) || val <= 0) {
      toast.error("Ingresa un tipo de cambio válido mayor a 0");
      return;
    }

    setSavingTc(true);
    try {
      const res = await fetch("/api/admin/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoCambio: val }),
      });
      const data = await res.json();
      if (data.success) {
        setTipoCambio(val);
        toast.success(`✅ Tipo de cambio actualizado a ${val.toFixed(2)} Bs/USD`);
        loadData();
      } else {
        toast.error(data.error || "No se pudo actualizar el tipo de cambio");
      }
    } catch (e: any) {
      toast.error(e.message || "Error al actualizar tipo de cambio");
    } finally {
      setSavingTc(false);
    }
  }

  // Abrir modal de edición
  function handleOpenEdit(item: TrabajoItem) {
    setEditingItem(item);
    setEditPriceUsd(item.precio_usd.toString());
    setEditPriceBs(item.precio_bs.toString());
    setEditModalOpen(true);
  }

  // Guardar edición de precio
  async function handleSaveEdit() {
    if (!editingItem) return;
    const pUsd = parseFloat(editPriceUsd);
    if (isNaN(pUsd) || pUsd < 0) {
      toast.error("Ingresa un precio válido");
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch("/api/admin/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem.id,
          precio_usd: pUsd,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Precio actualizado para "${editingItem.nombre}"`);
        setEditModalOpen(false);
        loadData();
      } else {
        toast.error(data.error || "Error al actualizar precio");
      }
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    } finally {
      setSavingEdit(false);
    }
  }

  // Guardar nuevo trabajo
  async function handleSaveNew() {
    if (!newNombre.trim()) {
      toast.error("El nombre del trabajo es obligatorio");
      return;
    }
    const pUsd = parseFloat(newPriceUsd);
    if (isNaN(pUsd) || pUsd < 0) {
      toast.error("Ingresa un precio en USD válido");
      return;
    }

    setSavingNew(true);
    try {
      const res = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: newNombre,
          categoria: newCategoria,
          marca: newMarca,
          precio_usd: pUsd,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`✅ Trabajo "${newNombre}" añadido al catálogo`);
        setNewModalOpen(false);
        setNewNombre("");
        setNewMarca("");
        setNewPriceUsd("");
        loadData();
      } else {
        toast.error(data.error || "Error al crear trabajo");
      }
    } catch (e: any) {
      toast.error(e.message || "Error al crear trabajo");
    } finally {
      setSavingNew(false);
    }
  }

  // Alternar activo / inactivo
  async function handleToggleActivo(item: TrabajoItem) {
    try {
      const res = await fetch("/api/admin/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          activo: !item.activo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(item.activo ? "Trabajo pausado" : "Trabajo activado");
        setTrabajos((prev) =>
          prev.map((t) => (t.id === item.id ? { ...t, activo: !item.activo } : t))
        );
      }
    } catch (e) {
      toast.error("Error al cambiar estado");
    }
  }

  // Categorías únicas
  const categorias = ["TODAS", ...Array.from(new Set(trabajos.map((t) => t.categoria).filter(Boolean)))];

  // Filtrado de trabajos para clínicas
  const trabajosFiltrados = trabajos.filter((t) => {
    const matchQ = t.nombre.toLowerCase().includes(query.toLowerCase()) ||
      (t.categoria && t.categoria.toLowerCase().includes(query.toLowerCase())) ||
      (t.marca && t.marca.toLowerCase().includes(query.toLowerCase()));
    const matchCat = selectedCat === "TODAS" || t.categoria === selectedCat;
    return matchQ && matchCat;
  });

  // Filtrado de UNITEPC
  const unitepcFiltrados = CATALOGO_UNITEPC.filter((t) =>
    t.nombre.toLowerCase().includes(query.toLowerCase()) ||
    t.categoria.toLowerCase().includes(query.toLowerCase())
  );

  // Filtrado de UNIVALLE
  const univalleFiltrados = CATALOGO_UNIVALLE.filter((t) =>
    t.nombre.toLowerCase().includes(query.toLowerCase()) ||
    t.categoria.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ========================================================= */}
      {/* 1. HEADER & CONTROL DE TIPO DE CAMBIO */}
      {/* ========================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#1C0F38] via-[#2A1654] to-[#120824] text-white shadow-xl border border-purple-800/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-purple-950 flex items-center justify-center font-black shadow-md">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Catálogo de Trabajos, Precios & Aranceles
              </h1>
              <p className="text-xs sm:text-sm text-purple-200/80">
                Guisela Laboratorio Dental · Sistema oficial de doble moneda (Bs / USD)
              </p>
            </div>
          </div>
        </div>

        {/* Widget Tipo de Cambio Oficial */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white/10 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl border border-white/15">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-black tracking-wider text-purple-200">
                Tipo de Cambio Oficial
              </p>
              <p className="text-xs font-bold text-white">
                1 USD = <span className="text-amber-300 font-black">{tipoCambio.toFixed(2)} Bs</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-24">
              <Input
                type="number"
                step="0.05"
                min="1"
                value={tcInput}
                onChange={(e) => setTcInput(e.target.value)}
                className="h-9 text-xs font-black bg-white/95 text-slate-900 border-none rounded-xl pr-6 text-center"
              />
              <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-500">
                Bs
              </span>
            </div>
            <Button
              onClick={handleSaveTipoCambio}
              disabled={savingTc}
              size="sm"
              className="h-9 px-3 bg-amber-400 hover:bg-amber-300 text-purple-950 font-black text-xs rounded-xl shadow-xs cursor-pointer"
            >
              {savingTc ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Guardar TC"}
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. TABS: CLÍNICAS / UNITEPC / UNIVALLE */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab("clinicas")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "clinicas"
                ? "bg-[#3C1C6C] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Clínicas Privadas & Doctores ({trabajos.length})
          </button>

          <button
            onClick={() => setActiveTab("unitepc")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "unitepc"
                ? "bg-[#3C1C6C] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            Convenio UNITEPC ({CATALOGO_UNITEPC.length})
          </button>

          <button
            onClick={() => setActiveTab("univalle")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "univalle"
                ? "bg-[#3C1C6C] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <GraduationCap className="w-4 h-4 text-purple-400" />
            Convenio UNIVALLE ({CATALOGO_UNIVALLE.length})
          </button>
        </div>

        {activeTab === "clinicas" && (
          <Button
            onClick={() => setNewModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs h-9 px-3.5 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nuevo Trabajo
          </Button>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. BARRA DE BÚSQUEDA Y FILTRO */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, prótesis, material..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 text-xs h-9 bg-slate-50 border-slate-200 rounded-xl"
          />
        </div>

        {activeTab === "clinicas" && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-hidden"
            >
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 4. CONTENIDO: TAB 1 CLÍNICAS PRIVADAS */}
      {/* ========================================================= */}
      {activeTab === "clinicas" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-purple-50/50 border-b border-purple-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-950">
                Aranceles Oficiales en Dólares ($ USD) convertidos a Bolivianos (Bs.)
              </h3>
              <p className="text-[11px] text-purple-800">
                Aplica a doctores particulares y consultorios. La tasa de cambio actual es de {tipoCambio.toFixed(2)} Bs por dólar.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-white border border-purple-200 rounded-lg text-purple-950">
              {trabajosFiltrados.length} trabajos listados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Trabajo Dental</th>
                  <th className="py-3 px-3">Categoría</th>
                  <th className="py-3 px-3">Marca / Material</th>
                  <th className="py-3 px-3 text-right">Precio ($ USD)</th>
                  <th className="py-3 px-4 text-right">Equivalente (Bs.)</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trabajosFiltrados.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-purple-50/30 transition-colors ${
                      !item.activo ? "opacity-50 bg-slate-50/50" : ""
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {item.nombre}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-semibold text-[10px]">
                        {item.categoria || "Otros"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {item.marca || "—"}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">
                      $ {Number(item.precio_usd).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-[#3C1C6C] bg-purple-50/30">
                      Bs. {(Number(item.precio_usd) * tipoCambio).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleActivo(item)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                          item.activo
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                        }`}
                      >
                        {item.activo ? "Activo" : "Pausado"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        onClick={() => handleOpenEdit(item)}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. CONTENIDO: TAB 2 CONVENIO UNITEPC */}
      {/* ========================================================= */}
      {activeTab === "unitepc" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4">
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              Aranceles Institucionales Convenio UNITEPC (Fijados en Bolivianos)
            </h3>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              Tarifas preferenciales acordadas con la Universidad UNITEPC según el volante oficial. Los precios se aplican directamente en Bolivianos.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Trabajo Dental UNITEPC</th>
                  <th className="py-3 px-3">Especialidad</th>
                  <th className="py-3 px-3">Material</th>
                  <th className="py-3 px-4 text-right">Arancel (Bs.)</th>
                  <th className="py-3 px-4 text-right">Equivalente ($ USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unitepcFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {item.nombre}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                        {item.categoria}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {item.marca || "Oficial"}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700 bg-emerald-50/30 text-sm">
                      Bs. {item.precioBs.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-500">
                      $ {(item.precioBs / tipoCambio).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. CONTENIDO: TAB 3 CONVENIO UNIVALLE */}
      {/* ========================================================= */}
      {activeTab === "univalle" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4">
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50 to-white border border-purple-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-600" />
              Aranceles Institucionales Convenio UNIVALLE (Fijados en Bolivianos)
            </h3>
            <p className="text-[11px] text-purple-800 mt-0.5">
              Planilla oficial de prótesis dental para la Universidad UNIVALLE (22 procedimientos). Aranceles fijos en Bs.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Procedimiento Dental UNIVALLE</th>
                  <th className="py-3 px-3">Especialidad</th>
                  <th className="py-3 px-3">Material</th>
                  <th className="py-3 px-4 text-right">Arancel (Bs.)</th>
                  <th className="py-3 px-4 text-right">Equivalente ($ USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {univalleFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {item.nombre}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-semibold text-[10px]">
                        {item.categoria}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {item.marca || "Oficial"}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-purple-900 bg-purple-50/30 text-sm">
                      Bs. {item.precioBs.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-500">
                      $ {(item.precioBs / tipoCambio).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. MODAL: EDITAR PRECIO */}
      {/* ========================================================= */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-purple-700" />
              Editar Precio de Trabajo
            </DialogTitle>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
                <p className="text-xs font-bold text-purple-950">{editingItem.nombre}</p>
                <p className="text-[11px] text-purple-800">
                  Categoría: {editingItem.categoria} · Marca: {editingItem.marca || "N/A"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Precio en Dólares ($ USD):</label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editPriceUsd}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditPriceUsd(val);
                        const n = parseFloat(val);
                        if (!isNaN(n)) {
                          setEditPriceBs((n * tipoCambio).toFixed(2));
                        }
                      }}
                      className="font-black text-sm h-10 pr-8 rounded-xl"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">$</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Equivalente en Bolivianos (Bs):</label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={editPriceBs}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditPriceBs(val);
                        const n = parseFloat(val);
                        if (!isNaN(n) && tipoCambio > 0) {
                          setEditPriceUsd((n / tipoCambio).toFixed(2));
                        }
                      }}
                      className="font-black text-sm h-10 pr-8 rounded-xl bg-purple-50/50 text-[#3C1C6C]"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">Bs</span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                * El precio en Bolivianos se calcula automáticamente con la tasa oficial ({tipoCambio.toFixed(2)} Bs/USD).
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              className="rounded-xl h-9 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="bg-[#3C1C6C] hover:bg-[#2e1553] text-white font-bold rounded-xl h-9 text-xs"
            >
              {savingEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* 8. MODAL: REGISTRAR NUEVO TRABAJO */}
      {/* ========================================================= */}
      <Dialog open={newModalOpen} onOpenChange={setNewModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              Nuevo Trabajo en Catálogo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Nombre del Trabajo Dental:</label>
              <Input
                placeholder="Ej. CORONA ZIRCONIO MONOLÍTICA"
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                className="h-10 text-xs rounded-xl font-bold uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Categoría:</label>
                <select
                  value={newCategoria}
                  onChange={(e) => setNewCategoria(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-hidden"
                >
                  <option value="Prótesis Fija">Prótesis Fija</option>
                  <option value="Prótesis Removible">Prótesis Removible</option>
                  <option value="Materiales">Materiales</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Marca / Material:</label>
                <Input
                  placeholder="Ej. ZIRCONIO / EMAX"
                  value={newMarca}
                  onChange={(e) => setNewMarca(e.target.value)}
                  className="h-10 text-xs rounded-xl font-medium uppercase"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Precio Unitario ($ USD):</label>
              <div className="relative">
                <Input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="Ej. 65.00"
                  value={newPriceUsd}
                  onChange={(e) => setNewPriceUsd(e.target.value)}
                  className="font-black text-sm h-10 pr-8 rounded-xl"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">$</span>
              </div>
              {parseFloat(newPriceUsd) > 0 && (
                <p className="text-[11px] text-purple-700 font-bold mt-1">
                  Equivalente en Bolivianos: Bs. {(parseFloat(newPriceUsd) * tipoCambio).toFixed(2)}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewModalOpen(false)}
              className="rounded-xl h-9 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveNew}
              disabled={savingNew}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-9 text-xs"
            >
              {savingNew ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
              Crear Trabajo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
