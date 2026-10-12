"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function EditProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    nombre: "",
    telefono: "",
    rol: "",
    email: "",
  });

  const router = useRouter();

  // Cargar datos
  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("nombre, telefono, rol")
        .eq("id", user.id)
        .single();

      setProfile({
        nombre: data?.nombre || "",
        telefono: data?.telefono || "",
        rol: data?.rol || "",
        email: user.email || "",
      });
      setLoading(false);
    }

    fetchProfile();
  }, [router]);

  // Guardar cambios
  async function handleSave() {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("profiles")
      .update({
        nombre: profile.nombre,
        telefono: profile.telefono,
        updated_at: new Date(),
      })
      .eq("id", user?.id);

    if (error) {
      toast.error("❌ Error al guardar cambios.");
    } else {
      toast.success("✅ Perfil actualizado correctamente.");
      router.push("/dashboard/profile");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin w-6 h-6 text-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>✏️ Editar Perfil</CardTitle>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Correo</Label>
            <Input value={profile.email} disabled />
          </div>
          <div>
            <Label>Nombre</Label>
            <Input
              value={profile.nombre}
              onChange={(e) =>
                setProfile({ ...profile, nombre: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input
              value={profile.telefono}
              onChange={(e) =>
                setProfile({ ...profile, telefono: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Rol</Label>
            <Input value={profile.rol} disabled />
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
