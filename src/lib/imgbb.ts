/**
 * Servicio Centralizado de Subida de Imágenes a ImgBB
 * Clave API de ImgBB provista por el usuario: 3c611fb33734f0610b8cf99e258cf21e
 *
 * Almacena imágenes en los servidores de ImgBB y devuelve únicamente
 * la URL permanente para almacenarla en Supabase, ahorrando límites de almacenamiento.
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
 * Sube una imagen (File, Blob o string Base64) a la API v1 de ImgBB
 * @param imageInput Archivo binario (File/Blob) o cadena en Base64
 * @param name Nombre opcional de la imagen
 */
export async function uploadToImgbb(
  imageInput: File | Blob | string,
  name?: string
): Promise<ImgbbUploadResult> {
  try {
    const formData = new FormData();

    if (typeof imageInput === "string") {
      // Si es una cadena Base64 tipo "data:image/jpeg;base64,..."
      let base64Clean = imageInput;
      if (imageInput.includes(",")) {
        base64Clean = imageInput.split(",")[1];
      }
      formData.append("image", base64Clean);
    } else {
      // Si es un File o Blob binario
      formData.append("image", imageInput);
    }

    if (name) {
      formData.append("name", name);
    }

    const endpoint = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      const errMsg =
        data?.error?.message ||
        `Error ${response.status}: No se pudo subir la imagen a ImgBB.`;
      console.error("Error al subir a ImgBB:", errMsg);
      return { success: false, error: errMsg };
    }

    const imgData = data.data;
    const finalUrl = imgData.display_url || imgData.url;

    return {
      success: true,
      url: finalUrl,
      displayUrl: imgData.display_url || finalUrl,
      thumbUrl: imgData.thumb?.url || finalUrl,
      deleteUrl: imgData.delete_url,
    };
  } catch (err: any) {
    console.error("Error de red conectando con ImgBB:", err);
    return {
      success: false,
      error: err.message || "Error de conexión al subir imagen a ImgBB",
    };
  }
}
