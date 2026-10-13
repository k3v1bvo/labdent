import { supabase } from "./supabaseClient";
import { getUserProfile } from "./getUserProfile";
import { uploadToImgbb } from "./imgbb";

export interface WorkshopConfig {
  id: number;
  taller_nombre: string;
  latitud: number;
  longitud: number;
  radio_tolerancia_metros: number;
  hora_entrada: string; // "08:30:00"
  tolerancia_entrada_minutos: number; // 20
  hora_salida: string; // "18:30:00"
  duracion_almuerzo_minutos: number; // 60
  tolerancia_almuerzo_minutos: number; // 10
}

export interface AttendanceRecord {
  id: string;
  usuario_id: string;
  usuario_nombre: string;
  usuario_rol: string;
  tipo: "ENTRADA" | "SALIDA_ALMUERZO" | "REGRESO_ALMUERZO" | "SALIDA_JORNADA";
  fecha: string;
  hora: string;
  latitud: number;
  longitud: number;
  distancia_metros: number;
  foto_selfie_url: string;
  estado: "A_TIEMPO" | "TARDANZA" | "FUERA_DE_RANGO" | "ALMUERZO_EXCESO";
  minutos_retraso: number;
  observaciones?: string;
  created_at: string;
}

/**
 * Calcula la distancia en metros entre dos coordenadas GPS (Fórmula de Haversine)
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) *
      Math.cos(lat2 * rad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Obtiene la configuración de geocerca y horarios del taller
 */
export async function getWorkshopConfig(): Promise<WorkshopConfig> {
  const defaultConfig: WorkshopConfig = {
    id: 1,
    taller_nombre: "Guisela Laboratorio Dental",
    latitud: -16.4955,
    longitud: -68.1336,
    radio_tolerancia_metros: 100,
    hora_entrada: "08:30:00",
    tolerancia_entrada_minutos: 20,
    hora_salida: "18:30:00",
    duracion_almuerzo_minutos: 60,
    tolerancia_almuerzo_minutos: 10,
  };

  try {
    const { data, error } = await supabase
      .from("configuracion_taller")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) return defaultConfig;
    return {
      ...defaultConfig,
      ...data,
      latitud: Number(data.latitud),
      longitud: Number(data.longitud),
    };
  } catch (err) {
    return defaultConfig;
  }
}

/**
 * Actualiza la configuración del taller (solo para Admin)
 */
export async function updateWorkshopConfig(
  config: Partial<WorkshopConfig>
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from("configuracion_taller")
      .upsert({ id: 1, ...config, updated_at: new Date().toISOString() });

    if (error) return { success: false, error };
    return { success: true };
  } catch (err) {
    return { success: false, error: err };
  }
}

/**
 * Obtiene los registros de asistencia de hoy para un usuario
 */
export async function getTodayAttendance(
  userId: string
): Promise<AttendanceRecord[]> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("asistencia_horarios")
      .select("*")
      .eq("usuario_id", userId)
      .eq("fecha", today)
      .order("created_at", { ascending: true });

    if (error || !data) return [];
    return data as AttendanceRecord[];
  } catch (err) {
    return [];
  }
}

/**
 * Registra un marcaje con foto selfie y geolocalización
 */
