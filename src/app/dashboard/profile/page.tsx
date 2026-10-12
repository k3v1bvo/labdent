"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ArrowLeft, Edit3 } from "lucide-react";

import StationPickerDialog, {
  Station,
} from "@/components/stations/StationPickerDialog";

export default function ProfilePage() {
  const [userInfo, setUserInfo] = useState<any>(null);

  const [stations, setStations] = useState<Station[]>([]);
  const [currentStationId, setCurrentStationId] = useState<string | null>(null);
  const [currentStationName, setCurrentStationName] = useState<string | null>(
    null
  );

  const router = useRouter();

  // Cargar usuario + perfil
  useEffect(() => {
    async function getUserInfo() {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        router.push("/login");
        return;
      }

      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("nombre, rol")
        .eq("id", user.id)
        .single();

      if (profErr) console.error("profile err:", profErr);

      setUserInfo({
        id: user.id,
        email: user.email,
        name: profile?.nombre,
        role: profile?.rol,
      });
    }

    getUserInfo();
  }, [router]);

  // Cargar estaciones + estación actual (solo técnico)
  useEffect(() => {
    if (!userInfo?.id || userInfo?.role !== "tecnico") return;

    async function loadStationsAndCurrent() {
      // 1) Lista estaciones
      const { data: ests, error: estErr } = await supabase
        .from("estaciones")
        .select("id, nombre, orden, descripcion")
        .order("orden", { ascending: true });

      if (estErr) {
        console.error("estaciones err:", estErr);
        return;
      }

      setStations((ests || []) as Station[]);

      // 2) Estación actual
      const { data: teRow, error: teErr } = await supabase
        .from("tecnico_estacion")
        .select("estacion_id, estaciones(nombre, orden)")
        .eq("tecnico_id", userInfo.id)
        .maybeSingle();

      if (teErr) {
        console.error("tecnico_estacion err:", teErr);
        return;
      }

      const estacionId = (teRow as any)?.estacion_id ?? null;
      const estacionNombre = (teRow as any)?.estaciones?.nombre ?? null;

      setCurrentStationId(estacionId);
      setCurrentStationName(estacionNombre);
    }

    loadStationsAndCurrent();
  }, [userInfo?.id, userInfo?.role]);

  const currentStationLabel = useMemo(() => {
    if (userInfo?.role !== "tecnico") return null;
    return currentStationName
      ? `Estación actual: ${currentStationName}`
      : "Estación actual: (no asignada)";
  }, [userInfo?.role, currentStationName]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!userInfo) {
    return <p className="text-center mt-20 text-gray-600">Cargando...</p>;
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 p-4">
      {/* Botón de regreso */}
      <div className="w-full max-w-md mb-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </Button>
      </div>

      {/* Tarjeta de perfil */}
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-green-700">
            Perfil del Usuario
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 text-center">
          <Avatar name={userInfo.name} className="mx-auto mb-3" />
          <p className="text-lg font-semibold">{userInfo.name}</p>
          <p className="text-gray-600">{userInfo.email}</p>
          <p className="text-sm text-green-600 font-medium">
            Rol: {userInfo.role}
          </p>

          {/* SOLO TÉCNICO: estación + modal reutilizable */}
          {userInfo.role === "tecnico" && (
            <div className="pt-2 space-y-2">
              <p className="text-sm text-gray-700">{currentStationLabel}</p>

              <StationPickerDialog
                stations={stations}
                currentStationId={currentStationId}
                triggerLabel="Cambiar estación"
                onChanged={(newId) => {
                  const st = stations.find((x) => x.id === newId);
                  setCurrentStationId(newId);
                  setCurrentStationName(st?.nombre ?? null);
                }}
              />
            </div>
          )}

          <Button
            onClick={() => router.push("/dashboard/profile/edit")}
            className="flex items-center gap-2 w-full justify-center"
          >
            <Edit3 className="w-4 h-4" /> Editar Perfil
          </Button>

          <Button
            onClick={handleLogout}
            variant="destructive"
            className="mt-6 w-full"
          >
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
