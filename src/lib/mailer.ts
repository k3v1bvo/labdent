import nodemailer from "nodemailer";

interface WelcomeEmailProps {
  to: string;
  name?: string;
  role?: string;
  clinic?: string;
}

interface PasswordResetEmailProps {
  to: string;
  name?: string;
  resetLink: string;
}

interface OrderNotificationProps {
  to: string;
  doctorName?: string;
  pacienteNombre: string;
  numeroRequerimiento?: string;
  numeroCaja?: string;
  estado: string;
  trabajoRealizar?: string;
}

// Configuración del transporte SMTP (Google / Gmail o cualquier proveedor SMTP)
export function getMailerTransport() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = port === 465; // true para 465 SSL, false para 587 TLS
  const user = process.env.SMTP_USER || "laboratoriodentalguisela@gmail.com";
  const pass = process.env.SMTP_PASS || "kwqaozqdssubjxcq";

  if (!user || !pass) {
    console.warn("⚠️ SMTP_USER o SMTP_PASS no están configurados en .env.local");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

const FROM_HEADER =
  process.env.SMTP_FROM ||
  `"Guisela Laboratorio Dental" <${process.env.SMTP_USER || "laboratoriodentalguisela@gmail.com"}>`;

/**
 * 🦷 Enviar correo de Bienvenida cuando un usuario se registra o es creado
 */
export async function sendWelcomeEmail({
  to,
  name,
  role = "doctor",
  clinic,
}: WelcomeEmailProps) {
  const transporter = getMailerTransport();
  const loginUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
    : "http://localhost:3000/login";

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f5fa; margin: 0; padding: 24px; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 40px 32px; box-shadow: 0 10px 30px rgba(60,28,108,0.08); border: 1px solid #ede8f5; }
    .header { text-align: center; margin-bottom: 28px; }
    .logo-badge { display: inline-block; background: #3C1C6C; color: #ffffff; padding: 8px 18px; border-radius: 999px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; }
    .title { color: #3C1C6C; font-size: 24px; font-weight: 900; margin: 16px 0 8px 0; }
    .subtitle { color: #7A6899; font-size: 14px; margin: 0; }
    .content { color: #373340; font-size: 15px; line-height: 1.6; margin: 24px 0; }
    .info-box { background: #F8F5FC; border-left: 4px solid #3C1C6C; border-radius: 12px; padding: 18px 20px; margin: 24px 0; }
    .info-row { margin: 6px 0; font-size: 14px; color: #4A3E61; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { background: linear-gradient(135deg, #3C1C6C 0%, #5E2C9E 100%); color: #ffffff !important; padding: 14px 32px; border-radius: 14px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 15px; box-shadow: 0 6px 20px rgba(60,28,108,0.25); }
    .footer { text-align: center; color: #9B94A6; font-size: 12px; margin-top: 32px; border-top: 1px solid #F1ECF8; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="logo-badge">✦ LABORATORIO DENTAL</span>
      <h1 class="title">¡Bienvenido a Guisela Lab Dental!</h1>
      <p class="subtitle">Innovación y Precisión CAD/CAM a tu servicio</p>
    </div>

    <div class="content">
      <p>Estimado/a <b>${name || "Doctor/a"}</b>,</p>
      <p>
        Tu cuenta en la plataforma digital de <b>Guisela Laboratorio Dental</b> ha sido creada con éxito. Ahora tienes acceso directo a la gestión de tus órdenes odontológicas, seguimiento de estaciones en tiempo real y facturación.
      </p>

      <div class="info-box">
        <div class="info-row">👤 <b>Usuario:</b> ${to}</div>
        <div class="info-row">🏷️ <b>Rol Asignado:</b> ${role.toUpperCase()}</div>
        ${clinic ? `<div class="info-row">🏥 <b>Clínica / Consultorio:</b> ${clinic}</div>` : ""}
      </div>

      <p>
        Puedes ingresar ahora mismo a nuestro portal clínico para comenzar a enviar requerimientos y agendar retiros o entregas:
      </p>

      <div class="btn-container">
        <a href="${loginUrl}" class="btn">Ingresar al Portal Dental →</a>
      </div>
    </div>

    <div class="footer">
      © Guisela Laboratorio Dental · Estética Biomimética & Prótesis Fija/Removible<br>
      Si no solicitaste esta cuenta, puedes ignorar este mensaje.
    </div>
  </div>
</body>
</html>
  `;

  return transporter.sendMail({
    from: FROM_HEADER,
    to,
    subject: `¡Bienvenido/a a Guisela Laboratorio Dental! 🦷`,
    html,
  });
}

/**
 * 🔑 Enviar correo de Recuperación de Contraseña con enlace seguro
 */
export async function sendPasswordResetEmail({
  to,
  name,
  resetLink,
}: PasswordResetEmailProps) {
  const transporter = getMailerTransport();

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f5fa; margin: 0; padding: 24px; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 40px 32px; box-shadow: 0 10px 30px rgba(60,28,108,0.08); border: 1px solid #ede8f5; }
    .header { text-align: center; margin-bottom: 24px; }
    .logo-badge { display: inline-block; background: #3C1C6C; color: #ffffff; padding: 8px 18px; border-radius: 999px; font-size: 13px; font-weight: 700; }
    .title { color: #3C1C6C; font-size: 22px; font-weight: 900; margin: 16px 0 8px 0; }
    .subtitle { color: #7A6899; font-size: 14px; margin: 0; }
    .content { color: #373340; font-size: 15px; line-height: 1.6; margin: 24px 0; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { background: linear-gradient(135deg, #3C1C6C 0%, #5E2C9E 100%); color: #ffffff !important; padding: 14px 32px; border-radius: 14px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 15px; box-shadow: 0 6px 20px rgba(60,28,108,0.25); }
    .security-note { background: #FFFBEB; border-left: 4px solid #F59E0B; border-radius: 12px; padding: 14px 18px; font-size: 13px; color: #92400E; margin: 24px 0; }
    .footer { text-align: center; color: #9B94A6; font-size: 12px; margin-top: 32px; border-top: 1px solid #F1ECF8; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="logo-badge">🔐 SEGURIDAD DE ACCESO</span>
      <h1 class="title">Restablecer tu Contraseña</h1>
      <p class="subtitle">Guisela Laboratorio Dental</p>
    </div>

    <div class="content">
      <p>Hola <b>${name || "Doctor/a"}</b>,</p>
      <p>
        Hemos recibido una solicitud para restablecer la contraseña asociada a tu cuenta (<b>${to}</b>).
      </p>
      <p>
        Haz clic en el siguiente botón para definir una nueva contraseña de acceso seguro:
      </p>

      <div class="btn-container">
        <a href="${resetLink}" class="btn">Restablecer mi Contraseña →</a>
      </div>

      <div class="security-note">
        ⚠️ <b>Aviso de Seguridad:</b> Este enlace tiene una validez temporal y expirará en breve. Si tú no solicitaste este cambio, por favor desestima este correo; tu contraseña actual continuará siendo segura.
      </div>
    </div>

    <div class="footer">
      © Guisela Laboratorio Dental · Cochabamba, Bolivia<br>
      Sistema de Gestión Dental & CAD/CAM
    </div>
  </div>
</body>
</html>
  `;

  return transporter.sendMail({
    from: FROM_HEADER,
    to,
    subject: `Restablecer tu contraseña - Guisela Laboratorio Dental 🔐`,
    html,
  });
}

/**
 * 📦 Notificación automática de Estado de Orden al Odontólogo
 */
export async function sendOrderNotificationEmail({
  to,
  doctorName,
  pacienteNombre,
  numeroRequerimiento,
  numeroCaja,
  estado,
  trabajoRealizar,
}: OrderNotificationProps) {
  const transporter = getMailerTransport();
  const portalUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/doctors/orders`
    : "http://localhost:3000/dashboard/doctors/orders";

  const estadoBadgeColor =
    estado === "completado" || estado === "entregado"
      ? "#10B981"
      : estado === "en_proceso" || estado === "en_produccion"
      ? "#3B82F6"
      : "#F59E0B";

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f5fa; margin: 0; padding: 24px; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 40px 32px; box-shadow: 0 10px 30px rgba(60,28,108,0.08); border: 1px solid #ede8f5; }
    .header { text-align: center; margin-bottom: 24px; }
    .logo-badge { display: inline-block; background: #3C1C6C; color: #ffffff; padding: 8px 18px; border-radius: 999px; font-size: 13px; font-weight: 700; }
    .title { color: #3C1C6C; font-size: 22px; font-weight: 900; margin: 16px 0 8px 0; }
    .subtitle { color: #7A6899; font-size: 14px; margin: 0; }
    .content { color: #373340; font-size: 15px; line-height: 1.6; margin: 24px 0; }
    .info-box { background: #F8F5FC; border-radius: 16px; padding: 20px; margin: 20px 0; border: 1px solid #EDE8F5; }
    .info-row { margin: 8px 0; font-size: 14px; color: #4A3E61; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; color: #fff; font-weight: 700; font-size: 12px; background: ${estadoBadgeColor}; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { background: #3C1C6C; color: #ffffff !important; padding: 12px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px; }
    .footer { text-align: center; color: #9B94A6; font-size: 11px; margin-top: 32px; border-top: 1px solid #F1ECF8; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="logo-badge">📦 SEGUIMIENTO DE PRODUCCIÓN</span>
      <h1 class="title">Actualización de tu Orden Clínica</h1>
      <p class="subtitle">Guisela Laboratorio Dental</p>
    </div>

    <div class="content">
      <p>Estimado/a <b>${doctorName || "Doctor/a"}</b>,</p>
      <p>
        Te informamos que tu orden de trabajo para el paciente <b>${pacienteNombre}</b> ha sido actualizada:
      </p>

      <div class="info-box">
        <div class="info-row">
          <b>Estado Actual:</b> <span class="badge">${estado.toUpperCase().replace("_", " ")}</span>
        </div>
        <div class="info-row">👤 <b>Paciente:</b> ${pacienteNombre}</div>
        ${numeroRequerimiento ? `<div class="info-row">🔖 <b>Requerimiento:</b> #${numeroRequerimiento}</div>` : ""}
        ${numeroCaja ? `<div class="info-row">📦 <b>Caja Odontológica:</b> #${numeroCaja}</div>` : ""}
        ${trabajoRealizar ? `<div class="info-row">⚙️ <b>Trabajo:</b> ${trabajoRealizar}</div>` : ""}
      </div>

      <div class="btn-container">
        <a href="${portalUrl}" class="btn">Ver Detalles en el Portal →</a>
      </div>
    </div>

    <div class="footer">
      © Guisela Laboratorio Dental · Sistema CAD/CAM & Estética Biomimética
    </div>
  </div>
</body>
</html>
  `;

  return transporter.sendMail({
    from: FROM_HEADER,
    to,
    subject: `Actualización de Orden: Paciente ${pacienteNombre} [${estado.toUpperCase()}] 📦`,
    html,
  });
}

interface RoleChangeEmailProps {
  to: string;
  name?: string;
  newRole: string;
  previousRole?: string;
}

/**
 * 🛡️ Notificación por correo cuando un Administrador cambia el rol de un usuario
 */
export async function sendRoleChangeEmail({
  to,
  name,
  newRole,
  previousRole,
}: RoleChangeEmailProps) {
  const transporter = getMailerTransport();
  const loginUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
    : "http://localhost:3000/login";

  const roleLabels: Record<string, string> = {
    admin: "👑 Administrador Global",
    secretaria: "📋 Secretaría & Recepción",
    doctor: "🩺 Odontólogo / Clínica Dental",
    tecnico: "🔬 Técnico de Laboratorio / CAD-CAM",
  };

  const portalNames: Record<string, string> = {
    admin: "Consola de Administración y Auditoría",
    secretaria: "Panel de Recepción y Control de Cajas",
    doctor: "Portal de Pedidos Clínicos & Tracking",
    tecnico: "Tablero de Estaciones de Taller",
  };

  const labelNuevo = roleLabels[newRole.toLowerCase()] || newRole.toUpperCase();
  const labelAnterior = previousRole ? (roleLabels[previousRole.toLowerCase()] || previousRole.toUpperCase()) : null;
  const portalName = portalNames[newRole.toLowerCase()] || "Portal Guisela Lab";

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f5fa; margin: 0; padding: 24px; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 40px 32px; box-shadow: 0 10px 30px rgba(60,28,108,0.08); border: 1px solid #ede8f5; }
    .header { text-align: center; margin-bottom: 28px; }
    .logo-badge { display: inline-block; background: #3C1C6C; color: #ffffff; padding: 8px 18px; border-radius: 999px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; }
    .title { color: #3C1C6C; font-size: 22px; font-weight: 900; margin: 16px 0 8px 0; }
    .subtitle { color: #7A6899; font-size: 14px; margin: 0; }
    .content { color: #373340; font-size: 15px; line-height: 1.6; margin: 24px 0; }
    .info-box { background: #F8F5FC; border-left: 4px solid #3C1C6C; border-radius: 12px; padding: 18px 20px; margin: 24px 0; }
    .info-row { margin: 8px 0; font-size: 14px; color: #4A3E61; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { background: linear-gradient(135deg, #3C1C6C 0%, #5E2C9E 100%); color: #ffffff !important; padding: 14px 32px; border-radius: 14px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 15px; box-shadow: 0 6px 20px rgba(60,28,108,0.25); }
    .footer { text-align: center; color: #9B94A6; font-size: 12px; margin-top: 32px; border-top: 1px solid #F1ECF8; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="logo-badge">🛡️ PERMISOS Y ACCESOS</span>
      <h1 class="title">Actualización de Rol de Usuario</h1>
      <p class="subtitle">Guisela Laboratorio Dental</p>
    </div>

    <div class="content">
      <p>Hola <b>${name || "Estimado/a usuario"}</b>,</p>
      <p>
        Te informamos que la Administración de <b>Guisela Laboratorio Dental</b> ha modificado tus permisos en la plataforma:
      </p>

      <div class="info-box">
        <div class="info-row">👤 <b>Usuario:</b> ${to}</div>
        ${labelAnterior ? `<div class="info-row">⏳ <b>Rol Anterior:</b> ${labelAnterior}</div>` : ""}
        <div class="info-row">✨ <b>Nuevo Rol Asignado:</b> <b style="color: #3C1C6C;">${labelNuevo}</b></div>
        <div class="info-row">🖥️ <b>Espacio de Trabajo:</b> ${portalName}</div>
      </div>

      <p>
        Tus nuevos accesos ya están activos. Puedes ingresar con tus mismas credenciales para acceder a tu nuevo panel:
      </p>

      <div class="btn-container">
        <a href="${loginUrl}" class="btn">Ingresar al Sistema →</a>
      </div>
    </div>

    <div class="footer">
      © Guisela Laboratorio Dental · Sistema Integral CAD/CAM<br>
      Si consideras que este cambio es un error, por favor contacta con la administración del laboratorio.
    </div>
  </div>
</body>
</html>
  `;

  return transporter.sendMail({
    from: FROM_HEADER,
    to,
    subject: `Actualización de Permisos: Nuevo Rol [${newRole.toUpperCase()}] - Guisela Lab Dental 🛡️`,
    html,
  });
}

interface TemporaryPasswordEmailProps {
  to: string;
  name?: string;
  temporaryPassword: string;
}

/**
 * 🔑 Enviar contraseña temporal asignada por el Administrador
 */
export async function sendTemporaryPasswordEmail({
  to,
  name,
  temporaryPassword,
}: TemporaryPasswordEmailProps) {
  const transporter = getMailerTransport();
  const loginUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
    : "http://localhost:3000/login";

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f5fa; margin: 0; padding: 24px; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 40px 32px; box-shadow: 0 10px 30px rgba(60,28,108,0.08); border: 1px solid #ede8f5; }
    .header { text-align: center; margin-bottom: 24px; }
    .logo-badge { display: inline-block; background: #3C1C6C; color: #ffffff; padding: 8px 18px; border-radius: 999px; font-size: 13px; font-weight: 700; }
    .title { color: #3C1C6C; font-size: 22px; font-weight: 900; margin: 16px 0 8px 0; }
    .subtitle { color: #7A6899; font-size: 14px; margin: 0; }
    .content { color: #373340; font-size: 15px; line-height: 1.6; margin: 24px 0; }
    .cred-box { background: #F8F5FC; border-left: 4px solid #3C1C6C; border-radius: 14px; padding: 20px; margin: 24px 0; }
    .cred-row { margin: 8px 0; font-size: 15px; color: #3C1C6C; }
    .cred-code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; background: #FFFFFF; border: 1px solid #D0B9FF; padding: 6px 14px; border-radius: 8px; font-weight: 800; color: #2E1553; font-size: 16px; letter-spacing: 1px; display: inline-block; }
    .btn-container { text-align: center; margin: 30px 0; }
    .btn { background: linear-gradient(135deg, #3C1C6C 0%, #5E2C9E 100%); color: #ffffff !important; padding: 14px 32px; border-radius: 14px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 15px; box-shadow: 0 6px 20px rgba(60,28,108,0.25); }
    .warning-box { background: #FFFBEB; border-left: 4px solid #F59E0B; border-radius: 12px; padding: 14px 18px; font-size: 13px; color: #92400E; margin: 24px 0; }
    .footer { text-align: center; color: #9B94A6; font-size: 12px; margin-top: 32px; border-top: 1px solid #F1ECF8; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="logo-badge">🔐 RESTABLECIMIENTO DE CLAVE</span>
      <h1 class="title">Tu Contraseña Temporal de Acceso</h1>
      <p class="subtitle">Guisela Laboratorio Dental</p>
    </div>

    <div class="content">
      <p>Hola <b>${name || "Estimado/a usuario"}</b>,</p>
      <p>
        La Administración de <b>Guisela Laboratorio Dental</b> ha restablecido tu contraseña de acceso para que puedas ingresar al sistema inmediatamente:
      </p>

      <div class="cred-box">
        <div class="cred-row">👤 <b>Correo de Acceso:</b> ${to}</div>
        <div class="cred-row">
          🔑 <b>Contraseña Temporal:</b> <span class="cred-code">${temporaryPassword}</span>
        </div>
      </div>

      <div class="warning-box">
        ⚠️ <b>Recomendación de Seguridad:</b> Por favor ingresa a la plataforma y cambia esta contraseña inmediatamente desde la sección <b>"Mi Perfil"</b> para mantener tu cuenta segura.
      </div>

      <div class="btn-container">
        <a href="${loginUrl}" class="btn">Ingresar al Sistema →</a>
      </div>
    </div>

    <div class="footer">
      © Guisela Laboratorio Dental · Sistema Integral CAD/CAM<br>
      Si no reconoces esta solicitud, contacta de inmediato con la administración del laboratorio.
    </div>
  </div>
</body>
</html>
  `;

  return transporter.sendMail({
    from: FROM_HEADER,
    to,
    subject: `Tu Contraseña Temporal de Acceso - Guisela Laboratorio Dental 🔑`,
    html,
  });
}

