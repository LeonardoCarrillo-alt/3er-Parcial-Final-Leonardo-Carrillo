# Requirements Document

## Introduction

**Duelo de Cristales** es un juego web por turnos para 2 jugadores en el mismo dispositivo. Cada jugador controla un Mago que protege su Núcleo, recolecta Cristales e invoca unidades para destruir el Núcleo enemigo. El frontend está construido con React + TypeScript y se comunica con un backend Express + TypeScript que valida y resuelve cada acción, manteniendo el estado autoritativo de la partida. El despliegue se realiza en Render, con pipelines de CI/CD en GitHub Actions.

---

## Glossary

- **P1 / P2**: Los dos jugadores que participan en la partida desde el mismo dispositivo.
- **Núcleo**: Unidad fija de cada jugador con 10 HP. Su destrucción determina la victoria inmediata del oponente.
- **Mago**: Unidad móvil controlada por el jugador activo.
- **Minion**: Unidad invocada por el Mago que se desplaza automáticamente hacia el Núcleo enemigo al final de cada turno.
- **Proyectil**: Entidad lanzada por el hechizo del Mago que avanza 1 casilla por turno hasta impactar un objetivo o salir del tablero.
- **Cristal**: Recurso recogible del tablero que otorga puntos al jugador que lo toma.
- **Obstáculo**: Casilla bloqueada que impide el movimiento de unidades.
- **Evento_Aleatorio**: Efecto global activado con 10 % de probabilidad al inicio de cada turno.
- **Tablero**: Cuadrícula de 10 × 10 casillas generada por el Backend al crear la partida.
- **Backend**: Servidor Express + TypeScript, árbitro único del estado de la partida.
- **Frontend**: Aplicación React + TypeScript que renderiza el juego y envía acciones al Backend.
- **HUD**: Interfaz superpuesta al Tablero que muestra HP, maná, cristales y número de turno.
- **API**: Interfaz HTTP/JSON expuesta por el Backend.
- **Partida**: Instancia de juego identificada por un `id` único almacenada en memoria por el Backend.
- **Estado**: Objeto que describe completamente la Partida en un instante dado.
- **Historia**: Registro ordenado de todas las acciones ejecutadas en la Partida.

---

## Requirements

### Requirement 1: Creación de partida

**User Story:** Como P1, quiero iniciar una nueva Partida indicando los nombres de ambos jugadores, para que el juego empiece con un estado inicial válido y conocido.

#### Acceptance Criteria

1. WHEN el Frontend envía `POST /api/games` con los nombres de P1 y P2, THE Backend SHALL crear una Partida con un `id` único, `status: "playing"`, `turn: "P1"` y `turnNumber: 1`.
2. WHEN el Backend crea una Partida, THE Backend SHALL generar un Tablero de 10 × 10 casillas que contenga exactamente 8 obstáculos en posiciones aleatorias distintas entre sí y distintas de las posiciones de Núcleos y Magos, exactamente 4 Cristales en posiciones libres y exactamente 2 Eventos_Aleatorios ocultos.
3. WHEN el Backend crea una Partida, THE Backend SHALL posicionar el Núcleo de P1 en la esquina superior-izquierda `(0,0)` y el Núcleo de P2 en la esquina inferior-derecha `(9,9)`.
4. WHEN el Backend crea una Partida, THE Backend SHALL posicionar el Mago de P1 en la casilla `(0,1)` y el Mago de P2 en la casilla `(9,8)`.
5. WHEN el Backend crea una Partida, THE Backend SHALL asignar a cada jugador exactamente 3 puntos de maná, 0 Cristales y armadura 0.
6. WHEN el Backend crea una Partida, THE Backend SHALL responder con `{ ok: true, gameId, state }` donde `state` incluye los campos `status`, `turn`, `turnNumber`, `board`, `players`, `units`, `projectiles`, `events`, `history` y `winner`, con código HTTP 201.
7. IF el cuerpo de `POST /api/games` no contiene los nombres de ambos jugadores, o alguno de los nombres está vacío o es solo espacios en blanco, THEN THE Backend SHALL responder con `{ ok: false, error: "Nombres de jugadores requeridos" }` y código HTTP 400, sin crear ninguna Partida.

