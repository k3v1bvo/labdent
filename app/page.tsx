"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const rol = data.user.user_metadata?.rol;
        switch (rol) {
          case "admin":
            router.push("/admin");
            break;
          case "doctor":
            router.push("/doctor");
            break;
          case "secretaria":
            router.push("/secretaria");
            break;
          case "tecnico":
            router.push("/tecnico");
            break;
          default:
            router.push("/auth/login");
        }
      } else {
        router.push("/auth/login");
      }
    };

    checkSession();
  }, [router]);

  return (
    <div className="flex justify-center items-center h-[80vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
