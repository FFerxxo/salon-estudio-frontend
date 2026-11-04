# Salón de Estudio Colaborativo en Tiempo Real — Frontend (`salon-estudio-frontend`)

Aplicación web en **React + TypeScript + Vite + Tailwind CSS + React Router** desplegada en **Vercel**.
Se comunica exclusivamente con `salon-estudio-backend` mediante HTTP/REST (`VITE_API_URL`) y **nunca consulta Firestore directamente**.

## Rutas del mapa del sitio (Sprint 0 — TS-00 y TS-04)

- `/` — Inicio
- `/ingresar` — Ingresar (maqueta Sprint 0)
- `/registro` — Registro (maqueta Sprint 0)
- `/panel` — Panel principal (maqueta Sprint 0)
- `/perfil` — Perfil de usuario (maqueta Sprint 0)
- `/salas/:id` — Sala de estudio (maqueta Sprint 0)
- `/ayuda` — Ayuda y preguntas frecuentes
- `/base-tecnica` — Verificación de extremo a extremo contra `GET /api/app-info` (estados: cargando, error con botón «Reintentar», éxito)
- `*` — Página 404 diseñada

## Variables de entorno y despliegue

Copia `.env.example` a `.env` y define la URL base de la API:

```bash
cp .env.example .env
```

- `VITE_API_URL`: URL base del backend (ej. `http://localhost:3000` en local o la URL del servicio en Render para producción).
- **En Vercel (Producción):** Configurar la variable de entorno `VITE_API_URL` con el dominio público del backend en Render (ej. `https://salon-estudio-backend.onrender.com`).

## Scripts disponibles

```bash
npm install
npm run dev        # Servidor de desarrollo Vite
npm run lint       # Verificación estática con ESLint
npm run build      # Compilación TypeScript + empaquetado Vite
npm test           # Pruebas unitarias y de accesibilidad con Vitest
npm run test:e2e   # Pruebas de navegación por teclado en Chromium con Playwright
```

## Ejecución con Docker

### Construcción individual de la imagen

```bash
docker build -t salon-estudio-frontend .
docker run -p 5173:80 salon-estudio-frontend
```

### Ejecución conjunta con Docker Compose

El frontend y el backend están diseñados para clonarse lado a lado en el mismo directorio:

```text
Mini Proyecto 2/
  salon-estudio-backend/
  salon-estudio-frontend/
```

Para levantar ambos servicios en simultáneo, dirígete a `salon-estudio-backend` y ejecuta:

```bash
cd ../salon-estudio-backend
docker compose up --build
```
