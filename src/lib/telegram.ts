/**
 * Integración con Telegram Bot API para Guisela Laboratorio Dental
 * Permite enviar notificaciones de pedidos clínicos y adjuntar archivos 3D (STL/OBJ/PLY/ZIP)
 * directamente al canal o grupo de Telegram del laboratorio.
 */

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || "";

const TELEGRAM_CHAT_ID =
  process.env.TELEGRAM_CHAT_ID || process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || "";

export interface TelegramOrderInfo {
  numeroRequerimiento: string;
  doctorNombre: string;
  doctorTelefono?: string | null;
  pacienteNombre: string;
  pacienteTelefono?: string | null;
  trabajoRealizar: string;
  piezaNumero: string;
  colorPieza?: string | null;
  colimetro?: string | null;
  observaciones?: string | null;
  totalBs?: number | null;
  anticipoBs?: number | null;
  delivery?: boolean;
  direccionEntrega?: string | null;
  fileName3D?: string | null;
}

/**
 * Formatea un mensaje formal para Telegram con HTML
 */
export function formatTelegramOrderMessage(order: TelegramOrderInfo): string {
  const deliveryInfo = order.delivery
    ? `🚚 <b>Modalidad:</b> DELIVERY SOLICITADO\n📍 <b>Destino:</b> ${order.direccionEntrega || "Consultorio del Doctor"}`
    : `🏢 <b>Modalidad:</b> Recepción / Retiro en Clínica`;

  const finanzas =
    order.totalBs != null
      ? `💰 <b>Total Cotizado:</b> Bs ${order.totalBs.toFixed(2)}${
          order.anticipoBs ? ` | Anticipo: Bs ${order.anticipoBs.toFixed(2)}` : ""
        }`
      : "💰 <b>Cotización:</b> Pendiente de revisión técnica";

  return `🦷 <b>NUEVA ORDEN DIGITAL - GUISELA LAB DENTAL</b> 🦷
━━━━━━━━━━━━━━━━━━━━━━
📋 <b>N° Requerimiento:</b> <code>#${order.numeroRequerimiento}</code>
👨‍⚕️ <b>Odontólogo:</b> ${order.doctorNombre || "No especificado"}${
    order.doctorTelefono ? ` (📱 ${order.doctorTelefono})` : ""
  }
👤 <b>Paciente:</b> ${order.pacienteNombre}
🦷 <b>Trabajo:</b> <b>${order.trabajoRealizar}</b>
🔢 <b>Pieza(s):</b> ${order.piezaNumero}
🎨 <b>Color / Guía:</b> ${order.colorPieza || "Por definir"} ${
    order.colimetro ? `(${order.colimetro})` : ""
  }
${deliveryInfo}
${finanzas}
${
  order.fileName3D
    ? `📦 <b>Escaneo 3D Adjunto:</b> <code>${order.fileName3D}</code>`
    : ""
}
${
  order.observaciones
    ? `📝 <b>Observaciones:</b> <i>${order.observaciones.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</i>`
    : ""
}
━━━━━━━━━━━━━━━━━━━━━━
⚡ <i>Generado automáticamente por el Portal Guisela CAD/CAM</i>`;
}

/**
 * Envía un mensaje de texto a Telegram
 */
export async function sendTelegramMessage(text: string): Promise<{
  success: boolean;
  message?: string;
  notConfigured?: boolean;
}> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn(
      "⚠️ Telegram Bot no configurado (TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID ausente en .env.local)"
    );
    return {
      success: false,
      notConfigured: true,
      message: "Telegram no configurado en variables de entorno",
    };
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      console.error("Error en respuesta de Telegram:", data);
      return { success: false, message: data.description || "Error de Telegram" };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error al enviar mensaje a Telegram:", err);
    return { success: false, message: err?.message || "Fallo de conexión con Telegram" };
  }
}

/**
 * Envía un documento/archivo 3D (STL/OBJ/ZIP) a Telegram
 */
export async function sendTelegramDocument(
  fileBuffer: Buffer | Blob,
  fileName: string,
  caption?: string
): Promise<{ success: boolean; message?: string; notConfigured?: boolean }> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("⚠️ Telegram Bot no configurado para adjuntos");
    return {
      success: false,
      notConfigured: true,
      message: "Telegram no configurado",
    };
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
    const formData = new FormData();
    formData.append("chat_id", TELEGRAM_CHAT_ID);
    const blob =
      fileBuffer instanceof Blob
        ? fileBuffer
        : new Blob([new Uint8Array(fileBuffer)]);
    formData.append("document", blob, fileName);
    if (caption) {
      formData.append("caption", caption);
      formData.append("parse_mode", "HTML");
    }

    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      console.error("Error subiendo documento a Telegram:", data);
      return { success: false, message: data.description || "Error de Telegram" };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error enviando documento a Telegram:", err);
    return { success: false, message: err?.message || "Fallo al enviar archivo a Telegram" };
  }
}
