/**
 * Servicio Centralizado de Subida de Imágenes a ImgBB
 * Clave API de ImgBB provista por el usuario: 3c611fb33734f0610b8cf99e258cf21e
 *
 * Almacena imágenes en los servidores de ImgBB y devuelve únicamente
 * la URL permanente para almacenarla en Supabase, ahorrando límites de almacenamiento
 * y acelerando la carga en toda la plataforma.
 */

const IMGBB_API_KEY =
  process.env.NEXT_PUBLIC_IMGBB_API_KEY || "3c611fb33734f0610b8cf99e258cf21e";

export interface ImgbbUploadResult {
  success: boolean;
  url?: string;
  displayUrl?: string;
  thumbUrl?: string;
  deleteUrl?: string;
  error?: string;
}

/**
 * Sube una imagen (File, Blob o string Base64) a ImgBB.
 * En el navegador, utiliza la ruta interna /api/upload-imgbb para evitar bloqueos CORS.
 */
export async function uploadToImgbb(
  imageInput: File | Blob | string,
  name?: string
): Promise<ImgbbUploadResult> {
  try {
    // Si ya es una URL permanente válida de ImgBB o web, retornarla directamente
    if (typeof imageInput === "string" && (imageInput.startsWith("http://") || imageInput.startsWith("https://"))) {
      return {
        success: true,
        url: imageInput,
        displayUrl: imageInput,
      };
    }

    let base64String = "";

    if (typeof imageInput === "string") {
      base64String = imageInput;
    } else {
      // Convertir File / Blob a Base64
      base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageInput);
      });
    }

    // Si estamos en el navegador, llamar a la API interna Next.js (cero CORS)
    if (typeof window !== "undefined") {
      const res = await fetch("/api/upload-imgbb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64String,
          name: name || `guisela_${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error("Error en API /api/upload-imgbb:", data);
        return {
          success: false,
          error: data?.error || "Error al subir imagen a ImgBB vía servidor",
        };
      }

      return {
        success: true,
        url: data.url,
        displayUrl: data.displayUrl || data.url,
        thumbUrl: data.thumbUrl || data.url,
        deleteUrl: data.deleteUrl,
      };
    }

    // Si estamos en entorno Node.js del servidor:
    let base64Clean = base64String;
    if (base64String.includes(",")) {
      base64Clean = base64String.split(",")[1];
    }

    const formData = new FormData();
    formData.append("image", base64Clean);
    if (name) formData.append("name", name);

    const endpoint = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      const errMsg = data?.error?.message || `Error ${response.status} en ImgBB`;
      console.error("Error al subir a ImgBB:", errMsg);
      return { success: false, error: errMsg };
    }

    const finalUrl = data.data.display_url || data.data.url;
    return {
      success: true,
      url: finalUrl,
      displayUrl: finalUrl,
      thumbUrl: data.data.thumb?.url || finalUrl,
      deleteUrl: data.data.delete_url,
    };
  } catch (err: any) {
    console.error("Excepción en uploadToImgbb:", err);
    return {
      success: false,
      error: err.message || "Error de red al procesar imagen",
    };
  }
}
