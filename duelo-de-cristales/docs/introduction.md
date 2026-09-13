# Duelo de Cristales — Introducción

## Nombre del proyecto

**Duelo de Cristales**

## Propósito

Es un juego web por turnos para dos jugadores (hot-seat, en el mismo navegador). Cada jugador controla a un mago sobre un tablero de 10×10 y compite por recolectar cristales (fuente de maná y de puntos) mientras intenta destruir el **Núcleo** del oponente antes de que se agoten los 30 turnos.

El proyecto es el trabajo final de la materia de React del tercer parcial y cubre de extremo a extremo: frontend (React + Vite), backend (Express), pruebas unitarias, pruebas basadas en propiedades, pruebas E2E y despliegue automático en la nube con CI/CD.

## Experiencia de juego

- Dos magos se enfrentan en un tablero 10×10 generado al azar en cada partida: **P1 (azul)** abajo a la izquierda y **P2 (rojo)** arriba a la derecha, cada uno con su castillo (Núcleo) en la esquina correspondiente.
- Por turno cada jugador gasta maná en una de seis acciones: **moverse**, **recolectar cristales**, **defenderse**, **atacar** a distancia de un casillero, **invocar súbditos** o **lanzar hechizos** que cruzan el tablero como proyectiles.
- Los cristales aparecen al azar durante la partida; recolectarlos otorga maná (la economía del juego) y suma puntos que deciden la partida si llega el turno 30 sin un ganador.
- Eventos aleatorios (tormenta, cristal doble, bloqueo) aparecen con una probabilidad del 10% por turno y agregan incertidumbre a cada partida.
- La partida termina al destruir un Núcleo (10 de vida), al eliminar al mago rival o por decisión por cristales en el turno 30.

La interfaz tiene estética retro/pixel (tipografía Press Start 2P) e incluye sprites de magos, súbditos, proyectiles y castillos, más un HUD de turno/activo y un historial de acciones.

## Tipo de jugadores objetivo

- Jugadores casuales que disfrutan juegos de mesa o estrategia por turnos.
- Parejas de jugadores en el mismo lugar (hot-seat local) que quieren una partida rápida de 5 a 15 minutos.
- Estudiantes y docentes, como referencia de una aplicación web Full Stack con arquitectura cliente-servidor, API REST y pruebas.

## Tecnologías usadas

| Capa | Tecnología | Uso |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Interfaz del juego y consumo de la API REST |
| Backend | Node.js + Express + TypeScript | API REST y árbitro autoritativo del estado del juego |
| Pruebas unitarias | Jest | Engine de juego, generador, validadores |
| Pruebas de propiedades | fast-check | Generación aleatoria de entradas para engine y validadores |
| Pruebas E2E | Playwright | Flujo completo de usuario en navegador real |
| Calidad | ESLint + TypeScript | Linter y type-check en CI |
| CI/CD | GitHub Actions | Lint, E2E y despliegue automático |
| Hosting / Deploy | Render | Servidor de producción + hook de despliegue |