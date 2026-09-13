/**
 * Propiedad 17 — botones del jugador inactivo siempre están disabled
 *
 * Validates: Requirements 17 (ActionPanel deshabilita botones del jugador inactivo)
 */
import { render, screen, cleanup } from '@testing-library/react'
import * as fc from 'fast-check'
import { vi, test, expect } from 'vitest'
import { ActionPanel } from '../components/ActionPanel'
import type { GameState, PlayerId } from '../types/game'

/** Build a minimal GameState with the given active turn. */
function makeState(turn: PlayerId): GameState {
  const emptyRow = Array.from({ length: 10 }, () => ({ type: 'empty' as const }))
  const board = Array.from({ length: 10 }, () => [...emptyRow])

  return {
    id: 'test-game',
    status: 'playing',
    turn,
    turnNumber: 1,
    board,
    players: {
      P1: { id: 'P1', name: 'Player 1', mana: 5, crystals: 0, armor: 0, position: { x: 0, y: 0 } },
      P2: { id: 'P2', name: 'Player 2', mana: 5, crystals: 0, armor: 0, position: { x: 9, y: 9 } },
    },
    units: [
      { id: 'p1-core', type: 'core', owner: 'P1', position: { x: 0, y: 0 }, hp: 20, armor: 0 },
      { id: 'p2-core', type: 'core', owner: 'P2', position: { x: 9, y: 9 }, hp: 20, armor: 0 },
    ],
    projectiles: [],
    events: [],
    history: [],
    winner: null,
    crystalDoubleActive: false,
  }
}

test('Propiedad 17 — botones del jugador inactivo siempre están disabled', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('P1' as const, 'P2' as const),
      (turn) => {
        const inactivePlayer: PlayerId = turn === 'P1' ? 'P2' : 'P1'
        const state = makeState(turn)
        const onAction = vi.fn()

        const { unmount } = render(
          <ActionPanel
            state={state}
            activePlayer={inactivePlayer}
            onAction={onAction}
            error={null}
          />
        )

        // Todos los botones del panel del jugador inactivo deben estar disabled
        const buttons = screen.getAllByRole('button')
        buttons.forEach((btn) => {
          expect(btn).toBeDisabled()
        })

        unmount()
        cleanup()
      }
    ),
    { numRuns: 10 }
  )
})
