import { NextRequest, NextResponse } from "next/server";
import { sendOrderNotificationEmail } from "@/lib/mailer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let {
      to,
      doctorName,
      pacienteNombre,
      numeroRequerimiento,
      numeroCaja,
      estado,
      trabajoRealizar,
      pedidoId,
    } = body;

    // Si falta el correo o datos de la orden, intentar resolverlos automáticamente con pedidoId
    if ((!to || !pacienteNombre) && pedidoId) {
      try {
        const { data: pedido } = await supabaseAdmin
          .from("pedidos")
          .select(
            "paciente_nombre, doctor_nombre, numero_requerimiento, numero_caja, trabajo_realizar, creado_por, doctor_id"
          )
          .eq("id", pedidoId)
          .single();

        if (pedido) {
          pacienteNombre = pacienteNombre || pedido.paciente_nombre;
          doctorName = doctorName || pedido.doctor_nombre;
          numeroRequerimiento = numeroRequerimiento || pedido.numero_requerimiento;
          numeroCaja = numeroCaja || pedido.numero_caja;
          trabajoRealizar = trabajoRealizar || pedido.trabajo_realizar;

          const userIdToLook = pedido.creado_por;
          if (userIdToLook) {
            const { data: userData } =
              await supabaseAdmin.auth.admin.getUserById(userIdToLook);
            if (userData?.user?.email) {
              to = userData.user.email;
            }
          }
        }
      } catch (lookupErr) {
        console.warn("No se pudo autocompletar email por pedidoId:", lookupErr);
      }
    }

    if (!to || !pacienteNombre || !estado) {
      return NextResponse.json(
        {
          error:
            "Campos to, pacienteNombre y estado son requeridos (o un pedidoId válido con usuario registrado)",
        },
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
