import { supabase } from "./supabaseClient";
import { getUserProfile } from "./getUserProfile";

export type AuditAction =
  | "CREACION"
  | "APROBACION"
  | "RECHAZO"
  | "MODIFICACION_MONTO"
  | "CAMBIO_ESTADO"
  | "REGISTRO_ENTREGA"
  | "EDICION_ADMIN"
  | "ANULACION";

export interface LogAuditParams {
  pedidoId: string;
  accion: AuditAction;
  campoModificado?: string;
  valorAnterior?: string | number | null;
  valorNuevo?: string | number | null;
  motivo?: string;
}

/**
 * Registra un evento inmutable en la tabla de auditoría para prevenir fraudes
 * y rastrear cualquier cambio de estado, precios, anticipos o entregas.
 */
export async function logAudit({
  pedidoId,
  accion,
  campoModificado,
  valorAnterior,
  valorNuevo,
  motivo,
}: LogAuditParams): Promise<{ success: boolean; error?: any }> {
  try {
    const { user, profile } = await getUserProfile();

    const auditRecord = {
      pedido_id: pedidoId,
      usuario_id: user?.id || null,
      usuario_nombre: profile?.nombre || user?.email || "Usuario Desconocido",
      usuario_rol: profile?.rol || "desconocido",
      accion,
      campo_modificado: campoModificado || null,
      valor_anterior: valorAnterior != null ? String(valorAnterior) : null,
      valor_nuevo: valorNuevo != null ? String(valorNuevo) : null,
      motivo: motivo || null,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("auditoria_pedidos").insert(auditRecord);

    if (error) {
      // Si la tabla aún no existe en Supabase o hay un error de RLS, lo registramos en consola sin tumbar la app
      console.warn("⚠️ [Auditoría] No se pudo guardar el registro en auditoria_pedidos:", error.message);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.warn("⚠️ [Auditoría] Error inesperado registrando log:", err);
    return { success: false, error: err };
  }
}
