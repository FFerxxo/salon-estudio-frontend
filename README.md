# Salón de Estudio Colaborativo en Tiempo Real — Frontend (`salon-estudio-frontend`)

Aplicación web en **React + TypeScript + Vite + Tailwind CSS + React Router** desplegada en **Vercel**.
Se comunica exclusivamente con `salon-estudio-api` mediante HTTP/REST (`VITE_API_URL`) y **nunca consulta Firestore directamente**.

## Rutas del mapa del sitio (Sprint 0 — TS-00)

- `/` — Inicio
- `/ingresar` — Ingresar (maqueta Sprint 0)
- `/registro` — Registro (maqueta Sprint 0)
- `/panel` — Panel principal (maqueta Sprint 0)
- `/perfil` — Perfil de usuario (maqueta Sprint 0)
- `/salas/:id` — Sala de estudio (maqueta Sprint 0)
- `/ayuda` — Ayuda y preguntas frecuentes
- `/base-tecnica` — Verificación de extremo a extremo contra `GET /api/app-info` (estados: cargando, error con botón «Reintentar», éxito)
- `*` — Página 404 diseñada

## Variables de entorno

Copia `.env.example` a `.env` y define la URL base de la API:

```bash
cp .env.example .env
```

- `VITE_API_URL`: URL base del backend (ej. `http://localhost:3000` en local o `https://<api>.onrender.com` en Vercel).

## Scripts disponibles

```bash
npm install
npm run dev      # Servidor de desarrollo Vite
npm run lint     # Verificación estática con ESLint
npm run build    # Compilación TypeScript + empaquetado de producción Vite
npm test         # Pruebas automatizadas con Vitest y Testing Library
```
