"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Componente de notificaciones para técnicos
 * Muestra alertas en tiempo real cuando:
 * - Se le asigna una nueva tarea (nueva estación)
 * - Se marca una estación como completada
 * - Se genera un nuevo pedido que llega a su estación
 */

export default function TechnicianNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // ✅ Cargar usuario actual
  useEffect(() => {
    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);
      await loadNotifications(user.id);

      // Escuchar cambios en tiempo real
      const channel = supabase
        .channel("technician-notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notificaciones",
            filter: `receptor_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setNotifications((prev) => [
                payload.new,
                ...prev.slice(0, 9), // mantiene solo las 10 últimas
              ]);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    fetchUser();
  }, []);

  // ✅ Cargar notificaciones iniciales
  async function loadNotifications(uid: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("notificaciones")
      .select("id, mensaje, leida, created_at")
      .eq("receptor_id", uid)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) setNotifications(data);
    setLoading(false);
  }

  // ✅ Marcar como leídas
  async function markAllAsRead() {
    if (!userId) return;

    await supabase
      .from("notificaciones")
      .update({ leida: true })
      .eq("receptor_id", userId)
      .eq("leida", false);

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, leida: true }))
    );
  }

  const unreadCount = notifications.filter((n) => !n.leida).length;

  return (
    <div className="relative">
      {/* Botón de notificaciones */}
      <Button
  variant="outline"
  size="sm"
  className="relative p-2 w-10 h-10 flex items-center justify-center"
  onClick={() => setOpen(!open)}
>
  <Bell className="w-5 h-5 text-gray-700" />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1.5">
      {unreadCount}
    </span>
  )}
</Button>


      {/* Panel desplegable */}
      {open && (
        <div className="absolute right-0 mt-3 w-80 bg-white border shadow-lg rounded-lg overflow-hidden z-50">
          <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50">
            <p className="font-semibold text-gray-700">Notificaciones</p>
            <button
              className="text-xs text-blue-600 hover:underline"
              onClick={markAllAsRead}
            >
              Marcar todas como leídas
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-center text-gray-500 py-6">
                No tienes notificaciones recientes.
              </p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "px-4 py-3 border-b hover:bg-gray-50 transition",
                    !n.leida ? "bg-blue-50" : "bg-white"
                  )}
                >
                  <p className="text-sm text-gray-800">{n.mensaje}</p>
                  <span className="text-xs text-gray-400">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