---

### Requirement 2: Consulta del estado

**User Story:** Como jugador, quiero consultar el estado actual de la Partida en cualquier momento, para que el Frontend pueda sincronizarse con el estado autoritativo del Backend.

#### Acceptance Criteria

1. WHEN el Frontend envía una solicitud de consulta de estado con un `id` de Partida válido existente, THE Backend SHALL responder con el Estado completo de la Partida y código HTTP 200.
2. IF el `id` solicitado no existe en memoria, THEN THE Backend SHALL responder con `{ ok: false, error: "Partida no encontrada" }` y código HTTP 404.
3. THE Estado SHALL contener los campos: `status`, `turn`, `turnNumber`, `board`, `players`, `units`, `projectiles`, `events`, `history` y `winner`.
4. IF el campo `id` de la solicitud está ausente o tiene formato inválido, THEN THE Backend SHALL responder con un mensaje de error indicando que el identificador es inválido y código HTTP 400.
5. WHILE la Partida tiene `status` distinto de `"finished"`, THE Estado SHALL contener `winner` con valor `null`.

---

### Requirement 3: Ejecución de acciones

**User Story:** Como jugador activo, quiero enviar una acción al Backend para que la valide y la resuelva, de forma que el estado del juego avance de manera autorizada.

#### Acceptance Criteria

1. WHEN el Frontend envía `POST /api/games/:id/actions` con una acción válida del jugador activo, THE Backend SHALL validar la acción, aplicarla al Estado, cambiar el turno al jugador contrario e incrementar `turnNumber` en 1.
2. WHEN el Backend aplica una acción válida, THE Backend SHALL responder con el Estado actualizado y `{ ok: true }` con código HTTP 200.
3. IF el jugador que envía la acción no es el jugador activo según `turn`, THEN THE Backend SHALL responder indicando que no es su turno sin modificar el Estado.
4. IF la Partida tiene `status: "finished"`, THEN THE Backend SHALL responder indicando que la partida ha terminado sin modificar el Estado.
5. IF el maná actual del jugador activo es menor al coste de maná requerido por la acción, THEN THE Backend SHALL responder con un error de maná insuficiente sin modificar el Estado ni cambiar el turno.
6. THE Backend SHALL registrar toda acción ejecutada con éxito en el campo `history` de la Partida, incluyendo el identificador del jugador, el tipo de acción, el valor de `turnNumber` en el momento de ejecución y la marca de tiempo ISO 8601.
7. IF el cuerpo de `POST /api/games/:id/actions` está malformado o no contiene los campos `playerId` y `action`, THEN THE Backend SHALL responder con código HTTP 400 y un mensaje de error descriptivo sin modificar el Estado.
8. IF el `id` de la URL no corresponde a ninguna Partida en memoria, THEN THE Backend SHALL responder con código HTTP 404 y un mensaje indicando que la Partida no fue encontrada.

---

### Requirement 4: Acción Mover

**User Story:** Como jugador activo, quiero mover mi Mago una casilla ortogonal, para reposicionarlo estratégicamente sin coste de maná.

#### Acceptance Criteria

1. WHEN el jugador activo envía la acción `move` con una dirección ortogonal válida (norte, sur, este, oeste), THE Backend SHALL desplazar el Mago 1 casilla en esa dirección sin consumir maná y responder con el Estado actualizado incluyendo las nuevas coordenadas del Mago.
2. IF la casilla destino contiene un Obstáculo o está ocupada por el Mago del oponente, THEN THE Backend SHALL responder con un error indicando que la casilla está bloqueada sin mover el Mago ni cambiar el turno.
3. IF la casilla destino está fuera de los límites del Tablero (coordenadas < 0 o > 9), THEN THE Backend SHALL responder con un error indicando movimiento fuera del tablero sin mover el Mago ni cambiar el turno.
4. IF el jugador que envía la acción `move` no es el jugador activo del turno en curso, THEN THE Backend SHALL responder con un error indicando que no es su turno sin modificar el Estado del juego.

