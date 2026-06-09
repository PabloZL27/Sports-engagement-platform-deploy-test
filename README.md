# Tennessee Titans Sports Engagement Platform

A comprehensive sports engagement platform dedicated to Tennessee Titans fans and American football enthusiasts. Connect with fellow fans, track game statistics, and immerse yourself in the ultimate Titans community experience.

## Overview

The Titans Sports Engagement Platform is designed to bring fans closer to their favorite NFL team through real-time updates, interactive features, and a vibrant community. Whether you're tracking live game stats, analyzing big plays, or connecting with other members of Titan Nation, this platform is your one-stop destination for everything related to the Tennessee Titans.

## Features

### Live Game Experience
- **Real-time community chats** - Follow every touchdown, field goal, and defensive stop as it happens
- **Player draft selection** - Detailed breakdown of every drive and crucial moment
- **Player Statistics** - Track individual and team performance metrics throughout the season
- **Game Highlights** - Watch and share key plays and memorable moments

## Technology Stack

- **Frontend**: React.js, Next.js, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: SQL
- **Real-time**: WebSockets
- **Authentication**: OAuth 2.0
- **Hosting**: Vercel / AWS

---

**Titan Up!** ⚔️🏈

*Built with 💙 by Titans fans, for Titans fans

------------------------------------------------------------------------------------------------------------------
------------------------------------------------------------------------------------------------------------------
------------------------------------------------------------------------------------------------------------------

# Guía de instalación, ejecución local y despliegue

Instrucciones para configurar, ejecutar y desplegar la **Tennessee Titans Sports Engagement Platform**.

## Tabla de contenidos

