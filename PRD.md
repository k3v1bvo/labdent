# PRD: Guisela Laboratorio Dental — Roadmap de Control, Finanzas, Catálogo y Doble Moneda

> **Propósito**: Implementar las prioridades operativas acordadas en la reunión con la Dirección del Laboratorio Dental: sistema de doble moneda (Bs / USD) con tipo de cambio configurable, catálogo de 75 productos con cálculo automático de precios por pieza, tarifas diferenciadas por doctor/universidad (Univalle), bloqueo de seguridad de roles y edición de órdenes, soporte multi-estación para técnicos y trazabilidad de materiales.

---

## 작업 목록

### Step 1: Base de Datos & Configuración — Doble Moneda, Tipo de Cambio y Catálogo
- [ ] Tarea 1-1: Crear migración SQL (`MIGRACION_DOBLE_MONEDA_Y_CATALOGO.sql`) agregando `tipo_cambio_usd` (default 8.00) en `configuracion_taller`, y campos `tipo_tarifa` ('regular', 'descuento_normal', 'institucional_universidad') y `descuento_porcentaje` en `doctores`.
- [ ] Tarea 1-2: Crear tabla `catalogo_trabajos` (id, nombre, categoria, marca, precio_usd, precio_bs, activo) y sembrar los 75 productos oficiales del laboratorio con sus precios en USD.
- [ ] Tarea 1-3: Crear helper global `src/lib/currency.ts` con funciones de conversión `formatDualPrice(bs, rateUsd)`, cálculo automático de saldos y estilo de alerta en rojo para deudas.
- [ ] 검증 1: Ejecutar script SQL en Supabase, verificar inserción de los 75 productos y compilar TypeScript con `npx tsc --noEmit`.

### Step 2: Seguridad y Control Anti-Fraude
- [ ] #parallel Tarea 2-1: Bloquear cambio de rol en `src/components/profile/ProfileDialog.tsx`: ocultar el selector de rol a usuarios no administradores (solo lectura).
- [ ] #parallel Tarea 2-2: En `src/app/dashboard/secretary/orders/page.tsx` y diálogo de revisión: bloquear edición directa de montos y piezas en órdenes guardadas. Si hay error, permitir únicamente "Solicitar Anulación" con motivo justificado para aprobación del administrador en auditoría.
- [ ] 검증 2: Verificar que perfiles no-admin no puedan cambiar su rol y que órdenes en producción tengan candado de edición financiera.

### Step 3: Cotización Automática en Nueva Orden (Secretaría & Doctor)
- [ ] Tarea 3-1: En `src/app/dashboard/secretary/new-order/page.tsx`: conectar el trabajo a realizar con el autocompletado de `catalogo_trabajos`. Al seleccionar el trabajo y la cantidad de piezas, calcular automáticamente el Total en USD y Bs según el tipo de cambio y aplicar tarifa del doctor (regular vs institucional Univalle). Permitir agregar trabajo personalizado si no existe.
- [ ] Tarea 3-2: Replicar el catálogo y cálculo en `src/app/dashboard/doctors/new-order/page.tsx`.
- [ ] 검증 3: Registrar un pedido de prueba con 3 piezas de Corona Metal Cerámica ($50 c/u) y verificar que el total se auto-calcule en $150 (Bs 1200 a cambio 8) sin digitar precios a mano.

### Step 4: Visualización de Doble Moneda en Todas las Vistas
- [ ] #parallel Tarea 4-1: Actualizar `src/app/dashboard/admin/orders/page.tsx`, `src/app/dashboard/admin/orders/[id]/page.tsx` y `src/app/dashboard/admin/tracking/page.tsx` para mostrar montos en Bs grande y USD pequeño, con deudas en rojo.
- [ ] #parallel Tarea 4-2: Actualizar `src/app/dashboard/doctors/orders/page.tsx` y `src/app/dashboard/secretary/orders/page.tsx` con la visualización dual de moneda y estado de deuda en rojo.
- [ ] #parallel Tarea 4-3: Agregar en el panel de Administrador (`src/app/dashboard/admin/overview/page.tsx` o perfil de admin) el control para modificar manualmente el tipo de cambio (ej. 8.00 Bs).
- [ ] 검증 4: Navegar por las vistas en el navegador y comprobar la visualización dual `Bs XXX.XX ($YY.YY)` y las deudas en rojo.

### Step 5: Estaciones de Técnicos Multi-Área y Búsqueda Rápida
- [ ] Tarea 5-1: Permitir que un técnico opere múltiples estaciones sin crear cuentas separadas, con selector rápido de estación en `src/app/dashboard/technician/page.tsx` y `src/app/dashboard/technician/stations/page.tsx`.
- [ ] Tarea 5-2: Agregar campo de "Materiales / Tornillos devueltos" y notas de ajuste en la finalización de estaciones para evitar pérdida de aditamentos costosos.
- [ ] Tarea 5-3: Agregar buscador y filtro rápido por número de orden y número de caja en la estación técnica.
- [ ] 검증 5: Probar la búsqueda y el cambio de estación con un técnico de prueba.

### Step 6: Módulo de Caja Diaria y Respaldo QR
- [ ] Tarea 6-1: Crear vista de Apertura y Cierre de Caja (`/dashboard/admin/cash` o subsección) con base fija de 200 Bs, registro de gastos menores con recibo y desglose de ingresos (efectivo Bs/USD y pagos QR).
- [ ] Tarea 6-2: Campo obligatorio de comprobante / foto de QR en órdenes pagadas con transferencia para conciliar con extracto bancario.
- [ ] Tarea 6-3: Impresión / exportación de Estado de Cuenta (Kardex) por doctor o institución (semanal/mensual).
- [ ] 검증 6: Ejecutar `npm run build` y validar que todas las páginas compilen con código 0 y realizar commit en Git.

---

## 각 단계별 작업 중 필요하다면 PRD에 내용을 추가하거나 변경해라.