---

### Requirement 5: Acción Recolectar

**User Story:** Como jugador activo, quiero recolectar el Cristal que ocupa la casilla de mi Mago, para incrementar mi puntuación sin coste de maná.

#### Acceptance Criteria

1. WHEN el jugador activo envía la acción `collect` y el Mago está en una casilla con un Cristal, THE Backend SHALL eliminar el Cristal de esa casilla del Tablero, incrementar en 1 el contador de cristales del jugador activo y mantener el maná del jugador activo en el mismo valor que tenía antes de la acción.
2. WHEN el jugador activo envía la acción `collect` y el Mago está en una casilla con un Cristal, THE Backend SHALL responder con `ok: true` e incluir el Estado actualizado del Tablero y del jugador activo.
3. IF la casilla del Mago no contiene un Cristal, THEN THE Backend SHALL responder con un error indicando que no hay cristal en la casilla sin modificar el Estado del juego.
4. IF el jugador que envía la acción `collect` no es el jugador activo del turno en curso, THEN THE Backend SHALL responder con un error indicando que no es su turno sin modificar el Estado del juego.

---

### Requirement 6: Acción Invocar Minion

**User Story:** Como jugador activo, quiero invocar un Minion adyacente a mi Mago, para que avance automáticamente hacia el Núcleo enemigo.

#### Acceptance Criteria

1. WHEN el jugador activo envía la acción `summon` y dispone de al menos 2 puntos de maná, THE Backend SHALL crear un Minion en una casilla libre adyacente al Mago del jugador activo, restar 2 puntos de maná al jugador y responder con `{ ok: true }` e incluir el Estado actualizado.
2. IF el jugador activo dispone de menos de 2 puntos de maná, THEN THE Backend SHALL responder con un error de maná insuficiente sin crear el Minion.
3. IF no existe ninguna casilla libre adyacente al Mago, THEN THE Backend SHALL responder con un error indicando que no hay casillas libres para invocar sin crear el Minion ni consumir maná.
4. WHEN un Minion es creado, THE Backend SHALL asignar al Minion el identificador del jugador propietario, la posición de la casilla libre adyacente seleccionada y exactamente 3 HP.
5. IF el jugador que envía la acción `summon` no es el jugador activo del turno en curso, THEN THE Backend SHALL responder con un error indicando que no es su turno sin modificar el Estado.
6. WHEN existen múltiples casillas libres adyacentes al Mago disponibles para invocar, THE Backend SHALL seleccionar la casilla en orden de prioridad: Norte, Este, Sur, Oeste (la primera disponible).

---

### Requirement 7: Acción Lanzar Hechizo

**User Story:** Como jugador activo, quiero lanzar un hechizo dirigido, para dañar unidades enemigas a distancia con un Proyectil que avanza por el Tablero.

#### Acceptance Criteria

1. WHEN el jugador activo envía la acción `spell` con una dirección válida y dispone de al menos 3 puntos de maná, THE Backend SHALL crear un Proyectil en la casilla adyacente al Mago en la dirección indicada, restar 3 puntos de maná al jugador e incluir el Estado actualizado del Tablero en la respuesta.
2. WHEN un Proyectil existe en el Tablero al inicio de la fase de resolución de un turno, THE Backend SHALL avanzar el Proyectil exactamente 1 casilla en su dirección de desplazamiento antes de procesar cualquier otra acción del mismo turno.
3. WHEN un Proyectil se desplaza a una casilla ocupada por una unidad enemiga (Mago, Minion o Núcleo), THE Backend SHALL aplicar exactamente 3 puntos de daño a dicha unidad, eliminar el Proyectil del Tablero y reflejar el Estado actualizado de la unidad impactada en la respuesta.
4. WHEN un Proyectil avanza a una casilla fuera de los límites del Tablero, THE Backend SHALL eliminar el Proyectil del Tablero sin aplicar daño a ninguna unidad y reflejar la ausencia del Proyectil en la respuesta.
5. IF el jugador activo dispone de menos de 3 puntos de maná al enviar la acción `spell`, THEN THE Backend SHALL rechazar la acción con un error de maná insuficiente sin crear el Proyectil ni modificar el Estado del Tablero.
6. IF el jugador activo envía la acción `spell` con una dirección no válida, THEN THE Backend SHALL rechazar la acción con un error indicando dirección inválida sin crear el Proyectil ni modificar el Estado del Tablero.
7. IF la casilla adyacente al Mago en la dirección indicada está ocupada por una unidad enemiga al momento de lanzar el hechizo, THEN THE Backend SHALL aplicar inmediatamente 3 puntos de daño a dicha unidad, restar 3 puntos de maná al jugador y no crear el Proyectil en el Tablero.

