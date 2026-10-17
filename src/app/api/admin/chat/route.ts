import { NextRequest, NextResponse } from "next/server";
import { queryGoogleGemini } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DEFAULT_EXCHANGE_RATE } from "@/lib/currency";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, history = [], apiKey = "" } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "El prompt es obligatorio" },
        { status: 400 }
      );
    }

    // 1. Obtener tipo de cambio actual
    let exchangeRate = DEFAULT_EXCHANGE_RATE;
    try {
      const { data: configRow } = await supabaseAdmin
        .from("configuracion_taller")
        .select("tipo_cambio_usd")
        .eq("id", 1)
        .maybeSingle();

      if (configRow?.tipo_cambio_usd && Number(configRow.tipo_cambio_usd) > 0) {
        exchangeRate = Number(configRow.tipo_cambio_usd);
      }
    } catch (e) {
      console.warn("No se pudo obtener tipo de cambio de BD:", e);
    }

    // 2. Extraer órdenes y datos financieros en vivo
    const { data: pedidos, error: pedidosErr } = await supabaseAdmin
      .from("pedidos")
      .select(
        "id, numero_requerimiento, paciente_nombre, doctor_nombre, doctor_telefono, trabajo_realizar, pieza_numero, estado, total, anticipo, numero_caja, fecha_creacion, fecha_entrega, observaciones"
      )
      .order("fecha_creacion", { ascending: false });

    if (pedidosErr) {
      console.error("Error consultando pedidos para IA:", pedidosErr);
    }

    // Calcular analítica agregada
    let totalInvoicedBs = 0;
    let totalAnticipoBs = 0;
    let totalDebtBs = 0;

    const countByStatus: Record<string, number> = {
      pendiente_revision: 0,
      pendiente: 0,
      en_proceso: 0,
      finalizado: 0,
      entregado: 0,
      rechazado: 0,
    };

    const doctorDebts: Record<
      string,
      {
        doctor: string;
        telefono: string;
        pedidosConDeuda: number;
        totalFacturado: number;
        totalPagado: number;
        saldoDeuda: number;
        pedidosList: string[];
      }
    > = {};

    for (const p of pedidos || []) {
      const st = p.estado || "pendiente";
      countByStatus[st] = (countByStatus[st] || 0) + 1;

      const tot = Number(p.total) || 0;
      const ant = Number(p.anticipo) || 0;
      const sal = Math.max(0, tot - ant);

      totalInvoicedBs += tot;
      totalAnticipoBs += ant;
      totalDebtBs += sal;

      const docName = (p.doctor_nombre || "Dr(a). Sin Asignar").trim();
      if (!doctorDebts[docName]) {
        doctorDebts[docName] = {
          doctor: docName,
          telefono: p.doctor_telefono || "No registrado",
          pedidosConDeuda: 0,
          totalFacturado: 0,
          totalPagado: 0,
          saldoDeuda: 0,
          pedidosList: [],
        };
      }

      doctorDebts[docName].totalFacturado += tot;
      doctorDebts[docName].totalPagado += ant;
      if (sal > 0) {
        doctorDebts[docName].saldoDeuda += sal;
        doctorDebts[docName].pedidosConDeuda += 1;
        doctorDebts[docName].pedidosList.push(
          `#${p.numero_requerimiento || p.id.slice(0, 5)} (${p.paciente_nombre}): Debe Bs ${sal.toFixed(2)}`
        );
      }
    }

    // Top doctores con mayor deuda
    const topDebtors = Object.values(doctorDebts)
      .filter((d) => d.saldoDeuda > 0)
      .sort((a, b) => b.saldoDeuda - a.saldoDeuda)
      .slice(0, 10);

    // 3. Obtener estaciones del taller
    const { data: estaciones } = await supabaseAdmin
      .from("estaciones")
      .select("id, nombre, orden")
      .order("orden", { ascending: true });

    // 4. Preparar el Prompt de Sistema con contexto real
    const systemInstruction = `
Eres "Guisela AI", el Asistente Ejecutivo Inteligente del Dueño y Administrador de Guisela Laboratorio Dental (La Paz, Bolivia).
Tienes acceso a la base de datos operativa, clínica y financiera del taller en tiempo real.

=== CONTEXTO DEL NEGOCIO EN VIVO ===
- Tipo de Cambio Oficial Activo: 1 USD = ${exchangeRate.toFixed(2)} Bs
- Total Facturado Histórico: Bs ${totalInvoicedBs.toFixed(2)} ($${(totalInvoicedBs / exchangeRate).toFixed(2)} USD)
- Total Anticipos Recaudados: Bs ${totalAnticipoBs.toFixed(2)} ($${(totalAnticipoBs / exchangeRate).toFixed(2)} USD)
- DEUDA / SALDO PENDIENTE POR COBRAR: Bs ${totalDebtBs.toFixed(2)} ($${(totalDebtBs / exchangeRate).toFixed(2)} USD)

=== ESTADO DE LAS ÓRDENES ===
- En Revisión (Secretaría): ${countByStatus["pendiente_revision"] || 0}
- En Producción Activa (Taller): ${(countByStatus["pendiente"] || 0) + (countByStatus["en_proceso"] || 0)}
- Trabajos Finalizados (Listos para entregar): ${countByStatus["finalizado"] || 0}
- Trabajos Entregados: ${countByStatus["entregado"] || 0}
- Total Pedidos Registrados: ${pedidos?.length || 0}

=== TOP DOCTORES CON SALDOS PENDIENTES (CARTERA DE DEUDAS) ===
${
  topDebtors.length > 0
    ? topDebtors
        .map(
          (d, i) =>
            `${i + 1}. ${d.doctor} (Tel: ${d.telefono}) -> Deuda: Bs ${d.saldoDeuda.toFixed(2)} ($${(d.saldoDeuda / exchangeRate).toFixed(2)} USD) en ${d.pedidosConDeuda} trabajo(s). Detalles: ${d.pedidosList.slice(0, 3).join("; ")}`
        )
        .join("\n")
    : "No hay deudas pendientes en este momento. Toda la cartera está al día."
}

=== ESTACIONES TÉCNICAS DEL TALLER ===
${(estaciones || []).map((e) => `${e.orden}. ${e.nombre}`).join("\n")}

=== REGLAS DE RESPUESTA PARA EL PROPIETARIO ===
1. Responde siempre con respeto, precisión gerencial y un tono ejecutivo, amigable y resolutivo.
2. Siempre muestra los valores monetarios en doble moneda: Bolivianos (Bs) primero y Dólares ($ USD) entre paréntesis.
3. Resalta las deudas y saldos en negrita con alertas (⚠️ o 🔴).
4. Si el dueño te pide redactar un mensaje para cobrar a un doctor o enviar por WhatsApp, genéralo listo para copiar, educado pero firme, incluyendo el desglose de sus pedidos y montos.
5. Puedes analizar qué estación tiene más pedidos, dar sugerencias operativas para aumentar la rentabilidad o acelerar entregas.
6. Sé conciso y utiliza formato Markdown claro (listas, negritas y tablas cuando corresponda).
`.trim();

    // 5. Consultar a Google Gemini
    const result = await queryGoogleGemini(prompt, systemInstruction, history, apiKey);

    if (result.error && !result.text) {
      return NextResponse.json(
        {
          error: result.error,
          message:
            "No se pudo conectar con la API de Google Gemini. Verifica que tengas tu GEMINI_API_KEY configurada.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      text: result.text,
      metrics: {
        totalOrders: pedidos?.length || 0,
        totalDebtBs,
        totalDebtUsd: totalDebtBs / exchangeRate,
        exchangeRate,
        topDebtorsCount: topDebtors.length,
      },
    });
  } catch (err: any) {
    console.error("Error en /api/admin/chat:", err);
    return NextResponse.json(
      { error: err?.message || "Error procesando consulta con Gemini AI" },
      { status: 500 }
    );
  }
}
