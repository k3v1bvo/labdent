"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Notificacion {
  id: string;
  mensaje: string;
  leida: boolean;
  creada_en: string;
}

export default function DoctorNotifications() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchNotificaciones() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("notificaciones")
      .select("id, mensaje, leida, creada_en")
      .eq("receptor_id", user.id)
      .order("creada_en", { ascending: false })
      .limit(10);

    if (!error && data) {
      setNotificaciones(data);
    }
    setLoading(false);
  }

  async function marcarLeidas() {
    const noLeidas = notificaciones.filter((n) => !n.leida).map((n) => n.id);
    if (noLeidas.length === 0) return;

    await supabase
      .from("notificaciones")
      .update({ leida: true })
      .in("id", noLeidas);

    setNotificaciones((prev) =>
      prev.map((n) => ({ ...n, leida: true }))
    );
  }

  useEffect(() => {
    fetchNotificaciones();

    const channel = supabase
      .channel("doctor-notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaciones" },
        (payload) => {
          const nueva = payload.new as Notificacion;
          setNotificaciones((prev) => [nueva, ...prev.slice(0, 9)]);
          toast.info("🔔 Nueva actualización de pedido dental");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const tieneNoLeidas = notificaciones.some((n) => !n.leida);

  return (
    <DropdownMenu onOpenChange={(open) => open && marcarLeidas()}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Notificaciones"
        >
          <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          {tieneNoLeidas && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 p-2 rounded-2xl shadow-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
      >
        <DropdownMenuLabel className="flex justify-between items-center px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span>Notificaciones</span>
          {tieneNoLeidas && (
            <span className="text-[10px] bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-bold px-1.5 py-0.5 rounded-full">
              Nuevas
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="animate-spin w-5 h-5 text-cyan-600" />
          </div>
        ) : notificaciones.length === 0 ? (
          <p className="text-center text-xs text-slate-500 py-6">
            No tienes notificaciones pendientes.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-1">
            {notificaciones.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={`p-2.5 rounded-xl cursor-default text-xs flex flex-col items-start gap-1 ${
                  n.leida
                    ? "text-slate-500 dark:text-slate-400"
                    : "bg-cyan-50/70 dark:bg-cyan-950/40 text-slate-800 dark:text-slate-100 font-medium"
                }`}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <span>{n.mensaje}</span>
                  {!n.leida && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0 mt-1" />
                  )}
                </div>
                <span className="text-[10px] text-slate-400">
                  {new Date(n.creada_en).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
