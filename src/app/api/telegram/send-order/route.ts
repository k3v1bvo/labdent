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

    // 1. Enviar ficha textual a Telegram (notificación al canal/grupo del laboratorio)
    let msgResult = null;
    try {
      const messageText = formatTelegramOrderMessage(orderInfo);
      msgResult = await sendTelegramMessage(messageText);
    } catch (tgErr) {
      console.warn("Aviso Telegram texto:", tgErr);
    }

    // 2. 📦 TELEGRAM CLOUD STORAGE: Usar Telegram como base de datos en la nube para archivos 3D
    // Almacenamiento gratuito e ilimitado para STL, OBJ, PLY y ZIP sin saturar Supabase.
    let docResult = null;
    let downloadUrl: string | null = null;

    if (fileBuffer && fileName) {
      try {
        const caption = `📦 Escaneo 3D CAD/CAM (#${orderInfo.numeroRequerimiento} - Paciente: ${orderInfo.pacienteNombre})`;
        docResult = await sendTelegramDocument(fileBuffer, fileName, caption);

        // Si Telegram guardó el archivo y devolvió fileId:
        if (docResult?.fileId) {
          downloadUrl = `/api/telegram/download?fileId=${encodeURIComponent(docResult.fileId)}&fileName=${encodeURIComponent(fileName)}`;
        }
      } catch (tgDocErr) {
        console.warn("Aviso subiendo 3D a Telegram:", tgDocErr);
      }

      // Si Telegram no estaba configurado o falló, fallback de emergencia a Supabase Storage
      if (!downloadUrl) {
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
            console.warn("Aviso subiendo 3D a Supabase Storage de respaldo:", upErr);
          }
        } catch (stErr) {
          console.warn("Fallo respaldo en Supabase Storage:", stErr);
        }
      }

      // 3. Guardar las direcciones de descarga en Supabase (en modelo_3d_link y observaciones)
      if (orderInfo.numeroRequerimiento) {
        try {
          const { data: currentPed } = await supabaseAdmin
            .from("pedidos")
            .select("id, observaciones")
            .eq("numero_requerimiento", orderInfo.numeroRequerimiento)
            .maybeSingle();

          if (currentPed) {
            const tgTag = docResult?.fileId
              ? `[📦 TELEGRAM 3D: file_id=${docResult.fileId} | name=${fileName}]`
              : `[📦 ESCANEO 3D CAD/CAM: ${fileName}]`;

            const linkTag = downloadUrl ? `[🔗 ENLACE 3D: ${downloadUrl}]` : "";

            let updatedObs = currentPed.observaciones || "";
            if (!updatedObs.includes(tgTag)) {
              updatedObs = updatedObs ? `${updatedObs}\n${tgTag}` : tgTag;
            }
            if (linkTag && !updatedObs.includes(linkTag)) {
              updatedObs = `${updatedObs}\n${linkTag}`;
            }

            await supabaseAdmin
              .from("pedidos")
              .update({
                observaciones: updatedObs,
                ...(downloadUrl ? { modelo_3d_link: downloadUrl } : {}),
              })
              .eq("id", currentPed.id);
          }
        } catch (updErr) {
          console.warn("No se pudo registrar dirección 3D en Supabase:", updErr);
        }
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
