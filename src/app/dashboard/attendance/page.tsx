"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getUserProfile } from "@/lib/getUserProfile";
import {
  getWorkshopConfig,
  getTodayAttendance,
  registerAttendanceMark,
  calculateDistanceMeters,
  type WorkshopConfig,
  type AttendanceRecord,
} from "@/lib/attendanceService";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Camera,
  MapPin,
  Clock,
  Utensils,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw,
  Sparkles,
  ShieldCheck,
  Timer,
  ChevronRight,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AttendanceClockInPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [config, setConfig] = useState<WorkshopConfig | null>(null);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // GPS state
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Modal / Action selection
  const [activeAction, setActiveAction] = useState<
    "ENTRADA" | "SALIDA_ALMUERZO" | "REGRESO_ALMUERZO" | "SALIDA_JORNADA" | null
  >(null);

  // Lunch Countdown Timer
  const [lunchSecondsLeft, setLunchSecondsLeft] = useState<number | null>(null);
  const [lunchElapsedMinutes, setLunchElapsedMinutes] = useState<number>(0);

  // 1. Cargar usuario, config y registros de hoy
  async function loadData() {
    setLoading(true);
    const { user: u, profile: p } = await getUserProfile();
    if (!u) {
      toast.error("Debes iniciar sesión.");
      setLoading(false);
      return;
    }
    setUser(u);
    setProfile(p);

    const conf = await getWorkshopConfig();
    setConfig(conf);

    const logs = await getTodayAttendance(u.id);
    setTodayRecords(logs);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
    requestGpsLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Obtener GPS en vivo
  function requestGpsLocation() {
    if (!navigator.geolocation) {
      setGpsError("Tu navegador no soporta geolocalización GPS.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCoords({ lat, lon });
        setGpsError(null);

        if (config) {
          const d = calculateDistanceMeters(lat, lon, config.latitud, config.longitud);
          setDistance(d);
        }
      },
      (err) => {
        console.warn("GPS error:", err);
        setGpsError("Por favor permite el acceso al GPS para validar tu presencia física en el taller.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // Recalcular distancia cuando cambia config o coords
  useEffect(() => {
    if (coords && config) {
      const d = calculateDistanceMeters(coords.lat, coords.lon, config.latitud, config.longitud);
      setDistance(d);
    }
  }, [coords, config]);

  // 3. Control de Cronómetro de Almuerzo en tiempo real
  const salidaAlmuerzoRecord = useMemo(() => {
    return todayRecords.find((r) => r.tipo === "SALIDA_ALMUERZO");
  }, [todayRecords]);

  const regresoAlmuerzoRecord = useMemo(() => {
    return todayRecords.find((r) => r.tipo === "REGRESO_ALMUERZO");
  }, [todayRecords]);

  const isInLunch = salidaAlmuerzoRecord && !regresoAlmuerzoRecord;

  useEffect(() => {
    if (!isInLunch || !salidaAlmuerzoRecord || !config) {
      setLunchSecondsLeft(null);
      return;
    }

    const timer = setInterval(() => {
      const start = new Date(salidaAlmuerzoRecord.created_at).getTime();
      const now = new Date().getTime();
      const diffSec = Math.floor((now - start) / 1000);
      const totalLunchSec = config.duracion_almuerzo_minutos * 60;
      const remainingSec = totalLunchSec - diffSec;

      setLunchSecondsLeft(remainingSec);
      setLunchElapsedMinutes(Math.floor(diffSec / 60));
    }, 1000);

    return () => clearInterval(timer);
  }, [isInLunch, salidaAlmuerzoRecord, config]);

  // 4. Iniciar / detener cámara
  async function startCamera() {
    setCapturedPhoto(null);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.error(err);
      setCameraError("No se pudo acceder a la cámara. Concede permisos para tomar tu selfie de asistencia.");
    }
  }

  function stopCamera() {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  function takePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
      setCapturedPhoto(dataUrl);
      stopCamera();
    }
  }

  function retakePhoto() {
    setCapturedPhoto(null);
    startCamera();
  }

  // 5. Manejar marcación
  async function handleConfirmClockIn() {
    if (!activeAction) return;

    if (!coords) {
      toast.error("⚠️ Se requiere ubicación GPS. Activa tu ubicación para continuar.");
      requestGpsLocation();
      return;
    }

    if (!capturedPhoto) {
      toast.error("⚠️ Debes tomarte una foto selfie para validar tu identidad.");
      return;
    }

    // Validación de Geocerca (100 metros)
    if (config && distance != null && distance > config.radio_tolerancia_metros) {
      const ok = confirm(
        `🚨 AVISO DE UBICACIÓN:\nEstás a ${distance} metros del taller (el límite autorizado es ${config.radio_tolerancia_metros} metros).\n\n¿Deseas enviar la marcación de todas formas? Quedará reportada automáticamente como 'FUERA DE RANGO'.`
      );
      if (!ok) return;
    }

    setSubmitting(true);
    const res = await registerAttendanceMark({
      tipo: activeAction,
      latitud: coords.lat,
      longitud: coords.lon,
      fotoBase64: capturedPhoto,
    });
    setSubmitting(false);

    if (res.success) {
      toast.success(res.message);
      setActiveAction(null);
      setCapturedPhoto(null);
      stopCamera();
      await loadData();
    } else {
      toast.error(res.message);
    }
  }

  const hasEntrada = todayRecords.some((r) => r.tipo === "ENTRADA");
  const hasSalidaJornada = todayRecords.some((r) => r.tipo === "SALIDA_JORNADA");

  const isWithinGeofence =
    config && distance != null && distance <= config.radio_tolerancia_metros;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#3C1C6C] flex items-center gap-2">
            <Clock className="w-8 h-8 text-[#A57CFA]" /> Control de Asistencia Biométrica & GPS
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro de entrada, cronómetro de almuerzo y salida con verificación de presencia física.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            loadData();
            requestGpsLocation();
          }}
          className="rounded-xl border-slate-200 gap-1.5 h-10 self-start sm:self-auto"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refrescar
        </Button>
      </div>

      {/* Tarjeta de Estado GPS en Vivo */}
      <Card className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-3 rounded-2xl shrink-0 ${
                isWithinGeofence
                  ? "bg-emerald-100 text-emerald-700"
                  : distance != null
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-base">Geocerca del Laboratorio Dental</h3>
                {isWithinGeofence ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> En Rango (Válido)
                  </span>
                ) : distance != null ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                    <AlertTriangle className="w-3.5 h-3.5" /> Fuera de Rango (&gt; {config?.radio_tolerancia_metros || 100}m)
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 font-mono">Buscando satélites...</span>
                )}
              </div>

              <p className="text-xs text-slate-500 mt-1">
                {distance != null ? (
                  <>
                    Estás a <strong className="text-slate-800">{distance} metros</strong> del taller central.
                    (Tolerancia máxima configurada: {config?.radio_tolerancia_metros || 100} metros).
                  </>
                ) : gpsError ? (
                  <span className="text-red-600 font-medium">{gpsError}</span>
                ) : (
                  "Calculando distancia al taller mediante GPS de alta precisión..."
                )}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={requestGpsLocation}
            className="rounded-xl border-slate-200 text-xs font-semibold shrink-0"
          >
            Actualizar GPS
          </Button>
        </div>
      </Card>

      {/* Ficha Oficial de Horario Asignado & Reglamento Laboral */}
      <Card className="p-5 sm:p-6 rounded-3xl border-2 border-[#A57CFA]/40 bg-gradient-to-br from-white via-purple-50/40 to-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-purple-200/40 via-transparent to-transparent rounded-bl-full pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-purple-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3C1C6C] text-[#D0B9FF] text-[11px] font-extrabold uppercase tracking-wider mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#A57CFA]" />
              Reglamento Interno Oficial • Guisela Lab
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#3C1C6C] tracking-tight">
              Ficha de Tu Horario Asignado & Normas de Asistencia
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Colaborador:</span>
            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-purple-100/80 text-[#3C1C6C] border border-purple-200 uppercase tracking-wide">
              {profile?.nombre || "Personal de Taller"} ({profile?.rol || "Técnico"})
            </span>
          </div>
        </div>

        {/* 4 Indicadores Clave del Horario */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Entrada */}
          <div className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-xs">
            <div className="flex items-center gap-2 text-purple-700 mb-1">
              <Clock className="w-4 h-4 text-[#A57CFA]" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Entrada Oficial
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">08:30 <span className="text-xs font-bold text-slate-500">AM</span></p>
            <div className="mt-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
              Tolerancia: +20 min (hasta 08:50)
            </div>
          </div>

          {/* 2. Almuerzo */}
          <div className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-xs">
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <Utensils className="w-4 h-4 text-orange-500" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Almuerzo
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">60 <span className="text-xs font-bold text-slate-500">minutos</span></p>
            <div className="mt-1 text-[11px] font-semibold text-orange-800 bg-orange-50 px-2 py-0.5 rounded-md inline-block">
              Retorno: +10 min tolerancia
            </div>
          </div>

          {/* 3. Salida */}
          <div className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-xs">
            <div className="flex items-center gap-2 text-slate-700 mb-1">
              <LogOut className="w-4 h-4 text-[#A57CFA]" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Salida Oficial
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">18:30 <span className="text-xs font-bold text-slate-500">PM</span></p>
            <div className="mt-1 text-[11px] font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md inline-block">
              Fin de jornada de taller
            </div>
          </div>

          {/* 4. GPS & Foto */}
          <div className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-xs">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Control Antifraude
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">100m <span className="text-xs font-bold text-slate-500">GPS</span></p>
            <div className="mt-1 text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md inline-block">
              Foto selfie biométrica obligatoria
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2">
          <Info className="w-4 h-4 text-[#A57CFA] shrink-0" />
          <span>
            Todo registro fuera de la tolerancia establecida se audita automáticamente. Asegúrate de estar dentro del radio de 100m del laboratorio y habilitar tu cámara al marcar.
          </span>
        </p>
      </Card>

      {/* Banner de Cronómetro de Almuerzo si está en almuerzo activo */}
      {isInLunch && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100/70 p-6 shadow-md"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-200/80 text-orange-800 flex items-center justify-center shrink-0">
                <Utensils className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-orange-800 bg-orange-200/60 px-2.5 py-0.5 rounded-full">
                  Almuerzo en Curso
                </span>
                <h2 className="text-xl font-extrabold text-orange-950 mt-1">
                  Tiempo Restante de Almuerzo
                </h2>
                <p className="text-xs text-orange-800/80">
                  Límite reglamentario: 60 min (+10 min de tolerancia de regreso).
                </p>
              </div>
            </div>

            {/* Cronómetro Grande */}
            <div className="flex flex-col items-center sm:items-end">
              <div className="text-4xl sm:text-5xl font-mono font-black text-orange-950 tracking-tight">
                {lunchSecondsLeft != null ? (
                  lunchSecondsLeft > 0 ? (
                    `${Math.floor(lunchSecondsLeft / 60)}:${String(
                      lunchSecondsLeft % 60
                    ).padStart(2, "0")}`
                  ) : (
                    <span className="text-red-600">
                      +{Math.abs(Math.floor(lunchSecondsLeft / 60))}:
                      {String(Math.abs(lunchSecondsLeft % 60)).padStart(2, "0")}
                    </span>
                  )
                ) : (
                  "--:--"
                )}
              </div>
              <span className="text-[11px] text-orange-800 font-semibold mt-0.5">
                {lunchSecondsLeft != null && lunchSecondsLeft < 0
                  ? "⚠️ Tiempo excedido"
                  : `${lunchElapsedMinutes} min transcurridos`}
              </span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-orange-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-orange-900 font-medium">
              Al terminar tu almuerzo, presiona para registrar tu regreso con foto y GPS:
            </p>
            <Button
              onClick={() => {
                setActiveAction("REGRESO_ALMUERZO");
                startCamera();
              }}
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-md gap-2"
            >
              <Camera className="w-4 h-4" /> Marcar Regreso de Almuerzo
            </Button>
          </div>
        </motion.div>
      )}

      {/* Botones de Marcación del Día */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Entrada */}
        <Card
          className={`p-5 rounded-2xl border transition-all ${
            hasEntrada
              ? "border-green-200 bg-green-50/40"
              : "border-slate-200 bg-white hover:border-[#3C1C6C]/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">1. Entrada</span>
            <div
              className={`p-2 rounded-xl ${
                hasEntrada ? "bg-green-100 text-green-700" : "bg-purple-100 text-[#3C1C6C]"
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="font-extrabold text-slate-900 text-base">Entrada Jornada</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Tolerancia: {config?.tolerancia_entrada_minutos || 20} min
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            {hasEntrada ? (
              <div className="text-xs text-green-800 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> Marcado a las{" "}
                {todayRecords.find((r) => r.tipo === "ENTRADA")?.hora}
              </div>
            ) : (
              <Button
                onClick={() => {
                  setActiveAction("ENTRADA");
                  startCamera();
                }}
                disabled={submitting}
                className="w-full bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold text-xs shadow-sm gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" /> Marcar Entrada
              </Button>
            )}
          </div>
        </Card>

        {/* 2. Salida Almuerzo */}
        <Card
          className={`p-5 rounded-2xl border transition-all ${
            salidaAlmuerzoRecord
              ? "border-amber-200 bg-amber-50/40"
              : "border-slate-200 bg-white hover:border-orange-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">2. Almuerzo</span>
            <div
              className={`p-2 rounded-xl ${
                salidaAlmuerzoRecord
                  ? "bg-amber-100 text-amber-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              <Utensils className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="font-extrabold text-slate-900 text-base">Salida a Almuerzo</p>
            <p className="text-xs text-slate-500 mt-0.5">Duración: 60 minutos</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            {salidaAlmuerzoRecord ? (
              <div className="text-xs text-amber-800 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-amber-600" /> Marcado a las{" "}
                {salidaAlmuerzoRecord.hora}
              </div>
            ) : (
              <Button
                onClick={() => {
                  if (!hasEntrada) {
                    toast.warning("Debes marcar tu Entrada primero.");
                    return;
                  }
                  setActiveAction("SALIDA_ALMUERZO");
                  startCamera();
                }}
                disabled={submitting || !hasEntrada}
                variant="outline"
                className="w-full border-orange-200 text-orange-800 hover:bg-orange-50 rounded-xl font-bold text-xs shadow-sm gap-1.5"
              >
                <Utensils className="w-3.5 h-3.5" /> Iniciar Almuerzo
              </Button>
            )}
          </div>
        </Card>

        {/* 3. Regreso Almuerzo */}
        <Card
          className={`p-5 rounded-2xl border transition-all ${
            regresoAlmuerzoRecord
              ? "border-green-200 bg-green-50/40"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">3. Regreso</span>
            <div
              className={`p-2 rounded-xl ${
                regresoAlmuerzoRecord
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              <Timer className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="font-extrabold text-slate-900 text-base">Fin de Almuerzo</p>
            <p className="text-xs text-slate-500 mt-0.5">Tolerancia: 10 min de margen</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            {regresoAlmuerzoRecord ? (
              <div className="text-xs text-green-800 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> Regreso a las{" "}
                {regresoAlmuerzoRecord.hora}
              </div>
            ) : (
              <Button
                onClick={() => {
                  if (!salidaAlmuerzoRecord) {
                    toast.warning("Primero debes registrar tu Salida a Almuerzo.");
                    return;
                  }
                  setActiveAction("REGRESO_ALMUERZO");
                  startCamera();
                }}
                disabled={submitting || !salidaAlmuerzoRecord}
                variant="outline"
                className="w-full border-blue-200 text-blue-800 hover:bg-blue-50 rounded-xl font-bold text-xs shadow-sm gap-1.5"
              >
                <Timer className="w-3.5 h-3.5" /> Marcar Regreso
              </Button>
            )}
          </div>
        </Card>

        {/* 4. Salida Jornada */}
        <Card
          className={`p-5 rounded-2xl border transition-all ${
            hasSalidaJornada
              ? "border-green-200 bg-green-50/40"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">4. Salida</span>
            <div
              className={`p-2 rounded-xl ${
                hasSalidaJornada
                  ? "bg-green-100 text-green-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              <LogOut className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="font-extrabold text-slate-900 text-base">Fin de Jornada</p>
            <p className="text-xs text-slate-500 mt-0.5">Cierre diario de trabajo</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            {hasSalidaJornada ? (
              <div className="text-xs text-green-800 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> Salida a las{" "}
                {todayRecords.find((r) => r.tipo === "SALIDA_JORNADA")?.hora}
              </div>
            ) : (
              <Button
                onClick={() => {
                  if (!hasEntrada) {
                    toast.warning("Debes marcar tu Entrada primero.");
                    return;
                  }
                  setActiveAction("SALIDA_JORNADA");
                  startCamera();
                }}
                disabled={submitting || !hasEntrada}
                variant="outline"
                className="w-full border-rose-200 text-rose-800 hover:bg-rose-50 rounded-xl font-bold text-xs shadow-sm gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" /> Marcar Salida
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* MODAL DE CAPTURA CON CÁMARA (SELFIE OBLIGATORIA) */}
      <AnimatePresence>
        {activeAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#3C1C6C]">
                    Verificación Biométrica & Selfie
                  </h3>
                  <p className="text-xs text-slate-500">
                    Acción: <strong className="text-slate-800">{activeAction.replace("_", " ")}</strong>
                  </p>
                </div>
                <button
                  onClick={() => {
                    stopCamera();
                    setActiveAction(null);
                  }}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              {/* Visor de Cámara / Foto Capturada */}
              <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center">
                {capturedPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={capturedPhoto}
                    alt="Selfie"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* Guía facial */}
                    <div className="absolute inset-0 border-2 border-dashed border-white/40 rounded-full m-8 pointer-events-none flex items-center justify-center">
                      <span className="text-[10px] text-white/70 font-semibold bg-black/40 px-2 py-0.5 rounded-full">
                        Ubica tu rostro al centro
                      </span>
                    </div>
                  </>
                )}

                <canvas ref={canvasRef} className="hidden" />
              </div>

              {cameraError && (
                <p className="text-xs text-red-600 font-medium bg-red-50 p-3 rounded-xl border border-red-200">
                  {cameraError}
                </p>
              )}

              {/* Indicador de Geocerca en el Modal */}
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  isWithinGeofence
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-amber-50 border-amber-200 text-amber-900"
                }`}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-4 h-4 shrink-0" />
                  {distance != null ? `A ${distance}m del taller` : "Calculando GPS..."}
                </span>
                <span className="font-bold">
                  {isWithinGeofence ? "✅ En Rango" : "⚠️ Fuera de Rango"}
                </span>
              </div>

              {/* Botones de Cámara y Confirmación */}
              <div className="flex gap-2 pt-2">
                {!capturedPhoto ? (
                  <Button
                    onClick={takePhoto}
                    disabled={!cameraActive}
                    className="w-full bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold h-11 gap-2 shadow-md"
                  >
                    <Camera className="w-4 h-4" /> Capturar Foto Selfie
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={retakePhoto}
                      disabled={submitting}
                      className="flex-1 rounded-xl border-slate-200 h-11"
                    >
                      Repetir Foto
                    </Button>
                    <Button
                      onClick={handleConfirmClockIn}
                      disabled={submitting}
                      className="flex-1 bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl font-bold h-11 shadow-md gap-2"
                    >
                      {submitting ? "Guardando..." : "Confirmar Marcaje"}
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Historial de Marcaciones de Hoy */}
      <div className="space-y-3 pt-2">
        <h3 className="font-bold text-[#3C1C6C] text-base flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" /> Marcaciones Registradas Hoy
        </h3>

        {todayRecords.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {todayRecords.map((r) => (
              <div
                key={r.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {r.foto_selfie_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.foto_selfie_url}
                      alt="Selfie"
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                    />
                  )}
                  <div>
                    <span className="font-bold text-slate-800 text-sm block">
                      {r.tipo.replace("_", " ")}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {r.hora} · A {r.distancia_metros}m del taller
                    </span>
                  </div>
                </div>

                <div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      r.estado === "A_TIEMPO"
                        ? "bg-green-100 text-green-800"
                        : r.estado === "TARDANZA"
                        ? "bg-red-100 text-red-800"
                        : r.estado === "ALMUERZO_EXCESO"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {r.estado.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-2xl border border-slate-100">
            Aún no tienes registros de asistencia para el día de hoy.
          </p>
        )}
      </div>
    </div>
  );
}
