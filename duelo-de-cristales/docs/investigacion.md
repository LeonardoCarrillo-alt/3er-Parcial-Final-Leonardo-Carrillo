# Duelo de Cristales — Investigación técnica

Documento de investigación sobre las herramientas usadas: configuración headless/visual de Playwright, despliegue en Render (variables, puertos, webhooks), la decisión sobre Docker, y los puertos y variables de entorno del proyecto.

---

## 1. Playwright

### Configuración headless / visual

- Los tests E2E se ejecutan **headless** por defecto (navegador Chromium sin ventana), lo que permite correrlos en CI y en la máquina de desarrollo sin depender de una pantalla.
- La suite se arranca ejecutando `npx playwright test --project=chromium` desde la raíz del workspace.
- En desarrollo, Playwright levanta **automáticamente** el backend y el frontend (configurado en `playwright.config.ts` con `webServer`) y usa `http://localhost:3001` como base.
- Para ver el juego en ventana (inspección visual), existe el modo **headed**: `npx playwright test --project=chromium --headed`.
- También se usan **screenshots** (Playwright `page.screenshot()`) como verificación visual de sprites, tamaño de unidades y lay-out del HUD, aunque no forman parte de la suite final.

### Modos de reporte

| Reporte | Cuándo se usa | Archivo |
|---|---|---|
| `list` | Terminal en desarrollo | stdout |
| `html` | Interactivo, con trazas y videos para depurar fallos | `playwright-report/` |
| `junit` | Integración con CI (agrupable por job) | `test-results/junit.xml` |

- En CI el `html` se publica como **artifact** en GitHub Actions junto con `test-results/`.
- Variables de entorno usadas por la config:
  - `BASE_URL`: url base del juego (en CI apunta al servidor de producción local en `http://localhost:3001`).
  - `PW_SKIP_SERVERS=1`: en CI, Playwright **no levanta** los servidores (el job ya los inició explícitamente) y solo corre los specs contra la url dada.

---

## 2. Render

Render es el PaaS elegido para producción (plan free).

### Build y start

- **Root Directory**: `duelo-de-cristales`
- **Build Command**:

  ```bash
  npm install --prefix client && npm install --prefix server && npm run build --prefix client && npm run build --prefix server
  ```

- **Start Command**:

  ```bash
  NODE_ENV=production node server/dist/index.js
  ```

### Variables de entorno

- `NODE_ENV=production`: hace que Express sirva los estáticos de `client/dist` (UI + API en un solo servicio).
- **Puerto**: el servidor usa `process.env.PORT ?? 3001` — Render inyecta `PORT` automáticamente y el servidor escucha en el puerto asignado por la plataforma.

### Webhooks (deploy hooks)

- Render genera una **URL de deploy hook** en *Settings → Deploy Hook*. Al hacer `POST` (curl) a esa URL, Render redepliega la última versión del repo sin intervención manual.
- Se usa en CI: el job `deploy` del workflow lambda a `https://api.render.com/deploy/srv-...?key=...` (guardada en el secret `RENDER_DEPLOY_HOOK_URL`) tras pasar lint + E2E. Esto permite **despliegue automático** al hacer push a `main` sin depender solo del auto-deploy de Render.

### Notas del plan free

- El servicio **duerme** tras ~15 min sin tráfico y hace **cold start** (30–50 s en el primer request).
- El estado en memoria (partidas) se pierde al dormir/reiniciar (ver `docs/decisiones.md`).
- URL pública: `https://threeer-parcial-final-leonardo-carrillo.onrender.com` (health check 200 en `/api/health`).

---

## 3. Docker — por qué se descartó

**Situación**: se evaluó envolver frontend+backend en una imagen Docker para el despliegue.

**Decisión final**: **no se usa Docker**; Render compila el proyecto directamente con los comandos de build/start de Node.

**Justificación**:
- Render soporta nativamente Web Services de Node con comandos `install/build/start` y variables de entorno, sin necesidad de un Dockerfile.
- El proyecto es un workspace npm simple (client + server); esto hace el despliegue **más simple y reproducible** que agregar una imagen.
- Evita tamaño y tiempo de build extra, y complejidad de prácticas de Docker (build stages, cache de capas) que no aportan al requisito.
- CI/CD se mantiene igual: los artifacts son los mismos `dist/` tanto en local, CI como en Render.

**Riesgo residual**: si en el futuro se quisiera liberar la misma imagen en otro proveedor, habría que crear el Dockerfile; hoy no hay necesidad porque Render cubre CI + hosting con la misma fuente.

---

## 4. Puertos y variables de entorno del proyecto

### Puertos

| Servicio | Puerto | Detalle |
|---|---|---|
| Backend (Express, dev y producción) | `3001` | Servido por `server/src/index.ts`; en Render lo asigna `PORT`. |
| Frontend (Vite dev) | `5173` (defecto) — localmente `5174` | En desarrollo se usa `--strictPort` y se pasa a `5174` si `5173` está ocupado en la máquina del desarrollador. |
| E2E (base URL de Playwright) | `3001` | La suite habla directo con la API. |

### Variables de entorno

| Variable | Uso | Valor típico |
|---|---|---|
| `PORT` | Puerto del servidor (inyectada por Render) | `3001` (o asignado) |
| `NODE_ENV` | Activa servir estáticos y logs de producción | `production` |
| `BASE_URL` | URL base para los tests E2E | `http://localhost:3001` (CI) |
| `PW_SKIP_SERVERS` | Evita que Playwright levante los servidores en CI | `1` |
| `CI` | Modo CI (reportes, no interactivo) | `true` |
| `RENDER_DEPLOY_HOOK_URL` | Secret en GitHub Actions para el deploy hook | URL del webhook |

No se usan otras variables secretas: no hay claves de API ni credenciales de base de datos (estado en memoria).