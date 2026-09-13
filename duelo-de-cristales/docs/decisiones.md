# Duelo de Cristales — Decisiones técnicas

Este documento registra las decisiones técnicas principales, la justificación detrás de cada una, los riesgos identificados y cómo se mitigan.

---

## 1. Estado del juego en memoria (`Map`) en lugar de base de datos

**Decisión**: el servidor guarda las partidas en un `Map<gameId, GameState>` en memoria; no se usa una base de datos (SQL/NoSQL).

**Justificación**:
- Los requisitos no piden persistencia multi-sesión: una partida se juega de principio a fin en minutos y el estado se entrega íntegro al cliente en cada respuesta.
- Elimina dependencias externas (servicio de BD, credenciales, migraciones) en un deploy de un solo servicio en Render free tier.
- Simplifica el flujo E2E y las pruebas unitarias: no hay que mockear ni limpiar datos de una BD.

**Riesgo**: las partidas se pierden si el servidor se reinicia (deploy nuevo o ciclo de vida de Render free tier, que duerme tras ~15 min de inactividad).

**Mitigación**:
- La API mantiene sesiones cortas (hot-seat, una pantalla); si el servidor duerme, al despertar se inicia una partida nueva.
- El `Map` está aislado por proceso, por lo que no hay corrupción de datos entre despliegues.
- La capa de acceso está encapsulada en `gameStore`, de modo que migrar a una BD más adelante solo exigiría reemplazar esa capa sin tocar el engine ni la API.

---

## 2. Proxy de Vite en desarrollo en lugar de CORS

**Decisión**: en desarrollo, Vite redirige (`proxy`) las peticiones `/api/*` del frontend hacia el backend `http://localhost:3001`. No se agregó CORS al servidor.

**Justificación**:
- El navegador ve un único origen (`localhost:5173`), por lo que no hay requests cross-origin y no se requiere configuración de CORS ni headers especiales.
- En producción no hace falta: el servidor Express sirve directamente los estáticos de `client/dist`, así que frontend y API viven en el mismo origen.

**Riesgo**: si en el futuro frontend y API se alojaran en orígenes distintos, faltaría CORS.

**Mitigación**: la decisión está documentada y es un cambio puntual en `vite.config.ts` (agregar middleware CORS) + proxy desactivado; la arquitectura no lo impide.

---

## 3. Pruebas basadas en propiedades con fast-check (PBT)

**Decisión**: se usó **fast-check** además de los tests unitarios con Jest para el engine, los validadores y el generador del tablero.

**Justificación**:
- El engine recibe combinaciones de estado muy variadas (posiciones, maná, obstáculos, cristales, eventos); el PBT genera decenas de miles de casos aleatorios y verifica invariantes (por ejemplo: el tablero siempre es 10×10, las unidades respetan los límites, el estado nunca muta externamente).
- Complementa los casos unitarios escritos a mano y encuentra edge cases difíciles de enumerar manualmente.
- Es parte del requisito de la materia y encaja con la calidad exigida en CI.

**Riesgo**: los tests de propiedades son deterministas sobre la semilla, pero un cambio en el engine podría requerir revisar los arbitrarios.

**Mitigación**: los arbitrarios viven en módulos dedicados (`*.property.ts`) y se corren en cada push dentro del workflow `lint.yml`/CI, detectando regresiones automáticamente.

---

## 4. Deploy single-service en Render en lugar de services separados / contenedor

**Decisión**: un único servicio de Web Service en Render ejecuta el backend Express, que además sirve los estáticos del frontend compilado.

**Justificación**:
- Un solo web service es suficiente: Express devuelve el `index.html` y los assets de `client/dist` en producción.
- Evita configurar dos services (frontend estático + API) o CORS entre ellos.
- Encaja con el plan free tier: un solo dyno, sin servicios de BD ni workers.
- Combined con la decisión 2, el juego completo (UI + API) se expone en una sola URL pública.

**Riesgo**: sleep del free tier (cold start de 30–50 s en el primer request tras inactividad) y límite de recursos (0.1 CPU).

**Mitigación**: se avisa al presentador de "despertar" el servicio antes de la demo; el estado en memoria reinicia una partida nueva al despertar (ver decisión 1).

---

## 5. Assets y fuente locales en lugar de CDN

**Decisión**: los sprites (`mage`, `core`, `minion`, `projectile`, `obstacle`, `preview`) y la tipografía Press Start 2P (`@fontsource/press-start-2p`) se empaquetan desde el bundle de Vite; no se cargan desde CDNs externos.

**Justificación**:
- El juego funciona sin conexión a Internet externa (útil en la defensa).
- Evita problemas de bloqueo de CDN y versiones que cambian; los assets quedan versionados por el build.

**Riesgo**: tamaño del bundle ligeramente mayor.

**Mitigación**: solo se importan los assets que realmente se usan y Vite optimiza el empaquetado del build de producción.

---

## 6. Efectos visuales de hechizos y proyectiles en el cliente

**Decisión**: los proyectiles son parte del estado autoritativo del servidor (recorrido calculado en el engine), pero los efectos visuales transitorios (destellos de impacto) se renderizan en el cliente.

**Justificación**:
- El servidor se mantiene como única fuente de verdad para reglas (daños, movimientos, victoria), mientras los efectos efímeros de UI no necesitan validación de reglas.
- Reduce la cantidad de datos en el estado compartido y simplifica el modelo.

**Riesgo**: desincronización visual si el cliente pierde un efecto.

**Mitigación**: los efectos son puramente cosméticos y se recalculan/re-entregan con cada `state`; el estado de juego nunca depende de ellos.

---

## Resumen de riesgos y mitigaciones

| Decisión | Riesgo | Mitigación |
|---|---|---|
| Estado en memoria | Pérdida de partidas al reiniciar | Sesiones cortas; capa `gameStore` intercambiable; reinicio limpio |
| Proxy Vite (sin CORS) | Frágil si se separan orígenes | Cambio puntual documentado |
| PBT con fast-check | Cambios en engine requieren revisar arbitrarios | Tests de propiedad en CI en cada push |
| Single-service en Render | Cold start / sleep free tier | Aviso de despertar antes de la demo |
| Assets locales | Bundle más pesado | Importación selectiva + build optimizado |
| Efectos visuales en cliente | Desincronización cosmética | Efectos no autoritativos y re-entregados con cada estado |