- [Arquitectura](#arquitectura)
- [Requisitos previos](#requisitos-previos)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Instalación](#instalación)
- [Configuración de variables de entorno](#configuración-de-variables-de-entorno)
- [Ejecución local](#ejecución-local)
- [Despliegue](#despliegue)
- [CI/CD](#cicd)
- [Solución de problemas](#solución-de-problemas)
- [Documentación adicional](#documentación-adicional)

## Arquitectura

La plataforma es un monorepo con arquitectura de microservicios:

| Capa | Tecnología | Ubicación |
|------|------------|-----------|
| Frontend | React 19, Vite, Tailwind CSS, TypeScript | `apps/web` |
| API Gateway | Nginx (proxy inverso y CORS) | `gateway` |
| Microservicios | Node.js / Express | `services/*` |
| Base de datos | PostgreSQL (vía Supabase o instancia gestionada) | — |
| Autenticación | Supabase Auth | — |
| Frontend (staging/prod) | Vercel | `apps/web` |
| Backend (staging) | Coolify + Docker Compose en GCP | `infra/` |

El gateway expone todos los servicios en un único punto de entrada (`:8081` en local). El frontend en desarrollo usa el proxy de Vite para evitar problemas de CORS.

### Microservicios

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| `community-service` | 4001 | Publicaciones y comunidad |
| `matches-service` | 4002 | Partidos y estadísticas |
| `rooms-service` | 4003 | Salas de chat en vivo |
| `analytics-service` | 4004 | Analítica |
| `store-service` | 4005 | Tienda (Stripe) |
| `profile-service` | 4006 | Perfiles de usuario |
| `tweets-service` | 4007 | Feed de tweets |
| `history-service` | 4008 | Historial del equipo |
| `cards-service` | 4009 | Colección de cartas |
| `offseason-service` | 4010 | Contenido de pretemporada |
| `news-service` | 4011 | Noticias (NewsAPI) |
| `feedback-service` | 4012 | Feedback y moderación |
| `admin-store-service` | 4013 | Administración de tienda |
| `war-room-service` | 4014 | War Room (trades simulados) |
| `dashboard-service` | 4015 | Panel de administración |
| `reports-service` | 4016 | Reportes de comunidad |

## Requisitos previos

Instala las siguientes herramientas antes de comenzar:

- **Node.js 20** — requerido por el frontend y los microservicios
- **npm** — gestor de paquetes (incluido con Node.js)
- **Docker** y **Docker Compose v2** — para ejecutar el backend y el gateway
- **PostgreSQL** accesible — localmente vía túnel SSH, Supabase self-hosted o instancia gestionada
- **Cuenta de Supabase** — para autenticación y almacenamiento
- *(Opcional)* Claves de APIs externas: Stripe, NewsAPI, OpenAI, ElevenLabs, GetXAPI

## Estructura del repositorio

```
Sports-engagement-platform/
├── apps/
│   └── web/                  # Frontend React + Vite
├── gateway/                  # Nginx API Gateway
├── services/                 # Microservicios Node.js
│   ├── community-service/
│   ├── matches-service/
│   ├── profile-service/
│   └── ...                   # (16 servicios en total)
├── infra/
│   ├── docker-compose.yml           # Compose base (portable)
│   ├── docker-compose.local.yml     # Overrides para desarrollo local
│   ├── docker-compose.tec.yml         # Overrides para entorno Tec legacy
│   ├── .env.example                 # Plantilla de variables de entorno
│   ├── .env.local.example           # Plantilla para desarrollo local
│   └── .env.production.example      # Plantilla para producción
└── .github/workflows/        # CI/CD (PR Checks, Deploy Staging)
```

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/<tu-org>/Sports-engagement-platform.git
cd Sports-engagement-platform
```

### 2. Instalar dependencias del frontend

```bash
cd apps/web
npm install
cd ../..
```

### 3. Instalar dependencias de un microservicio (solo si lo ejecutas fuera de Docker)

```bash
cd services/<nombre-del-servicio>
npm install
```

> En la mayoría de los casos no necesitas instalar dependencias de los servicios manualmente: Docker Compose las instala al construir las imágenes.

### 4. Configurar variables de entorno

Copia las plantillas de ejemplo y rellena los valores reales:

```bash
# Variables de infraestructura (backend)
cp infra/.env.local.example infra/.env

# Variables del frontend
cp apps/web/.env.example apps/web/.env.local
```

Consulta la sección [Configuración de variables de entorno](#configuración-de-variables-de-entorno) para el detalle de cada variable.

## Configuración de variables de entorno

### Backend (`infra/.env`)

Usa `infra/.env.local.example` como referencia para desarrollo local. Las variables principales son:

| Variable | Descripción |
|----------|-------------|
| `*_DB_URL` | URLs de conexión PostgreSQL por servicio (ej. `PROFILE_DB_URL`, `MATCHES_DB_URL`) |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Clave pública (anon) de Supabase |
| `SUPABASE_SERVICE_KEY` | Clave de servicio de Supabase |
| `SUPABASE_DOCKER_NETWORK` | Nombre de la red Docker externa de Supabase |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secreto del webhook de Stripe |
| `FRONTEND_URL` | URL pública del frontend (para CORS y redirecciones) |
| `NEWS_API_KEY` | Clave de NewsAPI |
| `OPENAI_API_KEY` | Clave de OpenAI (moderación de feedback) |
| `GETXAPI_KEY` | Clave de GetXAPI (tweets) |

> **Importante:** nunca subas archivos `.env` con secretos reales al repositorio.

### Frontend (`apps/web/.env.local`)

| Variable | Descripción | Valor recomendado en local |
|----------|-------------|----------------------------|
| `VITE_API_BASE_URL` | URL base de la API | Dejar vacío (usa proxy de Vite) |
| `VITE_PROXY_TARGET` | Destino del proxy de Vite | `http://localhost:8081` (por defecto) |
| `VITE_SUPABASE_URL` | URL de Supabase | URL de tu proyecto |
| `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Clave anon de Supabase | Clave de tu proyecto |
| `VITE_SUPABASE_FEEDBACK_BUCKET` | Bucket de imágenes de feedback | `feedback-images` |
| `VITE_ELEVENLABS_AGENT_ID` | ID del agente de voz ElevenLabs | *(opcional)* |
| `VITE_ADMIN_STORE_URL` | Ruta del admin store | `/admin-store` |
| `VITE_CHAT_DEV_USER_ID` | UUID de usuario para chat en dev | UUID válido *(opcional)* |

## Ejecución local

### Paso 1: Levantar el backend con Docker Compose

Asegúrate de tener PostgreSQL accesible y la red Docker de Supabase creada. Luego, desde la raíz del repositorio:

```bash
docker compose \
  --env-file infra/.env \
  -f infra/docker-compose.yml \
  -f infra/docker-compose.local.yml \
  up -d --build
```

Esto levanta el gateway y los 16 microservicios. El gateway queda disponible en **http://localhost:8081**.

Para verificar que los servicios están activos:

```bash
curl http://localhost:8081/matches/health
```

Para detener los contenedores:

```bash
docker compose \
  --env-file infra/.env \
  -f infra/docker-compose.yml \
  -f infra/docker-compose.local.yml \
  down
```

### Paso 2: Levantar el frontend

En otra terminal:

```bash
cd apps/web
npm run dev
```

El frontend estará disponible en **http://localhost:5173**. Las peticiones a `/api/*` se redirigen automáticamente al gateway en `:8081` mediante el proxy de Vite, sin necesidad de configurar CORS.

### Paso 3: Validar la configuración de Compose (opcional)

```bash
docker compose \
  --env-file infra/.env \
  -f infra/docker-compose.yml \
  -f infra/docker-compose.local.yml \
  config
```

### Ejecutar un servicio individual (sin Docker)

Si necesitas depurar un microservicio de forma aislada:

```bash
cd services/<nombre-del-servicio>
npm install
# Exporta las variables de entorno necesarias (PORT, *_DB_URL, etc.)
npm start
```

## Despliegue

### Staging — Frontend (Vercel)

El frontend de staging se despliega automáticamente en **Vercel** al hacer push a la rama conectada al proyecto.

1. Conecta el repositorio en [Vercel](https://vercel.com).
2. Configura el directorio raíz del proyecto como `apps/web`.
3. Define las variables de entorno `VITE_*` en el panel de Vercel (usa los valores de staging de Supabase y la URL pública de la API).
4. En staging, `VITE_API_BASE_URL` debe apuntar a la URL pública del gateway (ej. `https://api-staging.example.com`).

El archivo `apps/web/vercel.json` configura rewrites SPA para que React Router funcione correctamente.

### Staging — Backend (Coolify)

El backend de staging se despliega mediante **Coolify** en una VM de GCP. El despliegue se dispara automáticamente al hacer push a `main` o manualmente desde GitHub Actions.

**Secrets requeridos en GitHub** (Settings → Secrets and variables → Actions):

| Secret | Descripción |
|--------|-------------|
| `COOLIFY_DEPLOY_WEBHOOK_URL` | URL del webhook de despliegue en Coolify |
| `COOLIFY_API_TOKEN` | Token de API de Coolify |
| `STAGING_API_BASE_URL` | URL pública del API gateway de staging |

**Flujo de despliegue:**

1. Push a `main` (o ejecución manual del workflow `Deploy Staging Backend`).
2. GitHub Actions valida los secrets y dispara el webhook de Coolify.
3. Coolify construye y despliega los contenedores usando Docker Compose.
4. El workflow ejecuta smoke tests contra `GET /matches/health` (y endpoints opcionales).

Para redesplegar manualmente: GitHub → Actions → **Deploy Staging Backend** → **Run workflow**.

### Producción

Para producción, usa el compose base con un archivo de entorno dedicado:

```bash
docker compose \
  --env-file infra/.env.production \
  -f infra/docker-compose.yml \
  up -d --build
```

Usa `infra/.env.production.example` como plantilla. Sustituye las URLs de base de datos, claves de Supabase, Stripe y demás secretos por los valores del entorno de producción.

> El despliegue a producción aún no tiene un workflow de CD automatizado. Consulta `infra/staging-migration-runbook.md` para el estado actual de la infraestructura.

### Entorno Tec (legacy)

Si despliegas en el entorno Tec con red Docker externa de Supabase:

```bash
docker compose \
  --env-file infra/.env \
  -f infra/docker-compose.yml \
  -f infra/docker-compose.tec.yml \
  up -d --build
```

Usa `infra/.env.tec.example` como referencia de variables.

## CI/CD

| Workflow | Trigger | Qué valida |
|----------|---------|------------|
| **PR Checks** | Pull requests, manual | Build del frontend, lint/build de servicios, validación de Docker Compose, contrato de variables de entorno |
| **Deploy Staging Backend** | Push a `main`, manual | Despliegue en Coolify + smoke tests de la API |

Los PR Checks requieren Node.js 20 y Docker. Asegúrate de que tu rama pase estos checks antes de fusionar a `main`.

## Solución de problemas

### El frontend no puede conectar con la API

- Verifica que el gateway esté corriendo: `curl http://localhost:8081/matches/health`
- En local, deja `VITE_API_BASE_URL` vacío para usar el proxy de Vite.
- Si el gateway está en otra máquina, define `VITE_PROXY_TARGET` con su URL.

### Error de red Docker al levantar Compose

El compose base espera una red Docker externa definida en `SUPABASE_DOCKER_NETWORK`. Asegúrate de que esa red exista:

```bash
docker network ls | grep <nombre-de-tu-red>
```

### Los servicios no conectan a PostgreSQL

- En local, `docker-compose.local.yml` usa `host.docker.internal:15432` para alcanzar PostgreSQL en el host.
- Verifica que el túnel SSH o la instancia de Postgres esté activa y accesible en ese puerto.
- Revisa que las credenciales en `infra/.env` coincidan con las de tu base de datos.

### CORS en el navegador

El gateway configura CORS para `localhost:5173` y dominios de staging. Si usas otro puerto u origen, actualiza `gateway/nginx.conf`.

### Reconstruir imágenes tras cambios en el código

```bash
docker compose \
  --env-file infra/.env \
  -f infra/docker-compose.yml \
  -f infra/docker-compose.local.yml \
  up -d --build --force-recreate
```

## Documentación adicional

- [`infra/README.md`](infra/README.md) — flujos de Docker Compose por entorno
- [`infra/staging-migration-runbook.md`](infra/staging-migration-runbook.md) — runbook de despliegue en staging
- [`apps/web/.env.example`](apps/web/.env.example) — variables del frontend con comentarios detallados
- [`infra/.env.local.example`](infra/.env.local.example) — variables de backend para desarrollo local

