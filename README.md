# 🦷 LabDent - Sistema Integral de Laboratorio Dental

**LabDent** es una aplicación web moderna para la gestión integral de laboratorios dentales.  
Permite administrar pedidos, pacientes, técnicos, doctores y flujos de producción desde una interfaz intuitiva, centralizada y 100% en la nube.

---

## 🚀 Tecnologías principales

| Tipo | Herramienta |
|------|--------------|
| **Frontend** | [Next.js 15](https://nextjs.org/) + [React](https://react.dev/) |
| **UI/UX** | [TailwindCSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), [Framer Motion](https://www.framer.com/motion/) |
| **Backend** | [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage) |
| **Gráficos** | [Recharts](https://recharts.org/), [ECharts](https://echarts.apache.org/), [Plotly](https://plotly.com/javascript/) |
| **Deploy** | [Vercel](https://vercel.com/) + [Supabase Hosting](https://supabase.com/) |
| **Control de versiones** | [GitHub](https://github.com/) con CI/CD automático |

---

## 🧠 Funcionalidades principales

### 👩‍💼 Administración de pedidos
- Creación, edición y seguimiento de pedidos.
- Registro de paciente, piezas dentales y observaciones.
- Adjuntar enlace o referencia de modelo 3D externo.
- Control de anticipos y montos totales.

### 🧰 Flujo técnico de estaciones
- Moldeado → Escaneo 3D → Modelado Digital → Fresado → Pulido y Control.
- Cada técnico toma y marca su tarea como **“Completada”** o **“Devuelta”**.
- Trazabilidad completa mediante la tabla `historial_estaciones`.

### 📊 Dashboard del administrador
- Resumen de pedidos diarios y estados.
- Ingresos totales y promedio de producción.
- Gráficos interactivos con **Recharts** y **ECharts**.
- Indicadores clave: productividad por técnico, rendimiento semanal y flujo de trabajo.

### 👥 Gestión de usuarios
- Roles jerárquicos: `admin`, `secretaria`, `doctor`, `tecnico`.
- Cambiar roles, eliminar usuarios o registrar nuevos técnicos.
- Panel de control de usuarios visible solo para el **dueño (admin)**.

### 🌗 Interfaz moderna
- Modo **claro/oscuro** global (persistente por usuario).
- Diseño **responsive** compatible con PC, tablets y móviles.
- Animaciones suaves y consistentes con **Framer Motion**.

---

## 🗂️ Estructura del proyecto

labdent/
├── app/
│ ├── layout.tsx # Layout principal con Navbar
│ ├── page.tsx # Vista principal
│ ├── pedidos/ # CRUD de pedidos
│ ├── dashboard/ # Dashboard del administrador
│ └── usuarios/ # Gestión de usuarios y roles
│
├── components/
│ ├── layout/ # Navbar y estructura general
│ ├── pedido/ # Componentes del flujo técnico
│ └── ui/ # Componentes base (shadcn/ui)
│
├── lib/
│ └── supabaseClient.ts # Conexión central con Supabase
│
├── public/ # Recursos estáticos
├── .env.local # Variables de entorno (no se sube)
└── package.json

yaml
Copiar código

---

## ⚙️ Variables de entorno requeridas

En tu archivo `.env.local` agrega:

bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon
SUPABASE_SERVICE_ROLE_KEY=tu-clave-service-role
⚠️ Nunca compartas tus claves service_role públicamente.

🧾 Base de datos Supabase
El proyecto incluye un script SQL completo para crear todas las tablas, relaciones y políticas de seguridad (RLS):

profiles → Usuarios del sistema

doctores → Información complementaria del doctor

pedidos → Registro de trabajos dentales

estaciones → Flujo de etapas de producción

historial_estaciones → Trazabilidad por técnico

archivos → Enlaces y documentos

auditoria → Registro automático de cambios

📄 Archivo: schema_laboratorio_dental.sql

🧑‍💻 Cómo ejecutar localmente
bash
Copiar código
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/labdents.git
cd labdent

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local

# 4. Ejecutar en modo desarrollo
npm run dev

# 5. Abrir en el navegador
http://localhost:3000
☁️ Deploy en Vercel
Sube el proyecto a GitHub (ya listo).

Entra a 👉 https://vercel.com/new

Conecta tu repositorio labdent.

En Environment Variables, copia tus claves de .env.local.

¡Deploy automático! 🎉

📸 Capturas sugeridas
Agrega una carpeta /screenshots con imágenes como:

bash
Copiar código
📷 /screenshots/dashboard.png
📷 /screenshots/pedidos.png
📷 /screenshots/flujo-estaciones.png
📷 /screenshots/usuarios.png
💡 Créditos
Desarrollado por Kevin Davor Vergara Orellana
👨‍💻 k3v1bviLabs Corp.

Arquitectura y asistencia técnica por ChatGPT (OpenAI)
© 2025 — Proyecto académico / empresarial para laboratorios dentales.

🧩 Licencia
Este proyecto se distribuye bajo la licencia MIT,
lo que permite su uso, modificación y distribución libre con fines personales o comerciales.

yaml
Copiar código

---

✅ **Instrucciones finales:**
1. Copia **todo el texto** anterior.  
2. Pega en un archivo llamado `README.md` en la raíz de tu proyecto.  
3. Ejecuta:
   ```bash
   git add README.md
   git commit -m "📝 Añadido README profesional"
   git push
💡 Créditos

Desarrollado por [Kevin Davor Vergara Orellana / k3v1vboLabs Corp.]
Arquitectura y asistencia técnica por ChatGPT (OpenAI)
© 2025 - Proyecto académico / empresarial para laboratorios dentales
