"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      await supabase.auth.signOut();
      router.push("/auth/login");
    };
    logout();
  }, [router]);

  return <p className="p-8 text-center">Cerrando sesión...</p>;
}
