import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET: Obtener tipo de cambio actual y lista de trabajos de catalogo_trabajos
export async function GET() {
  try {
    // 1. Obtener tipo de cambio de configuracion_taller
    const { data: configData } = await supabaseAdmin
      .from("configuracion_taller")
      .select("tipo_cambio_usd")
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    const tipoCambio = Number(configData?.tipo_cambio_usd) || 8.0;

    // 2. Obtener lista completa de trabajos de Supabase
    const { data: trabajos, error: trabErr } = await supabaseAdmin
      .from("catalogo_trabajos")
      .select("*")
      .order("nombre", { ascending: true });

    if (trabErr) {
      console.error("Error obteniendo catalogo_trabajos:", trabErr);
    }

    return NextResponse.json({
      success: true,
      tipoCambio,
      trabajos: trabajos || [],
    });
  } catch (error: any) {
    console.error("GET /api/admin/catalog error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener catálogo" },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar el tipo de cambio oficial en configuracion_taller
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { tipoCambio } = body;

    const rate = parseFloat(tipoCambio);
    if (isNaN(rate) || rate <= 0) {
      return NextResponse.json(
        { success: false, error: "El tipo de cambio debe ser un número positivo mayor a 0" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("configuracion_taller")
      .update({ tipo_cambio_usd: rate, updated_at: new Date().toISOString() })
      .eq("id", 1);

    if (error) {
      console.error("Error actualizando tipo_cambio_usd:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Tipo de cambio oficial actualizado a ${rate.toFixed(2)} Bs/USD`,
      tipoCambio: rate,
    });
  } catch (error: any) {
    console.error("PATCH /api/admin/catalog error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar tipo de cambio" },
      { status: 500 }
    );
  }
}

// PUT: Modificar precio o datos de un trabajo existente
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, precio_usd, categoria, marca, activo, nombre } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Falta el ID del trabajo" }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (precio_usd !== undefined) {
      const p = parseFloat(precio_usd);
      if (isNaN(p) || p < 0) {
        return NextResponse.json({ success: false, error: "Precio USD inválido" }, { status: 400 });
      }
      updates.precio_usd = p;
    }

    if (categoria !== undefined) updates.categoria = categoria;
    if (marca !== undefined) updates.marca = marca;
    if (activo !== undefined) updates.activo = !!activo;
    if (nombre !== undefined && nombre.trim()) updates.nombre = nombre.trim();

    const { data, error } = await supabaseAdmin
      .from("catalogo_trabajos")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando trabajo:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Trabajo actualizado exitosamente",
      trabajo: data,
    });
  } catch (error: any) {
    console.error("PUT /api/admin/catalog error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar trabajo" },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo trabajo en el catálogo oficial
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nombre, categoria, marca, precio_usd } = body;

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ success: false, error: "El nombre del trabajo es obligatorio" }, { status: 400 });
    }

    const p = parseFloat(precio_usd);
    if (isNaN(p) || p < 0) {
      return NextResponse.json({ success: false, error: "El precio en USD debe ser un número válido" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("catalogo_trabajos")
      .insert([
        {
          nombre: nombre.trim().toUpperCase(),
          categoria: categoria?.trim() || "Otros",
          marca: marca?.trim() || "GENERAL",
          precio_usd: p,
          activo: true,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error insertando nuevo trabajo:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Nuevo trabajo registrado exitosamente en el catálogo",
      trabajo: data,
    });
  } catch (error: any) {
    console.error("POST /api/admin/catalog error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear trabajo" },
      { status: 500 }
    );
  }
}
