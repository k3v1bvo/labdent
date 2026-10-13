<div align="center">

# 🦷 LabDent — Guisela Laboratorio Dental
### Sistema Integral de Gestión de Laboratorio Dental, Taller CAD/CAM & Control Anti-Fraude

[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![ImgBB API](https://img.shields.io/badge/ImgBB-Cloud_Storage-0080FF?style=for-the-badge)](https://imgbb.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployment-black?style=for-the-badge&logo=vercel)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg?style=for-the-badge)](LICENSE)

<p align="center">
  Plataforma web integral diseñada para laboratorios dentales de alta precisión. Administra el ciclo completo de órdenes clínicas, trazabilidad en taller robótico CAD/CAM, auditoría forense inmutable para prevención de fraudes y marcación biométrica de personal con GPS.
</p>

[Demostración](#-demostración) • [Módulos Clave](#-módulos-clave-del-sistema) • [Arquitectura](#-arquitectura--stack-tecnológico) • [Instalación](#-instalación-y-configuración-local) • [Despliegue](#-despliegue-en-vercel) • [Licencia](#-licencia)

</div>

---

## 📋 Tabla de Contenidos

1. [Módulos Clave del Sistema](#-módulos-clave-del-sistema)
2. [Arquitectura & Stack Tecnológico](#-arquitectura--stack-tecnológico)
3. [Estructura del Proyecto](#-estructura-del-proyecto)
4. [Instalación y Configuración Local](#-instalación-y-configuración-local)
5. [Base de Datos (Supabase)](#-base-de-datos-supabase)
6. [Integración con ImgBB](#-integración-con-imgbb)
7. [Despliegue en Vercel](#-despliegue-en-vercel)
8. [Roles y Permisos](#-roles-y-permisos-del-sistema)
9. [Licencia](#-licencia)

---

## 🚀 Módulos Clave del Sistema

### 1. 🛡️ Sistema de Auditoría Forense & Blindaje Anti-Fraude
* **Inmutabilidad de Órdenes**: Una vez que un pedido pasa de revisión a producción, los montos (`total`, `anticipo`, `saldo`) y especificaciones quedan bloqueados con candado digital 🔒 para roles de secretaria.
* **Registro de Auditoría Append-Only (`auditoria_pedidos`)**: Cada cambio de estado, modificación autorizada de precio o entrega física queda registrado con responsable, rol, timestamp exacto, valores antes/después y motivo obligatorio.
* **Panel de Seguridad para Administrador (`/dashboard/admin/audit`)**: Detección en tiempo real de alteraciones de montos, pedidos entregados y feed cronológico de eventos.

### 2. 📍 Control de Asistencia Biométrica & Geocerca GPS
* **Geocerca de Precisión (100 metros)**: Utiliza la API de geolocalización del navegador y la fórmula de Haversine para verificar que el empleado esté físicamente en el taller. Marcaciones fuera de rango son catalogadas automáticamente como `FUERA_DE_RANGO`.
* **Selfie en Vivo con Guía Facial**: Captura fotográfica obligatoria en tiempo real con la cámara del dispositivo (`navigator.mediaDevices`), impidiendo el uso de imágenes precargadas de la galería.
* **Control de Tolerancia de Entrada**: Configuración de hora de ingreso con 20 minutos de tolerancia antes de registrar `TARDANZA`.
* **Cronómetro de Almuerzo en Tiempo Real**: Marcaje de salida a refrigerio que activa un cronómetro regresivo de 60 minutos con margen de 10 minutos (70 min totales).
* **Consola de Configuración de Taller (`/dashboard/admin/attendance`)**: Permite al administrador definir las coordenadas del taller con un botón de un clic (*"Usar Mi Ubicación Actual"*), tolerancias y horarios.

### 3. ☁️ Almacenamiento Cero Costo con ImgBB
* Todas las fotos (selfies de asistencia, registros clínicos y archivos visuales) se suben automáticamente a **ImgBB** mediante su API REST v1.
* En Supabase se almacena únicamente la URL directa (`https://i.ibb.co/...`), evitando sobrecostos de almacenamiento y ancho de banda en la base de datos.

### 4. 🔬 Taller Técnico & Estaciones CAD/CAM
* Flujo por estaciones de trabajo:
  1. *Recepción & Digitalización CAD 3D*
  2. *Fresado Robótico & Sinterizado de Zirconio*
  3. *Estratificación Cerámica & Arte Biomimético*
  4. *Terminado, Glaseado & Pulido*
  5. *Control de Calidad Final & Empaque*
* Registro de tiempos de fabricación por estación y asignación de técnicos.

### 5. 📦 Gestión Clínica y Despacho
* Seguimiento de cajas odontológicas numeradas (`numero_caja`).
* Registro de entrega contra nota numerada (`numero_nota_entrega`).
* Ficha técnica detallada imprimible con firmas de conformidad y maestro ceramista.

---

## 🛠️ Arquitectura & Stack Tecnológico

| Capa | Tecnología | Descripción |
| :--- | :--- | :--- |
| **Frontend** | [Next.js 15 (App Router)](https://nextjs.org/) | Framework React para producción con Server & Client Components |
| **Lenguaje** | [TypeScript](https://www.typescriptlang.org/) | Tipado estricto para alta mantenibilidad y seguridad |
| **Estilos** | [Tailwind CSS](https://tailwindcss.com/) | Diseño responsivo, utility-first con paleta institucional |
| **Animaciones** | [Framer Motion](https://www.framer.com/motion/) | Transiciones fluidas y micro-interacciones |
| **Íconos** | [Lucide React](https://lucide.dev/) | Iconografía SVG moderna y consistente |
| **Base de Datos** | [Supabase (PostgreSQL)](https://supabase.com/) | Base de datos relacional con Row Level Security (RLS) |
| **Autenticación** | Supabase Auth | Manejo de sesiones seguras por JWT |
| **Imágenes** | [ImgBB API v1](https://api.imgbb.com/) | Alojamiento en la nube de imágenes y selfies |
| **Hosting** | [Vercel](https://vercel.com/) | Despliegue continuo con edge network global |

---

## 📁 Estructura del Proyecto

```text
labdent/
├── public/                      # Recursos estáticos y logotipos oficiales
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── admin/           # Métricas, pedidos, auditoría y control de asistencia
│   │   │   │   ├── attendance/  # Panel de asistencia y configuración de geocerca
│   │   │   │   ├── audit/       # Centro forense anti-fraude
│   │   │   │   ├── orders/      # Gestión general de pedidos
│   │   │   │   ├── stations/    # Gestión de estaciones CAD/CAM
│   │   │   │   └── users/       # Administración de personal
│   │   │   ├── attendance/      # Reloj biométrico para técnicos y secretarias (GPS + Selfie)
│   │   │   ├── secretary/       # Recepción clínica, doctores y entrega con nota
│   │   │   └── technician/      # Estación de taller técnico en tiempo real
│   │   ├── login/               # Autenticación segura
│   │   └── page.tsx             # Landing page institucional del laboratorio
│   ├── components/
│   │   ├── layouts/             # DashboardLayout con navegación por roles
│   │   ├── orders/              # ReviewOrderDialog con candado anti-edición
│   │   └── ui/                  # Componentes reutilizables (Botones, Cards, Dialogs)
│   └── lib/
│       ├── attendanceService.ts # Servicio de geocerca Haversine y cálculo de tolerancias
│       ├── auditLogger.ts       # Logger append-only para auditoría inmutable
│       ├── imgbb.ts             # Cliente de subida a ImgBB API
│       ├── supabaseClient.ts    # Conexión centralizada de Supabase
│       └── getUserProfile.ts    # Proveedor de sesión y rol actual
├── MIGRACION_SUPABASE_COMPLETA.sql # Script SQL maestro unificado para Supabase
├── .env.example                 # Plantilla de variables de entorno
├── LICENSE                      # Licencia MIT
└── package.json                 # Dependencias y scripts
```

---

## 💻 Instalación y Configuración Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/labdent.git
cd labdent
```

### 2. Instalar dependencias
```bash
npm install
# o con pnpm:
pnpm install
```

### 3. Configurar variables de entorno
Copia la plantilla `.env.example` a `.env.local`:
```bash
cp .env.example .env.local
```

Configura tus credenciales:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima-publica
SUPABASE_SERVICE_ROLE_KEY=tu-clave-service-role
NEXT_PUBLIC_IMGBB_API_KEY=tu-clave-de-imgbb
```

### 4. Iniciar el servidor de desarrollo
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🗄️ Base de Datos (Supabase)

El proyecto incluye el script maestro de configuración listo para producción:
👉 `MIGRACION_SUPABASE_COMPLETA.sql`

### Pasos para migrar a un nuevo proyecto:
1. Crea tu proyecto en [Supabase](https://supabase.com).
2. Dirígete a la sección **SQL Editor**.
3. Pega todo el contenido de `MIGRACION_SUPABASE_COMPLETA.sql`.
4. Ejecuta el script (**RUN**).
5. Crea tu usuario administrador en **Authentication > Users** y asígnale `rol = 'admin'` en la tabla `profiles`.

---

## 🌐 Despliegue en Vercel

1. Importa el repositorio en tu cuenta de [Vercel](https://vercel.com).
2. En **Project Settings > Environment Variables**, añade:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   * `NEXT_PUBLIC_IMGBB_API_KEY`
3. Haz clic en **Deploy**.

---

## 👥 Roles y Permisos del Sistema

| Módulo / Acción | Administrador | Secretaria | Técnico Dental | Odontólogo (Doctor) |
| :--- | :---: | :---: | :---: | :---: |
| **Crear Nueva Orden** | ✅ | ✅ | ❌ | ✅ |
| **Aprobar Pedido Inicial** | ✅ | ✅ | ❌ | ❌ |
| **Modificar Precios Post-Aprobación** | ✅ *(Con motivo)* | ❌ *(Bloqueado)* | ❌ | ❌ |
| **Registrar Entrega Física** | ✅ | ✅ | ❌ | ❌ |
| **Taller & Estaciones CAD/CAM** | ✅ | ❌ | ✅ | ❌ |
| **Marcar Asistencia (Selfie + GPS)** | ✅ | ✅ | ✅ | ❌ |
| **Configurar Horarios & Geocerca** | ✅ | ❌ | ❌ | ❌ |
| **Centro de Auditoría Forense** | ✅ | ❌ | ❌ | ❌ |

---

## ⚖️ Aviso Legal, Privacidad & Cumplimiento Normativo

* **Protección de Datos Biométricos & Geolocalización**:
  * El módulo de marcación fotográfica (selfie) y cálculo de geocerca GPS se rige exclusivamente bajo el principio de finalidad laboral y control horario interno dentro del perímetro del taller.
  * **Sin Rastreo en Segundo Plano**: La geolocalización y la cámara se activan única y exclusivamente a solicitud explícita del empleado al momento de presionar el botón de marcaje y se apagan inmediatamente al completarse el registro. No existe rastreo continuo ni invasión de privacidad.
  * **Seguridad de Credenciales**: Ninguna clave privada, token de servicio o credencial administrativa debe ser commiteada al repositorio público. Todas las configuraciones sensibles se manejan mediante variables de entorno encriptadas (`.env.local` / Vercel Environment Variables).
* **Descargo de Responsabilidad**: El uso de esta plataforma para auditoría de órdenes y control de personal es responsabilidad del administrador del establecimiento de conformidad con la legislación laboral local aplicable.

---

## 📄 Licencia

Este proyecto está distribuido bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para obtener más información.

<div align="center">
  <sub>Desarrollado con excelencia para <strong>Guisela Laboratorio Dental</strong>. © 2026 Todos los derechos reservados.</sub>
</div>
