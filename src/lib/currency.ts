import { supabase } from "@/lib/supabaseClient";

// Tipo de cambio por defecto según acuerdo con Dirección del Laboratorio
export const DEFAULT_EXCHANGE_RATE = 8.00;

let cachedExchangeRate: number = DEFAULT_EXCHANGE_RATE;
let isCacheLoaded = false;

/**
 * Obtiene el tipo de cambio actual (Bs por USD).
 * Consulta configuracion_taller y almacena en caché.
 */
export async function getExchangeRate(): Promise<number> {
  if (typeof window !== "undefined") {
    const localRate = localStorage.getItem("guisela_tipo_cambio_usd");
    if (localRate && !isNaN(Number(localRate)) && Number(localRate) > 0) {
      cachedExchangeRate = Number(localRate);
    }
  }

  if (isCacheLoaded) return cachedExchangeRate;

  try {
    const { data, error } = await supabase
      .from("configuracion_taller")
      .select("tipo_cambio_usd")
      .eq("id", 1)
      .maybeSingle();

    if (!error && data?.tipo_cambio_usd && Number(data.tipo_cambio_usd) > 0) {
      cachedExchangeRate = Number(data.tipo_cambio_usd);
      if (typeof window !== "undefined") {
        localStorage.setItem("guisela_tipo_cambio_usd", String(cachedExchangeRate));
      }
    }
    isCacheLoaded = true;
  } catch (e) {
    console.warn("Usando tipo de cambio por defecto:", DEFAULT_EXCHANGE_RATE);
  }

  return cachedExchangeRate;
}

/**
 * Retorna el tipo de cambio en caché sincrónico (para renders inmediatos)
 */
export function getCachedExchangeRate(): number {
  if (typeof window !== "undefined") {
    const local = localStorage.getItem("guisela_tipo_cambio_usd");
    if (local && !isNaN(Number(local))) {
      return Number(local);
    }
  }
  return cachedExchangeRate || DEFAULT_EXCHANGE_RATE;
}

/**
 * Actualiza el tipo de cambio en Supabase y localmente.
 */
export async function updateExchangeRate(newRate: number): Promise<{ success: boolean; message?: string }> {
  if (!newRate || newRate <= 0) {
    return { success: false, message: "El tipo de cambio debe ser mayor a 0" };
  }

  try {
    // Intentar actualizar via RPC
    const { data: rpcData, error: rpcErr } = await supabase.rpc("rpc_actualizar_tipo_cambio", {
      p_nuevo_tipo_cambio: newRate,
    });

    if (rpcErr) {
      // Fallback directo a UPDATE en configuracion_taller
      const { error: updErr } = await supabase
        .from("configuracion_taller")
        .update({ tipo_cambio_usd: newRate })
        .eq("id", 1);

      if (updErr) throw updErr;
    }

    cachedExchangeRate = newRate;
    isCacheLoaded = true;
    if (typeof window !== "undefined") {
      localStorage.setItem("guisela_tipo_cambio_usd", String(newRate));
      window.dispatchEvent(new CustomEvent("guisela_exchange_rate_changed", { detail: newRate }));
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error al actualizar tipo de cambio:", err);
    // Guardar al menos localmente
    cachedExchangeRate = newRate;
    if (typeof window !== "undefined") {
      localStorage.setItem("guisela_tipo_cambio_usd", String(newRate));
      window.dispatchEvent(new CustomEvent("guisela_exchange_rate_changed", { detail: newRate }));
    }
    return { success: true, message: "Guardado localmente (actualizar migración en Supabase)" };
  }
}

/**
 * Formatea un monto en Bolivianos a la convención acordada:
 * - Bs grande
 * - USD pequeño en paréntesis
 */
export function formatDualCurrency(
  amountBs: number | null | undefined,
  exchangeRate: number = getCachedExchangeRate()
): {
  bsFormatted: string;
  usdFormatted: string;
  combined: string;
  rawBs: number;
  rawUsd: number;
} {
  const valBs = Number(amountBs) || 0;
  const rate = exchangeRate > 0 ? exchangeRate : DEFAULT_EXCHANGE_RATE;
  const valUsd = valBs / rate;

  const bsFormatted = `Bs ${valBs.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const usdFormatted = `($${valUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)`;

  return {
    bsFormatted,
    usdFormatted,
    combined: `${bsFormatted} ${usdFormatted}`,
    rawBs: valBs,
    rawUsd: valUsd,
  };
}

/**
 * Convierte un monto en USD a Bolivianos y retorna formato dual
 */
export function formatUsdToDual(
  amountUsd: number | null | undefined,
  exchangeRate: number = getCachedExchangeRate()
): {
  bsFormatted: string;
  usdFormatted: string;
  combined: string;
  rawBs: number;
  rawUsd: number;
} {
  const valUsd = Number(amountUsd) || 0;
  const rate = exchangeRate > 0 ? exchangeRate : DEFAULT_EXCHANGE_RATE;
  const valBs = valUsd * rate;

  return formatDualCurrency(valBs, rate);
}
