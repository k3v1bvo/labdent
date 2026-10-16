"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface Notificacion {
  id: string;
  mensaje: string;
  creada_en: string;
  leida: boolean;
}

export default function AdminNotifications() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔹 Cargar notificaciones
  async function fetchNotificaciones() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notificaciones")
      .select("id, mensaje, creada_en, leida")
      .eq("receptor_id", user.id)
      .order("creada_en", { ascending: false })
      .limit(10);

    if (!error && data) setNotificaciones(data);
    setLoading(false);
  }

  // 🔹 Marcar como leída
  async function marcarLeida(id: string) {
    await supabase.from("notificaciones").update({ leida: true }).eq("id", id);
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );
  }

  // 🔹 Suscribirse a notificaciones nuevas
  useEffect(() => {
    let activeChannel: any = null;

    async function init() {
      await fetchNotificaciones();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      activeChannel = supabase
        .channel(`admin-notifications-${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notificaciones" },
          (payload) => {
            const nueva = payload.new as any;
            if (nueva.receptor_id === user.id || nueva.tipo === "admin") {
              setNotificaciones((prev) => [nueva as Notificacion, ...prev]);
              toast.info("🔔 Notificación de Administración", {
                description: nueva.mensaje,
              });
            }
          }
        )
        .subscribe();
    }

    init();

    return () => {
      if (activeChannel) supabase.removeChannel(activeChannel);
    };
  }, []);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {notificaciones.some((n) => !n.leida) && (
          <span className="absolute top-1 right-1 block w-2 h-2 rounded-full bg-red-500" />
        )}
      </Button>

      {open && (
        <Card className="absolute right-0 mt-2 w-80 bg-white border shadow-md z-50">
          <div className="p-3 border-b flex justify-between items-center">
            <p className="font-semibold text-gray-700">Notificaciones</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cerrar
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-6">
              <Loader2 className="animate-spin w-5 h-5 text-green-600" />
            </div>
          ) : notificaciones.length === 0 ? (
            <p className="text-center text-gray-500 py-6">
              No hay notificaciones.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notificaciones.map((n) => (
                <li
                  key={n.id}
                  className={`px-4 py-3 text-sm border-b cursor-pointer hover:bg-gray-50 ${
                    n.leida ? "text-gray-500" : "font-medium text-gray-800"
                  }`}
                  onClick={() => marcarLeida(n.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span>{n.mensaje}</span>
                    {!n.leida && (
                      <Check className="w-4 h-4 text-green-500 mt-0.5" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.creada_en).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
