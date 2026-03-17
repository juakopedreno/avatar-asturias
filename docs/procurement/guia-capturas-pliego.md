# Guía: capturas para el pliego

Esta guía indica **de dónde sacar exactamente** cada captura que pide el pliego (combinación tecnológica, esquemas y evidencias).

---

## 1. Esquema del stack tecnológico por capas

**Descripción en pliego:** *Diagrama simplificado con frontend, backend, base de datos, motor RAG, proveedor avatar, seguridad y módulos transversales.*

**Dónde sacarlo:** La especificación en texto para que generes el diagrama (con Claude u otra herramienta) está en **`docs/procurement/especificacion-diagramas-pliego.txt`** (Diagrama 1). Genera el diagrama según esa especificación y exporta a PNG o SVG.

---

## 2. Vista técnica de administración o módulo backend

**Descripción en pliego:** *Evidencia del enfoque modular, mostrando las principales áreas funcionales del sistema o una vista representativa del panel de administración.*

**Dónde sacarlo:**

1. Arranca la aplicación (front en local o en la URL de producción).
2. Inicia sesión en el **panel de administración** (ej.: `/admin` con usuario admin).
3. Haz la captura de pantalla en una de estas vistas (recomendado que se vea el **menú lateral** para mostrar las áreas funcionales):
   - **`/admin`** – Dashboard (resumen y métricas).
   - **`/admin/sources`** – Fuentes (modulo de fuentes de conocimiento).
   - **`/admin/content`** – Contenidos.
   - **`/admin/training`** – Entrenamiento / política.
   - **`/admin/audit`** – Auditoría (evidencia de trazabilidad).

**Recomendación:** Captura con el **sidebar visible** (Dashboard, Contenidos, Fuentes, Entrenamiento, Analítica, Auditoría, Usuarios, Configuración) para dejar claro el enfoque modular.

**Ruta en el repo:** La estructura del panel está en `apps/web/src/components/layout/AdminSidebar.tsx` y las páginas en `apps/web/src/pages/admin/`.

---

## 3. Esquema de arquitectura funcional

**Descripción en pliego:** *Diagrama de arquitectura de alto nivel con separación entre canal ciudadano, backend, repositorio de conocimiento, analítica, auditoría y proveedor de avatar.*

**Dónde sacarlo:** La especificación en texto está en **`docs/procurement/especificacion-diagramas-pliego.txt`** (Diagrama 2). Pásale esa parte a Claude (u otra herramienta) para generar el diagrama y exporta a PNG o SVG.

---

## 4. Exportación o bundle de datos y configuración

**Descripción en pliego:** *Evidencia del mecanismo de exportación estructurada de configuración, conocimiento, métricas y logs en formato estándar.*

**Dónde sacarlo:**

El sistema expone un **bundle de exportación** vía API (`GET /export/bundle`) que incluye: configuración (política de entrenamiento, ajustes), conocimiento (chunks RAG), métricas (analítica) y logs (auditoría), en JSON con `schemaVersion`, `exportedAt` y `manifest` con hashes.

**Opción A – Desde el panel de administración (recomendada):**

1. Entra en **Admin → Auditoría** (`/admin/audit`).
2. Pulsa el botón **“Exportar Logs”** (en la parte superior de la página).  
   Ese botón descarga el **bundle completo** (configuración, conocimiento, métricas y logs) en un JSON.
3. Para la captura puedes hacer **una o ambas**:
   - Captura del **panel de Auditoría** con el botón **“Exportar Logs”** visible.
   - Captura del **contenido del JSON** descargado (abre el archivo y haz una captura donde se vean las secciones principales: `schemaVersion`, `exportedAt`, `manifest`, `knowledge`, `config`, `metrics`, `logs`).

**Opción B – Desde la API:**

1. Con la API en marcha y un token de admin, llama a:
   ```http
   GET /export/bundle
   Authorization: Bearer <token>
   ```
2. Captura la respuesta JSON (por ejemplo en Postman/Insomnia o pestaña Network de DevTools), mostrando la estructura del bundle.

**Código de referencia:**  
- API: `apps/api/src/modules/export/export.service.ts` (método `exportBundle()`).  
- Front: botón en `apps/web/src/pages/admin/Audit.tsx` que llama a `apiGet('/export/bundle')` y descarga el JSON.

---

## Resumen rápido

| # | Captura                         | Dónde / Cómo                                                                 |
|---|---------------------------------|-------------------------------------------------------------------------------|
| 1 | Stack tecnológico por capas     | `docs/procurement/especificacion-diagramas-pliego.txt` (Diagrama 1) → Claude → PNG |
| 2 | Vista administración / modular  | App → `/admin` (o `/admin/sources`, `/admin/audit`, etc.) con sidebar visible |
| 3 | Arquitectura funcional          | `docs/procurement/especificacion-diagramas-pliego.txt` (Diagrama 2) → Claude → PNG |
| 4 | Exportación / bundle            | Admin → Auditoría → “Exportar Logs” + (opcional) captura del JSON descargado  |
