/**
 * Script de prueba rápida de tu servidor de correos (Nodemailer / Gmail)
 * Uso:
 *   node test-email.js tu_correo_de_destino@gmail.com
 */
const fs = require("fs");
const nodemailer = require("nodemailer");

async function main() {
  const targetEmail = process.argv[2] || "k3v1bvo@gmail.com";

  // Leer variables de .env.local
  if (!fs.existsSync(".env.local")) {
    console.error("❌ No se encontró el archivo .env.local");
    process.exit(1);
  }

  const envContent = fs.readFileSync(".env.local", "utf-8");
  const env = {};
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      env[key] = val;
    }
  }

  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  const host = env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(env.SMTP_PORT) || 465;

  console.log("\n==========================================");
  console.log("🔍 PROBADOR DE CORREOS — GUISELA LAB DENTAL");
  console.log("==========================================");
  console.log(`• Host SMTP:    ${host}:${port}`);
  console.log(`• Remitente:    ${user || "⚠️ (NO CONFIGURADO AÚN)"}`);
  console.log(`• Contraseña:   ${pass ? "******** (Configurada)" : "⚠️ (VACÍA)"}`);

  if (!user || !pass) {
    console.log("\n⚠️ DEBES PONER TU SMTP_USER Y SMTP_PASS EN .env.local PRIMERO.");
    process.exit(1);
  }

  console.log(`\n⏳ Conectando con Google SMTP y enviando prueba a: ${targetEmail}...`);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  try {
    await transporter.verify();
    console.log("✅ Conexión con Gmail SMTP exitosa!");

    const info = await transporter.sendMail({
      from: `"Guisela Laboratorio Dental" <${user}>`,
      to: targetEmail,
      subject: "🎉 Prueba Exitosa - Sistema de Correos Guisela Laboratorio Dental",
      html: `
        <div style="font-family: sans-serif; background: #f7f5fa; padding: 24px;">
          <div style="max-width: 500px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 16px; border: 1px solid #ede8f5;">
            <h2 style="color: #3C1C6C; margin-top: 0;">¡Hola! Tu servidor de correos está funcionando 🎉</h2>
            <p style="color: #4A3E61; line-height: 1.6;">
              Este es un correo oficial de confirmación enviado directamente desde el servidor propio de <b>Guisela Laboratorio Dental</b> mediante Google SMTP.
            </p>
            <div style="background: #F8F5FC; padding: 16px; border-radius: 12px; border-left: 4px solid #3C1C6C; margin: 20px 0;">
              <b>Detalles del Envío:</b><br>
              • Remitente: ${user}<br>
              • Destinatario: ${targetEmail}<br>
              • Fecha y Hora: ${new Date().toLocaleString("es-BO")}<br>
              • Estado: Entregado con Éxito ✅
            </div>
            <p style="font-size: 12px; color: #9B94A6; margin-bottom: 0;">
              © ${new Date().getFullYear()} Guisela Laboratorio Dental · Sistema Propio
            </p>
          </div>
        </div>
      `,
    });

    console.log(`🎉 ¡CORREO ENVIADO CON ÉXITO! ID: ${info.messageId}`);
    console.log(`👉 Revisa la bandeja de entrada de: ${targetEmail}\n`);
  } catch (err) {
    console.error("\n❌ ERROR AL ENVIAR CORREO:");
    console.error(err.message || err);
    process.exit(1);
  }
}

main();
