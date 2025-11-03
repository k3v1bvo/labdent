"use client";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function DoctorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) router.push("/auth/login");
      else setUser(data.user);
    };
    getUser();
  }, [router]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Panel del Doctor</h1>
      <p>Hola {user?.user_metadata?.nombre}, aquí puedes crear o revisar pedidos.</p>
      <Button onClick={() => router.push("/auth/logout")}>Cerrar sesión</Button>
    </div>
  );
}
