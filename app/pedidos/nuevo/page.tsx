"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

// Configuración de Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function NuevoPedidoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    paciente_nombre: "",
    paciente_genero: "H",
    piezas: "",
    observaciones: "",
    total: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("pedidos").insert([
        {
          paciente_nombre: form.paciente_nombre,
          paciente_genero: form.paciente_genero,
          piezas: form.piezas,
          observaciones: form.observaciones,
          total: form.total ? parseFloat(form.total) : null,
        },
      ]);

      if (error) throw error;

      alert("✅ Pedido creado con éxito");
      router.push("/pedidos");
    } catch (err) {
      console.error("❌ Error al crear pedido:", err);
      alert("Error al crear el pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6">
      <Card className="max-w-lg mx-auto shadow-md border border-border">
        <CardHeader>
          <CardTitle>Nuevo Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre del paciente</label>
              <Input
                name="paciente_nombre"
                value={form.paciente_nombre}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Género</label>
              <select
                name="paciente_genero"
                value={form.paciente_genero}
                onChange={(e) => setForm({ ...form, paciente_genero: e.target.value })}
                className="border border-border rounded-md p-2 w-full bg-background text-foreground"
              >
                <option value="H">Hombre</option>
                <option value="M">Mujer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Piezas a realizar</label>
              <Input name="piezas" value={form.piezas} onChange={handleChange} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Observaciones</label>
              <textarea
                name="observaciones"
                value={form.observaciones}
                onChange={handleChange}
                className="border border-border rounded-md p-2 w-full bg-background text-foreground"
                rows={3}
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Total (opcional)</label>
              <Input
                name="total"
                type="number"
                step="0.01"
                value={form.total}
                onChange={handleChange}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              ) : (
                "Guardar Pedido"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
