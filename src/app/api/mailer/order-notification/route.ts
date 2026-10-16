import { NextRequest, NextResponse } from "next/server";
import { sendOrderNotificationEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const {
      to,
      doctorName,
      pacienteNombre,
      numeroRequerimiento,
      numeroCaja,
      estado,
      trabajoRealizar,
    } = await req.json();

    if (!to || !pacienteNombre || !estado) {
      return NextResponse.json(
        { error: "Campos to, pacienteNombre y estado son obligatorios" },
        { status: 400 }
      );
    }

    const info = await sendOrderNotificationEmail({
      to,
      doctorName,
      pacienteNombre,
      numeroRequerimiento,
      numeroCaja,
      estado,
      trabajoRealizar,
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error("Error en endpoint order-notification:", error);
    return NextResponse.json(
      { error: error?.message || "Error al enviar notificación de orden" },
      { status: 500 }
    );
  }
}