export async function registerAttendanceMark({
  tipo,
  latitud,
  longitud,
  fotoBase64,
  observaciones,
}: {
  tipo: "ENTRADA" | "SALIDA_ALMUERZO" | "REGRESO_ALMUERZO" | "SALIDA_JORNADA";
  latitud: number;
  longitud: number;
  fotoBase64: string;
  observaciones?: string;
}): Promise<{ success: boolean; message: string; record?: any }> {
  try {
    const { user, profile } = await getUserProfile();
    if (!user) {
      return { success: false, message: "Sesión inválida. Vuelve a iniciar sesión." };
    }

    const config = await getWorkshopConfig();
    const distancia = calculateDistanceMeters(
      latitud,
      longitud,
      config.latitud,
      config.longitud
    );

    const now = new Date();
    const currentTimeStr = now.toTimeString().slice(0, 8);
    const currentDateStr = now.toISOString().split("T")[0];

    // Verificar Geocerca (100 metros)
    let estado: "A_TIEMPO" | "TARDANZA" | "FUERA_DE_RANGO" | "ALMUERZO_EXCESO" =
      "A_TIEMPO";
    let minutosRetraso = 0;

    if (distancia > config.radio_tolerancia_metros) {
      estado = "FUERA_DE_RANGO";
    } else if (tipo === "ENTRADA") {
      // Evaluar hora de entrada y tolerancia de 20 min
      const [hEntrada, mEntrada] = config.hora_entrada.split(":").map(Number);
      const entradaEsperada = new Date(now);
      entradaEsperada.setHours(hEntrada, mEntrada, 0, 0);

      const entradaLimite = new Date(entradaEsperada);
      entradaLimite.setMinutes(entradaLimite.getMinutes() + config.tolerancia_entrada_minutos);

      if (now > entradaLimite) {
        estado = "TARDANZA";
        const diffMs = now.getTime() - entradaEsperada.getTime();
        minutosRetraso = Math.round(diffMs / 60000);
      }
    } else if (tipo === "REGRESO_ALMUERZO") {
      // Buscar la salida de almuerzo de hoy
      const todayLogs = await getTodayAttendance(user.id);
      const salidaAlmuerzo = todayLogs.find((l) => l.tipo === "SALIDA_ALMUERZO");

      if (salidaAlmuerzo) {
        const fechaSalida = new Date(salidaAlmuerzo.created_at);
        const minutosTranscurridos = Math.round(
          (now.getTime() - fechaSalida.getTime()) / 60000
        );

        // Duración reglamentaria: 60 min + 10 min tolerancia = 70 min
        const limiteMaximo =
          config.duracion_almuerzo_minutos + config.tolerancia_almuerzo_minutos;

        if (minutosTranscurridos > limiteMaximo) {
          estado = "ALMUERZO_EXCESO";
          minutosRetraso = minutosTranscurridos - config.duracion_almuerzo_minutos;
        }
      }
    }

    // Subir foto selfie a ImgBB para ahorrar almacenamiento en Supabase
    let finalFotoUrl = fotoBase64;
    try {
      const imgbbRes = await uploadToImgbb(
        fotoBase64,
        `asistencia_${user.id}_${currentDateStr}_${tipo}`
      );
      if (imgbbRes.success && imgbbRes.url) {
        finalFotoUrl = imgbbRes.url;
      }
    } catch (e) {
      console.warn("Fallback a foto original por error de ImgBB:", e);
    }

    const newRecord = {
      usuario_id: user.id,
      usuario_nombre: profile?.nombre || user.email || "Usuario",
      usuario_rol: profile?.rol || "tecnico",
      tipo,
      fecha: currentDateStr,
      hora: currentTimeStr,
      latitud,
      longitud,
      distancia_metros: distancia,
      foto_selfie_url: finalFotoUrl,
      estado,
      minutos_retraso: minutosRetraso,
      observaciones: observaciones || null,
      created_at: now.toISOString(),
    };

    const { data, error } = await supabase
      .from("asistencia_horarios")
      .insert(newRecord)
      .select()
      .single();

    if (error) {
      console.error("Error registrando asistencia:", error);
      return { success: false, message: error.message };
    }

    let msg = "✅ Marcación registrada correctamente.";
    if (estado === "FUERA_DE_RANGO") {
      msg = `⚠️ Marcación registrada, pero estás a ${distancia}m del taller (Límite: ${config.radio_tolerancia_metros}m). Se reportó como FUERA DE RANGO.`;
    } else if (estado === "TARDANZA") {
      msg = `⚠️ Marcación registrada con tardanza de ${minutosRetraso} minutos.`;
    } else if (estado === "ALMUERZO_EXCESO") {
      msg = `⚠️ Regreso de almuerzo registrado con exceso de ${minutosRetraso} minutos.`;
    }

    return { success: true, message: msg, record: data };
  } catch (err: any) {
    console.error(err);
    return { success: false, message: err.message || "Error inesperado" };
  }
}
