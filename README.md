# Duelo de Cristales

Juego web por turnos de 2 jugadores construido como proyecto final de React.

## Propósito

Los jugadores se enfrentan en un tablero 10×10, gestionando recursos (maná, cristales) e invocando unidades para destruir el Núcleo del oponente antes del turno 30.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite (TypeScript) |
| Backend | Express (TypeScript) |
| Pruebas unitarias / propiedades | Jest + fast-check |
| Pruebas E2E | Playwright |
| CI/CD | GitHub Actions |
| Despliegue | Render |

## Estructura del proyecto

```
3er-Parcial-Final-Leonardo-Carrillo/
├── duelo-de-cristales/
│   ├── client/      # React + Vite frontend
│   ├── server/      # Express backend (árbitro del estado)
│   └── docs/        # Documentación
├── package.json     # Scripts raíz de workspace
└── README.md
```

## Comandos rápidos

```bash
# Instalar dependencias
npm install --prefix duelo-de-cristales/client
npm install --prefix duelo-de-cristales/server

# Desarrollo
npm run dev:client   # Frontend en http://localhost:5173
npm run dev:server   # Backend en http://localhost:3001

# Build
npm run build

# Lint
npm run lint

# Tests E2E
npm run test:e2e
```

## Autor

Leonardo Carrillo
