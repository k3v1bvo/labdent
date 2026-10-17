"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  CheckCircle2,
  Loader2,
  CalendarDays,
  Clock as ClockIcon,
  Hash,
  Stethoscope,
  Phone,
  User,
  ClipboardCheck,
  Palette,
  Ruler,
  Sparkles,
  X,
  Save,
  Wand2,
  Copy,
  Truck,
  Building2,
  MapPin,
  Check,
} from "lucide-react";
import { ClinicLocationPickerModal } from "@/components/location/ClinicLocationPickerModal";
import { TrabajoSelector } from "@/components/orders/TrabajoSelector";
import { ControlComponentes, ComponenteItem } from "@/components/orders/ControlComponentes";

type SuggestionType = "paciente" | "color" | "colimetro";

interface DoctorPedidoForm {
  numero_requerimiento: string;
  fecha_ingreso: string;
  hora_ingreso: string;
  doctor_nombre: string;
  doctor_telefono: string;
  paciente_nombre: string;
  paciente_telefono: string;
  trabajo_realizar: string;
  pieza_numero: string;
  color_pieza: string;
  colimetro: string;
  observaciones: string;
  // Delivery & Consultorio
  requiere_delivery: boolean;
  clinica_nombre: string;
  direccion_entrega: string;
  referencia_entrega: string;
  telefono_entrega: string;
}

/**
 * Normaliza nombres:
 * - elimina espacios al inicio
 * - colapsa múltiples espacios a 1
 * - Title Case por palabra (Primera Mayúscula, resto minúscula)
 */