---

### Requirement 8: Acción Atacar

**User Story:** Como jugador activo, quiero atacar una unidad enemiga adyacente, para reducir sus HP y avanzar hacia la victoria.

#### Acceptance Criteria

1. WHEN el jugador activo envía la acción `attack` con un objetivo adyacente al Mago y dispone de al menos 1 punto de maná, THE Backend SHALL infligir `max(2 - armadura_objetivo, 1)` puntos de daño a la unidad objetivo y restar 1 punto de maná al jugador activo.
2. WHEN el daño reduce los HP de una unidad a 0 o menos, THE Backend SHALL eliminar la unidad del Tablero y, si la unidad eliminada es un Núcleo, activar inmediatamente la condición de victoria del jugador atacante.
3. THE Backend SHALL permitir como máximo una acción `attack` por turno por jugador; si el jugador activo intenta un segundo ataque en el mismo turno, THE Backend SHALL rechazarlo con un error descriptivo.
4. IF el jugador activo no dispone de al menos 1 punto de maná, THEN THE Backend SHALL responder con un error de maná insuficiente sin aplicar daño.
5. IF no existe ninguna unidad enemiga adyacente al Mago, THEN THE Backend SHALL responder con un error indicando que no hay objetivo adyacente sin aplicar daño ni consumir maná.

---

### Requirement 9: Acción Defender

**User Story:** Como jugador activo, quiero adoptar postura defensiva, para reducir el daño recibido durante el turno del oponente sin coste de maná.

#### Acceptance Criteria

1. WHEN el jugador activo envía la acción `defend`, THE Backend SHALL asignar exactamente 2 puntos de armadura al Mago del jugador activo sin consumir maná; si el Mago ya tiene armadura activa, el valor se reemplaza (no se acumula) manteniéndolo en 2.
2. WHEN comienza el turno siguiente del jugador que usó `defend`, THE Backend SHALL restablecer la armadura del Mago a 0, independientemente de si fue parcialmente consumida durante el turno del oponente.

---

### Requirement 10: Movimiento automático de Minions

**User Story:** Como sistema, quiero que los Minions avancen automáticamente hacia el Núcleo enemigo al final de cada turno, para presionar al oponente sin intervención del jugador.

#### Acceptance Criteria

1. WHEN el Backend resuelve el final de un turno y existen Minions en el Tablero, THE Backend SHALL desplazar cada Minion exactamente 1 casilla en la dirección ortogonal que minimice la distancia Manhattan al Núcleo enemigo; en caso de empate de distancias, se prioriza en orden Norte > Este > Sur > Oeste. Los Minions se procesan en orden ascendente por su identificador único.
2. IF la casilla destino del Minion está ocupada por un Obstáculo u otra unidad, THEN THE Backend SHALL mantener el Minion en su posición actual sin moverlo.
3. WHEN un Minion alcanza la casilla del Núcleo enemigo, THE Backend SHALL infligir 1 punto de daño al Núcleo y eliminar el Minion del Tablero; la casilla del Núcleo no actúa como bloqueador para el movimiento del Minion.

---

### Requirement 11: Reaparición periódica de Cristales

