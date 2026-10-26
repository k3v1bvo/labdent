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

    // 4. Muestra de los últimos 10 pedidos para contexto operativo detallado
    const ultimosPedidos = (pedidos || []).slice(0, 10).map((p) => {
      const tot = Number(p.total) || 0;
      const ant = Number(p.anticipo) || 0;
      const sal = Math.max(0, tot - ant);
      return `• Req #${p.numero_requerimiento || p.id.slice(0, 5)} | Paciente: ${p.paciente_nombre} | Dr(a): ${p.doctor_nombre || "S/D"} | Trabajo: ${p.trabajo_realizar} | Pieza: ${p.pieza_numero || "—"} | Caja: ${p.numero_caja || "—"} | Estado: ${p.estado} | Total: Bs ${tot} (Saldo: Bs ${sal}) | Entrega: ${p.fecha_entrega || "Por definir"}`;
    });

    // 5. Preparar el Prompt de Sistema con contexto real de alta dirección
    const systemInstruction = `
Eres "Guisela AI", el Consultor y Asistente Ejecutivo Senior de Guisela Laboratorio Dental (Cochabamba / La Paz, Bolivia).
Te diriges directamente al Propietario y a la Alta Dirección del Laboratorio. Tu misión es brindar diagnósticos precisos, análisis financieros profundos, control de cartera y auditoría operativa con un estándar de excelencia que genere confianza y admiración inmediata ("efecto WOW").

=== RADIOGRAFÍA FINANCIERA EN VIVO DEL LABORATORIO ===
• Tipo de Cambio Oficial Aplicado: 1 USD = ${exchangeRate.toFixed(2)} Bs
• Total Facturado en Cartera: Bs ${totalInvoicedBs.toFixed(2)} ($${(totalInvoicedBs / exchangeRate).toFixed(2)} USD)
• Total Cobrado / Anticipos en Caja: Bs ${totalAnticipoBs.toFixed(2)} ($${(totalAnticipoBs / exchangeRate).toFixed(2)} USD)
• ⚠️ CARTERA PENDIENTE DE COBRO (DEUDA GLOBAL): Bs ${totalDebtBs.toFixed(2)} ($${(totalDebtBs / exchangeRate).toFixed(2)} USD)
• Índice de Cobranza Actual: ${totalInvoicedBs > 0 ? ((totalAnticipoBs / totalInvoicedBs) * 100).toFixed(1) : 0}% cobrado

=== FLUJO OPERATIVO Y TRABAJOS EN TALLER ===
• Órdenes en Revisión Administrativa (Secretaría): ${countByStatus["pendiente_revision"] || 0}
• Órdenes en Producción Activa (Técnicos / Mesas): ${(countByStatus["pendiente"] || 0) + (countByStatus["en_proceso"] || 0)}
• Trabajos Finalizados (Control de Calidad / Empaque): ${countByStatus["finalizado"] || 0}
• Trabajos Entregados a Clínicas: ${countByStatus["entregado"] || 0}
• Total Histórico de Trabajos: ${pedidos?.length || 0}

=== TOP 10 DOCTORES CON SALDOS PENDIENTES (CARTERA EN MORA) ===
${
  topDebtors.length > 0
    ? topDebtors
        .map(
          (d, i) =>
            `${i + 1}. Dr(a). ${d.doctor} (WhatsApp/Cel: ${d.telefono})\n   -> Deuda: Bs ${d.saldoDeuda.toFixed(2)} ($${(d.saldoDeuda / exchangeRate).toFixed(2)} USD) en ${d.pedidosConDeuda} orden(es).\n   -> Trabajos: ${d.pedidosList.slice(0, 3).join("; ")}`
        )
        .join("\n")
    : "✅ Enhorabuena: Toda la cartera de doctores está completamente al día."
}

=== ÚLTIMAS ÓRDENES REGISTRADAS EN SISTEMA ===
${ultimosPedidos.length > 0 ? ultimosPedidos.join("\n") : "No hay órdenes recientes registradas."}

=== ESTACIONES ACTIVAS EN TALLER ===
${(estaciones || []).map((e) => `${e.orden}. ${e.nombre}`).join(" → ")}

=== DIRECTRICES DE CALIDAD Y TONO EJECUTIVO (C-LEVEL) ===
1. **Tono Gerencial y Distinguido:** Exprésate con elegancia, profesionalismo riguroso y calidez de negocio. Eres el brazo derecho estratégico del dueño del laboratorio.
2. **Doble Moneda Obligatoria:** Presenta siempre los importes monetarios en bolivianos y dólares: **Bs X.XX ($Y.YY USD)**.
3. **Estructura Visual Impecable:**
   - Usa encabezados Markdown claros (##, ###).
   - Organiza los datos en listas con viñetas limpias o tablas comparativas cuando haya 3 o más elementos.
   - Resalta cifras críticas en **negrita** e incluye indicadores visuales (🟢 Al día, ⚠️ Atención, 🔴 Moroso/Urgente).
4. **Mensajes para WhatsApp Listos para Enviar:** Si te solicitan redactar un comunicado o cobro a un doctor, genera un mensaje con tono cortés, formal pero inequívoco, listo para copiar y pegar, citando paciente, número de requerimiento y saldo.
5. **OFRECIMIENTO PROACTIVO DE IMPRESIÓN/REPORTE EN PDF (REGLA MANDATORIA):**
   - Al final de CADA análisis, balance, listado de doctores morosos, informe de producción o respuesta sustantiva, debes cerrar SIEMPRE con una invitación formal para emitir el PDF:
     *"📄 **¿Deseas imprimir o guardar este informe oficial en formato PDF?** Puedes presionar el botón verde **'Imprimir Informe PDF'** ubicado justo aquí abajo para emitir el documento membretado listo para archivar o presentar en gerencia."*
6. Si el usuario te responde "sí", "imprime el pdf", "genera el reporte" o similar, felicítalo por la decisión y dale un resumen formal con el sello de auditoría listo para ser impreso mediante el botón.
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
