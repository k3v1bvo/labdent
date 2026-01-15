"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface Notification {
  id: string;
  tipo: string;
  mensaje: string;
  leida: boolean;
  creada_en: string;
  pedido_id?: string;
  receptor_id?: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Cargar notificaciones iniciales
  async function fetchNotifications() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notificaciones")
      .select("*")
      .eq("receptor_id", user.id)
      .order("creada_en", { ascending: false });

    if (!error && data) setNotifications(data);
    setLoading(false);
  }

  // 🔹 Marcar como leída
  async function markAsRead(id: string) {
    await supabase.from("notificaciones").update({ leida: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );
  }

  // 🔹 Escucha en tiempo real
  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("notificaciones-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaciones" },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { notifications, loading, markAsRead };
}
