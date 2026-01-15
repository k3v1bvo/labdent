"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ArrowLeft, Edit3 } from "lucide-react";

export default function ProfilePage() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    async function getUserInfo() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("nombre, rol")
        .eq("id", user.id)
        .single();

      setUserInfo({
        email: user.email,
        name: profile?.nombre,
        role: profile?.rol,
      });
    }

    getUserInfo();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!userInfo)
    return <p className="text-center mt-20 text-gray-600">Cargando...</p>;

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