**User Story:** Como sistema, quiero que aparezcan nuevos Cristales cada 4 turnos, para mantener el incentivo de exploración durante toda la partida.

#### Acceptance Criteria

1. WHEN el `turnNumber` es múltiplo de 4, THE Backend SHALL colocar 1 Cristal en una casilla libre aleatoria del Tablero después de la evaluación del evento aleatorio y antes de que el jugador ejecute su acción; el número máximo de Cristales simultáneos en el Tablero es 10.
2. IF no existe ninguna casilla libre disponible en el Tablero, THE Backend SHALL omitir la aparición del Cristal en ese turno sin generar error.

---

### Requirement 12: Eventos aleatorios

**User Story:** Como sistema, quiero activar eventos globales aleatorios al inicio de ciertos turnos, para introducir variabilidad y tensión en la partida.

#### Acceptance Criteria

1. WHEN el Backend inicia un turno, THE Backend SHALL evaluar con exactamente 10 % de probabilidad si se activa un Evento_Aleatorio; si se activa, seleccionará uno de los tres tipos (`Tormenta`, `Cristal_Doble`, `Bloqueo`) con igual probabilidad (33,3 % cada uno).
2. WHEN se activa el evento `Tormenta`, THE Backend SHALL restar 1 punto de maná a cada jugador, con un mínimo de 0 puntos de maná.
3. WHEN se activa el evento `Cristal_Doble`, THE Backend SHALL marcar que el próximo Cristal recolectado durante esa Partida otorgará 2 puntos al jugador que lo tome; si el marcador `Cristal_Doble` ya está activo, el nuevo evento no lo apila y se restablece a activo; el marcador se desactiva después de la primera recolección posterior.
4. WHEN se activa el evento `Bloqueo`, THE Backend SHALL colocar un Obstáculo temporal en una casilla libre aleatoria del Tablero; dicho Obstáculo desaparecerá al término del turno siguiente.
5. IF el evento `Bloqueo` se activa y no existe ninguna casilla libre disponible, THE Backend SHALL registrar el evento como activado pero sin efecto en el Tablero, sin generar error.
6. WHEN se activa un Evento_Aleatorio, THE Backend SHALL registrarlo en el campo `events` del Estado con el tipo de evento, el `turnNumber` y las entidades afectadas (para `Tormenta`: ambos jugadores; para `Cristal_Doble`: ninguna entidad directa; para `Bloqueo`: la casilla donde se colocó el obstáculo).

---

### Requirement 13: Condiciones de victoria y empate

**User Story:** Como sistema, quiero detectar y registrar el resultado final de la partida cuando se cumpla una condición de victoria o empate, para que el Frontend pueda informarlo a los jugadores.

#### Acceptance Criteria

1. WHEN los HP del Núcleo de un jugador llegan a 0 o menos, THE Backend SHALL establecer `status: "finished"`, asignar `winner` al jugador contrario y dejar de aceptar acciones para esa Partida.
2. WHEN el `turnNumber` alcanza 30 y ningún Núcleo ha sido destruido, THE Backend SHALL establecer `status: "finished"` y comparar los Cristales de ambos jugadores: si P1 tiene más, `winner: "P1"`; si P2 tiene más, `winner: "P2"`; si son iguales, `winner: "draw"`.
3. WHEN el Backend determina el resultado final, THE Backend SHALL incluir el `winner` en el Estado devuelto por cualquier llamada posterior a `GET /api/games/:id`.
4. IF se envía una acción a una Partida con `status: "finished"`, THEN THE Backend SHALL responder con un error indicando que la partida ha terminado y código HTTP 409, sin modificar el Estado.

---

### Requirement 14: Historial de acciones

**User Story:** Como jugador, quiero consultar el historial completo de acciones de la partida, para revisar las jugadas realizadas.

#### Acceptance Criteria

