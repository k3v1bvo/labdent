"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchOrder() {
      setLoading(true);
      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          id,
          paciente_nombre,
          paciente_genero,
          piezas,
          observaciones,
          estado,
          modelo_3d_link,
          anticipo,
          total,
          fecha_creacion,
          fecha_entrega,
          doctores (
            id,
            clinica,
            especialidad,
            profiles (nombre)
          ),
          historial_estaciones (
            id,
            fecha_inicio,
            fecha_fin,
            estado,
            comentarios,
            estaciones (nombre),
            perfiles:tecnico_id (nombre)
          ),
          archivos (id, tipo, url_archivo, descripcion, fecha_subida)
        `)
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error cargando pedido:", error);
      } else {
        setOrder(data);
      }
      setLoading(false);
    }

    fetchOrder();
  }, [id]);

  if (loading) return <p className="p-10">Cargando detalles del pedido...</p>;
  if (!order)
    return <p className="p-10 text-red-600">No se encontró el pedido.</p>;

  const estadoColors: Record<string, string> = {
    pendiente: "bg-yellow-100 text-yellow-700",
    en_proceso: "bg-blue-100 text-blue-700",
    finalizado: "bg-green-100 text-green-700",
    entregado: "bg-purple-100 text-purple-700",
    devuelto: "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <button
        onClick={() => router.back()}
        className="mb-6 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
      >
        ⬅ Volver
      </button>

      <div className="bg-white shadow rounded-2xl p-8 border border-gray-100">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-green-800">
              Pedido #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-gray-600 mt-1">
              Paciente: <strong>{order.paciente_nombre}</strong> ({order.paciente_genero})
            </p>
            <p className="text-gray-600">
              Doctor:{" "}
              <strong>{order.doctores?.profiles?.nombre || "Sin asignar"}</strong>
            </p>
          </div>

          <span
            className={`px-4 py-2 rounded-full text-sm font-semibold ${estadoColors[order.estado]}`}
          >
            {order.estado}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <InfoBox label="Piezas" value={order.piezas || "—"} />
          <InfoBox label="Observaciones" value={order.observaciones || "—"} />
          <InfoBox label="Anticipo" value={`$${order.anticipo || 0}`} />
          <InfoBox label="Total" value={`$${order.total || 0}`} />
          <InfoBox
            label="Fecha creación"
            value={new Date(order.fecha_creacion).toLocaleString()}
          />
          <InfoBox
            label="Fecha entrega"
            value={
              order.fecha_entrega
                ? new Date(order.fecha_entrega).toLocaleString()
                : "—"
            }
          />
        </div>

        {order.modelo_3d_link && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Modelo 3D o enlace adjunto:
            </h2>
            <a
              href={order.modelo_3d_link}
              target="_blank"
              className="text-blue-600 hover:underline"
            >
              {order.modelo_3d_link}
            </a>
          </div>
        )}

        {/* HISTORIAL DE ESTACIONES */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-green-700 mb-4">
            🔧 Historial de Estaciones
          </h2>
          {order.historial_estaciones?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-gray-200 rounded-lg">
                <thead className="bg-gray-100 text-gray-800">
                  <tr>
                    <th className="px-4 py-2">Estación</th>
                    <th className="px-4 py-2">Técnico</th>
                    <th className="px-4 py-2">Estado</th>
                    <th className="px-4 py-2">Inicio</th>
                    <th className="px-4 py-2">Fin</th>
                    <th className="px-4 py-2">Comentarios</th>
                  </tr>
                </thead>
                <tbody>
                  {order.historial_estaciones.map((h: any) => (
                    <tr key={h.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2">{h.estaciones?.nombre}</td>
                      <td className="px-4 py-2">{h.perfiles?.nombre}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            estadoColors[h.estado]
                          }`}
                        >
                          {h.estado}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {h.fecha_inicio
                          ? new Date(h.fecha_inicio).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-2">
                        {h.fecha_fin
                          ? new Date(h.fecha_fin).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-2">{h.comentarios || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600">Sin historial de estaciones aún.</p>
          )}
        </div>

        {/* ARCHIVOS ADJUNTOS */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-green-700 mb-4">
            📁 Archivos adjuntos
          </h2>
          {order.archivos?.length > 0 ? (
            <ul className="space-y-3">
              {order.archivos.map((a: any) => (
                <li
                  key={a.id}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-800">
                      {a.descripcion || "Archivo sin descripción"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Tipo: {a.tipo} | {new Date(a.fecha_subida).toLocaleString()}
                    </p>
                  </div>
                  <a
                    href={a.url_archivo}
                    target="_blank"
                    className="text-blue-600 hover:underline"
                  >
                    Ver archivo
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">No hay archivos adjuntos registrados.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-gray-800 font-semibold mt-1">{value}</p>
    </div>
  );
}
