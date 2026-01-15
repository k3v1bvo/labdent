"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

type SuggestionType = "paciente" | "color" | "colimetro";

export default function DoctorNewOrderPage() {
  const [form, setForm] = useState({
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
  });

  const [loading, setLoading] = useState(false);
  const [numError, setNumError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

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

  // 🕒 Fecha y hora automáticas
  useEffect(() => {
    const now = new Date();
    setForm((prev) => ({
      ...prev,
      fecha_ingreso: now.toISOString().split("T")[0],
      hora_ingreso: now.toTimeString().slice(0, 5),
    }));
  }, []);

  // 👨‍⚕️ Cargar datos del doctor autenticado
  useEffect(() => {
    async function loadDoctorData() {
      const { data: { user } } = await supabase.auth.getUser();
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
          doctor_nombre: profile.nombre,
          doctor_telefono: profile.telefono || "",
        }));
      }
    }

    loadDoctorData();
  }, []);

  // 🔄 Manejar cambios
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "numero_requerimiento") setNumError("");

    // 🔍 Sugerencias dinámicas
    if (name === "paciente_nombre") fetchSuggestions("paciente", value);
    if (name === "color_pieza") fetchSuggestions("color", value);
    if (name === "colimetro") fetchSuggestions("colimetro", value);
  }

  // 🔍 Buscar sugerencias (globales)
  async function fetchSuggestions(type: SuggestionType, query: string) {
    if (query.length < 2) {
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
      .limit(10);

    if (error || !data) return console.error(error);

    const unique = Array.from(
      new Set((data as Record<string, any>[]).map((d) => d[column]))
    ).filter(Boolean);

    setSuggestions((prev) => ({ ...prev, [type]: unique as string[] }));
    setVisibleSuggest((prev) => ({ ...prev, [type]: true }));
  }

  // ✅ Seleccionar sugerencia
  async function handleSelectSuggestion(type: SuggestionType, value: string) {
    setVisibleSuggest((prev) => ({ ...prev, [type]: false }));

    if (type === "paciente") {
      const { data } = await supabase
        .from("pedidos")
        .select("paciente_telefono")
        .eq("paciente_nombre", value)
        .order("fecha_ingreso", { ascending: false })
        .limit(1)
        .maybeSingle();

      const telefonoValue = data ? String((data as Record<string, any>)["paciente_telefono"] ?? "") : "";
      setForm((prev) => ({ ...prev, paciente_nombre: value, paciente_telefono: telefonoValue }));
    } else {
      const col = type === "color" ? "color_pieza" : "colimetro";
      setForm((prev) => ({ ...prev, [col]: value }));
    }
  }

  // ⚠️ Validar número único
  async function checkNumeroExists(num: string) {
    if (!num.trim()) return false;
    const { data } = await supabase
      .from("pedidos")
      .select("id")
      .eq("numero_requerimiento", num)
      .maybeSingle();
    return !!data;
  }

  // 💾 Guardar pedido (corregido con doctor_id)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.numero_requerimiento || !form.paciente_nombre || !form.trabajo_realizar || !form.pieza_numero) {
      toast.error("Completa los campos obligatorios (*)");
      return;
    }

    const existe = await checkNumeroExists(form.numero_requerimiento);
    if (existe) {
      setNumError("⚠️ Este número de requerimiento ya está en uso");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    // ✅ Buscar doctor_id vinculado al perfil del usuario
    const { data: doctor, error: doctorError } = await supabase
      .from("doctores")
      .select("id")
      .eq("profile_id", user?.id)
      .maybeSingle();

    if (doctorError || !doctor) {
      toast.error("No se encontró el perfil del doctor asociado.");
      setLoading(false);
      return;
    }

    // ✅ Insertar pedido con doctor_id
    const { error } = await supabase.from("pedidos").insert([{
      numero_requerimiento: form.numero_requerimiento,
      fecha_ingreso: form.fecha_ingreso,
      hora_ingreso: form.hora_ingreso,
      doctor_id: doctor.id, // 👈 Aquí el fix
      doctor_nombre: form.doctor_nombre,
      doctor_telefono: form.doctor_telefono,
      paciente_nombre: form.paciente_nombre,
      paciente_telefono: form.paciente_telefono,
      trabajo_realizar: form.trabajo_realizar,
      pieza_numero: form.pieza_numero,
      color_pieza: form.color_pieza,
      colimetro: form.colimetro,
      observaciones: form.observaciones,
      creado_por: user?.id,
    }]);

    setLoading(false);

    if (error) {
      console.error(error);
      toast.error("❌ Error al guardar el pedido");
      return;
    }

    // ✅ Mostrar éxito visual
    toast.success("✅ Pedido guardado correctamente");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);

    // 🔄 Limpiar formulario
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
    }));
  }

  return (
    <div className="max-w-3xl mx-auto py-10 relative">
      {/* Overlay de éxito */}
      {showSuccess && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50 animate-fade-in">
          <CheckCircle2 className="text-green-600 w-20 h-20 mb-3 animate-bounce" />
          <p className="text-green-700 font-semibold text-lg">Pedido guardado con éxito</p>
        </div>
      )}

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-green-700 text-2xl font-bold">
            🩺 Nuevo Pedido del Doctor
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Número requerimiento */}
            <div>
              <label>N° Requerimiento *</label>
              <Input
                name="numero_requerimiento"
                value={form.numero_requerimiento}
                onChange={handleChange}
                placeholder="Ej: 000123"
                required
                className={numError ? "border-red-500" : ""}
              />
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

            <div>
              <label>Doctor</label>
              <Input name="doctor_nombre" value={form.doctor_nombre} readOnly className="bg-gray-100 cursor-not-allowed" />
            </div>

            <div>
              <label>Teléfono Doctor</label>
              <Input name="doctor_telefono" value={form.doctor_telefono} readOnly className="bg-gray-100 cursor-not-allowed" />
            </div>

            {/* Paciente */}
            <div className="relative">
              <label>Paciente *</label>
              <Input
                name="paciente_nombre"
                value={form.paciente_nombre}
                onChange={handleChange}
                placeholder="Nombre del paciente"
                required
                autoComplete="off"
              />
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

            {/* Color y Colímetro */}
            <div className="relative">
              <label>Color pieza</label>
              <Input name="color_pieza" value={form.color_pieza} onChange={handleChange} placeholder="Ej: A2" autoComplete="off" />
              {visibleSuggest.color && suggestions.color.map((c, i) => (
                <div key={i} onClick={() => handleSelectSuggestion("color", c)} className="absolute z-10 bg-white border rounded-md shadow-md w-full px-3 py-2 hover:bg-green-100 cursor-pointer text-sm">
                  {c}
                </div>
              ))}
            </div>

            <div className="relative">
              <label>Colímetro</label>
              <Input name="colimetro" value={form.colimetro} onChange={handleChange} placeholder="Ej: Vita Easyshade" autoComplete="off" />
              {visibleSuggest.colimetro && suggestions.colimetro.map((c, i) => (
                <div key={i} onClick={() => handleSelectSuggestion("colimetro", c)} className="absolute z-10 bg-white border rounded-md shadow-md w-full px-3 py-2 hover:bg-green-100 cursor-pointer text-sm">
                  {c}
                </div>
              ))}
            </div>

            <div className="md:col-span-2">
              <label>Observaciones</label>
              <Textarea name="observaciones" value={form.observaciones} onChange={handleChange} placeholder="Notas técnicas o detalles especiales..." />
            </div>

            <div className="md:col-span-2 text-right">
              <Button type="submit" className="bg-green-700 hover:bg-green-800 text-white" disabled={loading}>
                {loading ? "Guardando..." : "Guardar Pedido"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
