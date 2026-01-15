"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

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
}

export default function SecretaryNewOrderPage() {
  const [form, setForm] = useState<PedidoForm>({
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
  });

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

  const [visibleSuggest, setVisibleSuggest] = useState<Record<SuggestionType, boolean>>({
    doctor: false,
    paciente: false,
    color: false,
    colimetro: false,
  });

  // 🕒 Fecha y hora automáticas
  useEffect(() => {
    const now = new Date();
    setForm((prev) => ({
      ...prev,
      fecha_ingreso: now.toISOString().split("T")[0],
      hora_ingreso: now.toTimeString().slice(0, 5),
    }));
  }, []);

  // 💵 Calcular saldo restante
  useEffect(() => {
    const total = parseFloat(form.total) || 0;
    const anticipo = parseFloat(form.anticipo) || 0;
    setSaldoRestante(total - anticipo);
  }, [form.total, form.anticipo]);

  // 🔄 Manejar cambios
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (name === "numero_requerimiento") setNumError("");

    if (name === "doctor_nombre") fetchSuggestions("doctor", value);
    if (name === "paciente_nombre") fetchSuggestions("paciente", value);
    if (name === "color_pieza") fetchSuggestions("color", value);
    if (name === "colimetro") fetchSuggestions("colimetro", value);
  }

  // 🔍 Buscar sugerencias
  async function fetchSuggestions(type: SuggestionType, query: string) {
    if (query.length < 2) {
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

    const { data, error } = await supabase
      .from("pedidos")
      .select(column)
      .ilike(column, `%${query}%`)
      .limit(5);

    if (error || !data) return console.error(error);

    // ✅ Corregido TS7015
    const unique = Array.from(
      new Set((data as Record<string, any>[]).map((d) => d[column]))
    ).filter(Boolean);

    setSuggestions((prev) => ({ ...prev, [type]: unique as string[] }));
    setVisibleSuggest((prev) => ({ ...prev, [type]: true }));
  }

  // ✅ Seleccionar sugerencia (autocompleta y rellena teléfono si aplica)
  async function handleSelectSuggestion(type: SuggestionType, value: string) {
    setVisibleSuggest((prev) => ({ ...prev, [type]: false }));

    if (type === "doctor" || type === "paciente") {
      const telefonoCol = type === "doctor" ? "doctor_telefono" : "paciente_telefono";
      const nombreCol = type === "doctor" ? "doctor_nombre" : "paciente_nombre";

      const { data } = await supabase
        .from("pedidos")
        .select(`${telefonoCol}`)
        .eq(nombreCol, value)
        .order("fecha_ingreso", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Evitar convertir 'undefined' a 'string': primero verificar y usar Record<string, any>
      const telefonoValue = data ? String((data as Record<string, any>)[telefonoCol] ?? "") : "";

      setForm((prev) => ({
        ...prev,
        [nombreCol]: value,
        [telefonoCol]: telefonoValue,
      }));
    } else {
      const col = type === "color" ? "color_pieza" : "colimetro";
      setForm((prev) => ({ ...prev, [col]: value }));
    }
  }

  // ⚠️ Validar número duplicado
  async function checkNumeroExists(num: string) {
    if (!num.trim()) return false;
    const { data } = await supabase.from("pedidos").select("id").eq("numero_requerimiento", num).maybeSingle();
    return !!data;
  }

  // 👨‍⚕️ Obtener o crear doctor
  async function getOrCreateDoctor(nombre: string, telefono: string) {
    if (!nombre.trim()) return null;
    const { data: existing } = await supabase.from("doctores").select("id").ilike("clinica", nombre).maybeSingle();
    if (existing) return existing.id;

    const { data: profile } = await supabase.from("profiles").select("id").ilike("nombre", nombre).maybeSingle();
    const { data: newDoctor } = await supabase
      .from("doctores")
      .insert([{ profile_id: profile?.id || null, clinica: nombre, created_at: new Date() }])
      .select("id")
      .single();

    return newDoctor?.id || null;
  }

  // 💾 Guardar pedido
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (await checkNumeroExists(form.numero_requerimiento)) {
      setNumError("⚠️ Este número de requerimiento ya está en uso");
      return;
    }

    if (!form.numero_requerimiento || !form.doctor_nombre || !form.paciente_nombre || !form.trabajo_realizar || !form.pieza_numero || !form.total) {
      toast.error("Completa los campos obligatorios (*)");
      return;
    }

    if (Number(form.total) <= 0) {
      toast.error("El monto total debe ser mayor que 0");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const doctorId = await getOrCreateDoctor(form.doctor_nombre, form.doctor_telefono);

    const { error } = await supabase.from("pedidos").insert([{
      numero_requerimiento: form.numero_requerimiento,
      fecha_ingreso: form.fecha_ingreso,
      hora_ingreso: form.hora_ingreso,
      doctor_id: doctorId,
      doctor_nombre: form.doctor_nombre,
      doctor_telefono: form.doctor_telefono,
      paciente_nombre: form.paciente_nombre,
      paciente_telefono: form.paciente_telefono,
      trabajo_realizar: form.trabajo_realizar,
      pieza_numero: form.pieza_numero,
      color_pieza: form.color_pieza,
      colimetro: form.colimetro,
      numero_caja: form.numero_caja,
      observaciones: form.observaciones,
      anticipo: mostrarAnticipo && form.anticipo ? Number(form.anticipo) : 0,
      total: Number(form.total),
      creado_por: user?.id,
    }]);

    setLoading(false);

    if (error) {
      console.error(error);
      toast.error("❌ Error al guardar el requerimiento");
      return;
    }

    toast.success("✅ Requerimiento creado correctamente");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);

    const now = new Date();
    setForm({
      numero_requerimiento: "",
      fecha_ingreso: now.toISOString().split("T")[0],
      hora_ingreso: now.toTimeString().slice(0, 5),
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
    });
  }

  return (
    <div className="max-w-3xl mx-auto py-10 relative">
      {/* ✅ Overlay de éxito */}
      {showSuccess && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50 animate-fade-in">
          <CheckCircle2 className="text-green-600 w-20 h-20 mb-3 animate-bounce" />
          <p className="text-green-700 font-semibold text-lg">Requerimiento guardado con éxito</p>
        </div>
      )}

      <Card className="shadow-md relative">
        <CardHeader>
          <CardTitle className="text-green-700 text-2xl font-bold">📝 Nuevo Requerimiento de Trabajo</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Número requerimiento */}
            <div>
              <label>N° Requerimiento *</label>
              <Input name="numero_requerimiento" value={form.numero_requerimiento} onChange={handleChange} placeholder="Ej: 000123" required className={numError ? "border-red-500" : ""} />
              {numError && <p className="text-red-500 text-xs mt-1">{numError}</p>}
            </div>

            <div>
              <label>Fecha de ingreso</label>
              <Input type="date" name="fecha_ingreso" value={form.fecha_ingreso} readOnly className="bg-gray-100 cursor-not-allowed" />
            </div>

            <div>
              <label>Hora de ingreso</label>
              <Input type="time" name="hora_ingreso" value={form.hora_ingreso} readOnly className="bg-gray-100 cursor-not-allowed" />
            </div>

            {/* Doctor */}
            <div className="relative">
              <label>Doctor *</label>
              <Input name="doctor_nombre" value={form.doctor_nombre} onChange={handleChange} placeholder="Nombre del doctor" required autoComplete="off" />
              {visibleSuggest.doctor && suggestions.doctor.map((d, i) => (
                <div key={i} onClick={() => handleSelectSuggestion("doctor", d)} className="absolute z-10 bg-white border rounded-md shadow-md w-full px-3 py-2 hover:bg-green-100 cursor-pointer text-sm">
                  {d}
                </div>
              ))}
            </div>

            <div>
              <label>Teléfono Doctor</label>
              <Input name="doctor_telefono" value={form.doctor_telefono} onChange={handleChange} placeholder="Teléfono del doctor" />
            </div>

            {/* Paciente */}
            <div className="relative">
              <label>Paciente *</label>
              <Input name="paciente_nombre" value={form.paciente_nombre} onChange={handleChange} placeholder="Nombre del paciente" required autoComplete="off" />
              {visibleSuggest.paciente && suggestions.paciente.map((p, i) => (
                <div key={i} onClick={() => handleSelectSuggestion("paciente", p)} className="absolute z-10 bg-white border rounded-md shadow-md w-full px-3 py-2 hover:bg-green-100 cursor-pointer text-sm">
                  {p}
                </div>
              ))}
            </div>

            <div>
              <label>Teléfono Paciente</label>
              <Input name="paciente_telefono" value={form.paciente_telefono} onChange={handleChange} placeholder="Teléfono del paciente" />
            </div>

            <div>
              <label>Trabajo a realizar *</label>
              <Input name="trabajo_realizar" value={form.trabajo_realizar} onChange={handleChange} placeholder="Ej: Corona metal-porcelana" required />
            </div>

            <div>
              <label>Pieza N° *</label>
              <Input name="pieza_numero" value={form.pieza_numero} onChange={handleChange} placeholder="Ej: 24" required />
            </div>

            {/* Color + Colímetro + Caja */}
            <div className="relative">
              <label>Color pieza</label>
              <Input name="color_pieza" value={form.color_pieza} onChange={handleChange} placeholder="Ej: A2" autoComplete="off" />
              {visibleSuggest.color && suggestions.color.map((c, i) => (
                <div key={i} onClick={() => handleSelectSuggestion("color", c)} className="absolute z-10 bg-white border rounded-md shadow-md w-full px-3 py-2 hover:bg-green-100 cursor-pointer text-sm">
                  {c}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <label>Colímetro</label>
                <Input name="colimetro" value={form.colimetro} onChange={handleChange} placeholder="Ej: Vita Easyshade" autoComplete="off" />
                {visibleSuggest.colimetro && suggestions.colimetro.map((c, i) => (
                  <div key={i} onClick={() => handleSelectSuggestion("colimetro", c)} className="absolute z-10 bg-white border rounded-md shadow-md w-full px-3 py-2 hover:bg-green-100 cursor-pointer text-sm">
                    {c}
                  </div>
                ))}
              </div>

              <div className="w-20">
                <label>Caja</label>
                <Input name="numero_caja" value={form.numero_caja} onChange={handleChange} placeholder="01" maxLength={2} />
              </div>
            </div>

            {/* Montos */}
            <div className="md:col-span-2 border-t pt-3 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="mostrarAnticipo"
                  checked={mostrarAnticipo}
                  onChange={() => {
                    setMostrarAnticipo(!mostrarAnticipo);
                    if (mostrarAnticipo) setForm({ ...form, anticipo: "" });
                  }}
                />
                <label htmlFor="mostrarAnticipo" className="cursor-pointer text-sm text-gray-700">
                  Agregar anticipo
                </label>
              </div>

              {mostrarAnticipo && (
                <div className="transition-all">
                  <label>Anticipo</label>
                  <Input type="number" name="anticipo" value={form.anticipo} onChange={handleChange} placeholder="Ej: 50.00" step="0.01" min="0" />
                </div>
              )}

              <div className="mt-2">
                <label>Total *</label>
                <Input type="number" name="total" value={form.total} onChange={handleChange} placeholder="Ej: 120.00" step="0.01" min="0" required />
              </div>

              {mostrarAnticipo && (
                <p className="text-sm text-gray-700 mt-2">
                  💰 Saldo restante: <span className="font-semibold text-green-700">${saldoRestante.toFixed(2)}</span>
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label>Observaciones</label>
              <Textarea name="observaciones" value={form.observaciones} onChange={handleChange} placeholder="Notas técnicas, materiales, acabados, instrucciones especiales, etc." />
            </div>

            <div className="md:col-span-2 text-right">
              <Button type="submit" className="bg-green-700 hover:bg-green-800 text-white" disabled={loading}>
                {loading ? "Guardando..." : "Guardar Requerimiento"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
