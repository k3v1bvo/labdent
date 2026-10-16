"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import {
  Loader2,
  CalendarDays,
  Clock as ClockIcon,
  Hash,
  User,
  Stethoscope,
  Phone,
  ClipboardCheck,
  Palette,
  Ruler,
  Banknote,
  Sparkles,
  X,
  Save,
  Copy,
  Truck,
  Building2,
  MapPin,
  Check,
} from "lucide-react";
import { ClinicLocationPickerModal } from "@/components/location/ClinicLocationPickerModal";

type SuggestionType = "doctor" | "paciente" | "color" | "colimetro";

export interface DoctorSuggestion {
  nombre: string;
  telefono?: string;
  clinica?: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  especialidad?: string;
}

interface PedidoForm {
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
  numero_caja: string;
  observaciones: string;
  anticipo: string;
  total: string;
  // Delivery
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
 * - Title Case por palabra
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

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function SecretaryNewOrderPage() {
  const emptyForm: PedidoForm = useMemo(
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
      numero_caja: "00",
      observaciones: "",
      anticipo: "",
      total: "",
      requiere_delivery: false,
      clinica_nombre: "",
      direccion_entrega: "",
      referencia_entrega: "",
      telefono_entrega: "",
    }),
    []
  );

  const [form, setForm] = useState<PedidoForm>(emptyForm);

  const [mostrarAnticipo, setMostrarAnticipo] = useState(false);
  const [saldoRestante, setSaldoRestante] = useState(0);
  const [loading, setLoading] = useState(false);
  const [numError, setNumError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const [suggestions, setSuggestions] = useState<Record<SuggestionType, string[]>>({
    doctor: [],
    paciente: [],
    color: [],
    colimetro: [],
  });

  const [doctorObjSuggestions, setDoctorObjSuggestions] = useState<DoctorSuggestion[]>([]);
  const [selectedDoctorObj, setSelectedDoctorObj] = useState<DoctorSuggestion | null>(null);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [latitudEntrega, setLatitudEntrega] = useState<number | null>(null);
  const [longitudEntrega, setLongitudEntrega] = useState<number | null>(null);

  const [visibleSuggest, setVisibleSuggest] = useState<Record<SuggestionType, boolean>>({
    doctor: false,
    paciente: false,
    color: false,
    colimetro: false,
  });

  // focus refs
  const reqRef = useRef<HTMLInputElement | null>(null);
  const doctorRef = useRef<HTMLInputElement | null>(null);
  const pacienteRef = useRef<HTMLInputElement | null>(null);
  const trabajoRef = useRef<HTMLInputElement | null>(null);
  const piezaRef = useRef<HTMLInputElement | null>(null);
  const totalRef = useRef<HTMLInputElement | null>(null);

  // debounce sugerencias
  const suggTimers = useRef<Record<string, any>>({});

  // 🕒 Fecha y hora automáticas
  useEffect(() => {
    const now = new Date();
    setForm((prev) => ({
      ...prev,
      fecha_ingreso: now.toISOString().split("T")[0],
      hora_ingreso: now.toTimeString().slice(0, 5),
    }));
    setTimeout(() => reqRef.current?.focus(), 80);
  }, []);

  // 💵 Calcular saldo restante
  useEffect(() => {
    const total = Number(form.total) || 0;
    const anticipo = mostrarAnticipo ? Number(form.anticipo) || 0 : 0;
    setSaldoRestante(total - anticipo);
  }, [form.total, form.anticipo, mostrarAnticipo]);

  function debouncedSuggestions(type: SuggestionType, query: string) {
    if (suggTimers.current[type]) clearTimeout(suggTimers.current[type]);
    suggTimers.current[type] = setTimeout(() => fetchSuggestions(type, query), 180);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;

    let v = value;

    // ✅ nombres
    if (name === "doctor_nombre" || name === "paciente_nombre") v = normalizePersonName(value);

    // ✅ teléfonos sólo números
    if (name === "doctor_telefono" || name === "paciente_telefono" || name === "telefono_entrega") v = onlyDigits(value);

    // ✅ caja 2 dígitos
    if (name === "numero_caja") v = value.replace(/[^\d]/g, "").slice(0, 2);

    // ✅ montos
    if (name === "anticipo" || name === "total") v = value.replace(/[^\d.]/g, "");

    // ✅ requerimiento
    if (name === "numero_requerimiento") {
      v = value.replace(/^\s+/, "");
      setNumError("");
    }

    setForm((prev) => ({ ...prev, [name]: v }));

    if (name === "doctor_nombre") debouncedSuggestions("doctor", v);
    if (name === "paciente_nombre") debouncedSuggestions("paciente", v);
    if (name === "color_pieza") debouncedSuggestions("color", v);
    if (name === "colimetro") debouncedSuggestions("colimetro", v);
  }

  // 🔍 Buscar sugerencias (desde tabla doctores y pedidos previos)
  async function fetchSuggestions(type: SuggestionType, query: string) {
    const qClean = query.trim();
    if (qClean.length < 2) {
      setVisibleSuggest((prev) => ({ ...prev, [type]: false }));
      if (type === "doctor") setDoctorObjSuggestions([]);
      return;
    }

    // 👨‍⚕️ Búsqueda avanzada de Doctores (Tabla doctores + pedidos previos)
    if (type === "doctor") {
      const merged: DoctorSuggestion[] = [];
      const seenNames = new Set<string>();

      try {
        // 1. Buscar en tabla doctores registrados
        const { data: regDocs } = await supabase
          .from("doctores")
          .select("id, nombre, telefono, clinica, especialidad, profile_id")
          .ilike("nombre", `%${qClean}%`)
          .limit(6);

        if (regDocs) {
          regDocs.forEach((d) => {
            const clean = normalizePersonName(d.nombre);
            seenNames.add(clean.toLowerCase());
            merged.push({
              nombre: clean,
              telefono: d.telefono || undefined,
              clinica: d.clinica || undefined,
              especialidad: d.especialidad || undefined,
            });
          });
        }

        // 2. Buscar en historial de pedidos para doctores frecuentes
        const { data: pastOrders } = await supabase
          .from("pedidos")
          .select("doctor_nombre, doctor_telefono, observaciones")
          .ilike("doctor_nombre", `%${qClean}%`)
          .order("fecha_ingreso", { ascending: false })
          .limit(8);

        if (pastOrders) {
          pastOrders.forEach((p) => {
            const clean = normalizePersonName(p.doctor_nombre || "");
            if (clean && !seenNames.has(clean.toLowerCase())) {
              seenNames.add(clean.toLowerCase());

              // Extraer dirección previa de delivery si existió en observaciones
              let pastDir: string | undefined = undefined;
              let pastClinica: string | undefined = undefined;
              if (p.observaciones && p.observaciones.includes("DELIVERY:")) {
                const matchDir = p.observaciones.match(/Dir:\s*([^|()]+)/);
                if (matchDir) pastDir = matchDir[1].trim();
                const matchCli = p.observaciones.match(/DELIVERY:\s*([^|()]+)/);
                if (matchCli && !matchCli[1].toLowerCase().includes("consultorio")) {
                  pastClinica = matchCli[1].trim();
                }
              }

              merged.push({
                nombre: clean,
                telefono: p.doctor_telefono || undefined,
                clinica: pastClinica,
                direccion: pastDir,
              });
            }
          });
        }
      } catch (err) {
        console.warn("Error buscando doctores:", err);
      }

      setDoctorObjSuggestions(merged);
      setSuggestions((prev) => ({ ...prev, doctor: merged.map((m) => m.nombre) }));
      setVisibleSuggest((prev) => ({ ...prev, doctor: merged.length > 0 }));
      return;
    }

    // 👤 Búsqueda estándar para Paciente, Color, Colímetro
    const columnMap: Record<SuggestionType, string> = {
      doctor: "doctor_nombre",
      paciente: "paciente_nombre",
      color: "color_pieza",
      colimetro: "colimetro",
    };
    const column = columnMap[type];

    const { data, error } = await supabase.from("pedidos").select(column).ilike(column, `%${qClean}%`).limit(6);

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

  // ✅ Seleccionar sugerencia completa de Doctor
  async function handleSelectDoctorObj(doc: DoctorSuggestion) {
    setVisibleSuggest((prev) => ({ ...prev, doctor: false }));
    setSelectedDoctorObj(doc);

    const selectedName = normalizePersonName(doc.nombre);

    // Si no tiene dirección guardada en el objeto, buscar la última orden con delivery de este doctor
    let foundDir = doc.direccion;
    let foundClinica = doc.clinica;
    let foundTel = doc.telefono;

    try {
      const { data: lastOrder } = await supabase
        .from("pedidos")
        .select("doctor_telefono, observaciones")
        .ilike("doctor_nombre", selectedName)
        .order("fecha_ingreso", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastOrder) {
        if (!foundTel && lastOrder.doctor_telefono) {
          foundTel = lastOrder.doctor_telefono;
        }
        if (!foundDir && lastOrder.observaciones && lastOrder.observaciones.includes("DELIVERY:")) {
          const match = lastOrder.observaciones.match(/Dir:\s*([^|()]+)/);
          if (match) foundDir = match[1].trim();
          const matchCli = lastOrder.observaciones.match(/DELIVERY:\s*([^|()]+)/);
          if (matchCli && !matchCli[1].toLowerCase().includes("consultorio")) {
            foundClinica = foundClinica || matchCli[1].trim();
          }
        }
      }
    } catch (e) {
      console.warn("Lookup past delivery address error:", e);
    }

    setForm((prev) => {
      const updated = {
        ...prev,
        doctor_nombre: selectedName,
        doctor_telefono: foundTel ? onlyDigits(foundTel) : prev.doctor_telefono,
        clinica_nombre: foundClinica || prev.clinica_nombre,
      };

      if (foundDir) {
        updated.direccion_entrega = foundDir;
      }
      if (foundTel && !updated.telefono_entrega) {
        updated.telefono_entrega = onlyDigits(foundTel);
      }

      return updated;
    });

    if (doc.latitud != null && doc.longitud != null) {
      setLatitudEntrega(doc.latitud);
      setLongitudEntrega(doc.longitud);
    }

    toast.success(`Doctor/a ${selectedName} seleccionado`, {
      description: foundClinica ? `Clínica: ${foundClinica}` : undefined,
    });

    setTimeout(() => pacienteRef.current?.focus(), 60);
  }

  // ✅ Seleccionar sugerencia genérica (paciente, color, colimetro)
  async function handleSelectSuggestion(type: SuggestionType, value: string) {
    setVisibleSuggest((prev) => ({ ...prev, [type]: false }));

    if (type === "doctor") {
      const matched = doctorObjSuggestions.find((d) => d.nombre.toLowerCase() === value.toLowerCase());
      if (matched) {
        handleSelectDoctorObj(matched);
        return;
      }
      handleSelectDoctorObj({ nombre: value });
      return;
    }

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

      const telefonoValue = data ? String(data.paciente_telefono ?? "") : "";

      setForm((prev) => ({
        ...prev,
        paciente_nombre: selectedName,
        paciente_telefono: onlyDigits(telefonoValue),
      }));

      setTimeout(() => trabajoRef.current?.focus(), 60);
    } else {
      const col = type === "color" ? "color_pieza" : "colimetro";
      setForm((prev) => ({ ...prev, [col]: value }));
    }
  }

  // ⚠️ Validar número duplicado
  async function checkNumeroExists(num: string) {
    const clean = num.trim();
    if (!clean) return false;

    const { data, error } = await supabase.from("pedidos").select("id").eq("numero_requerimiento", clean).maybeSingle();

    if (error) {
      console.error("checkNumeroExists error:", error);
      return false;
    }

    return !!data;
  }

  function clearAll() {
    const now = new Date();
    setForm({
      ...emptyForm,
      fecha_ingreso: now.toISOString().split("T")[0],
      hora_ingreso: now.toTimeString().slice(0, 5),
    });
    setMostrarAnticipo(false);
    setNumError("");
    setTimeout(() => reqRef.current?.focus(), 60);
  }

  const requiredOk = useMemo(() => {
    const doctorNombreClean = normalizePersonName(form.doctor_nombre);
    const pacienteNombreClean = normalizePersonName(form.paciente_nombre);

    return (
      !!form.numero_requerimiento.trim() &&
      !!doctorNombreClean.trim() &&
      !!pacienteNombreClean.trim() &&
      !!form.trabajo_realizar.trim() &&
      !!form.pieza_numero.trim() &&
      !!String(form.total).trim() &&
      Number(form.total) > 0
    );
  }, [
    form.numero_requerimiento,
    form.doctor_nombre,
    form.paciente_nombre,
    form.trabajo_realizar,
    form.pieza_numero,
    form.total,
  ]);

  const completion = useMemo(() => {
    const fields = [
      !!form.numero_requerimiento.trim(),
      !!normalizePersonName(form.doctor_nombre).trim(),
      !!normalizePersonName(form.paciente_nombre).trim(),
      !!form.trabajo_realizar.trim(),
      !!form.pieza_numero.trim(),
      !!String(form.total).trim(),
      !!form.doctor_telefono.trim(),
      !!form.paciente_telefono.trim(),
      !!form.color_pieza.trim(),
      !!form.colimetro.trim(),
      !!form.numero_caja.trim(),
      !!form.observaciones.trim(),
      !mostrarAnticipo || !!String(form.anticipo).trim(),
    ];
    const done = fields.filter(Boolean).length;
    return Math.round((done / fields.length) * 100);
  }, [form, mostrarAnticipo]);

  // 💾 Guardar pedido (SECRETARIA -> directo a producción)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const doctorNombreClean = normalizePersonName(form.doctor_nombre);
    const pacienteNombreClean = normalizePersonName(form.paciente_nombre);

    if (await checkNumeroExists(form.numero_requerimiento)) {
      setNumError("⚠️ Este número de requerimiento ya está en uso");
      reqRef.current?.focus();
      return;
    }

    if (!requiredOk) {
      toast.error("Completa los campos obligatorios (*)");
      if (!form.numero_requerimiento.trim()) reqRef.current?.focus();
      else if (!doctorNombreClean.trim()) doctorRef.current?.focus();
      else if (!pacienteNombreClean.trim()) pacienteRef.current?.focus();
      else if (!form.trabajo_realizar.trim()) trabajoRef.current?.focus();
      else if (!form.pieza_numero.trim()) piezaRef.current?.focus();
      else totalRef.current?.focus();
      return;
    }

    const totalNum = Number(form.total) || 0;
    if (totalNum <= 0) {
      toast.error("El monto total debe ser mayor que 0");
      totalRef.current?.focus();
      return;
    }

    const anticipoNum = mostrarAnticipo && form.anticipo ? Number(form.anticipo) : 0;
    if (anticipoNum < 0) {
      toast.error("El anticipo no puede ser negativo");
      return;
    }
    if (anticipoNum > totalNum) {
      toast.error("El anticipo no puede ser mayor que el total");
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
      return;
    }

    // Formatear logística de delivery en observaciones si se activó
    let finalObservaciones = form.observaciones?.trim() || "";
    if (form.requiere_delivery && form.direccion_entrega.trim()) {
      const gpsPart =
        latitudEntrega != null && longitudEntrega != null
          ? ` | GPS: ${latitudEntrega.toFixed(5)}, ${longitudEntrega.toFixed(5)}`
          : "";
      const deliveryTag = `[🚚 DELIVERY: ${form.clinica_nombre.trim() || "Consultorio"} | Dir: ${form.direccion_entrega.trim()}${form.referencia_entrega.trim() ? ` (Ref: ${form.referencia_entrega.trim()})` : ""}${form.telefono_entrega.trim() ? ` | Contacto: ${form.telefono_entrega.trim()}` : ""}${gpsPart}]`;
      finalObservaciones = finalObservaciones
        ? `${finalObservaciones}\n${deliveryTag}`
        : deliveryTag;
    }

    // ✅ SECRETARIA: pedido ya validado => estado "pendiente"
    const { error } = await supabase.from("pedidos").insert([
      {
        numero_requerimiento: form.numero_requerimiento.trim(),
        fecha_ingreso: form.fecha_ingreso,
        hora_ingreso: form.hora_ingreso,

        // Secretaria guarda directo (sin doctor_id)
        doctor_id: null,
        doctor_nombre: doctorNombreClean,
        doctor_telefono: form.doctor_telefono?.trim() ? onlyDigits(form.doctor_telefono) : null,

        paciente_nombre: pacienteNombreClean,
        paciente_telefono: form.paciente_telefono?.trim() ? onlyDigits(form.paciente_telefono) : null,

        trabajo_realizar: form.trabajo_realizar.trim(),
        pieza_numero: form.pieza_numero.trim(),
        color_pieza: form.color_pieza.trim() || null,
        colimetro: form.colimetro.trim() || null,

        numero_caja: (form.numero_caja?.trim() || "00").padStart(2, "0"),
        observaciones: finalObservaciones || null,

        anticipo: anticipoNum,
        total: totalNum,

        estado: "pendiente",
        creado_por: user.id,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error("insert pedido error:", error);
      toast.error(`❌ Error al guardar: ${error.message}`);
      return;
    }

    toast.success("✅ Guardado con éxito (Producción)");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1800);

    clearAll();
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 relative">
      {/* ✅ Overlay éxito (mantiene el “efecto”) */}
      {showSuccess && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm z-50">
          <div className="bg-white border shadow-xl rounded-3xl px-8 py-7 flex flex-col items-center animate-in fade-in zoom-in">
            <div className="relative">
              <div className="absolute -inset-3 rounded-full bg-green-100 blur-md" />
              <CheckCircle2 className="relative text-green-600 w-20 h-20 mb-3 animate-bounce" />
            </div>
            <p className="text-green-700 font-semibold text-lg text-center">Guardado con éxito (Producción)</p>
            <p className="text-xs text-muted-foreground mt-1">Creado por Secretaría y enviado a producción.</p>
          </div>
        </div>
      )}

      {/* ✅ Header pro + completitud + acciones */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 py-4 mb-6 rounded-2xl px-4 sm:px-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[#3C1C6C] dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[#A57CFA]" /> Nuevo Requerimiento
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">Creación directa: entra a producción con estado “pendiente”.</p>

            <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
              <span className="inline-flex items-center gap-1 font-medium">
                <ClipboardCheck className="w-4 h-4 text-[#A57CFA]" /> Completitud
              </span>
              <div className="h-2 w-36 sm:w-48 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#3C1C6C] via-[#6329B7] to-[#A57CFA] transition-all duration-300" style={{ width: `${completion}%` }} />
              </div>
              <span className="font-bold text-[#3C1C6C] dark:text-[#A57CFA]">{completion}%</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
            <Button type="button" variant="outline" onClick={clearAll} className="text-xs h-9 sm:h-10 flex items-center gap-1.5 border-slate-200 hover:bg-rose-50 hover:text-rose-600" disabled={loading}>
              <X className="w-3.5 h-3.5" /> Limpiar
            </Button>

            <Button
              type="submit"
              form="secretary-new-order-form"
              className="bg-[#3C1C6C] hover:bg-[#2C1550] text-white text-xs sm:text-sm h-9 sm:h-10 px-4 sm:px-5 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-purple-950/20"
              disabled={loading || !requiredOk}
              title={!requiredOk ? "Completa los campos obligatorios (*)" : "Guardar requerimiento"}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Guardar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Card className="shadow-sm rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-[#3C1C6C] dark:text-white text-lg sm:text-xl font-black flex items-center gap-2">
            📝 Datos del Pedido Dental
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form
            id="secretary-new-order-form"
            onSubmit={handleSubmit}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            {/* ✅ Meta */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl border bg-white">
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" /> N° Requerimiento{" "}
                  <span className="text-red-500">*</span>
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

            {/* ✅ Doctor */}
            <div className="lg:col-span-1 p-4 rounded-2xl border bg-white space-y-3">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-muted-foreground" /> Doctor
              </p>

              <div className="relative space-y-1">
                <label className="text-sm font-medium">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <Input
                  ref={doctorRef}
                  name="doctor_nombre"
                  value={form.doctor_nombre}
                  onChange={handleChange}
                  placeholder="Nombre del doctor"
                  required
                  autoComplete="off"
                  onBlur={() => setTimeout(() => setVisibleSuggest((p) => ({ ...p, doctor: false })), 150)}
                />

                {visibleSuggest.doctor && doctorObjSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-1 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-150">
                    {doctorObjSuggestions.map((doc, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectDoctorObj(doc);
                        }}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-purple-50/70 cursor-pointer transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-800 flex items-center gap-1.5 truncate">
                            <Stethoscope className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span>{doc.nombre}</span>
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                            {doc.clinica && (
                              <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded">
                                🏥 {doc.clinica}
                              </span>
                            )}
                            {doc.telefono && (
                              <span className="text-slate-500">
                                📞 {doc.telefono}
                              </span>
                            )}
                            {doc.direccion && (
                              <span className="text-purple-600 truncate max-w-[200px]">
                                📍 {doc.direccion}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full shrink-0">
                          Elegir
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">Tip: escribe 2 letras para sugerencias.</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" /> Teléfono
                </label>
                <Input
                  name="doctor_telefono"
                  value={form.doctor_telefono}
                  onChange={handleChange}
                  placeholder="Solo números"
                  inputMode="numeric"
                />
              </div>
            </div>

            {/* ✅ Paciente */}
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
                    <div className="absolute top-full left-0 w-full mt-1 z-50 bg-white border rounded-xl shadow-lg overflow-hidden max-h-56 overflow-auto">
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

                  <p className="text-xs text-muted-foreground">Seleccionar paciente autocompleta teléfono si existe.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" /> Teléfono
                  </label>
                  <Input
                    name="paciente_telefono"
                    value={form.paciente_telefono}
                    onChange={handleChange}
                    placeholder="Solo números"
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>

            {/* ✅ Trabajo */}
            <div className="lg:col-span-3 p-4 rounded-2xl border bg-white space-y-3">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-muted-foreground" /> Trabajo
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium">
                    Trabajo a realizar <span className="text-red-500">*</span>
                  </label>
                  <Input
                    ref={trabajoRef}
                    name="trabajo_realizar"
                    value={form.trabajo_realizar}
                    onChange={handleChange}
                    placeholder="Ej: Corona porcelana"
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

                {/* Color */}
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
                    <div className="absolute top-full left-0 w-full mt-1 z-50 bg-white border rounded-xl shadow-lg overflow-hidden max-h-56 overflow-auto">
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

                {/* Colímetro */}
                <div className="relative space-y-1">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-muted-foreground" /> Colímetro
                  </label>
                  <Input
                    name="colimetro"
                    value={form.colimetro}
                    onChange={handleChange}
                    placeholder="Ej: Vita"
                    autoComplete="off"
                    onBlur={() => setTimeout(() => setVisibleSuggest((p) => ({ ...p, colimetro: false })), 150)}
                  />

                  {visibleSuggest.colimetro && suggestions.colimetro.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-1 z-50 bg-white border rounded-xl shadow-lg overflow-hidden max-h-56 overflow-auto">
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

                {/* Caja */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">Caja</label>
                  <Input
                    name="numero_caja"
                    value={form.numero_caja}
                    onChange={handleChange}
                    placeholder="01"
                    maxLength={2}
                  />
                  <p className="text-xs text-muted-foreground">2 dígitos (ej: 01)</p>
                </div>
              </div>
            </div>

            {/* ✅ Montos */}
            <div className="lg:col-span-3 p-4 rounded-2xl border bg-white space-y-3">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-muted-foreground" /> Pagos
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-1">
                  <label className="text-sm font-medium">
                    Total (Bs) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    ref={totalRef}
                    type="number"
                    name="total"
                    value={form.total}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    required
                    placeholder="Ej: 120.00"
                  />
                </div>

                <div className="md:col-span-2 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="mostrarAnticipo"
                      checked={mostrarAnticipo}
                      onChange={() => {
                        setMostrarAnticipo(!mostrarAnticipo);
                        if (mostrarAnticipo) setForm((p) => ({ ...p, anticipo: "" }));
                      }}
                    />
                    <label htmlFor="mostrarAnticipo" className="cursor-pointer text-sm text-gray-700">
                      Agregar anticipo
                    </label>
                  </div>

                  {mostrarAnticipo && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium">Anticipo (Bs)</label>
                        <Input
                          type="number"
                          name="anticipo"
                          value={form.anticipo}
                          onChange={handleChange}
                          step="0.01"
                          min="0"
                          placeholder="Ej: 50.00"
                        />
                      </div>

                      <div className="rounded-2xl border border-purple-200 bg-purple-50/70 dark:bg-purple-950/30 px-4 py-3">
                        <p className="text-xs font-semibold text-[#3C1C6C] dark:text-[#D0B9FF]">Saldo restante</p>
                        <p className="text-xl font-black text-[#3C1C6C] dark:text-white">Bs {saldoRestante.toFixed(2)}</p>
                        {saldoRestante < 0 && <p className="text-xs text-rose-600 font-semibold">⚠️ Anticipo supera el total</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ✅ Observaciones */}
            <div className="lg:col-span-3 p-4 rounded-2xl border bg-white space-y-2">
              <label className="text-sm font-medium">Observaciones</label>
              <Textarea
                name="observaciones"
                value={form.observaciones}
                onChange={handleChange}
                placeholder="Notas técnicas, materiales, acabados, instrucciones especiales, etc."
                className="min-h-[110px]"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Opcional</span>
                <span>{(form.observaciones || "").length} caracteres</span>
              </div>
            </div>

            {/* 🚚 Logística de Despacho & Delivery (Opcional) */}
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
                      Indica si el trabajo terminado será enviado por delivery al consultorio o clínica.
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
                </div>
              )}
            </div>

            {/* ✅ Footer acciones */}
            <div className="lg:col-span-3 flex flex-col sm:flex-row gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={clearAll} className="flex items-center gap-2 border-slate-200 hover:bg-rose-50 hover:text-rose-600" disabled={loading}>
                <X className="w-4 h-4" /> Limpiar
              </Button>

              <Button
                type="submit"
                className="bg-[#3C1C6C] hover:bg-[#2C1550] text-white font-bold px-6 h-11 rounded-xl shadow-md shadow-purple-950/20 flex items-center gap-2"
                disabled={loading || !requiredOk}
                title={!requiredOk ? "Completa los campos obligatorios (*)" : "Guardar requerimiento"}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Guardar (Producción)
                  </>
                )}
              </Button>
            </div>

            <div className="lg:col-span-3">
              <p className="text-xs text-muted-foreground">
                Campos obligatorios: <span className="font-semibold">Requerimiento, Doctor, Paciente, Trabajo, Pieza y Total</span>.
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
          toast.success("📍 Ubicación fijada en el mapa con éxito");
        }}
        initialLat={latitudEntrega || -16.4955}
        initialLng={longitudEntrega || -68.1336}
        initialAddress={form.direccion_entrega}
        clinicaNombre={form.clinica_nombre || form.doctor_nombre || "Consultorio Dental"}
      />
    </div>
  );
}
