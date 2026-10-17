import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      nombre,
      telefono,
      rol = "doctor",
      clinica,
      especialidad = "Rehabilitación Oral",
      estacionId,
    } = body;

    if (!email || !password || !nombre) {
      return NextResponse.json(
        { error: "Email, contraseña y nombre son obligatorios" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanNombre = String(nombre).trim();
    const cleanTelefono = telefono ? String(telefono).replace(/[^\d]/g, "") : null;
    const cleanRol = String(rol).toLowerCase();

    // 1. Crear usuario en Supabase Auth con confirmación inmediata
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: String(password),
        email_confirm: true,
        user_metadata: {
          nombre: cleanNombre,
          telefono: cleanTelefono,
          rol: cleanRol,
          clinica: clinica || (cleanRol === "doctor" ? `Clínica Dr(a). ${cleanNombre}` : null),
        },
      });

    if (authError || !authData.user) {
      console.error("Error creando usuario en auth:", authError);
      return NextResponse.json(
        { error: authError?.message || "No se pudo crear la cuenta de usuario" },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // 2. Guardar perfil completo en 'profiles' con service role (cero bloqueo RLS)
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      nombre: cleanNombre,
      telefono: cleanTelefono,
      rol: cleanRol,
    });

    if (profileError) {
      console.error("Error guardando perfil:", profileError);
    }

    // 3. Si es doctor, asegurar registro en la tabla 'doctores'
    if (cleanRol === "doctor") {
      const clinicName = clinica || `Clínica Dr(a). ${cleanNombre}`;
      await supabaseAdmin.from("doctores").upsert({
        profile_id: userId,
        clinica: clinicName,
        especialidad: especialidad || "Rehabilitación Oral",
        telefono: cleanTelefono,
      });
    }

    // 4. Si es técnico, vincular a su estación de especialidad inicial
    if (cleanRol === "tecnico" || cleanRol === "technician") {
      let targetEstacion = estacionId;
      if (!targetEstacion) {
        // Asignar por defecto la primera estación si no se seleccionó ninguna
        const { data: firstEst } = await supabaseAdmin
          .from("estaciones")
          .select("id")
          .order("orden", { ascending: true })
          .limit(1)
          .single();
        targetEstacion = firstEst?.id;
      }

      if (targetEstacion) {
        await supabaseAdmin.from("tecnico_estacion").upsert({
          tecnico_id: userId,
          estacion_id: targetEstacion,
        });
      }
    }

    // 5. Enviar correo de bienvenida con branding Guisela
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://guiselalabdent.vercel.app";
      fetch(`${appUrl}/api/mailer/welcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: cleanEmail,
          name: cleanNombre,
          role: cleanRol,
          clinic: clinica || `Clínica Dr(a). ${cleanNombre}`,
        }),
      }).catch((e) => console.warn("Aviso email bienvenida:", e));
    } catch (e) {
      console.warn("Fallo envio email bienvenida:", e);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: cleanEmail,
        nombre: cleanNombre,
        rol: cleanRol,
      },
    });
  } catch (err: any) {
    console.error("Error en /api/auth/register:", err);
    return NextResponse.json(
      { error: err?.message || "Error procesando registro manual" },
      { status: 500 }
    );
  }
}
