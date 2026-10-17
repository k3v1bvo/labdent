import { NextRequest, NextResponse } from "next/server";
import {
  formatTelegramOrderMessage,
  sendTelegramMessage,
  sendTelegramDocument,
  type TelegramOrderInfo,
} from "@/lib/telegram";

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

    // 1. Enviar ficha textual con HTML formateado
    const messageText = formatTelegramOrderMessage(orderInfo);
    const msgResult = await sendTelegramMessage(messageText);

    // 2. Si adjuntó archivo 3D (STL/OBJ), enviarlo como documento
    let docResult = null;
    if (fileBuffer && fileName) {
      const caption = `📦 Escaneo 3D CAD/CAM (#${orderInfo.numeroRequerimiento} - Paciente: ${orderInfo.pacienteNombre})`;
      docResult = await sendTelegramDocument(fileBuffer, fileName, caption);
    }

    return NextResponse.json({
      success: true,
      messageResult: msgResult,
      documentResult: docResult,
      fileName3D: fileName || null,
    });
  } catch (err: any) {
    console.error("Error en /api/telegram/send-order:", err);
    return NextResponse.json(
      { error: err?.message || "Error procesando envío a Telegram" },
      { status: 500 }
    );
  }
}
