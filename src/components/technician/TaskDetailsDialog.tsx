"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Info,
  Hash,
  Ruler,
  Clock,
  Timer,
  User,
  Phone,
  Stethoscope,
  ClipboardCheck,
  Palette,
  Box,
  MessageSquareText,
  DollarSign,
  Copy,
  Download,
  FileCode,
} from "lucide-react";
import { toast } from "sonner";

export type PedidoLite = {
  id: string;
  paciente_nombre: string | null;
  paciente_telefono?: string | null;

  doctor_nombre?: string | null;
  doctor_telefono?: string | null;

  numero_requerimiento?: string | null;

  trabajo_realizar?: string | null;
  pieza_numero?: string | null;
  color_pieza?: string | null;
  colimetro?: string | null;
  numero_caja?: string | null;

  total?: number | null;
  anticipo?: number | null;

  observaciones?: string | null;
};

export type TaskRowLite = {
  id: string;
  estado: "pendiente" | "en_proceso" | "completado" | "devuelto";
  comentarios: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estaciones?: { nombre: string } | null;
  pedidos?: PedidoLite | null;
};

function formatDT(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function msToHuman(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function estadoChip(estado: TaskRowLite["estado"]) {
  const base =
    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium";
  switch (estado) {
    case "pendiente":
      return (
        <span className={`${base} bg-gray-100 text-gray-700`}>
          <Clock className="w-3.5 h-3.5" /> Pendiente
        </span>
      );
    case "en_proceso":
      return (
        <span className={`${base} bg-blue-100 text-blue-800`}>
          <Timer className="w-3.5 h-3.5" /> En proceso
        </span>
      );
    case "completado":
      return (
        <span className={`${base} bg-green-100 text-green-800`}>
          ✅ Completado
        </span>
      );
    case "devuelto":
      return (
        <span className={`${base} bg-red-100 text-red-800`}>❌ Devuelto</span>
      );
    default:
      return <span className={`${base} bg-gray-100 text-gray-700`}>{estado}</span>;
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function TaskDetailsDialog({
  open,
  onOpenChange,
  row,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: TaskRowLite | null;
}) {
  const p = row?.pedidos;

  const start = row?.fecha_inicio ? new Date(row.fecha_inicio).getTime() : null;
  const end = row?.fecha_fin ? new Date(row.fecha_fin).getTime() : null;
  const duration = start && end ? msToHuman(end - start) : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#3C1C6C] font-bold">
            <Info className="w-5 h-5 text-[#A57CFA]" />
            Detalles del registro de trabajo
          </DialogTitle>
        </DialogHeader>

        {!row ? (
          <p className="text-sm text-muted-foreground">No hay datos.</p>
        ) : (
          <div className="space-y-4">
            {/* Chips */}
            <div className="flex flex-wrap items-center gap-2">
              {p?.numero_requerimiento && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                  <Hash className="w-3.5 h-3.5" />
                  {p.numero_requerimiento}
                </span>
              )}

              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                <Ruler className="w-3.5 h-3.5" />
                {row.estaciones?.nombre || "—"}
              </span>

              {estadoChip(row.estado)}
            </div>

            {/* Tiempos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="border rounded-2xl p-4 bg-white">
                <p className="text-xs text-muted-foreground font-semibold mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-600" />
                  Inicio
                </p>
                <p className="font-semibold text-slate-900">
                  {formatDT(row.fecha_inicio)}
                </p>
              </div>

              <div className="border rounded-2xl p-4 bg-white">
                <p className="text-xs text-muted-foreground font-semibold mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-600" />
                  Fin
                </p>
                <p className="font-semibold text-slate-900">
                  {formatDT(row.fecha_fin)}
                </p>
              </div>

              <div className="border rounded-2xl p-4 bg-white">
                <p className="text-xs text-muted-foreground font-semibold mb-2 flex items-center gap-2">
                  <Timer className="w-4 h-4 text-slate-600" />
                  Duración
                </p>
                <p className="font-semibold text-slate-900">{duration}</p>
              </div>
            </div>

            {/* Paciente + Doctor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="border rounded-2xl p-4 bg-white">
                <p className="text-xs text-muted-foreground font-semibold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-600" />
                  Paciente
                </p>

                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Nombre:</span>
                    <span className="font-semibold">
                      {p?.paciente_nombre || "—"}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Tel:</span>
                    <span className="font-semibold">
                      {p?.paciente_telefono || "—"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="border rounded-2xl p-4 bg-white">
                <p className="text-xs text-muted-foreground font-semibold mb-3 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-slate-600" />
                  Doctor
                </p>

                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Nombre:</span>
                    <span className="font-semibold">
                      {p?.doctor_nombre || "—"}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Tel:</span>
                    <span className="font-semibold">
                      {p?.doctor_telefono || "—"}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Trabajo */}
            <div className="border rounded-2xl p-4 bg-white">
              <p className="text-xs text-muted-foreground font-semibold mb-3 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-slate-600" />
                Trabajo
              </p>

              <p className="text-sm">
                <span className="text-muted-foreground">Trabajo:</span>{" "}
                <span className="font-semibold">
                  {p?.trabajo_realizar || "—"}
                </span>
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-white text-slate-700">
                  <Ruler className="w-3.5 h-3.5" />
                  Pieza:{" "}
                  <span className="font-semibold">{p?.pieza_numero || "—"}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-white text-slate-700">
                  <Palette className="w-3.5 h-3.5" />
                  Color:{" "}
                  <span className="font-semibold">{p?.color_pieza || "—"}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-white text-slate-700">
                  <Ruler className="w-3.5 h-3.5" />
                  Colímetro:{" "}
                  <span className="font-semibold">{p?.colimetro || "—"}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-white text-slate-700">
                  <Box className="w-3.5 h-3.5" />
                  Caja:{" "}
                  <span className="font-semibold">{p?.numero_caja || "—"}</span>
                </span>
              </div>
            </div>

            {/* 🦷 SECCIÓN DE DESCARGA DE ESCANEO 3D (STL / OBJ) PARA EL TÉCNICO */}
            {(() => {
              const obs = p?.observaciones || "";
              const stlMatch = obs.match(/\[🔗 ENLACE 3D:\s*(https?:\/\/[^\s\]]+)\]/i) || obs.match(/(https?:\/\/[^\s]+\.(?:stl|obj|ply|zip|rar))/i);
              const stlUrl = stlMatch ? stlMatch[1] || stlMatch[0] : null;

              const stlNameMatch = obs.match(/\[📦 ESCANEO 3D CAD\/CAM:\s*([^(\]]+)/i);
              const stlFileName = stlNameMatch ? stlNameMatch[1].trim() : "escaneo_3d_clinico.stl";

              if (!stlUrl && !stlNameMatch) return null;

              return (
                <div className="border border-purple-200 rounded-2xl p-4 bg-purple-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#3C1C6C] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                      <FileCode className="w-5 h-5 text-purple-200" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        Escaneo Digital 3D: <code className="text-purple-800 font-mono font-bold">{stlFileName}</code>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Archivo clínico para diseño en Exocad, 3Shape o Ceramill.
                      </p>
                    </div>
                  </div>

                  {stlUrl ? (
                    <a
                      href={stlUrl}
                      target="_blank"
                      rel="noreferrer"
                      download={stlFileName}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#3C1C6C] hover:bg-[#2E1553] text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar Archivo 3D
                    </a>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg shrink-0">
                      Sincronizado a Telegram
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Observaciones + Comentario */}
            {(p?.observaciones || row.comentarios) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {p?.observaciones && (
                  <div className="border rounded-2xl p-4 bg-white">
                    <p className="text-xs text-muted-foreground font-semibold mb-2 flex items-center gap-2">
                      <MessageSquareText className="w-4 h-4 text-slate-600" />
                      Observaciones del pedido
                    </p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {p.observaciones}
                    </p>
                  </div>
                )}

                {row.comentarios && (
                  <div className="border rounded-2xl p-4 bg-white">
                    <p className="text-xs text-muted-foreground font-semibold mb-2 flex items-center gap-2">
                      <MessageSquareText className="w-4 h-4 text-slate-600" />
                      Comentario técnico
                    </p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {row.comentarios}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-slate-100 pt-3">
          <Button
            variant="outline"
            className="w-full sm:w-auto rounded-xl border-slate-200 h-10"
            onClick={async () => {
              const txt = p?.numero_requerimiento ?? "";
              if (!txt.trim()) return;
              const ok = await copyToClipboard(txt);
              if (ok) toast.success("📋 Requerimiento copiado");
              else toast.error("No se pudo copiar");
            }}
            disabled={!p?.numero_requerimiento}
          >
            <Copy className="w-4 h-4 mr-2" /> Copiar requerimiento
          </Button>

          <Button
            variant="outline"
            className="w-full sm:w-auto rounded-xl border-slate-200 h-10"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
