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
  Wand2,
  Copy,
  Truck,
  Building2,
  MapPin,
} from "lucide-react";
import { toBoliviaYMD, getBoliviaCurrentTimeString } from "@/lib/dateUtils";
import { TrabajoSelector } from "@/components/orders/TrabajoSelector";
import { DualPrice } from "@/components/common/DualPrice";
import { ControlComponentes, ComponenteItem } from "@/components/orders/ControlComponentes";
import { PaymentMethodSelector } from "@/components/orders/PaymentMethodSelector";
import { addCajaMovimiento, getActiveCajaSession } from "@/lib/cashService";
import { getCachedExchangeRate } from "@/lib/currency";

type SuggestionType = "doctor" | "paciente" | "color" | "colimetro";

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

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function AdminNewOrderPage() {
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

      numero_caja: "",
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
  const [componentesCaja, setComponentesCaja] = useState<ComponenteItem[]>([]);
  const [pagoMoneda, setPagoMoneda] = useState<"BOB" | "USD">("BOB");
  const [pagoMetodo, setPagoMetodo] = useState<"efectivo" | "qr_transferencia">("efectivo");
  const [pagoComprobanteUrl, setPagoComprobanteUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [numError, setNumError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const [suggestions, setSuggestions] = useState<Record<SuggestionType, string[]>>({
    doctor: [],
    paciente: [],
    color: [],
    colimetro: [],
  });

  const [visibleSuggest, setVisibleSuggest] = useState<Record<SuggestionType, boolean>>({
    doctor: false,
    paciente: false,
    color: false,
    colimetro: false,
  });

  // refs para focus “pro”
  const reqRef = useRef<HTMLInputElement | null>(null);
  const doctorRef = useRef<HTMLInputElement | null>(null);
  const pacienteRef = useRef<HTMLInputElement | null>(null);
  const trabajoRef = useRef<HTMLInputElement | null>(null);
  const piezaRef = useRef<HTMLInputElement | null>(null);
  const totalRef = useRef<HTMLInputElement | null>(null);

  // debounce sugerencias
  const suggTimers = useRef<Record<string, any>>({});

  // 🕒 Fecha y hora automáticas (Cochabamba, Bolivia GMT-4)
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      fecha_ingreso: toBoliviaYMD(),
      hora_ingreso: getBoliviaCurrentTimeString(false),
    }));
    setTimeout(() => reqRef.current?.focus(), 80);
  }, []);

  // 💵 Calcular saldo restante (considerando moneda del pago)
  useEffect(() => {
    const total = Number(form.total) || 0;
    const anticipo = mostrarAnticipo ? Number(form.anticipo) || 0 : 0;
    const rate = getCachedExchangeRate();
    const anticipoBs = pagoMoneda === "USD" ? anticipo * rate : anticipo;
    setSaldoRestante(total - anticipoBs);
  }, [form.total, form.anticipo, mostrarAnticipo, pagoMoneda]);

  // 🔄 Manejar cambios
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;

    let v = value;

    // nombres
    if (name === "doctor_nombre" || name === "paciente_nombre") v = normalizePersonName(value);

    // teléfonos solo dígitos
    if (name === "doctor_telefono" || name === "paciente_telefono" || name === "telefono_entrega") v = onlyDigits(value);

    // caja: 2 dígitos (si quieres)
    if (name === "numero_caja") v = value.replace(/[^\d]/g, "").slice(0, 2);

    // montos: permite punto decimal, pero evita letras
    if (name === "anticipo" || name === "total") v = value.replace(/[^\d.]/g, "");

    // requerimiento
    if (name === "numero_requerimiento") {
      v = value.replace(/^\s+/, "");
      setNumError("");
    }

    setForm((prev) => ({ ...prev, [name]: v }));

    // sugerencias (debounced)
    if (name === "doctor_nombre") debouncedSuggestions("doctor", v);
    if (name === "paciente_nombre") debouncedSuggestions("paciente", v);
    if (name === "color_pieza") debouncedSuggestions("color", v);
    if (name === "colimetro") debouncedSuggestions("colimetro", v);
  }

  function debouncedSuggestions(type: SuggestionType, query: string) {
    if (suggTimers.current[type]) clearTimeout(suggTimers.current[type]);
    suggTimers.current[type] = setTimeout(() => fetchSuggestions(type, query), 180);
  }

  // 🔍 Buscar sugerencias (de pedidos previos)
  async function fetchSuggestions(type: SuggestionType, query: string) {
    if (query.trim().length < 2) {
      setVisibleSuggest((prev) => ({ ...prev, [type]: false }));
      return;
    }

    const columnMap: Record<SuggestionType, string> = {
      doctor: "doctor_nombre",
      paciente: "paciente_nombre",
      color: "color_pieza",
      colimetro: "colimetro",
    };
    const column = columnMap[type];

    const { data, error } = await supabase.from("pedidos").select(column).ilike(column, `%${query}%`).limit(6);

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

  // ✅ Seleccionar sugerencia (autocompleta y rellena teléfono si aplica)
  async function handleSelectSuggestion(type: SuggestionType, value: string) {
    setVisibleSuggest((prev) => ({ ...prev, [type]: false }));

    if (type === "doctor" || type === "paciente") {
      const telefonoCol = type === "doctor" ? "doctor_telefono" : "paciente_telefono";
      const nombreCol = type === "doctor" ? "doctor_nombre" : "paciente_nombre";

      const selectedName = normalizePersonName(value);

      const { data, error } = await supabase
        .from("pedidos")
        .select(`${telefonoCol}`)
        .ilike(nombreCol, selectedName) // más flexible
        .order("fecha_ingreso", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) console.error("telefono lookup error:", error);

      const telefonoValue = data ? String((data as Record<string, any>)[telefonoCol] ?? "") : "";

      setForm((prev) => ({
        ...prev,
        [nombreCol]: selectedName,
        [telefonoCol]: onlyDigits(telefonoValue),
      }));

      setTimeout(() => {
        if (type === "doctor") pacienteRef.current?.focus();
        else trabajoRef.current?.focus();
      }, 60);
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

  // 👨‍⚕️ Obtener o crear doctor (externo) en tabla doctores (sin profile_id)
  // Nota: aquí lo usamos como "catálogo" de doctores por nombre.
  async function getOrCreateDoctor(nombre: string) {
    const clean = nombre.trim();
    if (!clean) return null;

    const { data: existing, error: exErr } = await supabase.from("doctores").select("id").eq("clinica", clean).maybeSingle();
    if (exErr) console.error("getOrCreateDoctor existing err:", exErr);
    if (existing?.id) return existing.id as string;

    const { data: created, error: crErr } = await supabase
      .from("doctores")
      .insert([{ profile_id: null, clinica: clean }])
      .select("id")
      .single();

    if (crErr) {
      console.error("getOrCreateDoctor create err:", crErr);
      return null;
    }

    return (created?.id as string) ?? null;
  }

  function clearAll() {
    setForm({
      ...emptyForm,
      fecha_ingreso: toBoliviaYMD(),
      hora_ingreso: getBoliviaCurrentTimeString(false),
    });
    setMostrarAnticipo(false);
    setPagoMoneda("BOB");
    setPagoMetodo("efectivo");
    setPagoComprobanteUrl(null);
    setComponentesCaja([]);
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

  function quickFillExample() {
    setForm((prev) => ({
      ...prev,
      numero_requerimiento: prev.numero_requerimiento || "000123",
      doctor_nombre: prev.doctor_nombre || "Carlos Rojas",
      doctor_telefono: prev.doctor_telefono || "70000001",
      paciente_nombre: prev.paciente_nombre || "Juan Perez",
      paciente_telefono: prev.paciente_telefono || "70000002",
      trabajo_realizar: prev.trabajo_realizar || "Corona metal-porcelana",
      pieza_numero: prev.pieza_numero || "24",
      color_pieza: prev.color_pieza || "A2",
      colimetro: prev.colimetro || "Vita Easyshade",
      numero_caja: prev.numero_caja || "01",
      total: prev.total || "120",
      anticipo: prev.anticipo || "50",
    }));
    setMostrarAnticipo(true);
    toast.message("✨ Rellenado rápido", { description: "Solo es un ejemplo, ajusta y guarda." });
    setTimeout(() => totalRef.current?.focus(), 60);
  }

  // 💾 Guardar pedido (Admin => directo a producción: estado "pendiente")
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const doctorNombreClean = normalizePersonName(form.doctor_nombre);
    const pacienteNombreClean = normalizePersonName(form.paciente_nombre);

    // número único
    const existe = await checkNumeroExists(form.numero_requerimiento);
    if (existe) {
      setNumError("⚠️ Este número de requerimiento ya está en uso");
      reqRef.current?.focus();
      return;
    }

    // obligatorios
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

    const doctorId = await getOrCreateDoctor(doctorNombreClean);

    // Formatear logística de delivery en observaciones si se activó
    let finalObservaciones = form.observaciones?.trim() || "";
    if (form.requiere_delivery && form.direccion_entrega.trim()) {
      const deliveryTag = `[🚚 DELIVERY: ${form.clinica_nombre.trim() || "Consultorio"} | Dir: ${form.direccion_entrega.trim()}${form.referencia_entrega.trim() ? ` (Ref: ${form.referencia_entrega.trim()})` : ""}${form.telefono_entrega.trim() ? ` | Contacto: ${form.telefono_entrega.trim()}` : ""}]`;
      finalObservaciones = finalObservaciones
        ? `${finalObservaciones}\n${deliveryTag}`
        : deliveryTag;
    }

    // Formatear componentes de caja seleccionados
    const compChecked = componentesCaja.filter((c) => c.checked);
    if (compChecked.length > 0) {
      const compTag = `[COMPONENTES: ${compChecked.map((c) => `${c.cantidad}x ${c.nombre}`).join(", ")}]`;
      finalObservaciones = finalObservaciones
        ? `${finalObservaciones}\n${compTag}`
        : compTag;
    }

    // Formatear detalle de pago inicial / anticipo
    if (anticipoNum > 0) {
      const pagoTag = `[💳 PAGO INICIAL: ${anticipoNum.toFixed(2)} ${pagoMoneda} | Método: ${
        pagoMetodo === "qr_transferencia" ? "QR Bancario" : "Efectivo"
      }${pagoComprobanteUrl ? ` | Comprobante: ${pagoComprobanteUrl}` : ""}]`;
      finalObservaciones = finalObservaciones
        ? `${finalObservaciones}\n${pagoTag}`
        : pagoTag;
    }

    // Registrar en caja activa si existe sesión abierta
    if (anticipoNum > 0) {
      try {
        const { session: activeSession } = await getActiveCajaSession();
        if (activeSession) {
          await addCajaMovimiento({
            sesionId: activeSession.id,
            tipo: "ingreso",
            origen: "pedido_anticipo",
            metodoPago: pagoMetodo,
            moneda: pagoMoneda,
            monto: anticipoNum,
            concepto: `Anticipo Pedido #${form.numero_requerimiento.trim()} - Paciente: ${pacienteNombreClean}`,
            comprobanteUrl: pagoComprobanteUrl || undefined,
            numeroRequerimiento: form.numero_requerimiento.trim(),
            userId: user.id,
            userName: "Administrador",
          });
        }
      } catch (cajaErr) {
        console.warn("Aviso registrando en caja diaria:", cajaErr);
      }
    }

    const { error } = await supabase.from("pedidos").insert([
      {
        numero_requerimiento: form.numero_requerimiento.trim(),
        fecha_ingreso: form.fecha_ingreso,
        hora_ingreso: form.hora_ingreso,

        doctor_id: doctorId,
        doctor_nombre: doctorNombreClean,
        doctor_telefono: form.doctor_telefono?.trim() ? onlyDigits(form.doctor_telefono) : null,

        paciente_nombre: pacienteNombreClean,
        paciente_telefono: form.paciente_telefono?.trim() ? onlyDigits(form.paciente_telefono) : null,

        trabajo_realizar: form.trabajo_realizar.trim(),
        pieza_numero: form.pieza_numero.trim(),
        color_pieza: form.color_pieza.trim() || null,
        colimetro: form.colimetro.trim() || null,

        numero_caja: (form.numero_caja || "00").trim(),
        observaciones: finalObservaciones || null,

        anticipo: anticipoNum,
        total: totalNum,

        // ✅ Admin/Secretaria crean directo (no revisión)
        estado: "pendiente",

        creado_por: user.id,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error("insert pedido error:", error);
      toast.error(`❌ Error al guardar el requerimiento: ${error.message}`);
      return;
    }

    toast.success("✅ Requerimiento creado correctamente");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);

    clearAll();
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 relative">
      {/* ✅ Overlay de éxito (igual idea, más pro) */}
      {showSuccess && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm z-50">
          <div className="bg-white border shadow-xl rounded-3xl px-8 py-7 flex flex-col items-center animate-in fade-in zoom-in">
            <div className="relative">
              <div className="absolute -inset-3 rounded-full bg-green-100 blur-md" />
              <CheckCircle2 className="relative text-green-600 w-20 h-20 mb-3 animate-bounce" />
            </div>
            <p className="text-green-700 font-semibold text-lg text-center">Requerimiento guardado con éxito</p>
            <p className="text-xs text-muted-foreground mt-1">Creado por Admin y enviado a producción.</p>
          </div>
        </div>
      )}

      {/* ✅ Header sticky pro + completitud */}
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
            <Button type="button" variant="outline" onClick={quickFillExample} className="text-xs h-9 sm:h-10 flex items-center gap-1.5 border-slate-200 hover:bg-purple-50" disabled={loading}>
              <Wand2 className="w-3.5 h-3.5 text-[#A57CFA]" /> Relleno rápido
            </Button>

            <Button type="button" variant="outline" onClick={clearAll} className="text-xs h-9 sm:h-10 flex items-center gap-1.5 border-slate-200 hover:bg-rose-50 hover:text-rose-600" disabled={loading}>
              <X className="w-3.5 h-3.5" /> Limpiar
            </Button>

            <Button
              type="submit"
              form="admin-new-order-form"
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
            📝 Datos de la Orden de Trabajo
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form id="admin-new-order-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* ✅ Meta */}
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

                {visibleSuggest.doctor && suggestions.doctor.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-1 z-50 bg-white border rounded-xl shadow-lg max-h-52 overflow-auto overflow-x-hidden">
                    {suggestions.doctor.map((d, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectSuggestion("doctor", d)}
                        className="w-full text-left px-3 py-2 hover:bg-green-50 cursor-pointer text-sm flex items-center gap-2"
                      >
                        <Stethoscope className="w-4 h-4 text-muted-foreground" /> {d}
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
                    <div className="absolute top-full left-0 w-full mt-1 z-50 bg-white border rounded-xl shadow-lg max-h-52 overflow-auto overflow-x-hidden">
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
            <div className="lg:col-span-3 p-4 rounded-2xl border bg-white space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-purple-700" /> Selección de Trabajo & Catálogos Oficiales
                </p>
              </div>

              {/* Selector interactivo de catálogo oficial con auto-precio */}
              <TrabajoSelector
                selectedTrabajo={form.trabajo_realizar}
                piezas={form.pieza_numero}
                onSelect={(trabajo: any, precioBs: number) => {
                  setForm((prev) => ({
                    ...prev,
                    trabajo_realizar: trabajo.nombre,
                    total: precioBs.toFixed(2),
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
                  <Input ref={piezaRef} name="pieza_numero" value={form.pieza_numero} onChange={handleChange} placeholder="Ej: 24" required />
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
                    <div className="absolute top-full left-0 w-full mt-1 z-50 bg-white border rounded-xl shadow-lg max-h-52 overflow-auto overflow-x-hidden">
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
                    placeholder="Ej: Vita Easyshade"
                    autoComplete="off"
                    onBlur={() => setTimeout(() => setVisibleSuggest((p) => ({ ...p, colimetro: false })), 150)}
                  />

                  {visibleSuggest.colimetro && suggestions.colimetro.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-1 z-50 bg-white border rounded-xl shadow-lg max-h-52 overflow-auto overflow-x-hidden">
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
                  <Input name="numero_caja" value={form.numero_caja} onChange={handleChange} placeholder="01" maxLength={2} />
                  <p className="text-xs text-muted-foreground">2 dígitos (ej: 01)</p>
                </div>
              </div>
            </div>

            {/* ✅ Montos */}
            <div className="lg:col-span-3 p-4 rounded-2xl border bg-white space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-purple-700" /> Montos & Pagos (Bs Grande / $us Pequeño)
                </p>
                {parseFloat(form.total) > 0 && (
                  <DualPrice amountBs={parseFloat(form.total)} className="text-xs" />
                )}
              </div>

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
                    placeholder="Ej: 120.00"
                    step="0.01"
                    min="0"
                    required
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
                    <div className="space-y-3 pt-2">
                      <PaymentMethodSelector
                        monto={form.anticipo}
                        totalOrderBs={parseFloat(form.total) || 0}
                        moneda={pagoMoneda}
                        metodoPago={pagoMetodo}
                        comprobanteUrl={pagoComprobanteUrl}
                        onMontoChange={(val) => setForm((p) => ({ ...p, anticipo: val }))}
                        onMonedaChange={setPagoMoneda}
                        onMetodoPagoChange={setPagoMetodo}
                        onComprobanteUrlChange={setPagoComprobanteUrl}
                      />

                      <div className="rounded-2xl border border-purple-200 bg-purple-50/70 dark:bg-purple-950/30 px-4 py-3">
                        <p className="text-xs font-semibold text-[#3C1C6C] dark:text-[#D0B9FF]">
                          Saldo restante por cobrar:
                        </p>
                        <DualPrice
                          amountBs={saldoRestante}
                          isDebt={saldoRestante > 0}
                          bsClassName="text-xl"
                          className="mt-0.5"
                        />
                        {saldoRestante < 0 && (
                          <p className="text-xs text-rose-600 font-semibold mt-1">
                            ⚠️ El anticipo supera el total de la orden
                          </p>
                        )}
                      </div>
                    </div>
                  )}
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
                      Indica si el trabajo terminado será enviado por delivery al consultorio o clínica del doctor.
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
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-purple-600" /> Dirección de Entrega
                    </label>
                    <Input
                      name="direccion_entrega"
                      value={form.direccion_entrega}
                      onChange={handleChange}
                      placeholder="Ej. Av. Busch #1234, Piso 3, Of. 301"
                      className="h-9 text-xs rounded-xl border-slate-200"
                    />
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
                    <Save className="w-4 h-4" /> Guardar Requerimiento
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
    </div>
  );
}
