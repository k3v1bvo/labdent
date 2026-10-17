/**
 * Utilidades de fecha y hora sincronizadas con Cochabamba, Bolivia (GMT-4 / America/La_Paz)
 * Garantiza que sin importar dónde corran los servidores (Vercel en USA/Europa)
 * o los dispositivos de los doctores, todos los registros, reportes y horas se manejen
 * bajo la hora oficial de Bolivia.
 */

export const BOLIVIA_TIMEZONE = "America/La_Paz";

/**
 * Obtiene la fecha y hora actual formateada o ajustada a Bolivia
 */
export function getBoliviaNow(): Date {
  // Generar fecha en timezone America/La_Paz
  const now = new Date();
  const boliviaStr = now.toLocaleString("en-US", { timeZone: BOLIVIA_TIMEZONE });
  return new Date(boliviaStr);
}

/**
 * Formatea una fecha en formato legible "DD/MM/YYYY" en hora de Bolivia
 */
export function formatBoliviaDate(
  dateValue?: string | Date | number | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateValue) return "—";
  try {
    const d = typeof dateValue === "string" || typeof dateValue === "number" ? new Date(dateValue) : dateValue;
    if (isNaN(d.getTime())) return "—";

    return new Intl.DateTimeFormat("es-BO", {
      timeZone: BOLIVIA_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...options,
    }).format(d);
  } catch {
    return "—";
  }
}

/**
 * Formatea fecha y hora completa "DD/MM/YYYY, HH:MM" en hora de Bolivia
 */
export function formatBoliviaDateTime(
  dateValue?: string | Date | number | null,
  includeSeconds: boolean = false
): string {
  if (!dateValue) return "—";
  try {
    const d = typeof dateValue === "string" || typeof dateValue === "number" ? new Date(dateValue) : dateValue;
    if (isNaN(d.getTime())) return "—";

    return new Intl.DateTimeFormat("es-BO", {
      timeZone: BOLIVIA_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: includeSeconds ? "2-digit" : undefined,
      hour12: false,
    }).format(d);
  } catch {
    return "—";
  }
}

/**
 * Formatea únicamente la hora "HH:MM" o "HH:MM:SS" en hora de Bolivia
 */
export function formatBoliviaTime(
  dateValue?: string | Date | number | null,
  includeSeconds: boolean = false
): string {
  if (!dateValue) return "—";
  try {
    const d = typeof dateValue === "string" || typeof dateValue === "number" ? new Date(dateValue) : dateValue;
    if (isNaN(d.getTime())) return "—";

    return new Intl.DateTimeFormat("es-BO", {
      timeZone: BOLIVIA_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: includeSeconds ? "2-digit" : undefined,
      hour12: false,
    }).format(d);
  } catch {
    return "—";
  }
}

/**
 * Convierte una fecha a string YYYY-MM-DD según la fecha en Bolivia
 */
export function toBoliviaYMD(dateValue?: string | Date | number | null): string {
  const d = dateValue ? new Date(dateValue) : new Date();
  if (isNaN(d.getTime())) return "";

  // Usar formateador con timezone Bolivia
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BOLIVIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const year = parts.find((p) => p.type === "year")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  const day = parts.find((p) => p.type === "day")?.value || "";

  return `${year}-${month}-${day}`;
}

/**
 * Devuelve la hora actual en Bolivia en formato "HH:MM:SS" para campos hora_ingreso / hora_entrega
 */
export function getBoliviaCurrentTimeString(includeSeconds: boolean = true): string {
  return formatBoliviaTime(new Date(), includeSeconds);
}