1. WHEN el Frontend envía `GET /api/games/:id/history`, THE Backend SHALL responder con el arreglo `history` ordenado cronológicamente de más antiguo a más reciente con código HTTP 200.
2. THE Backend SHALL almacenar en cada entrada del `history` al menos: el identificador del jugador (`"P1"` o `"P2"`), el tipo de acción, el valor de `turnNumber` en rango 1–30 y la marca de tiempo ISO 8601.
3. IF el `id` solicitado no existe, THEN THE Backend SHALL responder con `{ ok: false, error: "Partida no encontrada" }` y código HTTP 404.
4. IF la Partida existe pero aún no se ha ejecutado ninguna acción, THEN THE Backend SHALL responder con `{ ok: true, history: [] }` y código HTTP 200.

---

### Requirement 15: Interfaz de inicio

**User Story:** Como jugador, quiero ver una pantalla de inicio donde ingresar los nombres de ambos jugadores, para identificar a cada participante antes de empezar la Partida.

#### Acceptance Criteria

1. THE Frontend SHALL mostrar una pantalla de inicio con dos campos de texto para ingresar el nombre de P1 y el nombre de P2, y un botón para iniciar la Partida.
2. WHEN el jugador presiona el botón de inicio y ambos campos contienen entre 1 y 30 caracteres no vacíos, THE Frontend SHALL enviar `POST /api/games` mediante `fetch` nativo y navegar a la pantalla de juego al recibir la respuesta exitosa.
3. IF alguno de los campos de nombre está vacío al presionar el botón, THEN THE Frontend SHALL mostrar un mensaje de validación indicando que ambos nombres son obligatorios, sin enviar la solicitud al Backend.
4. IF alguno de los campos de nombre supera los 30 caracteres, THEN THE Frontend SHALL mostrar un mensaje de validación indicando el límite máximo de caracteres, sin enviar la solicitud al Backend.

---

### Requirement 16: Tablero de juego

**User Story:** Como jugador, quiero ver el Tablero completo a pantalla completa con todas sus unidades y elementos, para percibir el estado visual del juego en todo momento.

#### Acceptance Criteria

1. THE Frontend SHALL renderizar el Tablero como una cuadrícula de 10 × 10 que ocupe al menos el 80 % del área visible de la pantalla del dispositivo.
2. THE Frontend SHALL representar visualmente en el Tablero cada tipo de elemento con color e icono diferenciados por jugador: Núcleos, Magos, Minions, Proyectiles, Cristales, Obstáculos y Eventos_Aleatorios activos.
3. WHEN el Backend devuelve un Estado con Proyectiles en movimiento, THE Frontend SHALL animar el desplazamiento de dichos Proyectiles mediante transiciones CSS con duración entre 100 ms y 400 ms por casilla.
4. WHEN el Backend devuelve un Estado con Minions, THE Frontend SHALL animar el desplazamiento automático de los Minions mediante transiciones CSS con duración entre 100 ms y 400 ms por casilla.

---

### Requirement 17: HUD y panel de acciones

**User Story:** Como jugador activo, quiero ver mi HP, maná, cristales y el turno actual, y disponer de botones para cada acción posible, para tomar decisiones informadas rápidamente.

#### Acceptance Criteria

1. THE Frontend SHALL mostrar un HUD permanente, no ocultable ni colapsable, con: HP del Núcleo de cada jugador, maná de cada jugador, cristales de cada jugador y `turnNumber` actual.
2. THE Frontend SHALL mostrar un panel de acciones con botones para cada acción válida: Mover, Recolectar, Invocar, Hechizo, Atacar y Defender.
3. WHILE `turn` corresponde a P1, THE Frontend SHALL habilitar únicamente los controles de P1 estableciendo el atributo `disabled` en los botones de P2, y viceversa.
4. WHEN el Backend responde con `{ ok: false, error: "..." }`, THE Frontend SHALL mostrar el mensaje de error al jugador activo de forma visible durante al menos 3 segundos, sin recargar el Tablero.
5. WHEN el Backend responde con `status: "finished"`, THE Frontend SHALL reemplazar el panel de acciones por una pantalla de resultado con el `winner` y la opción de volver a la pantalla de inicio.

