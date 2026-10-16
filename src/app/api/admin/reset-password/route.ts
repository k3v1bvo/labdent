import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendTemporaryPasswordEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const { userId, temporaryPassword, sendEmail = true } = await req.json();

    if (!userId || !temporaryPassword) {
      return NextResponse.json(
        { error: "El ID de usuario y la contraseña temporal son obligatorios" },
        { status: 400 }
      );
    }

    if (temporaryPassword.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    // 1. Actualizar la contraseña directamente en auth.users con la clave maestra de Supabase
    const { data: updateData, error: updateErr } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: temporaryPassword,
        user_metadata: {
          must_change_password: true,
        },
      });

    if (updateErr) {
      console.error("Error al actualizar contraseña:", updateErr);
      return NextResponse.json(
        { error: updateErr.message || "Error al actualizar la contraseña del usuario" },
        { status: 400 }
      );
    }

    const userEmail = updateData?.user?.email;

    // 2. Obtener el nombre del usuario
    let userName = updateData?.user?.user_metadata?.full_name || "Doctor/a";
    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("nombre")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.nombre) {
        userName = profile.nombre;
      }
    } catch {
      // Ignorar si falla lectura de perfil
    }

    // 3. Insertar notificación en el sistema (campanita del usuario)
    try {
      await supabaseAdmin.from("notificaciones").insert({
        tipo: "admin",
        receptor_id: userId,
        mensaje: `Tu contraseña ha sido restablecida temporalmente por el Administrador. Por favor, actualízala desde tu perfil.`,
        leida: false,
      });
    } catch (notifErr) {
      console.warn("No se pudo insertar notificación in-app:", notifErr);
    }

    // 4. Si sendEmail está activo y hay correo, enviar notificación
    let messageId = null;
    if (sendEmail && userEmail) {
      try {
        const mailInfo = await sendTemporaryPasswordEmail({
          to: userEmail,
          name: userName,
          temporaryPassword,
        });
        messageId = mailInfo.messageId;
      } catch (mailErr) {
        console.error("Error enviando correo de clave temporal:", mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      email: userEmail,
      messageId,
      message: "Contraseña restablecida exitosamente",
    });
  } catch (error: any) {
    console.error("Error en API admin reset-password:", error);
    return NextResponse.json(
      { error: error?.message || "Error interno al restablecer contraseña" },
      { status: 500 }
    );
  }
}
