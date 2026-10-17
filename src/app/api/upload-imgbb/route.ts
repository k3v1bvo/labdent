import { NextRequest, NextResponse } from "next/server";

const IMGBB_API_KEY =
  process.env.NEXT_PUBLIC_IMGBB_API_KEY || "3c611fb33734f0610b8cf99e258cf21e";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, name } = body;

    if (!image) {
      return NextResponse.json(
        { success: false, error: "No se proporcionó imagen" },
        { status: 400 }
      );
    }

    // Si ya es una URL de ImgBB, retornarla directamente
    if (typeof image === "string" && image.startsWith("http")) {
      return NextResponse.json({ success: true, url: image });
    }

    let base64Clean = image;
    if (typeof image === "string" && image.includes(",")) {
      base64Clean = image.split(",")[1];
    }

    const formData = new FormData();
    formData.append("image", base64Clean);
    if (name) formData.append("name", name);

    const endpoint = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;
    const imgbbRes = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    const data = await imgbbRes.json();

    if (!imgbbRes.ok || !data.success) {
      console.error("ImgBB Server-Side API error:", data);
      return NextResponse.json(
        {
          success: false,
          error: data?.error?.message || "Error al subir a ImgBB",
        },
        { status: 500 }
      );
    }

    const finalUrl = data.data.display_url || data.data.url;

    return NextResponse.json({
      success: true,
      url: finalUrl,
      displayUrl: finalUrl,
      thumbUrl: data.data.thumb?.url || finalUrl,
      deleteUrl: data.data.delete_url,
    });
  } catch (error: any) {
    console.error("Error en /api/upload-imgbb:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error interno subiendo a ImgBB" },
      { status: 500 }
    );
  }
}
