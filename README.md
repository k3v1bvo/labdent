<div align="center">

# 🦷 LabDent — Guisela Laboratorio Dental
### Sistema Integral de Gestión de Laboratorio Dental, Taller CAD/CAM & Control Anti-Fraude

[![Next.js 16](https://img.shields.io/badge/Next.js-16.1.6-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Telegram Cloud](https://img.shields.io/badge/Telegram_Bot-3D_Cloud_Storage-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://core.telegram.org/bots/api)
[![ImgBB API](https://img.shields.io/badge/ImgBB-Image_Cloud-0080FF?style=for-the-badge)](https://imgbb.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployment-black?style=for-the-badge&logo=vercel)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg?style=for-the-badge)](LICENSE)

<p align="center">
  Plataforma web médica de alta precisión para la gestión completa de órdenes protésicas, trazabilidad robótica CAD/CAM, almacenamiento ilimitado de modelos 3D en Telegram Cloud, control de caja diaria bimonetaria, blindaje forense anti-fraude y control de asistencia GPS para <b>Guisela Laboratorio Dental</b> (Cochabamba & La Paz, Bolivia).
</p>

[Módulos Principales](#-módulos-principales-del-sistema) • [Arquitectura](#-arquitectura--stack-tecnológico) • [Estructura](#-estructura-del-proyecto) • [Instalación](#-instalación-y-configuración-local) • [Base de Datos](#-base-de-datos-y-migraciones-supabase) • [Roles y Permisos](#-roles-y-matriz-de-permisos) • [Manual de Doctores](#-manual-operativo-para-doctores) • [Licencia](#-licencia)

</div>

---

## 📋 Tabla de Contenidos

1. [Módulos Principales del Sistema](#-módulos-principales-del-sistema)
2. [Arquitectura & Stack Tecnológico](#-arquitectura--stack-tecnológico)
3. [Estructura del Proyecto](#-estructura-del-proyecto)
4. [Instalación y Configuración Local](#-instalación-y-configuración-local)
5. [Variables de Entorno](#-variables-de-entorno)
6. [Base de Datos y Migraciones (Supabase)](#-base-de-datos-y-migraciones-supabase)
7. [Roles y Matriz de Permisos](#-roles-y-matriz-de-permisos)
8. [Manual Operativo para Doctores y Flujo de Datos](#-manual-operativo-para-doctores)
9. [Licencia](#-licencia)

---

## 🚀 Módulos Principales del Sistema

### 1. 💰 Precios Duales en Tiempo Real (Bs Grande / $us Pequeño)
* **Regla de Visualización Financiera**: Todos los montos en el sistema se despliegan con el precio en **Bolivianos (Bs) en tipografía grande y destacada**, acompañado de la cotización equivalente en **Dólares ($us) en tipografía pequeña y elegante**.
* **Gestión de Tipo de Cambio Dinámico**: Servicio centralizado (`src/lib/currency.ts`) con sincronización en tiempo real y persistencia en Supabase (`configuracion_taller.tipo_cambio_usd`).
* **Resaltado de Deudas**: Cualquier saldo pendiente por cobrar se resalta automáticamente en color rojo carmesí (`text-rose-600`) para alerta visual inmediata en caja y reportes.

### 2. 🕒 Sincronización Horaria Oficial de Bolivia (GMT-4)
* **Zero Server Clock Drift**: Todo el sistema opera bajo el huso horario oficial de **Bolivia (America/La_Paz, GMT-4)** mediante utilidades en `src/lib/dateUtils.ts`.
* Evita discrepancias entre servidores en la nube (UTC) y la hora real de ingreso, entregas, marcaciones de personal y cortes de caja en Cochabamba y La Paz.

### 3. 🏷️ Gestión de Tarifas & Convenios por Odontólogo
* **Tarifas Asignables por Doctor** (configurables en `/dashboard/admin/doctors` y `/dashboard/secretary/doctors`):
  * 🏥 **Precios Regulares**: Catálogo estándar del laboratorio.
  * 🎓 **Convenio UNITEPC**: Precios institucionales fijos en Bolivianos (inmunes a fluctuaciones del dólar).
  * 🎓 **Convenio UNIVALLE**: Precios institucionales fijos en Bolivianos.
  * 🏷️ **Descuento Personalizado (%)**: Porcentaje exclusivo asignado a la clínica o doctor.
* **Auto-aplicación en Nuevas Órdenes**: Al seleccionar al doctor en el selector de pedidos, `TrabajoSelector` carga de inmediato sus precios asignados y aplica el descuento en automático.

### 4. 📦 Almacenamiento Ilimitado 3D CAD/CAM en Telegram Cloud
* **Cero Consumo de Cuota en Supabase Storage**: Los archivos pesados de escaneo intraoral (`.STL`, `.OBJ`, `.PLY`, `.ZIP` de 20MB a 80MB) se despachan directamente a un canal privado de **Telegram Cloud** a través del bot oficial (`/api/telegram/send-order`).
* **Streaming de Descarga Transparente**: En Supabase solo se almacena la referencia del `file_id`. Cuando los técnicos de taller hacen clic en **"Descargar Archivo 3D"**, la API (`/api/telegram/download`) transmite el archivo en streaming conservando su nombre clínico original, listo para abrir en **Exocad, 3Shape o Blender**.

### 5. 📱 Pago por QR Simple Bolivia & Subida de Comprobantes ImgBB
* **Modal de Pago QR en Alta Resolución**: Los doctores y secretarias pueden hacer clic en **"Ver y Descargar QR"** para ver el QR bancario oficial (Banco Unión / BCP / Simple QR) y descargarlo directo a su celular para pagar desde su banca móvil.
* **Gestor de QR para el Administrador**: El Administrador puede actualizar la imagen del QR oficial directamente desde la interfaz con subida instantánea a **ImgBB** sin tocar código.
* **Registro de Pago**: Registro de fecha y hora exacta de la transferencia bancaria y subida de la captura del comprobante con enlace de verificación original.

### 6. 🗃️ Control Físico de Componentes en Caja (15 Aditamentos)
* Verificación física estandarizada de los **15 aditamentos oficiales** de laboratorio:
  * *Tornillo de fijación, Tornillo de cicatrización, Análogo, Poste de impresión, Transfer de cubeta, Interfase de titanio, Base de cromo, Multi-Unit, Calcinable, Malla de titanio, Muñón artificial, Articulador plástico, Modelo antagonista, Registro de mordida y Cubeta individual*.
* Conteo de entrada y salida para evitar pérdidas de insumos quirúrgicos y protésicos de alto valor.

### 7. 💵 Módulo de Caja Diaria & Flujo de Efectivo
* **Apertura y Cierre de Sesión de Caja**: Registro de responsable, saldo inicial en Bs/USD, ingresos por anticipos y saldo final en caja física.
* **Movimientos Bimonetarios**: Soporte para cobros tanto en Efectivo (Bs / USD) como en QR Bancario.
* **Arqueo y Exportación**: Balance automático de sesión, detección de sobrantes/faltantes y conciliación con pedidos.

### 8. 🛡️ Auditoría Forense & Blindaje Anti-Fraude
* **Candado de Inmutabilidad 🔒**: Una vez que un pedido es aprobado, los montos (`total`, `anticipo`, `saldo`) y especificaciones quedan bloqueados contra edición para secretarias y usuarios operativos.
* **Bitácora Inmutable Append-Only (`auditoria_pedidos`)**: Cualquier corrección autorizada por el Administrador requiere un motivo explícito y queda firmada con timestamp, rol, IP y valores anteriores vs nuevos.

### 9. 📍 Marcación Biométrica con Geocerca GPS & Selfie en Vivo
* **Geocerca de Taller (100 metros)**: Verificación física mediante geolocalización del navegador y fórmula de Haversine.
* **Selfie en Tiempo Real**: Captura obligatoria por cámara (`navigator.mediaDevices`), impidiendo fotos precargadas de galería.
* **Control de Tiempos**: Tolerancia de entrada de 20 minutos y cronómetro regresivo de almuerzo de 60 minutos con 10 min de tolerancia.

### 10. 📄 Hoja de Remisión Oficial A4 & Kardex Odontológico
* **Hoja de Remisión Técnica A4**: Documento formal listo para imprimir en papel membretado o guardar en PDF, con marca de agua institucional de seguridad, código de barras simulado, resumen de cuenta bimonetario con saldo en rojo, detalle de componentes y certificado de garantía de biomateriales biocompatibles.
* **Kardex por Doctor**: Reporte financiero acumulado de cuenta corriente para cada odontólogo con balance histórico.

---

## 🛠️ Arquitectura & Stack Tecnológico

| Componente | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Framework Web** | [Next.js 16.1.6 (App Router)](https://nextjs.org/) | Arquitectura híbrida Server/Client Components, API Routes y Server Actions |
| **Lenguaje** | [TypeScript 5.0](https://www.typescriptlang.org/) | Tipado estático estricto de extremo a extremo |
| **Diseño & CSS** | [Tailwind CSS 3.4](https://tailwindcss.com/) | Sistema de diseño profesional con paleta corporativa morada (`#3C1C6C`) |
| **Animaciones** | [Framer Motion](https://www.framer.com/motion/) | Transiciones fluidas, modales y micro-interacciones |
| **Iconografía** | [Lucide React](https://lucide.dev/) | Iconos vectoriales limpios y consistentes |
| **Base de Datos** | [Supabase (PostgreSQL)](https://supabase.com/) | Base de datos relacional con RLS, triggers y funciones SQL |
| **Autenticación** | Supabase Auth (JWT) | Sesiones basadas en tokens criptográficos con control de roles |
| **Almacenamiento 3D** | [Telegram Bot API](https://core.telegram.org/bots/api) | Almacenamiento gratuito e ilimitado de modelos CAD/CAM (`.stl`, `.obj`) |
| **Alojamiento Imágenes**| [ImgBB API v1](https://api.imgbb.com/) | Hosting en la nube de comprobantes de pago y fotos de asistencia |
| **Mapas & Geocodificación**| [OpenStreetMap / Nominatim](https://nominatim.openstreetmap.org/) | Georreferenciación de clínicas y cálculo de rutas de delivery |
| **Despliegue** | [Vercel](https://vercel.com/) | CI/CD automático con Edge Network global |

---

## 📁 Estructura del Proyecto

```text
labdent/
├── public/                                # Imágenes institucionales, logos y emblemas
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/register/             # Registro asistido de doctores
│   │   │   ├── location/reverse/          # Geocodificación inversa OpenStreetMap
│   │   │   ├── mailer/                    # Envío de correos transaccionales (SMTP)
│   │   │   ├── telegram/
│   │   │   │   ├── download/              # Proxy de descarga de archivos 3D desde Telegram
│   │   │   │   ├── send-order/            # Despacho de ficha y archivo 3D a Telegram Bot
│   │   │   │   └── test/                  # Verificación de conexión con Telegram
│   │   │   └── upload-imgbb/              # API proxy de subida segura a ImgBB
│   │   ├── dashboard/
│   │   │   ├── admin/                     # Consola integral de Administrador
│   │   │   │   ├── attendance/            # Marcaciones y configuración de geocerca GPS
│   │   │   │   ├── audit/                 # Centro forense anti-fraude
│   │   │   │   ├── cash/                  # Control de caja diaria y arqueo
│   │   │   │   ├── doctors/               # Directorio y asignación de tarifas por doctor
│   │   │   │   ├── new-order/             # Registro express directo a producción
│   │   │   │   ├── orders/                # Listado de órdenes con filtros y detalle ([id])
│   │   │   │   └── stations/              # Configuración de estaciones técnicas
│   │   │   ├── attendance/                # Reloj biométrico de empleados (Selfie + GPS)
│   │   │   ├── doctors/                   # Portal exclusivo de Odontólogos
│   │   │   │   ├── new-order/             # Creación de pedidos con STL y tarifas auto
│   │   │   │   └── orders/                # Tracking en vivo de trabajos
│   │   │   ├── secretary/                 # Recepción, caja, validación y entrega
│   │   │   └── technician/                # Mesa técnica de taller con descarga de STL
│   │   ├── login/                         # Pantalla de acceso
│   │   └── page.tsx                       # Landing page corporativa
│   ├── components/
│   │   ├── common/DualPrice.tsx           # Componente universal de precios Bs/$us
│   │   ├── location/                      # Selector de ubicación en mapa satelital
│   │   ├── orders/
│   │   │   ├── ControlComponentes.tsx     # Checkbox de 15 aditamentos en caja
│   │   │   ├── LabPaymentQrModal.tsx      # Modal de QR oficial con descarga
│   │   │   ├── PaymentMethodSelector.tsx  # Selector Efectivo vs QR + ImgBB
│   │   │   ├── ReviewOrderDialog.tsx      # Revisión con candado y visor 3D
│   │   │   └── TrabajoSelector.tsx        # Catálogo interactivo con tarifas UNITEPC/UNIVALLE
│   │   ├── reports/
│   │   │   ├── DoctorKardexReportModal.tsx # Kardex de cuenta corriente de doctores
│   │   │   └── OrderReportModal.tsx       # Hoja de Remisión Oficial A4 con garantía
│   │   └── technician/TaskDetailsDialog.tsx # Detalle técnico y descarga directa de 3D
│   └── lib/
│       ├── currency.ts                    # Tipo de cambio en vivo y formateo bimonetario
│       ├── dateUtils.ts                   # Normalizador horario de Bolivia (GMT-4)
│       ├── qrPaymentService.ts            # Servicio de QR oficial de pago
│       ├── telegram.ts                    # Cliente Telegram Bot API (Send & Download)
│       ├── cashService.ts                 # Operaciones de caja diaria y arqueo
│       └── supabaseClient.ts              # Conexión Supabase
├── MIGRACION_QR_PAGO_Y_TARIFAS.sql        # Script SQL para columnas de tarifas y QR
├── MIGRACION_SUPABASE_COMPLETA.sql        # Script SQL maestro integral de la base de datos
├── .env.example                           # Plantilla de variables de entorno
├── LICENSE                                # Licencia MIT
└── package.json                           # Dependencias y scripts
```

---

## 💻 Instalación y Configuración Local

### 1. Clonar el Repositorio
```bash
git clone https://github.com/k3v1bvo/labdent.git
cd labdent
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
Copia el archivo `.env.example` creando `.env.local`:
```bash
cp .env.example .env.local
```

### 4. Iniciar el Servidor de Desarrollo
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### 5. Compilar para Producción
Para verificar la ausencia total de errores de compilación y validar las 50 rutas:
```bash
npm run build
```

---

## 🔐 Variables de Entorno

Configura los siguientes valores en tu archivo `.env.local` o en la consola de Vercel:

```env
# 1. Supabase (Base de Datos & Auth)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima-publica
SUPABASE_SERVICE_ROLE_KEY=tu-clave-service-role-privada

# 2. ImgBB (Alojamiento de Comprobantes, Selfies y QR)
NEXT_PUBLIC_IMGBB_API_KEY=tu-api-key-de-imgbb

# 3. Telegram Bot API (Almacenamiento Ilimitado 3D CAD/CAM)
TELEGRAM_BOT_TOKEN=tu-bot-token-de-botfather
TELEGRAM_CHAT_ID=-100tu_chat_id_del_canal

# 4. Servidor SMTP de Correo (Notificaciones y Bienvenidas)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=tu-correo@gmail.com
SMTP_PASS=tu-contraseña-de-aplicacion
SMTP_FROM="Guisela Laboratorio Dental" <tu-correo@gmail.com>

# 5. Dominio Base de la Aplicación
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🗄️ Base de Datos y Migraciones (Supabase)

El proyecto incluye dos scripts SQL principales listos para ejecutarse en el **SQL Editor** de Supabase:

1. **`MIGRACION_SUPABASE_COMPLETA.sql`**: Crea la arquitectura completa de tablas (`profiles`, `pedidos`, `estaciones`, `historial_estaciones`, `asistencia`, `configuracion_taller`, `auditoria_pedidos`, `caja_sesiones`, `caja_movimientos`), políticas RLS y triggers de auditoría.
2. **`MIGRACION_QR_PAGO_Y_TARIFAS.sql`**: Añade las columnas `tipo_tarifa` y `descuento_porcentaje` en `doctores`, y la columna `qr_pago_url` en `configuracion_taller`.

---

## 👥 Roles y Matriz de Permisos

| Capacidad / Función | Administrador | Secretaria | Técnico Dental | Odontólogo (Doctor) |
| :--- | :---: | :---: | :---: | :---: |
| **Crear Orden Clínica** | ✅ *(Directo)* | ✅ *(Directo)* | ❌ | ✅ *(A revisión)* |
| **Aprobar / Validar Pedidos** | ✅ | ✅ | ❌ | ❌ |
| **Modificar Precios Post-Aprobación** | ✅ *(Con motivo)* | ❌ *(Bloqueado 🔒)* | ❌ | ❌ |
| **Mesa Técnica CAD/CAM** | ✅ | ❌ | ✅ | ❌ |
| **Descargar Archivo 3D (STL/OBJ)** | ✅ | ✅ | ✅ | ❌ |
| **Gestión de Caja Diaria & Arqueo** | ✅ | ✅ | ❌ | ❌ |
| **Actualizar QR Oficial de Pago** | ✅ | ❌ | ❌ | ❌ |
| **Asignar Tarifas a Doctores** | ✅ | ✅ | ❌ | ❌ |
| **Marcar Asistencia (GPS + Selfie)**| ✅ | ✅ | ✅ | ❌ |
| **Configurar Geocerca & Horarios** | ✅ | ❌ | ❌ | ❌ |
| **Auditoría Forense Anti-Fraude** | ✅ | ❌ | ❌ | ❌ |

---

## 📖 Manual Operativo para Doctores

Para una guía detallada con diagramas del flujo de datos y manual paso a paso de uso para odontólogos, consulta el documento:
👉 **[MANUAL_DOCTORES_Y_FLUJO_DATOS.md](MANUAL_DOCTORES_Y_FLUJO_DATOS.md)**

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

<div align="center">
  <sub>Desarrollado con orgullo para <strong>Guisela Laboratorio Dental</strong> · Cochabamba & La Paz, Bolivia. © 2026 Todos los derechos reservados.</sub>
</div>
