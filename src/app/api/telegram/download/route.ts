import { NextRequest, NextResponse } from "next/server";
import { getTelegramFileDownloadUrl } from "@/lib/telegram";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId");
    const fileName = searchParams.get("fileName") || "escaneo_3d_clinico.stl";

    if (!fileId) {
      return NextResponse.json(
        { error: "fileId es requerido para descargar el archivo de Telegram" },
        { status: 400 }
      );
    }

    const { url, error } = await getTelegramFileDownloadUrl(fileId);

    if (error || !url) {
      return NextResponse.json(
        { error: error || "No se pudo obtener la URL de descarga desde Telegram" },
        { status: 502 }
      );
    }

    // Descargar el stream directamente desde Telegram y servirlo como archivo adjunto
    const tgRes = await fetch(url);
    if (!tgRes.ok || !tgRes.body) {
      return NextResponse.json(
        { error: "Error al transmitir el archivo desde el servidor de Telegram" },
        { status: 502 }
      );
    }

    const cleanFileName = fileName.replace(/["\r\n\/\\]/g, "_");
    const headers = new Headers();
    headers.set(
      "Content-Disposition",
      `attachment; filename="${cleanFileName}"; filename*=UTF-8''${encodeURIComponent(cleanFileName)}`
    );
    headers.set("Content-Type", "application/octet-stream");
    const cl = tgRes.headers.get("content-length");
    if (cl) headers.set("Content-Length", cl);

    return new NextResponse(tgRes.body as any, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error("Error en /api/telegram/download:", err);
    return NextResponse.json(
      { error: err?.message || "Error interno al descargar archivo 3D de Telegram" },
      { status: 500 }
    );
  }
}
