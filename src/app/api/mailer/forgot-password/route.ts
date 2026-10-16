import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendPasswordResetEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Correo electrónico no válido" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Obtener la URL base de la aplicación (producción o desarrollo)
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000";

    const redirectTo = `${origin}/reset-password`;

    // 2. Generar el enlace criptográfico seguro con Supabase Admin (SIN que Supabase mande correo)
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: cleanEmail,
        options: {
          redirectTo,
        },
      });

    if (linkError) {
      console.error("Error generando enlace de recuperación:", linkError);
      return NextResponse.json(
        { error: linkError.message || "No se pudo generar el enlace de recuperación" },
        { status: 400 }
      );
    }

    const resetLink =
      linkData?.properties?.action_link ||
      `${origin}/reset-password`;

    // 3. Obtener el nombre del usuario si existe en profiles
    let userName = "Doctor/a";
    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("nombre")
        .eq("id", linkData?.user?.id)
        .single();
      if (profile?.nombre) {
        userName = profile.nombre;
      }
    } catch {
      // Ignorar si falla lectura de perfil
    }

    // 4. Enviar el correo usando TU propio transporte SMTP / Gmail
    const mailInfo = await sendPasswordResetEmail({
      to: cleanEmail,
      name: userName,
      resetLink,
    });

    return NextResponse.json({
      success: true,
      message: "Correo de recuperación enviado con éxito",
      messageId: mailInfo.messageId,
    });
  } catch (error: any) {
    console.error("Error en endpoint forgot-password:", error);
    return NextResponse.json(
      { error: error?.message || "Error interno al procesar recuperación de contraseña" },
      { status: 500 }
    );
  }
}
