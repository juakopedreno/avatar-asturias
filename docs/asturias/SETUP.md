# Avatar Principado de Asturias — despliegue desde este fork

Este proyecto **reutiliza el mismo monorepo** que SHA/Torremolinos: panel de ingesta (`/admin/sources`), respuestas controladas, RAG, avatar Anam y demo (`/demo`). La rama `asturias` está personalizada para el Principado; **`main` sigue siendo SHA**.

## Por qué clonar / fork y no empezar de cero

| Ya incluido | Qué aporta |
|-------------|------------|
| `apps/web` + `/admin` | Ingesta PDF/web/API, contenido, alertas, usuarios |
| `apps/api` + `RagService` | Búsqueda en chunks + OpenAI + citas |
| Módulo `avatar` | Anam (hiperrealista) o mock |
| `stt` | Voz → texto (Whisper) |

Solo cambian **branding, prompts y datos** (otra base PostgreSQL, otras fuentes, otro avatar Anam).

## Publicar como repositorio nuevo en GitHub

1. En GitHub: **New repository** → p. ej. `avatar-asturias` (vacío, sin README).
2. En local (rama `asturias`):

```bash
cd AvatarTorremolinos
git checkout asturias
git remote add asturias https://github.com/TU_USUARIO/avatar-asturias.git
git push -u asturias asturias:main
```

3. **No subas** la rama `asturias` a `origin` si quieres mantener `citizen-connect-ai` solo para SHA.

## Despliegue (mismo patrón que SHA)

| Componente | Dónde |
|------------|--------|
| Frontend | Vercel → proyecto nuevo, rama `main` del repo Asturias |
| API | Railway/Render → Dockerfile en raíz |
| DB | PostgreSQL dedicado (`avatar_asturias`) |

Variables mínimas (ver `docs/asturias/env.example`).

## Puesta en marcha local

```bash
npm install
cp docs/asturias/env.example .env   # ajustar DATABASE_URL, OPENAI, ANAM_*
docker compose up -d            # Postgres local
npm run db:deploy -w @avatar/api
npm run db:seed -w @avatar/api
npm run dev:api
npm run dev:web
```

- Ciudadano: http://localhost:8080/demo  
- Admin: http://localhost:8080/admin (seed: `admin@asturias.es` / `password123`, MFA `123456`)

## Contenido del tema amplio

1. **Admin → Fuentes**: subir PDFs y URLs oficiales del Principado (normativa, ayudas, trámites, turismo, etc.).
2. **Admin → Respuestas controladas**: FAQs frecuentes publicadas.
3. **Admin → Entrenamiento**: tono institucional (la policy se guarda; ajustar también `ANAM_SYSTEM_PROMPT` y saludos en `rag.service.ts` si hace falta).
4. Probar en `/demo` preguntas dentro y fuera del corpus.

## Avatar hiperrealista (Anam)

1. Crear persona/avatar/voz en [Anam](https://anam.ai) acorde a imagen institucional.
2. Configurar en Railway:

```
AVATAR_RUNTIME=anam
ANAM_API_KEY=...
ANAM_PERSONA_ID=...          # o ANAM_AVATAR_ID + ANAM_VOICE_ID
ANAM_PERSONA_NAME=Asistente Principado de Asturias
ANAM_SYSTEM_PROMPT=Eres el asistente del Principado de Asturias...
```

## Mantener SHA intacto

```bash
git checkout main    # vuelves al código SHA
git checkout asturias  # trabajo Asturias
```

Cambios en `main` se pueden traer a Asturias con `git merge main` en la rama `asturias` (resolver conflictos de branding si los hay).
