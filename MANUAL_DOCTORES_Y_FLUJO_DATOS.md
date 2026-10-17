# 📖 Manual Operativo para Odontólogos & Arquitectura del Flujo de Datos
### Guisela Laboratorio Dental · Sistema Integral LabDent

---

## 📑 Índice de Contenidos

1. [Visión General del Portal del Odontólogo](#1-visión-general-del-portal-del-odontólogo)
2. [Arquitectura y Diagrama del Flujo de Datos](#2-arquitectura-y-diagrama-del-flujo-de-datos)
3. [Guía Paso a Paso: Creación de un Nuevo Pedido](#3-guía-paso-a-paso-creación-de-un-nuevo-pedido)
   - 3.1 [Datos del Paciente y Requerimiento](#31-datos-del-paciente-y-requerimiento)
   - 3.2 [Catálogo de Trabajos y Tarifas Asignadas](#32-catálogo-de-trabajos-y-tarifas-asignadas)
   - 3.3 [Especificaciones de Color, Pieza y Guía](#33-especificaciones-de-color-pieza-y-guía)
   - 3.4 [Adjunto de Escaneo Digital 3D CAD/CAM (Telegram Cloud)](#34-adjunto-de-escaneo-digital-3d-cadcam-telegram-cloud)
   - 3.5 [Verificación de Componentes Físicos en Caja (15 Aditamentos)](#35-verificación-de-componentes-físicos-en-caja-15-aditamentos)
   - 3.6 [Modalidad de Pago, QR Bancario y Comprobante](#36-modalidad-de-pago-qr-bancario-y-comprobante)
   - 3.7 [Logística de Despacho y Delivery con Mapa](#37-logística-de-despacho-y-delivery-con-mapa)
4. [Ciclo de Vida y Estados de la Orden](#4-ciclo-de-vida-y-estados-de-la-orden)
5. [Monitoreo y Tracking en Vivo](#5-monitoreo-y-tracking-en-vivo)
6. [Hoja de Remisión Oficial A4 y Kardex Financiero](#6-hoja-de-remisión-oficial-a4-y-kardex-financiero)
7. [Preguntas Frecuentes y Soporte](#7-preguntas-frecuentes-y-soporte)

---

## 1. Visión General del Portal del Odontólogo

El módulo para doctores de **LabDent** está diseñado para que los odontólogos y especialistas en prótesis puedan:
* Registrar órdenes clínicas desde su consultorio en menos de **2 minutos** (desde PC, tablet o celular).
* Cargar directamente los archivos digitales de escáner intraoral (`.STL`, `.OBJ`, `.PLY`, `.ZIP`) sin límite de tamaño.
* Pagar anticipos o saldos mediante **Simple QR Bolivia** descargando el QR oficial del laboratorio.
* Seguir la fabricación en tiempo real estación por estación técnica (CAD/CAM, Fresado, Cerámica, Control de Calidad).
* Descargar e imprimir su **Hoja de Remisión Oficial A4 con Certificado de Calidad** y consultar su **Kardex Histórico**.

---

## 2. Arquitectura y Diagrama del Flujo de Datos

El sistema implementa una arquitectura híbrida optimizada para el almacenamiento masivo sin costos de infraestructura:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   ODONTÓLOGO / CONSULTORIO DENTAL                      │
│   Ingresa a: /dashboard/doctors/new-order                             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           │                                                 │
           ▼ [Datos Clínicos + Pago]                         ▼ [Archivo 3D STL/OBJ]
┌──────────────────────────────┐              ┌──────────────────────────────┐
│  Formulario Web Next.js 16   │              │ Formulario Web Next.js 16    │
│  - Paciente & Requerimiento  │              │ - Archivo pesado (20 - 80 MB)│
│  - Tarifa Asignada (Auto)    │              │ - Drag & Drop                │
└──────────────┬───────────────┘              └──────────────┬───────────────┘
               │                                             │
               │ Sube comprobante QR                         │ Envío binario (file3d)
               ▼                                             ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│        ImgBB API v1          │              │ API: /api/telegram/send-order│
│  (Alojamiento de imagen)     │              └──────────────┬───────────────┘
│  Devuelve URL del recibo     │                             │
└──────────────┬───────────────┘                             │ Envía documento (Bot API)
               │                                             ▼
               │                              ┌──────────────────────────────┐
               │                              │   TELEGRAM CLOUD STORAGE     │
               │                              │   - Canal Privado del Lab    │
               │                              │   - Almacenamiento ILIMITADO │
               │                              │   - Devuelve: file_id único  │
               │                              └──────────────┬───────────────┘
               │                                             │
               │                                             │ Dirección de descarga:
               │                                             │ /api/telegram/download?fileId=...
               ▼                                             ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE POSTGRESQL DB                             │
│  Tabla "pedidos":                                                          │
│  - doctor_id, paciente_nombre, total, anticipo, estado: "pendiente_revision│
│  - modelo_3d_link = "/api/telegram/download?fileId=..."                    │
│  - observaciones = "[📦 TELEGRAM 3D: file_id=...] [📸 COMPROBANTE: ...]"    │
│  (¡Consumo de Supabase Storage: 0 Megabytes!)                              │
└──────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                 ┌─────────────────────┴─────────────────────┐
                 │                                           │
                 ▼                                           ▼
┌─────────────────────────────────┐         ┌────────────────────────────────┐
│   SECRETARÍA / ADMINISTRACIÓN   │         │    TÉCNICO DENTAL EN TALLER    │
│   - Valida datos y anticipo     │         │   - Recibe la orden en mesa    │
│   - Bloqueo de montos (Candado) │         │   - Clic en "Descargar STL 3D" │
│   - Pasa a: "pendiente"         │         │   - /api/telegram/download     │
└────────────────┬────────────────┘         │     obtiene el archivo directo │
                 │                          │     del Bot para Exocad/3Shape │
                 │                          └────────────────┬───────────────┘
                 │                                           │
                 ▼                                           ▼
┌─────────────────────────────────┐         ┌────────────────────────────────┐
│   DESPACHO & DELIVERY CLÍNICA   │         │    CONTROL DE CALIDAD FINAL    │
│   - Contacto WhatsApp con doctor│         │   - Verificación de 15 piezas  │
│   - Entrega con Nota y Hoja A4  │◄────────┤   - Pasa a: "finalizado"       │
└─────────────────────────────────┘         └────────────────────────────────┘
```

---

## 3. Guía Paso a Paso: Creación de un Nuevo Pedido

### 3.1 Datos del Paciente y Requerimiento
* **N° de Requerimiento**: Código único o correlativo interno que el odontólogo asigna al caso para su control en clínica (ej: `REQ-2026-089` o `0045`). El sistema valida en tiempo real que no esté duplicado.
* **Fecha y Hora de Ingreso**: Sincronizadas automáticamente con la hora oficial de **Bolivia (GMT-4)**.
* **Paciente**: Nombre completo del paciente y número de celular opcional para reportes.

---

### 3.2 Catálogo de Trabajos y Tarifas Asignadas
El sistema cuenta con un catálogo de más de 60 tipos de trabajos protésicos clasificados en categorías:
* *Zirconio Monolítico & Multicapa HD*
* *Disilicato de Litio (E-Max / Celtra)*
* *Metal-Porcelana Clásica & Biomimética*
* *Prótesis Removible & Cromo-Cobalto*
* *Prótesis Totales & Flexibles (Deflex)*
* *Rehabilitación sobre Implantes (Multi-Unit, Híbridas, Toronto)*
* *Ortodoncia, Placas Miorrelajantes y Alineadores*

#### 🏷️ Aplicación Automática de Tarifas por Doctor:
Cuando el odontólogo inicia sesión, el sistema detecta la modalidad de tarifa que el laboratorio le tiene asignada:
1. **Precios Regulares**: Precios base del catálogo general.
2. **Convenio Institucional UNITEPC**: Precios fijos preferenciales en Bolivianos para docentes y egresados de la UNITEPC.
3. **Convenio Institucional UNIVALLE**: Precios fijos preferenciales en Bolivianos para la Universidad del Valle.
4. **Descuento Personalizado (%)**: Porcentaje de descuento asignado a la clínica (ej: 10%, 15%, 20%) aplicado directamente al total.

> [!NOTE]
> Todos los montos se muestran en **Bolivianos (Bs grande)** con su referencia en **Dólares ($us pequeño)** al tipo de cambio en tiempo real.

---

### 3.3 Especificaciones de Color, Pieza y Guía
* **Pieza(s) Dental(es)**: Indicación de las piezas a intervenir bajo nomenclatura internacional FDI (ej: `11, 21` para centrales superiores, o `36, 46` para molares).
* **Color de Pieza**: Selección rápida o sugerida con autocompletado (ej: `A1`, `A2`, `A3.5`, `B1`, `BL2 Bleach`).
* **Colímetro / Guía Utilizada**: Selección de la guía de referencia clínica (ej: *Vita Classical, Vita 3D Master, Chromascop de Ivoclar, Shofu*).

---

### 3.4 Adjunto de Escaneo Digital 3D CAD/CAM (Telegram Cloud)
* Si el odontólogo tomó un escaneo intraoral o digitalizó el modelo con un escáner de mesa:
  * Formatos aceptados: `.STL`, `.OBJ`, `.PLY`, `.ZIP`, `.RAR`.
  * Límite por archivo: Hasta **50 MB** por envío.
  * Al seleccionar el archivo, se muestra una tarjeta con el nombre, tamaño y confirmación de preparación para la nube.
  * **Almacenamiento**: El archivo se sube automáticamente a los servidores seguros de Telegram Cloud a través del bot del laboratorio, generando un enlace de descarga directa para el técnico dental sin saturar la base de datos de Supabase.

---

### 3.5 Verificación de Componentes Físicos en Caja (15 Aditamentos)
Si el pedido incluye una caja física con componentes quirúrgicos o protésicos, el doctor puede marcar los elementos enviados con sus respectivas cantidades:
* *Tornillo de fijación, Tornillo de cicatrización, Análogo de implante, Poste de impresión, Transfer de cubeta abierta/cerrada, Ti-Base / Interfase de titanio, Base de cromo, Pilar Multi-Unit, Calcinable, Malla de titanio, Muñón artificial, Articulador plástico, Modelo antagonista, Registro de mordida en cera/silicona y Cubeta individual.*

Esta lista garantiza que el laboratorio devuelva exactamente las mismas piezas al momento de la entrega final.

---

### 3.6 Modalidad de Pago, QR Bancario y Comprobante
El doctor puede elegir entre dos modalidades para su anticipo o pago completo:
1. **Efectivo en Caja**: Pago presencial en ventanilla del laboratorio.
2. **Pago por QR / Transferencia (Simple QR Bolivia)**:
   * Al seleccionar esta opción, aparece el botón **"Ver y Descargar QR"**.
   * Se abre el modal con el **QR Oficial del Laboratorio** (Banco Unión / BCP / BNB) en alta resolución con datos de cuenta y titular.
   * El doctor puede pulsar **"⬇️ Descargar QR"** para guardar la imagen en la galería de su celular y pagar desde su aplicación bancaria móvil.
   * **Fecha y Hora del Pago**: Selector para registrar el momento exacto de la transferencia bancaria (GMT-4).
   * **Subir Comprobante**: Sube la captura de pantalla del pago bancario a la nube de ImgBB, quedando adjunta a la orden con vista previa.

---

### 3.7 Logística de Despacho y Delivery con Mapa
* Si el doctor desea recibir el trabajo terminado en su clínica:
  * Activa la casilla **"Enviar por Delivery al finalizar"**.
  * Puede ingresar el nombre de su consultorio, dirección y celular de recepción.
  * **Fijar en el Mapa**: Al hacer clic en el botón de mapa satelital, puede ubicar su consultorio en el mapa interactivo de Cochabamba / La Paz para guardar las coordenadas GPS exactas (latitud y longitud) para el motorizado.

---

## 4. Ciclo de Vida y Estados de la Orden

Cada orden sigue una progresión controlada para garantizar calidad y evitar errores:

| Estado | Significado para el Doctor | Acciones del Taller |
| :--- | :--- | :--- |
| **`pendiente_revision`** | Orden enviada por el doctor, en cola de recepción. | Secretaría revisa datos clínicos, verifica comprobante QR y asigna caja física. |
| **`pendiente`** | Orden aprobada formalmente. Precios bloqueados con candado 🔒. | Pasa a la cola activa de fabricación de los técnicos dentales. |
| **`en_proceso`** | En plena fabricación en el taller CAD/CAM. | Avanza por las estaciones técnicas: CAD 3D ➔ Fresado/Impresión ➔ Cerámica ➔ Glaseado. |
| **`finalizado`** | Prótesis terminada y aprobada por Control de Calidad. | Empacado en caja con sus aditamentos y generación de Hoja de Remisión A4. |
| **`entregado`** | Entregado físicamente al doctor o clínica. | Registro de firma de conformidad y liquidación de saldo. |
| **`rechazado`** | Notificación con motivo específico (ej: falta de mordida o escaneo incompleto). | El doctor puede ajustar los datos y reingresar el requerimiento. |

---

## 5. Monitoreo y Tracking en Vivo

En la sección **"Mis Trabajos"** (`/dashboard/doctors/orders`), el odontólogo dispone de:
* **Barra de Progreso Dinámica**: Indicador porcentual de avance del trabajo según la estación en la que se encuentra.
* **Detalle de la Estación Actual**: Visualización de la etapa actual (ej. *"Fresado Robótico de Zirconio"* o *"Estratificación Cerámica"*).
* **Filtros Inteligentes**: Búsqueda instantánea por nombre del paciente, número de requerimiento o estado.
* **Saldos en Rojo**: Resumen visual de montos cancelados y saldo pendiente por liquidar.

---

## 6. Hoja de Remisión Oficial A4 y Kardex Financiero

### 📄 Hoja de Remisión y Garantía Técnica A4
Al hacer clic en el botón de impresión de cualquier orden, el doctor puede visualizar y descargar el documento oficial:
* **Membrete Formal**: Emblema y datos institucionales de Guisela Laboratorio Dental.
* **Seguridad Forense**: Marca de agua institucional diagonal y código de barras de trazabilidad.
* **Resumen Económico Bimonetario**: Desglose en Bolivianos y Dólares con saldo resaltado.
* **Lista de Verificación de Componentes**: Lista física de los 15 aditamentos con tildes de confirmación.
* **Certificado de Biocompatibilidad**: Certificación de materiales (Zirconio multicapa, Disilicato de Litio o aleaciones libres de níquel).
* **Firmas de Conformidad**: Espacios para el Responsable Técnico CAD/CAM y el Odontólogo receptor.

### 📊 Kardex de Cuenta Corriente del Doctor
Desde el menú de órdenes, el doctor puede pulsar **"Ver Kardex"**:
* Lista histórica de todos los trabajos realizados a su nombre.
* Total acumulado facturado, total de anticipos entregados y balance de deuda neta.
* Botón de exportación a archivo Excel / CSV para contabilidad de la clínica.

---

## 7. Preguntas Frecuentes y Soporte

**¿Qué pasa si mi archivo 3D pesa más de 50 MB?**
Recomendamos comprimir la carpeta de escaneo en un archivo `.ZIP` o `.RAR`. Si supera los 50 MB, el doctor puede pegar el enlace de Google Drive o WeTransfer directamente en la casilla de *Observaciones*.

**¿El técnico puede ver mis notas clínicas?**
Sí. Todas las observaciones sobre acabados, textura vestibular, translucidez incisal o contactos proximales se transmiten en tiempo real a la pantalla de la mesa técnica.

**¿Cómo actualizo mi número de teléfono o dirección de consultorio?**
En la esquina superior derecha, accede a **Mi Perfil (`/dashboard/profile`)** para actualizar tus números de contacto, nombre de consultorio y dirección predeterminada de entrega.

---

<div align="center">
  <sub>Documento oficial de inducción clínica · <strong>Guisela Laboratorio Dental</strong> · Bolivia, 2026</sub>
</div>
