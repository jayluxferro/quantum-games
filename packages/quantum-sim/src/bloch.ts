import type { QubitState, BlochCoordinates, Complex } from './types.js'

export class BlochSphere {
  static stateToCoordinates(state: QubitState): BlochCoordinates {
    const alpha = state.alpha
    const beta = state.beta

    const alphaAbs = Math.sqrt(alpha.real ** 2 + alpha.imag ** 2)
    const betaAbs = Math.sqrt(beta.real ** 2 + beta.imag ** 2)

    let theta = 2 * Math.acos(Math.min(1, alphaAbs))

    let phi = 0
    if (betaAbs > 1e-10) {
      const relativePhase = {
        real: beta.real * alpha.real + beta.imag * alpha.imag,
        imag: beta.imag * alpha.real - beta.real * alpha.imag,
      }
      phi = Math.atan2(relativePhase.imag, relativePhase.real)
    }

    const x = Math.sin(theta) * Math.cos(phi)
    const y = Math.sin(theta) * Math.sin(phi)
    const z = Math.cos(theta)

    return { x, y, z, theta, phi }
  }

  static coordinatesToState(coords: BlochCoordinates): QubitState {
    const { theta, phi } = coords

    const alpha: Complex = {
      real: Math.cos(theta / 2),
      imag: 0,
    }

    const beta: Complex = {
      real: Math.sin(theta / 2) * Math.cos(phi),
      imag: Math.sin(theta / 2) * Math.sin(phi),
    }

    return { alpha, beta }
  }

  static getStandardStates(): Record<string, QubitState> {
    return {
      '|0⟩': {
        alpha: { real: 1, imag: 0 },
        beta: { real: 0, imag: 0 },
      },
      '|1⟩': {
        alpha: { real: 0, imag: 0 },
        beta: { real: 1, imag: 0 },
      },
      '|+⟩': {
        alpha: { real: 1 / Math.sqrt(2), imag: 0 },
        beta: { real: 1 / Math.sqrt(2), imag: 0 },
      },
      '|-⟩': {
        alpha: { real: 1 / Math.sqrt(2), imag: 0 },
        beta: { real: -1 / Math.sqrt(2), imag: 0 },
      },
      '|i⟩': {
        alpha: { real: 1 / Math.sqrt(2), imag: 0 },
        beta: { real: 0, imag: 1 / Math.sqrt(2) },
      },
      '|-i⟩': {
        alpha: { real: 1 / Math.sqrt(2), imag: 0 },
        beta: { real: 0, imag: -1 / Math.sqrt(2) },
      },
    }
  }

  static applyGate(state: QubitState, gate: string): QubitState {
    const { alpha, beta } = state

    switch (gate.toUpperCase()) {
      case 'X':
        return { alpha: beta, beta: alpha }

      case 'Y':
        return {
          alpha: { real: beta.imag, imag: -beta.real },
          beta: { real: -alpha.imag, imag: alpha.real },
        }

      case 'Z':
        return {
          alpha,
          beta: { real: -beta.real, imag: -beta.imag },
        }

      case 'H': {
        const h = 1 / Math.sqrt(2)
        return {
          alpha: {
            real: h * (alpha.real + beta.real),
            imag: h * (alpha.imag + beta.imag),
          },
          beta: {
            real: h * (alpha.real - beta.real),
            imag: h * (alpha.imag - beta.imag),
          },
        }
      }

      case 'S':
        return {
          alpha,
          beta: { real: -beta.imag, imag: beta.real },
        }

      case 'T': {
        const angle = Math.PI / 4
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        return {
          alpha,
          beta: {
            real: cos * beta.real - sin * beta.imag,
            imag: sin * beta.real + cos * beta.imag,
          },
        }
      }

      default:
        return state
    }
  }

  static probability(state: QubitState, outcome: '0' | '1'): number {
    if (outcome === '0') {
      return state.alpha.real ** 2 + state.alpha.imag ** 2
    } else {
      return state.beta.real ** 2 + state.beta.imag ** 2
    }
  }

  static formatState(state: QubitState): string {
    const { alpha, beta } = state

    const formatComplex = (c: Complex): string => {
      if (Math.abs(c.imag) < 1e-10) {
        return c.real.toFixed(3)
      }
      if (Math.abs(c.real) < 1e-10) {
        return `${c.imag.toFixed(3)}i`
      }
      return `${c.real.toFixed(3)} + ${c.imag.toFixed(3)}i`
    }

    return `(${formatComplex(alpha)})|0⟩ + (${formatComplex(beta)})|1⟩`
  }
}
