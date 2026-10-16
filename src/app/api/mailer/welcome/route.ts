import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const { to, name, role, clinic } = await req.json();

    if (!to) {
      return NextResponse.json(
        { error: "El correo destinatario (to) es obligatorio" },
        { status: 400 }
      );
    }

    const info = await sendWelcomeEmail({ to, name, role, clinic });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error("Error en API welcome email:", error);
    return NextResponse.json(
      { error: error?.message || "Error al enviar correo de bienvenida" },
      { status: 500 }
    );
  }
}
