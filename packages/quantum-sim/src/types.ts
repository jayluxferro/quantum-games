export interface QubitState {
  alpha: { real: number; imag: number }
  beta: { real: number; imag: number }
}

export interface CircuitOperation {
  gate: string
  qubits: number[]
  params?: number[]
}

export interface SimulationResult {
  statevector: Complex[]
  probabilities: Record<string, number>
  measurements?: Record<string, number>
}

export interface MeasurementResult {
  outcome: string
  probability: number
  collapsed_state: Complex[]
}

export interface Complex {
  real: number
  imag: number
}

export interface BlochCoordinates {
  x: number
  y: number
  z: number
  theta: number
  phi: number
}
