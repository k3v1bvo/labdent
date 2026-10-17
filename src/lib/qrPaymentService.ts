import { supabase } from "@/lib/supabaseClient";

export interface LabPaymentConfig {
  qr_pago_url: string;
  banco_nombre: string;
  titular_cuenta: string;
  numero_cuenta: string;
}

// Fallback por defecto si aún no se ha subido un QR personalizado
const DEFAULT_LAB_QR =
  "https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=GUISELA_DENTAL_LAB_PAGO_QR_BOLIVIA";

const DEFAULT_CONFIG: LabPaymentConfig = {
  qr_pago_url: DEFAULT_LAB_QR,
  banco_nombre: "Simple QR / Banco Unión / BCP",
  titular_cuenta: "Guisela Dental Lab",
  numero_cuenta: "100000-XXXXXXXX",
};

const STORAGE_KEY = "guisela_lab_payment_config";

/**
 * Obtiene la configuración y URL del QR de pago oficial del Laboratorio
 */
export async function getLabPaymentConfig(): Promise<LabPaymentConfig> {
  // 1. Revisar si hay copia local en el navegador
  if (typeof window !== "undefined") {
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed?.qr_pago_url) {
          // Si tenemos local, retornamos de inmediato y luego actualizamos en segundo plano
          fetchFromSupabaseAndCache();
          return { ...DEFAULT_CONFIG, ...parsed };
        }
      }
    } catch {
      // Ignorar error de parse
    }
  }

  // 2. Consultar Supabase
  return await fetchFromSupabaseAndCache();
}

/**
 * Consulta sincrónica para render inicial rápido
 */
export function getLabPaymentConfigSync(): LabPaymentConfig {
  if (typeof window !== "undefined") {
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed?.qr_pago_url) return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch {
      // ignore
    }
  }
  return DEFAULT_CONFIG;
}

/**
 * Consulta la tabla configuracion_taller en Supabase y actualiza la caché local
 */
async function fetchFromSupabaseAndCache(): Promise<LabPaymentConfig> {
  try {
    const { data, error } = await supabase
      .from("configuracion_taller")
      .select("qr_pago_url, banco_nombre, titular_cuenta, numero_cuenta")
      .eq("id", 1)
      .maybeSingle();

    if (!error && data) {
      const merged: LabPaymentConfig = {
        qr_pago_url: data.qr_pago_url || DEFAULT_CONFIG.qr_pago_url,
        banco_nombre: data.banco_nombre || DEFAULT_CONFIG.banco_nombre,
        titular_cuenta: data.titular_cuenta || DEFAULT_CONFIG.titular_cuenta,
        numero_cuenta: data.numero_cuenta || DEFAULT_CONFIG.numero_cuenta,
      };

      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn("Error consultando configuracion_taller para QR:", err);
  }

  return DEFAULT_CONFIG;
}

/**
 * Actualiza la configuración del QR (Solo Administradores)
 */
export async function updateLabPaymentConfig(
  newConfig: Partial<LabPaymentConfig>
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Guardar en Supabase
    const { error } = await supabase
      .from("configuracion_taller")
      .update({
        ...(newConfig.qr_pago_url && { qr_pago_url: newConfig.qr_pago_url }),
        ...(newConfig.banco_nombre && { banco_nombre: newConfig.banco_nombre }),
        ...(newConfig.titular_cuenta && { titular_cuenta: newConfig.titular_cuenta }),
        ...(newConfig.numero_cuenta && { numero_cuenta: newConfig.numero_cuenta }),
      })
      .eq("id", 1);

    if (error) {
      console.warn("Aviso al guardar en Supabase (usando localStorage):", error);
    }

    // 2. Guardar en localStorage
    if (typeof window !== "undefined") {
      const current = getLabPaymentConfigSync();
      const updated = { ...current, ...newConfig };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent("guisela_payment_qr_updated", { detail: updated })
      );
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error al actualizar configuración de pago:", err);
    return { success: false, error: err?.message || "Error desconocido" };
  }
}
