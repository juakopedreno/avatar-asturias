# Integración del documento actualizado «CoVa-systemprompt-General RAG»

Documento recibido: `CoVa-systemprompt-General RAG.docx`  
Sustituye al PDF anterior `CoVA_Avatar_Feria_Prompt_RAG (1).pdf` (mismo contenido con actualizaciones de fase, normativa y anexos).

---

## Qué cambia respecto al PDF viejo

- Fase del proyecto actualizada (licitación 2026, pilotos 2027).
- Nuevas referencias normativas (Decreto IA Principado, accesibilidad, etc.).
- Anexo «Entorno de atención y asistencia proactiva con la ciudadanía».

**Sigue faltando** (por eso mantenemos el suplemento):
- Cobán / errores de voz
- Fuera de ámbito sin «no tengo información»
- Soberanía tecnológica / DGX (detalle)
- Lenguaje inclusivo explícito

---

## Paso a paso en Anam Lab

### 1. Exportar el docx a PDF (recomendado)

Anam suele ir mejor con PDF:
- Abre `CoVa-systemprompt-General RAG.docx` en Word/Pages
- Exportar como PDF → `CoVa-systemprompt-General RAG.pdf`

### 2. Actualizar la carpeta «Liv Knowledge»

| Acción | Archivo |
|--------|---------|
| **Eliminar** (o sustituir) | `CoVA_Avatar_Feria_Prompt_RAG (1).pdf` |
| **Subir** (nuevo) | `CoVa-systemprompt-General RAG.pdf` |
| **Mantener** | `CoVA_FAQ_ciudadania_ampliada_SocialAsturias (1).pdf` |
| **Mantener** (tercer doc) | `CoVA_Feria_KB_Suplemento_Anam.md` o su PDF |

Quedan **3 documentos** en la carpeta.

### 3. Enlazar la carpeta al agente

En Knowledge library → seleccionar **Liv Knowledge** → debe quedar **«1 of 1 folder linked»** → **Done**.

Sin esto la KB no se usa.

### 4. System prompt del agente

**No pegues todo el documento** en el prompt.

Copia el contenido de: `docs/asturias/CoVA_Anam_System_Prompt_Feria_v2.txt`

(Es la Parte A resumida + reglas de Cobán, fuera de ámbito e inclusivo.)

Pégalo en Anam Lab → agente embed → **System prompt** → guardar.

### 5. Probar

https://avatar-asturias-api.vercel.app/feria/embed

---

## Para `/feria/live` (admin + API)

| Dónde | Qué hacer |
|-------|-----------|
| **Admin feria** | Subir el nuevo PDF/docx como fuente, sustituyendo `Feria_Prompt` / RAG anterior. Re-sincronizar ingesta. |
| **API (Railway)** | Los cambios de código (Cobán, inclusivo, fuera de ámbito) requieren deploy — pendiente de push si aún no está en producción. |

---

## Resumen visual

```
ANAM LAB
├── System prompt  →  CoVA_Anam_System_Prompt_Feria_v2.txt  (comportamiento)
└── Knowledge (carpeta enlazada)
    ├── CoVa-systemprompt-General RAG.pdf     (contenido factual Parte B)
    ├── CoVA_FAQ_ciudadania_....pdf           (servicios sociales)
    └── CoVA_Feria_KB_Suplemento_Anam.pdf   (Cobán, fuera ámbito, soberanía)
```

---

## ¿Quién hace qué?

| Tarea | Responsable |
|-------|-------------|
| Exportar docx → PDF y subir a Anam | Tú |
| Enlazar carpeta + pegar prompt v2 | Tú |
| Subir suplemento (si no lo hiciste) | Tú |
| Re-ingestar en admin feria | Tú |
| Deploy API live | Nosotros (commit + push) |
