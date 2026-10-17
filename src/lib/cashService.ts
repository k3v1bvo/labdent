import { supabase } from "./supabaseClient";
import { getCachedExchangeRate } from "./currency";
import { toBoliviaYMD } from "./dateUtils";

export interface CajaSesion {
  id: string;
  fecha: string;
  monto_apertura_bs: number;
  monto_apertura_usd: number;
  abierta_por?: string | null;
  abierta_por_nombre?: string | null;
  hora_apertura: string;
  estado: "abierta" | "cerrada";
  monto_cierre_efectivo_bs?: number | null;
  monto_cierre_efectivo_usd?: number | null;
  monto_cierre_qr_bs?: number | null;
  monto_cierre_gastos_bs?: number | null;
  saldo_teorico_bs?: number | null;
  saldo_real_bs?: number | null;
  diferencia_bs?: number | null;
  cerrada_por?: string | null;
  cerrada_por_nombre?: string | null;
  hora_cierre?: string | null;
  observaciones?: string | null;
}

export interface CajaMovimiento {
  id: string;
  sesion_id: string;
  tipo: "ingreso" | "egreso";
  origen: "pedido_anticipo" | "pedido_saldo" | "gasto_caja_chica" | "ingreso_manual" | "ajuste";
  metodo_pago: "efectivo" | "qr_transferencia" | "tarjeta" | "otro";
  moneda: "BOB" | "USD";
  monto: number;
  monto_bs_equivalente: number;
  tipo_cambio: number;
  concepto: string;
  numero_recibo?: string | null;
  comprobante_url?: string | null;
  pedido_id?: string | null;
  numero_requerimiento?: string | null;
  registrado_por?: string | null;
  registrado_por_nombre?: string | null;
  created_at: string;
}

const LOCAL_SESSION_KEY = "guisela_caja_sesion_activa";
const LOCAL_MOVIMIENTOS_KEY = "guisela_caja_movimientos";

/**
 * Obtiene la sesión de caja activa de hoy
 */
export async function getActiveCajaSession(): Promise<{
  session: CajaSesion | null;
  movimientos: CajaMovimiento[];
}> {
  const today = toBoliviaYMD();

  try {
    const { data: sessionData, error: sessionErr } = await supabase
      .from("caja_sesiones")
      .select("*")
      .eq("fecha", today)
      .eq("estado", "abierta")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionData && !sessionErr) {
      const { data: movsData } = await supabase
        .from("caja_movimientos")
        .select("*")
        .eq("sesion_id", sessionData.id)
        .order("created_at", { ascending: false });

      return {
        session: sessionData as CajaSesion,
        movimientos: (movsData as CajaMovimiento[]) || [],
      };
    }
  } catch (err) {
    console.warn("Fallo lectura Supabase caja_sesiones, usando fallback local:", err);
  }

  // Fallback seguro en localStorage si la tabla aún no se ha migrado en Supabase
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_SESSION_KEY);
      if (raw) {
        const parsed: CajaSesion = JSON.parse(raw);
        if (parsed.fecha === today && parsed.estado === "abierta") {
          const rawMovs = localStorage.getItem(`${LOCAL_MOVIMIENTOS_KEY}_${parsed.id}`) || "[]";
          return {
            session: parsed,
            movimientos: JSON.parse(rawMovs),
          };
        }
      }
    } catch (e) {
      console.warn("Error leyendo sesión local:", e);
    }
  }

  return { session: null, movimientos: [] };
}

/**
 * Abre una nueva sesión de caja
 */
export async function openCajaSession(params: {
  montoAperturaBs: number;
  montoAperturaUsd?: number;
  userId?: string;
  userName?: string;
}): Promise<CajaSesion> {
  const today = toBoliviaYMD();
  const rate = getCachedExchangeRate();

  const newSession: CajaSesion = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `caja_${Date.now()}`,
    fecha: today,
    monto_apertura_bs: params.montoAperturaBs,
    monto_apertura_usd: params.montoAperturaUsd || 0,
    abierta_por: params.userId || null,
    abierta_por_nombre: params.userName || "Personal de Turno",
    hora_apertura: new Date().toISOString(),
    estado: "abierta",
  };

  try {
    const { data, error } = await supabase
      .from("caja_sesiones")
      .insert([newSession])
      .select()
      .maybeSingle();

    if (!error && data) {
      return data as CajaSesion;
    }
  } catch (e) {
    console.warn("Fallo insert caja_sesiones en Supabase, guardando local:", e);
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(newSession));
  }

  return newSession;
}

