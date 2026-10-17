import { NextRequest, NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  try {
    const hasToken = !!(
      process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN
    );
    const hasChatId = !!(
      process.env.TELEGRAM_CHAT_ID || process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID
    );

    if (!hasToken || !hasChatId) {
      return NextResponse.json(
        {
          success: false,
          notConfigured: true,
          message:
            "Telegram aún no está configurado. Agrega TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en .env.local",
        },
        { status: 200 }
      );
    }

    const testMsg = `🤖 <b>TEST DE CONEXIÓN TELEGRAM - GUISELA LAB DENTAL</b>
━━━━━━━━━━━━━━━━━━━━━━
✅ El bot de Telegram está correctamente vinculado al sistema.
⏱ <b>Hora del servidor:</b> ${new Date().toLocaleString("es-BO")}
🦷 <b>Estado:</b> Listo para recibir órdenes y archivos 3D STL/OBJ.
━━━━━━━━━━━━━━━━━━━━━━`;

    const res = await sendTelegramMessage(testMsg);
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error al conectar con Telegram" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const hasToken = !!(
    process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN
  );
  const hasChatId = !!(
    process.env.TELEGRAM_CHAT_ID || process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID
  );

  return NextResponse.json({
    configured: hasToken && hasChatId,
    hasToken,
    hasChatId,
  });
}