---

### Requirement 18: Comunicación Frontend-Backend

**User Story:** Como sistema, quiero que el Frontend use `fetch` nativo para comunicarse con el Backend, para asegurar que toda la lógica de juego sea validada por el servidor.

#### Acceptance Criteria

1. THE Frontend SHALL utilizar exclusivamente `fetch` nativo (sin librerías HTTP externas) para todas las llamadas a la API del Backend.
2. THE Frontend SHALL serializar las solicitudes y deserializar las respuestas en formato JSON.
3. WHEN el Backend devuelve un error HTTP (4xx o 5xx), THE Frontend SHALL capturar el error, mostrar un mensaje descriptivo al usuario sin interrumpir el flujo de la aplicación, y mantener el Tablero y el HUD con el último Estado válido.
4. WHERE la aplicación se ejecuta en producción, THE Frontend SHALL construir las URLs de la API usando rutas relativas (sin hostname ni puerto hardcodeados) para que el navegador las resuelva contra el mismo origen que sirve el Frontend compilado.

---

### Requirement 19: Producción y despliegue

**User Story:** Como operador, quiero que el Backend sirva el Frontend compilado y que ambos se expongan en el mismo dominio y puerto en producción, para simplificar el despliegue en Render.

#### Acceptance Criteria

1. WHERE la variable de entorno `NODE_ENV` es `"production"`, THE Backend SHALL servir los archivos estáticos del Frontend compilado desde la carpeta `dist` y redirigir cualquier ruta no perteneciente a `/api/*` a `index.html`.
2. WHERE la aplicación está desplegada en Render, THE Frontend y el Backend SHALL ser accesibles bajo el mismo dominio y puerto, sin necesidad de configuración CORS adicional.
3. THE Backend SHALL exponer las rutas `POST /api/games`, `GET /api/games/:id`, `POST /api/games/:id/actions` y `GET /api/games/:id/history` respondiendo con código 2xx en caso de éxito, 4xx en caso de error del cliente y 5xx en caso de error del servidor, siempre con cuerpo JSON.

---

### Requirement 20: Pipelines de CI/CD con GitHub Actions

**User Story:** Como desarrollador, quiero que el repositorio cuente con tres flujos automáticos de GitHub Actions para lint, pruebas E2E y despliegue, para garantizar la calidad y disponibilidad del proyecto.

#### Acceptance Criteria

1. THE Repositorio SHALL contener exactamente 3 workflows de GitHub Actions: uno para lint, uno para pruebas E2E con Playwright y uno para despliegue en Render.
2. WHEN se ejecuta el workflow de lint, THE Pipeline SHALL ejecutar el linter del Frontend y del Backend y terminar con código de salida distinto de 0 si se detectan errores de lint.
3. WHEN se ejecuta el workflow de E2E, THE Pipeline SHALL ejecutar Playwright en modo headless y reportar el resultado de cada prueba.
4. WHEN se ejecuta el workflow de despliegue, THE Pipeline SHALL primero ejecutar lint, luego E2E, y solo si ambos pasan con código 0, construir el Frontend, compilar el Backend y desencadenar el despliegue en Render.
5. IF el entorno de ejecución es la máquina local del desarrollador, THEN THE Playwright SHALL ejecutarse en modo visual sobre Chrome mediante el comando configurado en `playwright.config.ts`.

---

### Requirement 21: Documentación del proyecto

**User Story:** Como colaborador, quiero que el repositorio incluya documentación completa en Markdown dentro de la carpeta `docs/`, para entender la arquitectura, las reglas y el despliegue del proyecto.

#### Acceptance Criteria

1. THE Repositorio SHALL contener una carpeta `docs/` con al menos cuatro archivos Markdown que cubran respectivamente: arquitectura del sistema, reglas del juego, referencia de la API con ejemplos JSON, e instrucciones de instalación local y despliegue en Render.
2. THE Repositorio SHALL no tener cambios pendientes sin confirmar (uncommitted changes) antes del 15/09/2026 a las 16:00 hora local.
