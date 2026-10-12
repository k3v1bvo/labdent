import { supabase } from "@/lib/supabaseClient";

/**
 * Assign order to the first station (order = 1)
 */
export async function assignToFirstStation(orderId: string) {
  const { data: station, error } = await supabase
    .from("estaciones")
    .select("id, nombre")
    .eq("orden", 1)
    .single();

  if (error || !station) {
    console.error("Error fetching first station:", error);
    return;
  }

  const { error: insertError } = await supabase.from("historial_estaciones").insert([
    {
      pedido_id: orderId,
      estacion_id: station.id,
      estado: "en_proceso",
      comentarios: `Order sent to ${station.nombre}`,
    },
  ]);

  if (insertError) console.error("Error inserting historial_estaciones:", insertError);

  await supabase.from("auditoria").insert([
    {
      accion: "ASSIGN_ORDER",
      tabla: "historial_estaciones",
      detalles: { pedido_id: orderId, station: station.nombre },
    },
  ]);
}

/**
 * Mark current station as completed and move order to next one.
 */
export async function completeStation(taskId: string, orderId: string, currentOrder: number) {
  // 1️⃣ Mark current station as completed
  await supabase
    .from("historial_estaciones")
    .update({
      estado: "completado",
      fecha_fin: new Date().toISOString(),
    })
    .eq("id", taskId);

  // 2️⃣ Find next station
  const { data: nextStation } = await supabase
    .from("estaciones")
    .select("id, nombre")
    .eq("orden", currentOrder + 1)
    .single();

  if (nextStation) {
    // 3️⃣ Insert next station in the history
    await supabase.from("historial_estaciones").insert([
      {
        pedido_id: orderId,
        estacion_id: nextStation.id,
        estado: "en_proceso",
        comentarios: `Moved to ${nextStation.nombre}`,
      },
    ]);

    await supabase.from("auditoria").insert([
      {
        accion: "MOVE_NEXT_STATION",
        tabla: "historial_estaciones",
        detalles: { pedido_id: orderId, nextStation: nextStation.nombre },
      },
    ]);
  } else {
    // 4️⃣ No next station → mark order as finished
    await supabase.from("pedidos").update({ estado: "finalizado" }).eq("id", orderId);

    await supabase.from("auditoria").insert([
      {
        accion: "ORDER_COMPLETED",
        tabla: "pedidos",
        detalles: { pedido_id: orderId },
      },
    ]);
  }
}
