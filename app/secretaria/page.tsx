"use client";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SecretariaDashboard() {
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
      <h1 className="text-2xl font-bold mb-4">Panel de la Secretaria</h1>
      <p>Hola {user?.user_metadata?.nombre}, aquí puedes gestionar pedidos y doctores.</p>
    </div>
  );
}
