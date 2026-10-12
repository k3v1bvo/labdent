"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  mensaje: string;
  leida: boolean;
  creada_en: string;
}

export default function SecretaryNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Cargar notificaciones
  useEffect(() => {
    async function loadNotifications() {
      const { data, error } = await supabase
        .from("notificaciones")
        .select("id, mensaje, leida, creada_en")
        .eq("tipo", "secretaria")
        .order("creada_en", { ascending: false })
        .limit(10);

      if (!error && data) {
        setNotifications(data);
      }
      setLoading(false);
    }

    loadNotifications();

    // 🔹 Suscripción en tiempo real
    const channel = supabase
      .channel("secretaria-notificaciones")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaciones" },
        (payload) => {
          const nueva = payload.new as Notification;
          if (nueva && (nueva as any).tipo === "secretaria") {
            setNotifications((prev) => [nueva, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function marcarLeidas() {
    const ids = notifications.map((n) => n.id);
    if (ids.length === 0) return;

    await supabase.from("notificaciones").update({ leida: true }).in("id", ids);
    setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative text-amber-700 hover:text-amber-800"
        >
          <Bell className="w-6 h-6" />
          {notifications.some((n) => !n.leida) && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-72">
        <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading ? (
          <DropdownMenuItem className="text-sm text-gray-500">
            Cargando...
          </DropdownMenuItem>
        ) : notifications.length > 0 ? (
          <>
            {notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={`text-sm ${
                  n.leida ? "text-gray-500" : "text-black font-medium"
                }`}
              >
                {n.mensaje}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-center text-blue-600 cursor-pointer"
              onClick={marcarLeidas}
            >
              Marcar todas como leídas
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem className="text-sm text-gray-500">
            No hay notificaciones nuevas.
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
