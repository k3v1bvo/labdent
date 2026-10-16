import { NextRequest, NextResponse } from "next/server";
import { sendRoleChangeEmail } from "@/lib/mailer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { to, name, newRole, previousRole, userId } = await req.json();

    if (!newRole) {
      return NextResponse.json(
        { error: "El campo newRole es obligatorio" },
        { status: 400 }
      );
    }

    let recipientEmail = to;
    let recipientName = name;

    // Si no se proporcionó el correo pero sí el userId, buscarlo en auth.users
    if (!recipientEmail && userId) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
      recipientEmail = userData?.user?.email;

      if (!recipientName) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("nombre")
          .eq("id", userId)
          .maybeSingle();
        recipientName = profile?.nombre || userData?.user?.user_metadata?.full_name || "Usuario";
      }
    }

    // 1. Insertar notificación en el sistema (campanita del usuario)
    if (userId) {
      try {
        await supabaseAdmin.from("notificaciones").insert({
          tipo: "admin",
          receptor_id: userId,
          mensaje: `Tu rol en el sistema ha sido actualizado a ${newRole.toUpperCase()} por la administración.`,
          leida: false,
        });
      } catch (notifErr) {
        console.warn("No se pudo insertar notificación in-app de rol:", notifErr);
      }
    }

    // 2. Enviar correo si tenemos destinatario
    let messageId = null;
    if (recipientEmail) {
      try {
        const info = await sendRoleChangeEmail({
          to: recipientEmail,
          name: recipientName,
          newRole,
          previousRole,
        });
        messageId = info.messageId;
      } catch (mailErr) {
        console.error("Error al despachar correo de cambio de rol:", mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      messageId,
    });
  } catch (error: any) {
    console.error("Error en API role-change:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar cambio de rol" },
      { status: 500 }
    );
  }
}
