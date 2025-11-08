"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface UserData {
  id: string;
  email: string;
  nombre: string;
  rol: string;
}

export function useUser() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || "",
          nombre: data.user.user_metadata?.nombre || "Sin nombre",
          rol: data.user.user_metadata?.rol || "sin_rol",
        });
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  return { user, loading };
}
