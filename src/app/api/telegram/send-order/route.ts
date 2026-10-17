import { NextRequest, NextResponse } from "next/server";
import {
  formatTelegramOrderMessage,
  sendTelegramMessage,
  sendTelegramDocument,
  type TelegramOrderInfo,
} from "@/lib/telegram";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let orderInfo: TelegramOrderInfo;
    let fileBuffer: Buffer | null = null;
    let fileName = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const rawOrder = formData.get("orderData");
      if (!rawOrder || typeof rawOrder !== "string") {
        return NextResponse.json(
          { error: "orderData es obligatorio en FormData" },
          { status: 400 }
        );
      }
      orderInfo = JSON.parse(rawOrder);

      const file = formData.get("file3d") as File | null;
      if (file && file.size > 0) {
        fileName = file.name;
        orderInfo.fileName3D = fileName;
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      }
    } else {
      const body = await req.json();
      orderInfo = body;
    }

    // 1. Si adjuntó archivo 3D, subir a Supabase Storage (bucket pedidos_3d) para descarga del técnico
    let downloadUrl: string | null = null;
    if (fileBuffer && fileName) {
      try {
        const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `req_${orderInfo.numeroRequerimiento || Date.now()}_${sanitized}`;

        const { error: upErr } = await supabaseAdmin.storage
          .from("pedidos_3d")
          .upload(storagePath, fileBuffer, {
            contentType: "application/octet-stream",
            upsert: true,
          });

        if (!upErr) {
          const { data: pubData } = supabaseAdmin.storage
            .from("pedidos_3d")
            .getPublicUrl(storagePath);
          downloadUrl = pubData?.publicUrl || null;
        } else {
          console.warn("Aviso subiendo 3D a Supabase Storage:", upErr);
        }
      } catch (stErr) {
        console.warn("Fallo almacenamiento en Supabase Storage:", stErr);
      }

      // Si obtuvimos enlace público, guardarlo en observaciones para descarga en el panel de técnicos
      if (downloadUrl && orderInfo.numeroRequerimiento) {
        try {
          const { data: currentPed } = await supabaseAdmin
            .from("pedidos")
            .select("id, observaciones")
            .eq("numero_requerimiento", orderInfo.numeroRequerimiento)
            .maybeSingle();

          if (currentPed) {
            const linkTag = `[🔗 ENLACE 3D: ${downloadUrl}]`;
            const updatedObs = currentPed.observaciones
              ? `${currentPed.observaciones}\n${linkTag}`
              : linkTag;

            await supabaseAdmin
              .from("pedidos")
              .update({ observaciones: updatedObs })
              .eq("id", currentPed.id);
          }
        } catch (updErr) {
          console.warn("No se pudo actualizar link 3D en pedido:", updErr);
        }
      }
    }

    // 2. Enviar ficha textual a Telegram (no bloquea si Telegram aún no está configurado)
    let msgResult = null;
    try {
      const messageText = formatTelegramOrderMessage(orderInfo);
      msgResult = await sendTelegramMessage(messageText);
    } catch (tgErr) {
      console.warn("Aviso Telegram texto:", tgErr);
    }

    // 3. Enviar archivo 3D a Telegram como documento si está disponible
    let docResult = null;
    if (fileBuffer && fileName) {
      try {
        const caption = `📦 Escaneo 3D CAD/CAM (#${orderInfo.numeroRequerimiento} - Paciente: ${orderInfo.pacienteNombre})`;
        docResult = await sendTelegramDocument(fileBuffer, fileName, caption);
      } catch (tgDocErr) {
        console.warn("Aviso Telegram archivo:", tgDocErr);
      }
    }

    return NextResponse.json({
      success: true,
      downloadUrl,
      fileName3D: fileName || null,
      messageResult: msgResult,
      documentResult: docResult,
    });
  } catch (err: any) {
    console.error("Error en /api/telegram/send-order:", err);
    return NextResponse.json(
      { error: err?.message || "Error procesando orden 3D" },
      { status: 500 }
    );
  }
}
