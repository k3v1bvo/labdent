"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  getWorkshopConfig,
  updateWorkshopConfig,
  type WorkshopConfig,
  type AttendanceRecord,
} from "@/lib/attendanceService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  UserCheck,
  MapPin,
  Clock,
  Utensils,
  Settings,
  RefreshCcw,
  CheckCircle2,
  AlertTriangle,
  Search,
  ExternalLink,
  Shield,
  LocateFixed,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminAttendancePage() {
  const [activeTab, setActiveTab] = useState<"LOGS" | "CONFIG">("LOGS");
  const [config, setConfig] = useState<WorkshopConfig | null>(null);
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Filtros
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedFilter, setSelectedFilter] = useState<string>("TODOS");
  const [searchTerm, setSearchTerm] = useState("");

  // Config form state
  const [formConfig, setFormConfig] = useState({
    taller_nombre: "",
    latitud: "",
    longitud: "",
    radio_tolerancia_metros: 100,
    hora_entrada: "08:30:00",
    tolerancia_entrada_minutos: 20,
    hora_salida: "18:30:00",
    duracion_almuerzo_minutos: 60,
    tolerancia_almuerzo_minutos: 10,
  });

  // Modal para foto ampliada
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const conf = await getWorkshopConfig();
      setConfig(conf);
      setFormConfig({
        taller_nombre: conf.taller_nombre,
        latitud: String(conf.latitud),
        longitud: String(conf.longitud),
        radio_tolerancia_metros: conf.radio_tolerancia_metros,
        hora_entrada: conf.hora_entrada,
        tolerancia_entrada_minutos: conf.tolerancia_entrada_minutos,
        hora_salida: conf.hora_salida,
        duracion_almuerzo_minutos: conf.duracion_almuerzo_minutos,
        tolerancia_almuerzo_minutos: conf.tolerancia_almuerzo_minutos,
      });

      // Cargar registros de la fecha seleccionada
      const { data: attendanceData, error } = await supabase
        .from("asistencia_horarios")
        .select("*")
        .eq("fecha", selectedDate)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Tabla asistencia_horarios error:", error.message);
      } else {
        setLogs((attendanceData as any) || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Capturar coordenadas del navegador del Admin
  function captureCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocalización no soportada en este navegador.");
      return;
    }
    toast.info("Obteniendo coordenadas GPS de tu ubicación actual...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormConfig((prev) => ({
          ...prev,
          latitud: String(pos.coords.latitude),
          longitud: String(pos.coords.longitude),
        }));
        toast.success("✅ Coordenadas capturadas con éxito.");
      },
      (err) => {
        toast.error("No se pudo obtener la ubicación GPS: " + err.message);
      },
      { enableHighAccuracy: true }
    );
  }

  // Guardar configuración
  async function handleSaveConfig() {
    setSavingConfig(true);
    const lat = parseFloat(formConfig.latitud);
    const lon = parseFloat(formConfig.longitud);

    if (isNaN(lat) || isNaN(lon)) {
      toast.error("Las coordenadas de latitud y longitud deben ser números válidos.");
      setSavingConfig(false);
      return;
    }

    const res = await updateWorkshopConfig({
      taller_nombre: formConfig.taller_nombre,
      latitud: lat,
      longitud: lon,
      radio_tolerancia_metros: Number(formConfig.radio_tolerancia_metros),
      hora_entrada: formConfig.hora_entrada,
      tolerancia_entrada_minutos: Number(formConfig.tolerancia_entrada_minutos),
      hora_salida: formConfig.hora_salida,
      duracion_almuerzo_minutos: Number(formConfig.duracion_almuerzo_minutos),
      tolerancia_almuerzo_minutos: Number(formConfig.tolerancia_almuerzo_minutos),
    });

    setSavingConfig(false);
    if (res.success) {
      toast.success("✅ Configuración de horarios y geocerca actualizada.");
      await loadData();
    } else {
      toast.error("Error guardando configuración: " + res.error?.message);
    }
  }

  // Filtrado de logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesFilter =
        selectedFilter === "TODOS" || log.estado === selectedFilter;

      const q = searchTerm.toLowerCase().trim();
      if (!q) return matchesFilter;

      const userMatch = (log.usuario_nombre || "").toLowerCase().includes(q);
      const roleMatch = (log.usuario_rol || "").toLowerCase().includes(q);
      const tipoMatch = (log.tipo || "").toLowerCase().includes(q);

      return matchesFilter && (userMatch || roleMatch || tipoMatch);
    });
  }, [logs, selectedFilter, searchTerm]);

  // Contadores
  const totalTardanzas = useMemo(
    () => logs.filter((l) => l.estado === "TARDANZA").length,
    [logs]
  );
  const totalFueraRango = useMemo(
    () => logs.filter((l) => l.estado === "FUERA_DE_RANGO").length,
    [logs]
  );
  const totalExcesoAlmuerzo = useMemo(
    () => logs.filter((l) => l.estado === "ALMUERZO_EXCESO").length,
    [logs]
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#3C1C6C] flex items-center gap-2">
            <UserCheck className="w-8 h-8 text-emerald-600" /> Control de Asistencia del Personal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Supervisión biométrica por selfie, validación de geocerca (100m) y cronómetro de almuerzos.
          </p>
        </div>

        {/* Toggle de Pestañas */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("LOGS")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "LOGS"
                ? "bg-white text-[#3C1C6C] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📋 Registros del Día
          </button>
          <button
            onClick={() => setActiveTab("CONFIG")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "CONFIG"
                ? "bg-white text-[#3C1C6C] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ⚙️ Horarios & Geocerca
          </button>
        </div>
      </div>

      {activeTab === "LOGS" ? (
        <>
          {/* Métricas del día */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 rounded-2xl border border-slate-200 bg-white">
              <span className="text-xs font-bold text-slate-500 uppercase">Marcaciones Registradas</span>
              <div className="text-2xl font-extrabold text-[#3C1C6C] mt-2">{logs.length}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">En la fecha seleccionada</p>
            </Card>

            <Card className={`p-4 rounded-2xl border ${totalTardanzas > 0 ? "border-red-300 bg-red-50/50" : "border-slate-200 bg-white"}`}>
              <span className="text-xs font-bold text-slate-500 uppercase">Tardanzas Entrada</span>
              <div className={`text-2xl font-extrabold mt-2 ${totalTardanzas > 0 ? "text-red-700" : "text-slate-800"}`}>
                {totalTardanzas}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">&gt; 20 min de tolerancia</p>
            </Card>

            <Card className={`p-4 rounded-2xl border ${totalExcesoAlmuerzo > 0 ? "border-orange-300 bg-orange-50/50" : "border-slate-200 bg-white"}`}>
              <span className="text-xs font-bold text-slate-500 uppercase">Excesos de Almuerzo</span>
              <div className={`text-2xl font-extrabold mt-2 ${totalExcesoAlmuerzo > 0 ? "text-orange-700" : "text-slate-800"}`}>
                {totalExcesoAlmuerzo}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">&gt; 70 min (60 + 10 margen)</p>
            </Card>

            <Card className={`p-4 rounded-2xl border ${totalFueraRango > 0 ? "border-amber-300 bg-amber-50/50" : "border-slate-200 bg-white"}`}>
              <span className="text-xs font-bold text-slate-500 uppercase">Fuera de Geocerca</span>
              <div className={`text-2xl font-extrabold mt-2 ${totalFueraRango > 0 ? "text-amber-800" : "text-slate-800"}`}>
                {totalFueraRango}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">&gt; 100m del taller</p>
            </Card>
          </div>

          {/* Filtros de Registros */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Fecha</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-xl border-slate-200 h-9 text-xs"
                />
              </div>

              <div className="relative flex-1 min-w-[200px]">
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Buscar empleado</label>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nombre o rol..."
                  className="rounded-xl border-slate-200 h-9 text-xs"
                />
              </div>
            </div>

            {/* Filtro de estado */}
            <div className="flex items-center gap-1.5 overflow-x-auto self-end md:self-auto">
              {[
                { id: "TODOS", label: "Todos" },
                { id: "A_TIEMPO", label: "✅ A Tiempo" },
                { id: "TARDANZA", label: "⚠️ Tardanzas" },
                { id: "ALMUERZO_EXCESO", label: "⏳ Exceso Almuerzo" },
                { id: "FUERA_DE_RANGO", label: "📍 Fuera de Rango" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedFilter === f.id
                      ? "bg-[#3C1C6C] text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grilla de Registros con Foto Selfie */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLogs.map((log) => (
              <Card
                key={log.id}
                className={`p-4 rounded-2xl border transition-all hover:shadow-md ${
                  log.estado === "TARDANZA"
                    ? "border-red-200 bg-red-50/20"
                    : log.estado === "FUERA_DE_RANGO"
                    ? "border-amber-200 bg-amber-50/20"
                    : log.estado === "ALMUERZO_EXCESO"
                    ? "border-orange-200 bg-orange-50/20"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Foto selfie alojada en ImgBB */}
                  {log.foto_selfie_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={log.foto_selfie_url}
                      alt="Selfie"
                      onClick={() => setSelectedPhoto(log.foto_selfie_url)}
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-200 cursor-pointer hover:scale-105 transition-transform shrink-0"
                      title="Click para ampliar foto selfie"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                      Sin foto
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-slate-900 text-sm truncate">
                        {log.usuario_nombre}
                      </h4>
                      <span className="text-[10px] text-slate-500 capitalize bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                        {log.usuario_rol}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-1.5 text-xs text-[#3C1C6C] font-extrabold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{log.tipo.replace("_", " ")}</span>
                      <span className="font-mono text-slate-500 font-normal">· {log.hora}</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> A {log.distancia_metros}m
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-full font-bold ${
                          log.estado === "A_TIEMPO"
                            ? "bg-green-100 text-green-800"
                            : log.estado === "TARDANZA"
                            ? "bg-red-100 text-red-800"
                            : log.estado === "ALMUERZO_EXCESO"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {log.estado === "TARDANZA"
                          ? `Tardanza (${log.minutos_retraso} min)`
                          : log.estado === "ALMUERZO_EXCESO"
                          ? `Exceso (${log.minutos_retraso} min)`
                          : log.estado.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {filteredLogs.length === 0 && !loading && (
              <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
                No se registraron marcaciones en esta fecha con los filtros seleccionados.
              </div>
            )}
          </div>
        </>
      ) : (
        /* PESTAÑA DE CONFIGURACIÓN */
        <Card className="p-6 rounded-3xl border border-slate-200 bg-white max-w-3xl mx-auto space-y-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-[#3C1C6C] flex items-center gap-2">
              <Settings className="w-5 h-5" /> Configuración de Geocerca GPS & Horarios del Laboratorio
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Define los parámetros obligatorios para que el personal pueda marcar asistencia.
            </p>
          </div>

          <div className="space-y-5 text-sm text-slate-700">
            {/* Nombre del Taller */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Nombre del Taller / Laboratorio</label>
              <Input
                value={formConfig.taller_nombre}
                onChange={(e) => setFormConfig({ ...formConfig, taller_nombre: e.target.value })}
                className="rounded-xl border-slate-200"
              />
            </div>

            {/* Coordenadas GPS del Taller */}
            <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-[#3C1C6C] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#A57CFA]" /> Coordenadas GPS Centrales del Laboratorio
                </label>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={captureCurrentLocation}
                  className="rounded-xl border-purple-200 text-[#3C1C6C] hover:bg-purple-100 gap-1.5 text-xs font-semibold"
                >
                  <LocateFixed className="w-3.5 h-3.5" /> Usar Mi Ubicación Actual
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500">Latitud</label>
                  <Input
                    value={formConfig.latitud}
                    onChange={(e) => setFormConfig({ ...formConfig, latitud: e.target.value })}
                    placeholder="-16.4955000"
                    className="rounded-xl border-slate-200 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">Longitud</label>
                  <Input
                    value={formConfig.longitud}
                    onChange={(e) => setFormConfig({ ...formConfig, longitud: e.target.value })}
                    placeholder="-68.1336000"
                    className="rounded-xl border-slate-200 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Radio de Geocerca (Metros de Tolerancia de Distancia)
                </label>
                <Input
                  type="number"
                  min="10"
                  max="5000"
                  value={formConfig.radio_tolerancia_metros}
                  onChange={(e) =>
                    setFormConfig({ ...formConfig, radio_tolerancia_metros: Number(e.target.value) })
                  }
                  className="rounded-xl border-slate-200 font-bold"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Regla recomendada por el cliente: <strong>100 metros</strong>. Si el técnico está a más de 100m, se alerta.
                </span>
              </div>
            </div>

            {/* Horarios de Entrada y Tolerancia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Hora Oficial de Entrada</label>
                <Input
                  type="time"
                  step="1"
                  value={formConfig.hora_entrada}
                  onChange={(e) => setFormConfig({ ...formConfig, hora_entrada: e.target.value })}
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Tolerancia de Entrada (Minutos)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="120"
                  value={formConfig.tolerancia_entrada_minutos}
                  onChange={(e) =>
                    setFormConfig({ ...formConfig, tolerancia_entrada_minutos: Number(e.target.value) })
                  }
                  className="rounded-xl border-slate-200"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Regla establecida: <strong>20 minutos</strong> de tolerancia.
                </span>
              </div>
            </div>

            {/* Almuerzo Reglamentario y Tolerancia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Duración de Almuerzo (Minutos)
                </label>
                <Input
                  type="number"
                  min="15"
                  max="180"
                  value={formConfig.duracion_almuerzo_minutos}
                  onChange={(e) =>
                    setFormConfig({ ...formConfig, duracion_almuerzo_minutos: Number(e.target.value) })
                  }
                  className="rounded-xl border-slate-200"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Regla: <strong>60 minutos (1 hora)</strong> con cronómetro regresivo en vivo.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Tolerancia de Almuerzo (Minutos de Margen)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="60"
                  value={formConfig.tolerancia_almuerzo_minutos}
                  onChange={(e) =>
                    setFormConfig({ ...formConfig, tolerancia_almuerzo_minutos: Number(e.target.value) })
                  }
                  className="rounded-xl border-slate-200"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Margen: <strong>10 minutos</strong>. Exceder 70 min totales marca retraso.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold px-6 h-11 shadow-md"
            >
              {savingConfig ? "Guardando..." : "Guardar Configuración"}
            </Button>
          </div>
        </Card>
      )}

      {/* Modal para ver foto selfie en grande */}
      <AnimatePresence>
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-lg w-full bg-slate-900 p-2 rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPhoto}
                alt="Selfie ampliada"
                className="w-full h-auto rounded-2xl object-cover max-h-[80vh]"
              />
              <div className="p-3 text-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedPhoto(null)}
                  className="text-white border-white/20 hover:bg-white/10 rounded-xl"
                >
                  Cerrar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
