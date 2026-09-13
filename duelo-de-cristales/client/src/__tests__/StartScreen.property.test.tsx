/**
 * Propiedad 16 — nombres inválidos no llaman createGame y muestran error
 *
 * Validates: Requirements 16 (validación de entrada en StartScreen)
 */
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import * as fc from 'fast-check'
import { vi, test, expect } from 'vitest'
import { StartScreen } from '../components/StartScreen'

// Mock useGame para interceptar createGame
vi.mock('../hooks/useGame', () => ({
  useGame: () => ({
    gameId: null,
    state: null,
    error: null,
    loading: false,
    createGame: vi.fn(),
    fetchState: vi.fn(),
    sendAction: vi.fn(),
  }),
}))

test('Propiedad 16 — nombres inválidos no llaman createGame y muestran error', () => {
  fc.assert(
    fc.property(
      // Strings solo espacios (1..20) o vacío
      fc.oneof(
        fc.constant(''),
        fc.array(fc.constant(' '), { minLength: 1, maxLength: 20 }).map((a) => a.join(''))
      ),
      fc.oneof(
        fc.constant(''),
        fc.array(fc.constant(' '), { minLength: 1, maxLength: 20 }).map((a) => a.join(''))
      ),
      (invalidP1, invalidP2) => {
        const onGameCreated = vi.fn()
        const { unmount } = render(<StartScreen onGameCreated={onGameCreated} />)

        // Escribir valores inválidos
        fireEvent.change(screen.getByTestId('input-player1'), {
          target: { value: invalidP1 },
        })
        fireEvent.change(screen.getByTestId('input-player2'), {
          target: { value: invalidP2 },
        })

        // Intentar enviar
        fireEvent.click(screen.getByTestId('btn-start'))

        // El callback onGameCreated no debe haberse llamado
        expect(onGameCreated).not.toHaveBeenCalled()

        // Debe haber al menos un mensaje de error visible
        const errors = screen.queryAllByTestId(/^error-p/)
        const hasVisibleError = errors.some(
          (el) => el.textContent && el.textContent.trim().length > 0
        )
        expect(hasVisibleError).toBe(true)

        unmount()
        cleanup()
      }
    ),
    { numRuns: 20 }
  )
})
