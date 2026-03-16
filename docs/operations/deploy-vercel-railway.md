# Despliegue demo: Vercel (frontend) + Railway (API + PostgreSQL)

Guía paso a paso para dejar la demo en vivo con **frontend en Vercel** y **API + base de datos en Railway**.

---

## Requisitos previos

- Cuenta en [Vercel](https://vercel.com) y en [Railway](https://railway.app)
- Repositorio del proyecto en **GitHub** (recomendado para conectar ambos)
- Variables de entorno locales listas (`.env`), sobre todo `JWT_SECRET`, `JWT_REFRESH_SECRET`, `OPENAI_API_KEY`, `ANAM_*` si usas avatar real

---

## Parte 1: Railway (API + PostgreSQL)

### 1.1 Crear proyecto y base de datos

1. Entra en [railway.app](https://railway.app) e inicia sesión (por ejemplo con GitHub).
2. **New Project** → **Deploy from GitHub repo** (o “Empty Project” si subes luego por CLI).
3. Si elegiste “Empty Project”:
   - **+ New** → **Database** → **PostgreSQL**.
   - Espera a que se cree; anota la **URL** que te muestra Railway (variable `DATABASE_URL`).
4. Si elegiste “Deploy from GitHub repo”:
   - Conecta el repositorio del proyecto.
   - En el mismo proyecto, **+ New** → **Database** → **PostgreSQL**.
   - La `DATABASE_URL` se suele inyectar automáticamente en el servicio que añadas después.

### 1.2 Añadir servicio API (Docker)

1. En el mismo proyecto Railway: **+ New** → **GitHub Repo** (o **Empty Service** si despliegas por CLI).
2. Si es **GitHub Repo**: selecciona el repo y deja **Root Directory** vacío (raíz del monorepo).
3. En **Settings** del servicio:
   - **Build**:  
     - **Builder**: **Dockerfile**.  
     - **Dockerfile path**: `Dockerfile` (raíz del repo).  
     - **Watch Paths**: opcional `apps/api`, `packages`, `Dockerfile`, `package.json`, `package-lock.json`.
   - **Deploy**:  
     - **Start Command**: no hace falta si el `Dockerfile` ya lleva `CMD` (prisma migrate + node).  
     - **Restart Policy**: Restart (por defecto).
4. **Variables** (pestaña **Variables** del servicio):
   - Railway suele crear `DATABASE_URL` si el Postgres está en el mismo proyecto; si no, **Add Variable** y pega la URL de PostgreSQL.
   - Añade el resto (mismas que en tu `.env`), por ejemplo:

   | Variable | Descripción | Ejemplo |
   |----------|-------------|--------|
   | `DATABASE_URL` | URL de PostgreSQL (Railway la puede inyectar) | `postgresql://user:pass@host:5432/railway` |
   | `JWT_SECRET` | Secreto para access token | Valor largo y aleatorio |
   | `JWT_REFRESH_SECRET` | Secreto para refresh token | Otro valor largo y aleatorio |
   | `PORT` | No suele hacer falta; Railway lo inyecta | — |
   | `CORS_ORIGIN` | Origen del frontend (Vercel) | `https://tu-proyecto.vercel.app` |
   | `NODE_ENV` | Entorno | `production` |
   | `OPENAI_API_KEY` | Para RAG y Whisper | `sk-...` |
   | `AVATAR_RUNTIME` | `anam` o `mock` | `anam` |
   | `ANAM_API_KEY` | Si usas Anam | ... |
   | `ANAM_PERSONA_ID` / `ANAM_AVATAR_ID` | Según tu configuración | ... |
   | (resto de `ANAM_*`, `STT_OPENAI_MODEL`, etc.) | Igual que en `.env` | ... |

5. **Deploy**: al guardar o hacer push al repo, Railway construye la imagen con el `Dockerfile` y despliega. Revisa **Deployments** y **Logs** por si falla `prisma migrate deploy` o el arranque.

### 1.3 Obtener la URL pública de la API

1. En el servicio de la API: **Settings** → **Networking** → **Generate Domain** (o **Public Networking**).
2. Te asignan una URL tipo: `https://avatar-torremolinos-api.up.railway.app`.
3. **Cópiala**; la usarás en Vercel como base de la API. La base para el frontend es esa URL **sin** el sufijo `/api` (el front ya añade `/api` en las peticiones). Ejemplo: si la URL del servicio es `https://xxx.up.railway.app`, en el front la base será `https://xxx.up.railway.app` y las llamadas irán a `https://xxx.up.railway.app/api/...`.

### 1.4 Comprobar que la API responde

- Health: `https://TU-DOMINIO-RAILWAY.app/api/health/live` (o `/api/health/ready`).
- Debe responder 200. Si no, revisa logs en Railway (migraciones, `DATABASE_URL`, secretos).

---

## Parte 2: Vercel (frontend)

### 2.1 Conectar el repositorio

1. Entra en [vercel.com](https://vercel.com) e inicia sesión (por ejemplo con GitHub).
2. **Add New** → **Project** → importa el mismo repositorio del monorepo.

### 2.2 Configurar el proyecto (monorepo)

1. **Root Directory**: deja **raíz** (o si Vercel te pide, no cambies a `apps/web` hasta que pruebes; ver siguiente paso).
2. **Framework Preset**: **Vite** (Vercel lo detecta si el build está en `apps/web`).
3. **Build and Output Settings**:
   - Si el repo root tiene solo el monorepo y el front está en `apps/web`:
     - **Root Directory**: `apps/web`.
     - **Build Command**: `npm run build` (o `npx vite build`).
     - **Output Directory**: `dist`.
     - **Install Command**: desde raíz del monorepo suele ser necesario instalar todo; en ese caso:
       - Deja **Root Directory** en la **raíz** del repo.
       - **Build Command**: `npm run build -w @avatar/web` (o `cd apps/web && npm ci && npm run build` si prefieres).
       - **Output Directory**: `apps/web/dist`.
   - Si **Root Directory** = `apps/web`:
     - **Install Command**: `npm install` (solo instala de `apps/web`; puede fallar si hay dependencias de workspace). Si falla, usa raíz como arriba.
     - **Build Command**: `npm run build`.
     - **Output Directory**: `dist`.

Recomendación: **Root Directory = raíz del repo**. El repo incluye un `vercel.json` en la raíz que ya define `buildCommand`, `outputDirectory` e `installCommand` para el monorepo; si dejas la raíz como Root Directory, Vercel usará esa configuración y no tendrás que rellenar a mano Build/Output/Install.

### 2.3 Variable de entorno: URL de la API

1. **Settings** → **Environment Variables**.
2. Añade:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://TU-DOMINIO-RAILWAY.app/api`  
     (sustituye por la URL real del servicio API en Railway; el front ya concatena rutas a esta base, así que debe ser la base hasta `/api`).
3. Comprueba en la documentación del front: en `api.ts` se usa `VITE_API_BASE_URL` y se concatena el `path`; si el path es `/auth/login`, la petición va a `VITE_API_BASE_URL + "/auth/login"` = `https://xxx/api/auth/login`. Por tanto **Value** = `https://TU-DOMINIO-RAILWAY.app/api`.
4. Aplica a **Production** (y Preview si quieres que los previews usen la misma API).

### 2.4 Desplegar

1. **Deploy** (o push a la rama conectada).
2. Cuando termine, tendrás una URL tipo: `https://avatar-torremolinos.vercel.app`.

### 2.5 CORS: volver a Railway

1. En Railway, en las variables del **servicio API**, pon o actualiza:
   - `CORS_ORIGIN` = `https://avatar-torremolinos.vercel.app` (o la URL que te haya dado Vercel).
2. Si tienes varios orígenes (por ejemplo también el admin en otro dominio): `CORS_ORIGIN` = `https://avatar-torremolinos.vercel.app,https://otro-dominio.vercel.app`.
3. Redeploy del servicio en Railway para que cargue la nueva variable.

---

## Resumen de URLs

| Dónde | URL / Variable |
|-------|-----------------|
| Frontend (ciudadano + admin) | `https://TU-PROYECTO.vercel.app` |
| API (health, auth, etc.) | `https://TU-SERVICIO.up.railway.app` |
| En Vercel: `VITE_API_BASE_URL` | `https://TU-SERVICIO.up.railway.app/api` |
| En Railway: `CORS_ORIGIN` | `https://TU-PROYECTO.vercel.app` |

---

## Comprobaciones rápidas

1. **Health**: `https://TU-API-RAILWAY.app/api/health/live` → 200.
2. **Front**: abrir `https://TU-VERCEL.app`; login admin o pantalla avatar; que no salga error de red (CORS o “Failed to fetch”).
3. **Login**: en `/admin` (o la ruta de login), iniciar sesión y ver que las peticiones van a la URL de Railway.

---

## Problemas frecuentes

- **CORS**: 403 o “blocked by CORS”. Solución: `CORS_ORIGIN` en Railway exactamente igual que la URL del front (con `https://`, sin barra final).
- **API 404**: comprobar que en Vercel `VITE_API_BASE_URL` es la base hasta `/api` (ej. `https://xxx.railway.app/api`).
- **Build Vercel falla**: si con Root = `apps/web` falla el install, usar Root = raíz, Build = `npm run build -w @avatar/web`, Output = `apps/web/dist`, Install = `npm ci`.
- **Railway: “Application failed”**: revisar logs; suele ser `DATABASE_URL` incorrecta, migraciones fallidas o falta `JWT_SECRET` / `JWT_REFRESH_SECRET`.

---

## Opción Render en lugar de Railway

Si usas **Render**:

1. **New** → **Web Service**; conecta el repo.
2. **Build**: Docker; Dockerfile path = `Dockerfile` (raíz).
3. **New** → **PostgreSQL** en el mismo “team”; copia **Internal Database URL** (o External si el backend está fuera de Render).
4. En el Web Service, **Environment**: añade `DATABASE_URL` (y el resto como en Railway). Render inyecta `PORT`.
5. **CORS_ORIGIN** = URL de Vercel.
6. En Vercel, `VITE_API_BASE_URL` = `https://TU-SERVICIO.onrender.com/api`.

Los pasos son equivalentes; solo cambian nombres de menús y dominios (`.onrender.com` vs `.railway.app`).
