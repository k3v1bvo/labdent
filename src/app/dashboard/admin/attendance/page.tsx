"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  getWorkshopConfig,
  updateWorkshopConfig,
  updateEmployeeSchedule,
  type WorkshopConfig,
  type AttendanceRecord,
  type EmployeeSchedule,
} from "@/lib/attendanceService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toBoliviaYMD } from "@/lib/dateUtils";
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
  Users,
  Download,
  Edit3,
  Calendar,
  Sparkles,
  Timer,
  ChevronRight,
  Info,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TeamMember {
  id: string;
  nombre: string;
  rol: string;
  telefono?: string;
  email?: string;
}

export default function AdminAttendancePage() {
  const [activeTab, setActiveTab] = useState<"LOGS" | "PERSONAL" | "CONFIG">("LOGS");
  const [config, setConfig] = useState<WorkshopConfig | null>(null);
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Filtros
  const [selectedDate, setSelectedDate] = useState<string>(toBoliviaYMD());
  const [selectedFilter, setSelectedFilter] = useState<string>("TODOS");
  const [searchTerm, setSearchTerm] = useState("");

  // Config general form state
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

  // Modal para editar horario de empleado
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [memberScheduleForm, setMemberScheduleForm] = useState<EmployeeSchedule>({
    hora_entrada: "08:30:00",
    hora_salida: "18:30:00",
    tolerancia_entrada_minutos: 20,
    turno_nombre: "Turno Regular",
    observaciones: "",
  });
  const [savingMemberSchedule, setSavingMemberSchedule] = useState(false);

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
      const { data: attendanceData, error: attErr } = await supabase
        .from("asistencia_horarios")
        .select("*")
        .eq("fecha", selectedDate)
        .order("created_at", { ascending: false });

      if (attErr) {
        console.warn("Tabla asistencia_horarios error:", attErr.message);
      } else {
        setLogs((attendanceData as any) || []);
      }

      // Cargar personal (técnicos, secretarias, admins)
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, nombre, rol, telefono")
        .order("nombre", { ascending: true });

      if (profilesData) {
        setTeamMembers(profilesData as TeamMember[]);
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

  // Guardar configuración general
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

  // Abrir modal de horario para un empleado específico
  function openMemberScheduleModal(member: TeamMember) {
    setEditingMember(member);
    const custom = config?.horarios_personal?.[member.id];
    if (custom) {
      setMemberScheduleForm({
        hora_entrada: custom.hora_entrada || config?.hora_entrada || "08:30:00",
        hora_salida: custom.hora_salida || config?.hora_salida || "18:30:00",
        tolerancia_entrada_minutos:
          custom.tolerancia_entrada_minutos ?? config?.tolerancia_entrada_minutos ?? 20,
        turno_nombre: custom.turno_nombre || "Turno Personalizado",
        observaciones: custom.observaciones || "",
      });
    } else {
      setMemberScheduleForm({
        hora_entrada: config?.hora_entrada || "08:30:00",
        hora_salida: config?.hora_salida || "18:30:00",
        tolerancia_entrada_minutos: config?.tolerancia_entrada_minutos ?? 20,
        turno_nombre: "Turno Regular (General)",
        observaciones: "",
      });
    }
  }

  // Guardar horario individual
  async function handleSaveMemberSchedule() {
    if (!editingMember) return;
    setSavingMemberSchedule(true);

    const res = await updateEmployeeSchedule(editingMember.id, memberScheduleForm);
    setSavingMemberSchedule(false);

    if (res.success) {
      toast.success(`✅ Horario establecido para ${editingMember.nombre}`);
      setEditingMember(null);
      await loadData();
    } else {
      toast.error("Error asignando horario individual.");
    }
  }

  // Restablecer horario al general del taller
  async function handleResetToDefaultSchedule() {
    if (!editingMember) return;
    setSavingMemberSchedule(true);
    const res = await updateEmployeeSchedule(editingMember.id, null);
    setSavingMemberSchedule(false);

    if (res.success) {
      toast.success(`✅ Horario de ${editingMember.nombre} restablecido al general del taller.`);
      setEditingMember(null);
      await loadData();
    } else {
      toast.error("Error restableciendo horario.");
    }
  }

  // Exportar registros a CSV
  function exportLogsToCSV() {
    if (filteredLogs.length === 0) {
      toast.info("No hay registros para exportar en la fecha seleccionada.");
      return;
    }

    const headers = [
      "Fecha",
      "Hora",
      "Empleado",
      "Rol",
      "Tipo Marcacion",
      "Estado",
      "Minutos Retraso",
      "Distancia Metros",
      "Observaciones / Horas Extras",
    ];

    const rows = filteredLogs.map((l) => [
      l.fecha,
      l.hora,
      `"${l.usuario_nombre || ""}"`,
      l.usuario_rol || "",
      l.tipo,
      l.estado,
      l.minutos_retraso || 0,
      l.distancia_metros || 0,
      `"${(l.observaciones || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `asistencia_labdent_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("✅ Archivo CSV descargado con éxito.");
  }

  // Filtrado de logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      let matchesFilter = true;
      if (selectedFilter === "TODOS") {
        matchesFilter = true;
      } else if (selectedFilter === "HORAS_EXTRAS") {
        matchesFilter = (log.observaciones || "").toLowerCase().includes("horas extras");
      } else {
        matchesFilter = log.estado === selectedFilter;
      }

      const q = searchTerm.toLowerCase().trim();
      if (!q) return matchesFilter;

      const userMatch = (log.usuario_nombre || "").toLowerCase().includes(q);
      const roleMatch = (log.usuario_rol || "").toLowerCase().includes(q);
      const tipoMatch = (log.tipo || "").toLowerCase().includes(q);
      const obsMatch = (log.observaciones || "").toLowerCase().includes(q);

      return matchesFilter && (userMatch || roleMatch || tipoMatch || obsMatch);
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
  const totalHorasExtras = useMemo(
    () =>
      logs.filter((l) => (l.observaciones || "").toLowerCase().includes("horas extras"))
        .length,
    [logs]
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#3C1C6C] flex items-center gap-2">
            <UserCheck className="w-8 h-8 text-emerald-600" /> Control de Asistencia & Horarios
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Supervisión biométrica, horarios asignados por personal, cálculo de horas extras y geocerca GPS.
          </p>
        </div>

        {/* Toggle de Pestañas */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl self-start sm:self-auto shadow-inner">
          <button
            onClick={() => setActiveTab("LOGS")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "LOGS"
                ? "bg-white text-[#3C1C6C] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📋 Registros & Marcaciones
          </button>
          <button
            onClick={() => setActiveTab("PERSONAL")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "PERSONAL"
                ? "bg-white text-[#3C1C6C] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-600" /> Horarios por Personal
          </button>
          <button
            onClick={() => setActiveTab("CONFIG")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "CONFIG"
                ? "bg-white text-[#3C1C6C] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ⚙️ Geocerca & Reglas
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PESTAÑA 1: REGISTROS Y MARCACIONES */}
      {/* ======================================================== */}
      {activeTab === "LOGS" && (
        <>
          {/* Métricas del día */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Marcaciones Registradas</span>
              <div className="text-2xl font-extrabold text-[#3C1C6C] mt-2">{logs.length}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">En la fecha {selectedDate}</p>
            </Card>

            <Card className={`p-4 rounded-2xl border shadow-sm ${totalTardanzas > 0 ? "border-red-300 bg-red-50/50" : "border-slate-200 bg-white"}`}>
              <span className="text-xs font-bold text-slate-500 uppercase">Tardanzas Entrada</span>
              <div className={`text-2xl font-extrabold mt-2 ${totalTardanzas > 0 ? "text-red-700" : "text-slate-800"}`}>
                {totalTardanzas}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Excedieron tolerancia asignada</p>
            </Card>

            <Card className={`p-4 rounded-2xl border shadow-sm ${totalHorasExtras > 0 ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 bg-white"}`}>
              <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" /> Horas Extras Registradas
              </span>
              <div className={`text-2xl font-extrabold mt-2 ${totalHorasExtras > 0 ? "text-emerald-700" : "text-slate-800"}`}>
                {totalHorasExtras}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Personal con salida extendida</p>
            </Card>

            <Card className={`p-4 rounded-2xl border shadow-sm ${totalFueraRango > 0 ? "border-amber-300 bg-amber-50/50" : "border-slate-200 bg-white"}`}>
              <span className="text-xs font-bold text-slate-500 uppercase">Fuera de Geocerca</span>
              <div className={`text-2xl font-extrabold mt-2 ${totalFueraRango > 0 ? "text-amber-800" : "text-slate-800"}`}>
                {totalFueraRango}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">&gt; 100m del taller</p>
            </Card>
          </div>

          {/* Filtros de Registros & Acciones */}
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
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Buscar colaborador</label>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nombre, rol o motivo..."
                  className="rounded-xl border-slate-200 h-9 text-xs"
                />
              </div>
            </div>

            {/* Filtro de estado & Exportar */}
            <div className="flex items-center gap-2 overflow-x-auto self-end md:self-auto">
              {[
                { id: "TODOS", label: "Todos" },
                { id: "A_TIEMPO", label: "✅ A Tiempo" },
                { id: "TARDANZA", label: "⚠️ Tardanzas" },
                { id: "HORAS_EXTRAS", label: "⏰ Horas Extras" },
                { id: "ALMUERZO_EXCESO", label: "⏳ Exceso Almuerzo" },
                { id: "FUERA_DE_RANGO", label: "📍 Fuera de Rango" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedFilter === f.id
                      ? "bg-[#3C1C6C] text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={exportLogsToCSV}
                className="rounded-xl border-slate-200 h-8 gap-1.5 text-xs text-slate-700 hover:bg-slate-100"
              >
                <Download className="w-3.5 h-3.5 text-purple-600" /> Exportar CSV
              </Button>
            </div>
          </div>

          {/* Grilla de Registros con Foto Selfie */}
          {filteredLogs.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">
                No hay marcaciones registradas para los filtros seleccionados.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Selecciona otra fecha o cambia el filtro de estado.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLogs.map((log) => {
                const hasOvertime = (log.observaciones || "").toLowerCase().includes("horas extras");
                return (
                  <Card
                    key={log.id}
                    className={`p-4 rounded-2xl border transition-all hover:shadow-md ${
                      log.estado === "TARDANZA"
                        ? "border-red-200 bg-red-50/20"
                        : log.estado === "FUERA_DE_RANGO"
                        ? "border-amber-200 bg-amber-50/20"
                        : hasOvertime
                        ? "border-emerald-200 bg-emerald-50/20"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Foto Selfie miniatura */}
                      <div className="relative shrink-0">
                        {log.foto_selfie_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={log.foto_selfie_url}
                            alt="Foto selfie de asistencia"
                            onClick={() => setSelectedPhoto(log.foto_selfie_url)}
                            className="w-14 h-14 rounded-2xl object-cover border border-purple-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 font-bold text-sm">
                            {(log.usuario_nombre || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            log.estado === "A_TIEMPO"
                              ? "bg-emerald-500"
                              : log.estado === "TARDANZA"
                              ? "bg-red-500"
                              : "bg-amber-500"
                          }`}
                        />
                      </div>

                      {/* Info Colaborador */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-slate-800 text-sm truncate">
                            {log.usuario_nombre}
                          </h4>
                          <span className="text-[11px] font-bold text-[#6C3483] bg-purple-100 px-2 py-0.5 rounded-full capitalize">
                            {log.usuario_rol}
                          </span>
                        </div>

                        {/* Tipo de marcación y hora */}
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-purple-500" />
                            {log.tipo.replace(/_/g, " ")}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {log.hora}
                          </span>
                        </div>

                        {/* Badges de Estado */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {log.estado === "A_TIEMPO" && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              ✅ A Tiempo
                            </span>
                          )}
                          {log.estado === "TARDANZA" && (
                            <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                              ⚠️ Retraso: {log.minutos_retraso} min
                            </span>
                          )}
                          {log.estado === "ALMUERZO_EXCESO" && (
                            <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                              ⏳ Exceso almuerzo: +{log.minutos_retraso} min
                            </span>
                          )}
                          {log.estado === "FUERA_DE_RANGO" && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> Fuera ({log.distancia_metros}m)
                            </span>
                          )}
                          {hasOvertime && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              ⏰ Horas Extras Cumplidas
                            </span>
                          )}
                        </div>

                        {/* Observaciones / Horas extras */}
                        {log.observaciones && (
                          <p className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            {log.observaciones}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 2: HORARIOS ASIGNADOS POR PERSONAL & HORAS EXTRAS */}
      {/* ======================================================== */}
      {activeTab === "PERSONAL" && (
        <div className="space-y-6">
          <Card className="p-5 rounded-2xl border border-slate-200 bg-gradient-to-r from-purple-50 via-white to-purple-50/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-purple-600 text-white rounded-2xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#3C1C6C]">
                    Gestión de Horarios y Turnos por Colaborador
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Cada técnico o personal tiene su horario asignado. Si se quedan más tiempo, el sistema calcula automáticamente sus horas extras.
                  </p>
                </div>
              </div>

              <div className="text-xs bg-white px-3 py-2 rounded-xl border border-purple-200 text-purple-900 shadow-sm shrink-0">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Horario General Taller</span>
                <strong>{config?.hora_entrada || "08:30"} - {config?.hora_salida || "18:30"}</strong> (Tol. {config?.tolerancia_entrada_minutos || 20}m)
              </div>
            </div>
          </Card>

          {/* Lista de personal con horarios */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers
              .filter((m) => m.rol !== "doctor")
              .map((member) => {
                const customSchedule = config?.horarios_personal?.[member.id];
                const horaEntrada = customSchedule?.hora_entrada || config?.hora_entrada || "08:30:00";
                const horaSalida = customSchedule?.hora_salida || config?.hora_salida || "18:30:00";
                const tolMinutos = customSchedule?.tolerancia_entrada_minutos ?? config?.tolerancia_entrada_minutos ?? 20;
                const turnoNombre = customSchedule?.turno_nombre || "Horario General";

                // Marcaciones de hoy para este usuario
                const userLogsToday = logs.filter((l) => l.usuario_id === member.id);
                const entradaToday = userLogsToday.find((l) => l.tipo === "ENTRADA");
                const salidaToday = userLogsToday.find((l) => l.tipo === "SALIDA_JORNADA");

                // Horas extras de hoy
                const overtimeRecord = userLogsToday.find((l) =>
                  (l.observaciones || "").toLowerCase().includes("horas extras")
                );

                return (
                  <Card
                    key={member.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-purple-300 transition-all shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Info */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#3C1C6C] to-[#6329B7] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                            {member.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 text-sm truncate">
                              {member.nombre}
                            </h4>
                            <span className="text-[11px] font-semibold text-purple-700 capitalize">
                              {member.rol}
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openMemberScheduleModal(member)}
                          className="h-8 px-2.5 rounded-xl text-purple-700 hover:bg-purple-100 text-xs gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Editar
                        </Button>
                      </div>

                      {/* Horario Asignado */}
                      <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-500 font-medium">Turno:</span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                              customSchedule
                                ? "bg-purple-100 text-[#3C1C6C]"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {turnoNombre}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Horario Asignado:</span>
                          <span className="font-bold text-slate-800 font-mono">
                            {horaEntrada.slice(0, 5)} - {horaSalida.slice(0, 5)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                          <span>Tolerancia de entrada:</span>
                          <span>{tolMinutos} minutos</span>
                        </div>
                      </div>

                      {/* Estado de Hoy */}
                      <div className="mt-3 text-xs space-y-1">
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">
                          Actividad de Hoy ({selectedDate}):
                        </span>

                        {entradaToday ? (
                          <div className="flex items-center justify-between text-slate-700">
                            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Entrada marcada:
                            </span>
                            <span className="font-mono text-[11px]">{entradaToday.hora}</span>
                          </div>
                        ) : (
                          <div className="text-slate-400 italic text-[11px]">
                            Sin marcación de entrada registrada hoy.
                          </div>
                        )}

                        {salidaToday && (
                          <div className="flex items-center justify-between text-slate-700">
                            <span className="flex items-center gap-1 text-blue-700 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Salida marcada:
                            </span>
                            <span className="font-mono text-[11px]">{salidaToday.hora}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Badge de Horas Extras */}
                    {overtimeRecord && (
                      <div className="mt-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 text-xs">
                        <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold truncate">{overtimeRecord.observaciones}</span>
                      </div>
                    )}
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 3: CONFIGURACIÓN GENERAL Y GEOCERCA GPS */}
      {/* ======================================================== */}
      {activeTab === "CONFIG" && (
        <Card className="p-6 rounded-2xl border border-slate-200 bg-white space-y-6 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-[#3C1C6C] flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-600" /> Configuración de Geocerca GPS & Parámetros
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Establece las coordenadas del laboratorio dental y las tolerancias por defecto.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Nombre del Laboratorio / Taller
              </label>
              <Input
                value={formConfig.taller_nombre}
                onChange={(e) => setFormConfig({ ...formConfig, taller_nombre: e.target.value })}
                className="rounded-xl border-slate-200"
              />
            </div>

            {/* Coordenadas GPS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Latitud GPS del Laboratorio
                </label>
                <Input
                  value={formConfig.latitud}
                  onChange={(e) => setFormConfig({ ...formConfig, latitud: e.target.value })}
                  placeholder="-16.495500"
                  className="rounded-xl border-slate-200 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Longitud GPS del Laboratorio
                </label>
                <Input
                  value={formConfig.longitud}
                  onChange={(e) => setFormConfig({ ...formConfig, longitud: e.target.value })}
                  placeholder="-68.133600"
                  className="rounded-xl border-slate-200 font-mono text-xs"
                />
              </div>
            </div>

            {/* Botón de auto-captura GPS */}
            <div className="flex items-center justify-between bg-purple-50 p-3 rounded-xl border border-purple-100">
              <div className="text-xs text-purple-900">
                <strong>¿Estás actualmente en el laboratorio?</strong> Puedes capturar las coordenadas exactas de tu dispositivo.
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={captureCurrentLocation}
                className="rounded-xl border-purple-200 text-purple-700 hover:bg-purple-100 gap-1.5 h-9 shrink-0"
              >
                <LocateFixed className="w-4 h-4" /> Capturar Mi Ubicación
              </Button>
            </div>

            {/* Radio de Geocerca */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Radio de Tolerancia de Geocerca (Metros)
              </label>
              <Input
                type="number"
                min="10"
                max="1000"
                value={formConfig.radio_tolerancia_metros}
                onChange={(e) =>
                  setFormConfig({ ...formConfig, radio_tolerancia_metros: Number(e.target.value) })
                }
                className="rounded-xl border-slate-200"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Valor reglamentario: <strong>100 metros</strong> alrededor de las instalaciones físicas.
              </span>
            </div>

            {/* Horarios por defecto del taller */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Hora de Entrada General
                </label>
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
                  Hora de Salida General
                </label>
                <Input
                  type="time"
                  step="1"
                  value={formConfig.hora_salida}
                  onChange={(e) => setFormConfig({ ...formConfig, hora_salida: e.target.value })}
                  className="rounded-xl border-slate-200"
                />
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
              className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold px-6 h-11 shadow-md cursor-pointer"
            >
              {savingConfig ? "Guardando..." : "Guardar Configuración General"}
            </Button>
          </div>
        </Card>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDITAR HORARIO DE EMPLEADO ESPECÍFICO */}
      {/* ======================================================== */}
      <AnimatePresence>
        {editingMember && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setEditingMember(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-md w-full bg-white p-6 rounded-3xl shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-base text-[#3C1C6C]">
                    Asignar Horario Individual
                  </h3>
                  <p className="text-xs text-slate-500">
                    Colaborador: <strong>{editingMember.nombre}</strong> ({editingMember.rol})
                  </p>
                </div>
                <button
                  onClick={() => setEditingMember(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Nombre o Etiqueta del Turno
                  </label>
                  <Input
                    value={memberScheduleForm.turno_nombre}
                    onChange={(e) =>
                      setMemberScheduleForm({ ...memberScheduleForm, turno_nombre: e.target.value })
                    }
                    placeholder="Ej. Turno Mañana, Turno Tarde..."
                    className="rounded-xl border-slate-200 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      Hora de Entrada
                    </label>
                    <Input
                      type="time"
                      step="1"
                      value={memberScheduleForm.hora_entrada}
                      onChange={(e) =>
                        setMemberScheduleForm({
                          ...memberScheduleForm,
                          hora_entrada: e.target.value,
                        })
                      }
                      className="rounded-xl border-slate-200 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      Hora de Salida
                    </label>
                    <Input
                      type="time"
                      step="1"
                      value={memberScheduleForm.hora_salida}
                      onChange={(e) =>
                        setMemberScheduleForm({
                          ...memberScheduleForm,
                          hora_salida: e.target.value,
                        })
                      }
                      className="rounded-xl border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Tolerancia de Entrada (Minutos)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    value={memberScheduleForm.tolerancia_entrada_minutos}
                    onChange={(e) =>
                      setMemberScheduleForm({
                        ...memberScheduleForm,
                        tolerancia_entrada_minutos: Number(e.target.value),
                      })
                    }
                    className="rounded-xl border-slate-200 text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Si marca después de este margen, se computará como tardanza. Si se retira después de su hora de salida, se sumarán horas extras.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetToDefaultSchedule}
                  disabled={savingMemberSchedule}
                  className="text-xs text-rose-600 hover:bg-rose-50 rounded-xl"
                >
                  Restablecer General
                </Button>

                <Button
                  size="sm"
                  onClick={handleSaveMemberSchedule}
                  disabled={savingMemberSchedule}
                  className="bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold px-4 h-9 shadow-md"
                >
                  {savingMemberSchedule ? "Guardando..." : "Guardar Horario"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL: VER FOTO SELFIE EN GRANDE */}
      {/* ======================================================== */}
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
