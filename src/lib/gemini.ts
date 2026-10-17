/**
 * Servicio de Inteligencia Artificial Google Gemini para Guisela Laboratorio Dental
 * Exclusivo para el Propietario y Administrador del Laboratorio.
 */

export interface GeminiMessage {
  role: "user" | "model" | "system";
  content: string;
}

/**
 * Llama a la API oficial de Google Gemini usando REST
 */
export async function queryGoogleGemini(
  prompt: string,
  systemInstruction?: string,
  conversationHistory: { role: string; text: string }[] = [],
  apiKeyOverride?: string
): Promise<{ text: string; error?: string }> {
  const apiKey =
    apiKeyOverride?.trim() ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    "";

  if (!apiKey) {
    return {
      text: "",
      error:
        "Falta la clave API de Google Gemini (GEMINI_API_KEY). Configúrala en el asistente o en tu archivo .env.local",
    };
  }

  // Modelos compatibles en orden de prioridad: gemini-1.5-flash -> gemini-2.0-flash -> gemini-1.5-pro
  const models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];

  let lastError = "";

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const contents: any[] = [];

      // Historial previo
      for (const msg of conversationHistory) {
        contents.push({
          role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
          parts: [{ text: msg.text }],
        });
      }

      // Mensaje actual
      contents.push({
        role: "user",
        parts: [{ text: prompt }],
      });

      const bodyPayload: any = {
        contents,
        generationConfig: {
          temperature: 0.2, // Respuestas precisas, analíticas y basadas en los datos reales
          maxOutputTokens: 2048,
        },
      };

      if (systemInstruction) {
        bodyPayload.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        lastError = data.error?.message || `Error con modelo ${model}`;
        continue;
      }

      const candidate = data.candidates?.[0];
      const responseText = candidate?.content?.parts?.[0]?.text;

      if (responseText) {
        return { text: responseText };
      }
    } catch (e: any) {
      lastError = e?.message || "Fallo de conexión con Google Gemini";
    }
  }

  return {
    text: "",
    error: lastError || "No se pudo obtener respuesta de Google Gemini",
  };
}