/**
 * Registra un movimiento de caja (ingreso o gasto menor)
 */
export async function addCajaMovimiento(params: {
  sesionId: string;
  tipo: "ingreso" | "egreso";
  origen: "pedido_anticipo" | "pedido_saldo" | "gasto_caja_chica" | "ingreso_manual" | "ajuste";
  metodoPago: "efectivo" | "qr_transferencia" | "tarjeta" | "otro";
  moneda: "BOB" | "USD";
  monto: number;
  concepto: string;
  numeroRecibo?: string;
  comprobanteUrl?: string;
  pedidoId?: string;
  numeroRequerimiento?: string;
  userId?: string;
  userName?: string;
}): Promise<CajaMovimiento> {
  const rate = getCachedExchangeRate();
  const montoBsEquivalente = params.moneda === "USD" ? params.monto * rate : params.monto;

  const newMov: CajaMovimiento = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `mov_${Date.now()}`,
    sesion_id: params.sesionId,
    tipo: params.tipo,
    origen: params.origen,
    metodo_pago: params.metodoPago,
    moneda: params.moneda,
    monto: params.monto,
    monto_bs_equivalente: montoBsEquivalente,
    tipo_cambio: rate,
    concepto: params.concepto,
    numero_recibo: params.numeroRecibo || null,
    comprobante_url: params.comprobanteUrl || null,
    pedido_id: params.pedidoId || null,
    numero_requerimiento: params.numeroRequerimiento || null,
    registrado_por: params.userId || null,
    registrado_por_nombre: params.userName || "Personal de Turno",
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("caja_movimientos")
      .insert([newMov])
      .select()
      .maybeSingle();

    if (!error && data) {
      return data as CajaMovimiento;
    }
  } catch (e) {
    console.warn("Fallo insert movimiento en Supabase, guardando local:", e);
  }

  if (typeof window !== "undefined") {
    const key = `${LOCAL_MOVIMIENTOS_KEY}_${params.sesionId}`;
    const raw = localStorage.getItem(key) || "[]";
    const current = JSON.parse(raw);
    current.unshift(newMov);
    localStorage.setItem(key, JSON.stringify(current));
  }

  return newMov;
}

/**
 * Cierra la sesión de caja y registra el arqueo final
 */
export async function closeCajaSession(params: {
  sessionId: string;
  efectivoRealBs: number;
  efectivoRealUsd: number;
  observaciones?: string;
  userId?: string;
  userName?: string;
  resumen: {
    totalEfectivoBs: number;
    totalEfectivoUsd: number;
    totalQrBs: number;
    totalGastosBs: number;
    saldoTeoricoBs: number;
  };
}): Promise<CajaSesion> {
  const rate = getCachedExchangeRate();
  const saldoRealTotalBs = params.efectivoRealBs + params.efectivoRealUsd * rate;
  const diferenciaBs = saldoRealTotalBs - params.resumen.saldoTeoricoBs;

  const updateData = {
    estado: "cerrada" as const,
    monto_cierre_efectivo_bs: params.efectivoRealBs,
    monto_cierre_efectivo_usd: params.efectivoRealUsd,
    monto_cierre_qr_bs: params.resumen.totalQrBs,
    monto_cierre_gastos_bs: params.resumen.totalGastosBs,
    saldo_teorico_bs: params.resumen.saldoTeoricoBs,
    saldo_real_bs: saldoRealTotalBs,
    diferencia_bs: diferenciaBs,
    cerrada_por: params.userId || null,
    cerrada_por_nombre: params.userName || "Personal de Turno",
    hora_cierre: new Date().toISOString(),
    observaciones: params.observaciones || null,
  };

  try {
    const { data, error } = await supabase
      .from("caja_sesiones")
      .update(updateData)
      .eq("id", params.sessionId)
      .select()
      .maybeSingle();

    if (!error && data) {
      if (typeof window !== "undefined") {
        localStorage.removeItem(LOCAL_SESSION_KEY);
      }
      return data as CajaSesion;
    }
  } catch (e) {
    console.warn("Fallo update caja_sesiones en Supabase, cerrando local:", e);
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem(LOCAL_SESSION_KEY);
  }

  return {
    id: params.sessionId,
    fecha: toBoliviaYMD(),
    monto_apertura_bs: 200,
    monto_apertura_usd: 0,
    hora_apertura: new Date().toISOString(),
    ...updateData,
  };
}
