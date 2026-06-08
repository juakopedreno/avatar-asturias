# Avatar Principado de Asturias

Plataforma de asistente virtual con avatar hiperrealista (Anam), RAG sobre fuentes oficiales y backoffice de ingesta de conocimiento.

> **Rama `asturias`**: variante para el Principado de Asturias.  
> El proyecto SHA Wellness vive en la rama **`main`** del repositorio original (`citizen-connect-ai`).

## Workspaces

- `apps/web`: frontend React — demo ciudadana (`/demo`) + panel admin (`/admin`)
- `apps/api`: backend NestJS — RAG, avatar, STT, fuentes, usuarios
- `packages/shared-types`: contratos compartidos
- `docs/asturias/SETUP.md`: guía de despliegue y publicación en repo propio

## Inicio rápido

```bash
npm install
cp .env.asturias.example .env   # ajustar variables
docker compose up -d
npm run db:deploy -w @avatar/api
npm run db:seed -w @avatar/api
npm run dev:api
npm run dev:web
```

- Demo: http://localhost:8080/demo  
- Admin: http://localhost:8080/admin (`admin@asturias.es` / `password123`, MFA `123456`)

## Panel de ingesta (mismo que SHA)

1. **Fuentes** — PDF, web, API → chunks RAG  
2. **Respuestas controladas** — FAQs publicadas  
3. **Alertas** — avisos por keywords  
4. **Entrenamiento** — política conversacional (guardada en DB)  
5. **Demo** — probar avatar + chat con citas

## Publicar como repositorio independiente

Ver `docs/asturias/SETUP.md` o ejecutar:

```bash
chmod +x scripts/publish-asturias-repo.sh
./scripts/publish-asturias-repo.sh https://github.com/TU_USUARIO/avatar-asturias.git
```

## Comandos

```bash
npm run dev:web
npm run dev:api
npm run lint
npm run test
npm run build
```
