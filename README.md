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

## Identidad y autenticación (Sprint 1 — US-01, US-02, US-03)

- `/registro` — Registro manual (nombres, apellidos, nombre de usuario, avatar, correo y contraseña) y «Continuar con Google».
- `/registro/usuario` — Paso obligatorio para elegir el nombre de usuario después de Google (no se puede omitir).
- `/ingresar` — Ingreso con correo y contraseña o con Google; mensaje genérico si las credenciales no coinciden.
- Rutas privadas (`/panel`, `/perfil`, `/salas/:id`): sin sesión llevan a `/ingresar` y, al ingresar, regresan a la ruta pedida.
- «Cerrar sesión» está en el menú del avatar del encabezado.

El navegador solo usa Firebase Authentication para iniciar sesión. Los perfiles se crean y consultan en la API
(`GET /api/usuarios/disponible`, `POST /api/usuarios`, `GET /api/usuarios/me`) enviando el ID token de Firebase
en el encabezado `Authorization: Bearer`.

## Variables de entorno y despliegue

Copia `.env.example` a `.env` y define la URL base de la API:

```bash
cp .env.example .env
```

- `VITE_API_URL`: URL base del backend (ej. `http://localhost:3000` en local o la URL del servicio en Render para producción).
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`: configuración de la app web de Firebase (Consola de Firebase → Configuración del proyecto → Tus apps → Web). En Firebase Authentication deben estar habilitados los proveedores Correo/contraseña y Google, y el dominio de Vercel debe estar en «Dominios autorizados».
- **En Vercel (Producción):** Configurar `VITE_API_URL` y las cuatro variables `VITE_FIREBASE_*`; `VITE_API_URL` con el dominio público del backend en Render (en producción: `https://salon-estudio-backend-ndzf.onrender.com`).

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