function normalizePersonName(input: string) {
  const hasTrailingSpace = /\s$/.test(input);

  const cleaned = input.replace(/\s+/g, " ").replace(/^\s+/, "");
  if (!cleaned) return "";

  const base = cleaned
    .trimEnd()
    .split(" ")
    .filter(Boolean)
    .map((w) => {
      const lower = w.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");

  return hasTrailingSpace && base ? base + " " : base;
}

function onlyDigits(v: string) {
  return v.replace(/[^\d]/g, "");
}

function isSameForm(a: DoctorPedidoForm, b: DoctorPedidoForm) {
  // comparación simple por JSON (suficiente aquí)
  return JSON.stringify(a) === JSON.stringify(b);
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function DoctorNewOrderPage() {
  const router = useRouter();

  const emptyDynamic: DoctorPedidoForm = useMemo(
    () => ({
      numero_requerimiento: "",
      fecha_ingreso: "",
      hora_ingreso: "",
      doctor_nombre: "",
      doctor_telefono: "",
      paciente_nombre: "",
      paciente_telefono: "",
      trabajo_realizar: "",
      pieza_numero: "",
      color_pieza: "",
      colimetro: "",
      observaciones: "",
      requiere_delivery: false,
      clinica_nombre: "",
      direccion_entrega: "",
      referencia_entrega: "",
      telefono_entrega: "",
    }),
    []
  );

  const [form, setForm] = useState<DoctorPedidoForm>(emptyDynamic);
  const [initialSnapshot, setInitialSnapshot] = useState<DoctorPedidoForm>(emptyDynamic);

  const [loading, setLoading] = useState(false);
  const [numError, setNumError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // Modal para mapa de entrega
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [latitudEntrega, setLatitudEntrega] = useState<number | null>(null);
  const [longitudEntrega, setLongitudEntrega] = useState<number | null>(null);
  const [componentesCaja, setComponentesCaja] = useState<ComponenteItem[]>([]);

  const [suggestions, setSuggestions] = useState<Record<SuggestionType, string[]>>({
    paciente: [],
    color: [],
    colimetro: [],
  });

  const [visibleSuggest, setVisibleSuggest] = useState<Record<SuggestionType, boolean>>({
    paciente: false,
    color: false,
    colimetro: false,
  });

  // refs para focus pro
  const reqRef = useRef<HTMLInputElement | null>(null);
  const pacienteRef = useRef<HTMLInputElement | null>(null);
  const trabajoRef = useRef<HTMLInputElement | null>(null);
  const piezaRef = useRef<HTMLInputElement | null>(null);

  // Debounce sugerencias (evita spamear supabase)
  const suggTimers = useRef<Record<string, any>>({});

  // 🕒 Fecha y hora automáticas
  useEffect(() => {
    const now = new Date();
    setForm((prev) => {
      const next = {
        ...prev,
        fecha_ingreso: now.toISOString().split("T")[0],
        hora_ingreso: now.toTimeString().slice(0, 5),
      };
      return next;
    });
  }, []);

  // 👨‍⚕️ Cargar datos del doctor autenticado (del profile)
  useEffect(() => {
    async function loadDoctorData() {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) console.error("auth getUser error:", userErr);
      if (!user) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("nombre, telefono")
        .eq("id", user.id)
        .single();

      if (error) console.error("Error cargando perfil:", error);

      if (profile) {
        setForm((prev) => ({
          ...prev,
          doctor_nombre: profile.nombre ?? "",
          doctor_telefono: profile.telefono ?? "",
          telefono_entrega: profile.telefono ?? "",
        }));
      }

      // Buscar doctor en tabla doctores para auto-cargar su clínica y dirección
      const { data: docRow } = await supabase
        .from("doctores")
        .select("clinica, direccion, telefono, latitud, longitud")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (docRow) {
        setForm((prev) => ({
          ...prev,
          clinica_nombre: docRow.clinica || prev.clinica_nombre,
          direccion_entrega: docRow.direccion || prev.direccion_entrega,
          telefono_entrega: docRow.telefono || prev.telefono_entrega,
        }));
        if (docRow.latitud && docRow.longitud) {
          setLatitudEntrega(Number(docRow.latitud));
          setLongitudEntrega(Number(docRow.longitud));
        }
      }

      // snapshot inicial cuando ya sabemos el doctor (para “cambios sin guardar”)
      setTimeout(() => {
        setInitialSnapshot((snap) => {
          // usa el estado más reciente
          return {
            ...snap,
            // no pisamos fecha/hora si ya se setearon
          } as any;
        });
      }, 0);
    }

    loadDoctorData();
  }, []);

  // Snapshot inicial real cuando form ya tiene fecha/hora (y doctor si aplica)
  useEffect(() => {
    // al primer render donde fecha/hora existen, tomamos snapshot
    if (form.fecha_ingreso && form.hora_ingreso && !initialSnapshot.fecha_ingreso) {
      setInitialSnapshot(form);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.fecha_ingreso, form.hora_ingreso]);

  const dirty = useMemo(() => !isSameForm(form, initialSnapshot), [form, initialSnapshot]);

  // Aviso pro al salir si hay cambios
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;

    let v = value;

    // ✅ Normalizar nombre del paciente
    if (name === "paciente_nombre") v = normalizePersonName(value);

    // ✅ teléfono solo dígitos (pro y evita basura)
    if (name === "paciente_telefono" || name === "doctor_telefono" || name === "telefono_entrega") {
      v = onlyDigits(value);
    }

    // ✅ requerimiento: trim left (no espacios al inicio)
    if (name === "numero_requerimiento") {
      v = value.replace(/^\s+/, "");
      setNumError("");
    }

    setForm((prev) => ({ ...prev, [name]: v }));

    // sugerencias (con debounce)
    if (name === "paciente_nombre") debouncedSuggestions("paciente", v);
    if (name === "color_pieza") debouncedSuggestions("color", v);
    if (name === "colimetro") debouncedSuggestions("colimetro", v);
  }

  function debouncedSuggestions(type: SuggestionType, query: string) {
    if (suggTimers.current[type]) clearTimeout(suggTimers.current[type]);
    suggTimers.current[type] = setTimeout(() => {
      fetchSuggestions(type, query);
    }, 180);
  }

  // 🔍 Buscar sugerencias (globales)
  async function fetchSuggestions(type: SuggestionType, query: string) {
    if (query.trim().length < 2) {
      setVisibleSuggest((prev) => ({ ...prev, [type]: false }));
      return;
    }

    const columnMap: Record<SuggestionType, string> = {
      paciente: "paciente_nombre",
      color: "color_pieza",
      colimetro: "colimetro",
    };
    const column = columnMap[type];

    const { data, error } = await supabase
      .from("pedidos")
      .select(column)
      .ilike(column, `%${query}%`)
      .limit(6);

    if (error || !data) {
      console.error("fetchSuggestions error:", error);
      return;
    }

    const unique = Array.from(new Set((data as Record<string, any>[]).map((d) => d[column])))
      .filter(Boolean)
      .map((v) => (typeof v === "string" ? v : String(v)));

    setSuggestions((prev) => ({ ...prev, [type]: unique }));
    setVisibleSuggest((prev) => ({ ...prev, [type]: unique.length > 0 }));
  }

  // ✅ Seleccionar sugerencia
  async function handleSelectSuggestion(type: SuggestionType, value: string) {
    setVisibleSuggest((prev) => ({ ...prev, [type]: false }));

    if (type === "paciente") {
      const selectedName = normalizePersonName(value);

      const { data, error } = await supabase
        .from("pedidos")
        .select("paciente_telefono")
        .ilike("paciente_nombre", selectedName)
        .order("fecha_ingreso", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) console.error("telefono lookup error:", error);

      const telefonoValue = data ? String((data as Record<string, any>)["paciente_telefono"] ?? "") : "";

      setForm((prev) => ({
        ...prev,
        paciente_nombre: selectedName,
        paciente_telefono: onlyDigits(telefonoValue),
      }));

      // focus siguiente campo
      setTimeout(() => trabajoRef.current?.focus(), 50);
    } else {
      const col = type === "color" ? "color_pieza" : "colimetro";
      setForm((prev) => ({ ...prev, [col]: value }));
    }
  }

  // ⚠️ Validar número único
  async function checkNumeroExists(num: string) {
    const clean = num.trim();
    if (!clean) return false;

    const { data, error } = await supabase
      .from("pedidos")
      .select("id")
      .eq("numero_requerimiento", clean)
      .maybeSingle();

    if (error) {
      console.error("checkNumeroExists error:", error);
      return false;
    }

    return !!data;
  }

  const requiredOk = useMemo(() => {
    const pacienteNombreClean = normalizePersonName(form.paciente_nombre);
    return (
      !!form.numero_requerimiento.trim() &&
      !!pacienteNombreClean.trim() &&
      !!form.trabajo_realizar.trim() &&
      !!form.pieza_numero.trim()
    );
  }, [form.numero_requerimiento, form.paciente_nombre, form.trabajo_realizar, form.pieza_numero]);

  function clearFormKeepDoctor() {
    const now = new Date();
    setForm((prev) => ({
      ...prev,
      numero_requerimiento: "",
      fecha_ingreso: now.toISOString().split("T")[0],
      hora_ingreso: now.toTimeString().slice(0, 5),
      paciente_nombre: "",
      paciente_telefono: "",
      trabajo_realizar: "",
      pieza_numero: "",
      color_pieza: "",
      colimetro: "",
      observaciones: "",
      requiere_delivery: false,
    }));
    setComponentesCaja([]);
    // mover focus al requerimiento
    setTimeout(() => reqRef.current?.focus(), 60);
  }

  async function quickFillExample() {
    // “Sorprendeme” pro: relleno ejemplo sin romper nada
    setForm((prev) => ({
      ...prev,
      numero_requerimiento: prev.numero_requerimiento || "000123",
      paciente_nombre: prev.paciente_nombre || "Juan Perez",
      paciente_telefono: prev.paciente_telefono || "70000000",
      trabajo_realizar: prev.trabajo_realizar || "Corona metal-porcelana",
      pieza_numero: prev.pieza_numero || "24",
      color_pieza: prev.color_pieza || "A2",
      colimetro: prev.colimetro || "Vita Easyshade",
    }));
    toast.message("✨ Rellenado rápido", { description: "Ajusta lo necesario y guarda." });
  }

  // 💾 Guardar pedido (en revisión)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const pacienteNombreClean = normalizePersonName(form.paciente_nombre);

    if (!requiredOk) {
      toast.error("Completa los campos obligatorios (*)");
      // enfoque al primer campo faltante
      if (!form.numero_requerimiento.trim()) reqRef.current?.focus();
      else if (!pacienteNombreClean.trim()) pacienteRef.current?.focus();
      else if (!form.trabajo_realizar.trim()) trabajoRef.current?.focus();
      else if (!form.pieza_numero.trim()) piezaRef.current?.focus();
      return;
    }

    const existe = await checkNumeroExists(form.numero_requerimiento);
    if (existe) {
      setNumError("⚠️ Este número de requerimiento ya está en uso");
      reqRef.current?.focus();
      return;
    }

    setLoading(true);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      setLoading(false);
      toast.error("Sesión inválida. Vuelve a iniciar sesión.");
      router.push("/login");
      return;
    }

    // 1) Buscar doctor en tabla doctores por profile_id
    let doctorId: string | null = null;

    const { data: doctorRow, error: doctorFindErr } = await supabase
      .from("doctores")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (doctorFindErr) {
      console.error("doctorFindErr:", doctorFindErr);
      setLoading(false);
      toast.error(`Error buscando doctor: ${doctorFindErr.message}`);
      return;
    }

    if (doctorRow?.id) {
      doctorId = doctorRow.id;
    } else {
      // 2) Si no existe, crearlo
      const { data: createdDoctor, error: doctorCreateErr } = await supabase
        .from("doctores")
        .insert([{ profile_id: user.id }])
        .select("id")
        .single();

      if (doctorCreateErr || !createdDoctor) {
        console.error("doctorCreateErr:", doctorCreateErr);
        setLoading(false);
        toast.error(`No se pudo crear el registro del doctor. (${doctorCreateErr?.message || "sin detalle"})`);
        return;
      }

      doctorId = createdDoctor.id;
    }

    // Formatear logística de delivery en observaciones si se activó
    let finalObservaciones = form.observaciones?.trim() || "";
    if (form.requiere_delivery && form.direccion_entrega.trim()) {
      const gpsPart =
        latitudEntrega != null && longitudEntrega != null
          ? ` | GPS: ${latitudEntrega.toFixed(6)}, ${longitudEntrega.toFixed(6)}`
          : "";
      const deliveryTag = `[🚚 DELIVERY: ${form.clinica_nombre.trim() || "Consultorio"} | Dir: ${form.direccion_entrega.trim()}${form.referencia_entrega.trim() ? ` (Ref: ${form.referencia_entrega.trim()})` : ""}${form.telefono_entrega.trim() ? ` | Contacto: ${form.telefono_entrega.trim()}` : ""}${gpsPart}]`;
      finalObservaciones = finalObservaciones
        ? `${finalObservaciones}\n${deliveryTag}`
        : deliveryTag;
    }

    // Formatear componentes en caja
    const compChecked = componentesCaja.filter((c) => c.checked);
    if (compChecked.length > 0) {
      const compTag = `[COMPONENTES: ${compChecked.map((c) => `${c.cantidad}x ${c.nombre}`).join(", ")}]`;
      finalObservaciones = finalObservaciones
        ? `${finalObservaciones}\n${compTag}`
        : compTag;
    }

    // 3) Insertar pedido EN REVISIÓN
    const { error: insertErr } = await supabase.from("pedidos").insert([
      {
        numero_requerimiento: form.numero_requerimiento.trim(),
        fecha_ingreso: form.fecha_ingreso,
        hora_ingreso: form.hora_ingreso,
        doctor_id: doctorId,
        doctor_nombre: form.doctor_nombre,
        doctor_telefono: form.doctor_telefono ? onlyDigits(form.doctor_telefono) : null,
        paciente_nombre: pacienteNombreClean,
        paciente_telefono: form.paciente_telefono?.trim() ? onlyDigits(form.paciente_telefono) : null,
        trabajo_realizar: form.trabajo_realizar.trim(),
        pieza_numero: form.pieza_numero.trim(),
        color_pieza: form.color_pieza.trim() || null,
        colimetro: form.colimetro.trim() || null,
        observaciones: finalObservaciones || null,
        componentes_caja: compChecked.length > 0 ? compChecked : null,

        estado: "pendiente_revision",

        motivo_rechazo: null,
        revisado_por: null,
        revisado_en: null,

        creado_por: user.id,
      },
    ]);

    setLoading(false);

    if (insertErr) {
      console.error("insertErr:", insertErr);
      toast.error(`❌ Error al guardar el pedido: ${insertErr.message}`);
      return;
    }

    // 🔔 Notificación en tiempo real para secretaría y administración
    try {
      await supabase.from("notificaciones").insert([
        {
          tipo: "secretaria",
          mensaje: `Nuevo pedido clínico #${form.numero_requerimiento.trim()} de Dr(a). ${form.doctor_nombre || "Doctor"} (Paciente: ${pacienteNombreClean}).`,
          emisor_id: user.id,
          leida: false,
        },
        {
          tipo: "admin",
          mensaje: `Nuevo pedido #${form.numero_requerimiento.trim()} recibido de Dr(a). ${form.doctor_nombre || "Doctor"}.`,
          emisor_id: user.id,
          leida: false,
        },
      ]);
    } catch (notifErr) {
      console.warn("Aviso notificacion nuevo pedido:", notifErr);
    }

    // ✅ Mantener tu overlay
    toast.success("✅ Guardado con éxito, en revisión");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);

    clearFormKeepDoctor();

    // refrescar snapshot (ya no “dirty” después de guardar)
    setTimeout(() => setInitialSnapshot((_) => ({ ...form })), 0);
  }

  // Pro: barra de progreso de completitud del formulario (solo UI)
  const completion = useMemo(() => {
    const fields = [
      ["numero_requerimiento", !!form.numero_requerimiento.trim()],
      ["paciente_nombre", !!normalizePersonName(form.paciente_nombre).trim()],
      ["trabajo_realizar", !!form.trabajo_realizar.trim()],
      ["pieza_numero", !!form.pieza_numero.trim()],
      ["paciente_telefono", !!form.paciente_telefono.trim()],
      ["color_pieza", !!form.color_pieza.trim()],
      ["colimetro", !!form.colimetro.trim()],
      ["observaciones", !!form.observaciones.trim()],
    ] as const;

    const done = fields.filter(([, ok]) => ok).length;
    const total = fields.length;
    return Math.round((done / total) * 100);
  }, [
    form.numero_requerimiento,
    form.paciente_nombre,
    form.trabajo_realizar,
    form.pieza_numero,
    form.paciente_telefono,
    form.color_pieza,
    form.colimetro,
    form.observaciones,
  ]);

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 relative">
      {/* ✅ Overlay éxito (igual idea, mejor animación) */}
      {showSuccess && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm z-50">
          <div className="bg-white border shadow-xl rounded-3xl px-8 py-7 flex flex-col items-center animate-in fade-in zoom-in">
            <div className="relative">
              <div className="absolute -inset-3 rounded-full bg-green-100 blur-md" />
              <CheckCircle2 className="relative text-green-600 w-20 h-20 mb-3 animate-bounce" />
            </div>
            <p className="text-green-700 font-semibold text-lg text-center">Guardado con éxito, en revisión</p>
            <p className="text-xs text-muted-foreground mt-1">Tu pedido se enviará al flujo de aprobación.</p>
          </div>
        </div>
      )}

      {/* ✅ Header sticky pro */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 py-4 mb-6 rounded-2xl px-4 sm:px-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[#3C1C6C] dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[#A57CFA]" /> Nuevo Pedido del Doctor
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Completa los detalles de tu paciente y trabajo. El pedido entrará a <span className="font-semibold text-[#3C1C6C] dark:text-[#D0B9FF]">revisión técnica</span>.
            </p>

            {/* mini progreso de completitud */}
            <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
              <span className="inline-flex items-center gap-1 font-medium">
                <ClipboardCheck className="w-4 h-4 text-[#A57CFA]" /> Completitud
              </span>
              <div className="h-2 w-36 sm:w-48 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#3C1C6C] via-[#6329B7] to-[#A57CFA] transition-all duration-300" style={{ width: `${completion}%` }} />
              </div>
              <span className="font-bold text-[#3C1C6C] dark:text-[#A57CFA]">{completion}%</span>
              {dirty && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-[#3C1C6C] font-semibold text-[10px]">
                  <Wand2 className="w-3 h-3" /> Cambios sin guardar
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
            <Button
              type="button"
              variant="outline"
              onClick={quickFillExample}
              className="text-xs h-9 sm:h-10 flex items-center gap-1.5 border-slate-200 hover:bg-purple-50"
              disabled={loading}
              title="Relleno rápido (solo ejemplo)"
            >
              <Wand2 className="w-3.5 h-3.5 text-[#A57CFA]" /> Relleno rápido
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={clearFormKeepDoctor}
              className="text-xs h-9 sm:h-10 flex items-center gap-1.5 border-slate-200 hover:bg-rose-50 hover:text-rose-600"
              disabled={loading}
              title="Limpiar campos (mantiene datos del doctor)"
            >
              <X className="w-3.5 h-3.5" /> Limpiar
            </Button>

            <Button
              type="submit"
              form="doctor-new-order-form"
              className="bg-[#3C1C6C] hover:bg-[#2C1550] text-white text-xs sm:text-sm h-9 sm:h-10 px-4 sm:px-5 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-purple-950/20"
              disabled={loading || !requiredOk}
              title={!requiredOk ? "Completa los campos obligatorios (*)" : "Guardar pedido (en revisión)"}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Guardar (en revisión)
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Card className="shadow-sm rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-[#3C1C6C] dark:text-white text-lg sm:text-xl font-black flex items-center gap-2">
            🩺 Formulario de Pedido Clínico
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form
            id="doctor-new-order-form"
            onSubmit={handleSubmit}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            {/* ✅ Sección 1: Meta */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl border bg-white">
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" /> N° Requerimiento <span className="text-red-500">*</span>
                </label>
                <Input
                  ref={reqRef}
                  name="numero_requerimiento"
                  value={form.numero_requerimiento}
                  onChange={handleChange}
                  placeholder="Ej: 000123"
                  required
                  className={numError ? "border-red-500" : ""}
                  autoComplete="off"
                />
                <div className="flex items-center justify-between">
                  {numError ? <p className="text-red-500 text-xs">{numError}</p> : <span className="text-xs text-muted-foreground">Único</span>}
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-2 text-xs"
                    onClick={async () => {
                      const ok = await copyToClipboard(form.numero_requerimiento.trim());
                      if (ok && form.numero_requerimiento.trim()) toast.success("📋 Requerimiento copiado");
                    }}
                    disabled={!form.numero_requerimiento.trim()}
                    title="Copiar requerimiento"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" /> Fecha de ingreso
                </label>
                <Input type="date" name="fecha_ingreso" value={form.fecha_ingreso} readOnly className="bg-gray-100 cursor-not-allowed" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-2">
                  <ClockIcon className="w-4 h-4 text-muted-foreground" /> Hora de ingreso
                </label>
                <Input type="time" name="hora_ingreso" value={form.hora_ingreso} readOnly className="bg-gray-100 cursor-not-allowed" />
              </div>
            </div>

            {/* ✅ Sección 2: Doctor */}
            <div className="lg:col-span-1 p-4 rounded-2xl border bg-white space-y-3">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-muted-foreground" /> Doctor
              </p>

              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Nombre</label>
                <Input name="doctor_nombre" value={form.doctor_nombre} readOnly className="bg-gray-100 cursor-not-allowed" />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Teléfono
                </label>
                <Input
                  name="doctor_telefono"
                  value={form.doctor_telefono}
                  readOnly
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Estos datos se cargan desde tu perfil.
              </p>
            </div>

            {/* ✅ Sección 3: Paciente */}
            <div className="lg:col-span-2 p-4 rounded-2xl border bg-white space-y-3">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" /> Paciente
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative space-y-1">
                  <label className="text-sm font-medium">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <Input
                    ref={pacienteRef}
                    name="paciente_nombre"
                    value={form.paciente_nombre}
                    onChange={handleChange}
                    placeholder="Nombre del paciente"
                    required
                    autoComplete="off"
                    onBlur={() => setTimeout(() => setVisibleSuggest((p) => ({ ...p, paciente: false })), 150)}
                  />

                  {visibleSuggest.paciente && suggestions.paciente.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-1 z-50 bg-white border rounded-xl shadow-lg overflow-hidden">
                      {suggestions.paciente.map((p, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectSuggestion("paciente", p)}
                          className="w-full text-left px-3 py-2 hover:bg-green-50 cursor-pointer text-sm flex items-center gap-2"
                        >
                          <User className="w-4 h-4 text-muted-foreground" /> {p}
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">Tip: escribe 2 letras para ver sugerencias.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" /> Teléfono
                  </label>
                  <Input
                    name="paciente_telefono"
                    value={form.paciente_telefono}
                    onChange={handleChange}
                    placeholder="Ej: 70000000"
                    inputMode="numeric"
                  />
                  <p className="text-xs text-muted-foreground">Solo números.</p>
                </div>
              </div>
            </div>

            {/* ✅ Sección 4: Trabajo */}
            <div className="lg:col-span-3 p-4 rounded-2xl border bg-white space-y-4">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2 border-b pb-2">
                <ClipboardCheck className="w-4 h-4 text-purple-700" /> Catálogo de Trabajos Oficiales Guisela Lab (81 Opciones)
              </p>

              {/* Selector interactivo de catálogo oficial con auto-precio */}
              <TrabajoSelector
                selectedTrabajo={form.trabajo_realizar}
                piezas={form.pieza_numero}
                onSelect={(trabajo: any) => {
                  setForm((prev) => ({
                    ...prev,
                    trabajo_realizar: trabajo.nombre,
                  }));
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium">
                    Trabajo a realizar <span className="text-red-500">*</span>
                  </label>
                  <Input
                    ref={trabajoRef}
                    name="trabajo_realizar"
                    value={form.trabajo_realizar}
                    onChange={handleChange}
                    placeholder="Ej: Corona metal-porcelana"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-muted-foreground" /> Pieza N° <span className="text-red-500">*</span>
                  </label>
                  <Input
                    ref={piezaRef}
                    name="pieza_numero"
                    value={form.pieza_numero}
                    onChange={handleChange}
                    placeholder="Ej: 24"
                    required
                  />
                </div>

                <div className="relative space-y-1">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Palette className="w-4 h-4 text-muted-foreground" /> Color pieza
                  </label>
                  <Input
                    name="color_pieza"
                    value={form.color_pieza}
                    onChange={handleChange}
                    placeholder="Ej: A2"
                    autoComplete="off"
                    onBlur={() => setTimeout(() => setVisibleSuggest((p) => ({ ...p, color: false })), 150)}
                  />

                  {visibleSuggest.color && suggestions.color.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-1 z-50 bg-white border rounded-xl shadow-lg overflow-hidden">
                      {suggestions.color.map((c, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectSuggestion("color", c)}
                          className="w-full text-left px-3 py-2 hover:bg-green-50 cursor-pointer text-sm flex items-center gap-2"
                        >
                          <Palette className="w-4 h-4 text-muted-foreground" /> {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative space-y-1">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-muted-foreground" /> Colímetro
                  </label>
                  <Input
                    name="colimetro"
                    value={form.colimetro}
                    onChange={handleChange}
                    placeholder="Ej: Vita Easyshade"
                    autoComplete="off"
                    onBlur={() => setTimeout(() => setVisibleSuggest((p) => ({ ...p, colimetro: false })), 150)}
                  />

                  {visibleSuggest.colimetro && suggestions.colimetro.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-1 z-50 bg-white border rounded-xl shadow-lg overflow-hidden">
                      {suggestions.colimetro.map((c, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectSuggestion("colimetro", c)}
                          className="w-full text-left px-3 py-2 hover:bg-green-50 cursor-pointer text-sm flex items-center gap-2"
                        >
                          <Ruler className="w-4 h-4 text-muted-foreground" /> {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-sm font-medium">Observaciones</label>
                  <Textarea
                    name="observaciones"
                    value={form.observaciones}
                    onChange={handleChange}
                    placeholder="Notas técnicas o detalles especiales..."
                    className="min-h-[110px]"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Opcional</span>
                    <span>{(form.observaciones || "").length} caracteres</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 📦 Control de Componentes en Caja (15 Aditamentos Oficiales) */}
            <div className="lg:col-span-3 p-4 sm:p-5 rounded-2xl border bg-white shadow-xs">
              <ControlComponentes
                value={componentesCaja}
                onChange={setComponentesCaja}
              />
            </div>

            {/* 🚚 Logística de Despacho & Consultorio Dental (Opcional) */}
            <div className="lg:col-span-3 border border-purple-200/80 rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-purple-50/50 via-white to-slate-50 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#3C1C6C] text-white flex items-center justify-center shadow-sm shrink-0">
                    <Truck className="w-5 h-5 text-purple-200" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                      Logística de Despacho & Delivery
                      <span className="text-[11px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                        Opcional
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Indica si deseas que el trabajo terminado sea enviado por mensajería/delivery a tu clínica.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none bg-white px-3 py-2 rounded-xl border border-purple-200 shadow-sm self-start sm:self-auto hover:bg-purple-50/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.requiere_delivery}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, requiere_delivery: e.target.checked }))
                    }
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Enviar por Delivery al finalizar
                  </span>
                </label>
              </div>

              {form.requiere_delivery && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-purple-100">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-purple-600" /> Nombre de Clínica / Consultorio
                    </label>
                    <Input
                      name="clinica_nombre"
                      value={form.clinica_nombre}
                      onChange={handleChange}
                      placeholder="Ej. Clínica Dental Sonrisas"
                      className="h-9 text-xs rounded-xl border-slate-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-purple-600" /> Dirección de Entrega
                      </label>
                      <button
                        type="button"
                        onClick={() => setMapModalOpen(true)}
                        className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer hover:underline"
                        title="Seleccionar ubicación exacta en el mapa satelital o de calles"
                      >
                        <MapPin className="w-3 h-3 text-purple-600" /> Fijar en el Mapa
                      </button>
                    </div>
                    <Input
                      name="direccion_entrega"
                      value={form.direccion_entrega}
                      onChange={handleChange}
                      placeholder="Ej. Av. Busch #1234, Piso 3, Of. 301"
                      className="h-9 text-xs rounded-xl border-slate-200"
                    />
                    {latitudEntrega != null && longitudEntrega != null && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1 mt-1">
                        <Check className="w-3 h-3 text-emerald-600" /> GPS fijado: {latitudEntrega.toFixed(4)}, {longitudEntrega.toFixed(4)}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-purple-600" /> Celular para Entrega
                    </label>
                    <Input
                      name="telefono_entrega"
                      value={form.telefono_entrega}
                      onChange={handleChange}
                      placeholder="Ej. 70012345"
                      className="h-9 text-xs rounded-xl border-slate-200"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Punto de Referencia / Indicaciones para el móvil
                    </label>
                    <Input
                      name="referencia_entrega"
                      value={form.referencia_entrega}
                      onChange={handleChange}
                      placeholder="Ej. Al lado del banco Mercantil, tocar timbre 3B..."
                      className="h-9 text-xs rounded-xl border-slate-200"
                    />
                  </div>

                  <div className="md:col-span-3 bg-white/90 p-2.5 rounded-xl border border-purple-100 flex items-center gap-2 text-xs text-purple-950">
                    <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>
                      Al finalizar el trabajo en el laboratorio, el equipo te contactará para consultar disponibilidad antes de despachar el pedido.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ✅ Footer acciones (por si scrollean al final) */}
            <div className="lg:col-span-3 flex flex-col sm:flex-row gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (dirty && !confirm("Tienes cambios sin guardar. ¿Seguro que quieres salir?")) return;
                  router.back();
                }}
                className="flex items-center gap-2"
                disabled={loading}
              >
                <X className="w-4 h-4" /> Volver
              </Button>

              <Button
                type="submit"
                className="bg-[#3C1C6C] hover:bg-[#2C1550] text-white font-bold px-6 h-11 rounded-xl shadow-md shadow-purple-950/20 flex items-center gap-2"
                disabled={loading || !requiredOk}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Guardar (en revisión)
                  </>
                )}
              </Button>
            </div>

            {/* ✅ mini ayuda */}
            <div className="lg:col-span-3">
              <p className="text-xs text-muted-foreground">
                Campos obligatorios: <span className="font-semibold">Requerimiento, Paciente, Trabajo y Pieza</span>. Las sugerencias se basan en pedidos previos.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Modal Interactivo de Ubicación de Clínica / Delivery */}
      <ClinicLocationPickerModal
        open={mapModalOpen}
        onOpenChange={setMapModalOpen}
        onConfirm={(res) => {
          setLatitudEntrega(res.lat);
          setLongitudEntrega(res.lng);
          if (res.direccion) {
            setForm((p) => ({ ...p, direccion_entrega: res.direccion }));
          }
          toast.success("📍 Ubicación de consultorio fijada en el mapa");
        }}
        initialLat={latitudEntrega || -16.4955}
        initialLng={longitudEntrega || -68.1336}
        initialAddress={form.direccion_entrega}
        clinicaNombre={form.clinica_nombre || form.doctor_nombre || "Consultorio Dental"}
      />
    </div>
  );
}
