import type { CircuitOperation, SimulationResult, Complex } from './types.js'

export class QuantumCircuit {
  private numQubits: number
  private operations: CircuitOperation[] = []
  private statevector: Complex[]

  constructor(numQubits: number) {
    this.numQubits = numQubits
    this.statevector = this.initializeStatevector()
  }

  private initializeStatevector(): Complex[] {
    const size = Math.pow(2, this.numQubits)
    const sv: Complex[] = new Array(size).fill(null).map(() => ({ real: 0, imag: 0 }))
    sv[0] = { real: 1, imag: 0 }
    return sv
  }

  reset(): void {
    this.operations = []
    this.statevector = this.initializeStatevector()
  }

  addGate(gate: string, qubits: number[], params?: number[]): this {
    this.operations.push({ gate, qubits, params })
    return this
  }

  x(qubit: number): this {
    return this.addGate('X', [qubit])
  }

  y(qubit: number): this {
    return this.addGate('Y', [qubit])
  }

  z(qubit: number): this {
    return this.addGate('Z', [qubit])
  }

  h(qubit: number): this {
    return this.addGate('H', [qubit])
  }

  s(qubit: number): this {
    return this.addGate('S', [qubit])
  }

  t(qubit: number): this {
    return this.addGate('T', [qubit])
  }

  rx(qubit: number, theta: number): this {
    return this.addGate('RX', [qubit], [theta])
  }

  ry(qubit: number, theta: number): this {
    return this.addGate('RY', [qubit], [theta])
  }

  rz(qubit: number, theta: number): this {
    return this.addGate('RZ', [qubit], [theta])
  }

  cnot(control: number, target: number): this {
    return this.addGate('CNOT', [control, target])
  }

  cx(control: number, target: number): this {
    return this.cnot(control, target)
  }

  cz(control: number, target: number): this {
    return this.addGate('CZ', [control, target])
  }

  swap(qubit1: number, qubit2: number): this {
    return this.addGate('SWAP', [qubit1, qubit2])
  }

  simulate(): SimulationResult {
    let state = [...this.statevector]

    for (const op of this.operations) {
      state = this.applyGate(state, op)
    }

    const probabilities = this.calculateProbabilities(state)

    return {
      statevector: state,
      probabilities,
    }
  }

  private applyGate(state: Complex[], op: CircuitOperation): Complex[] {
    const n = this.numQubits
    const newState = state.map(c => ({ ...c }))

    switch (op.gate.toUpperCase()) {
      case 'X':
        return this.applySingleQubitGate(newState, op.qubits[0], [
          [{ real: 0, imag: 0 }, { real: 1, imag: 0 }],
          [{ real: 1, imag: 0 }, { real: 0, imag: 0 }],
        ])
      
      case 'H':
        const h = 1 / Math.sqrt(2)
        return this.applySingleQubitGate(newState, op.qubits[0], [
          [{ real: h, imag: 0 }, { real: h, imag: 0 }],
          [{ real: h, imag: 0 }, { real: -h, imag: 0 }],
        ])
      
      case 'Z':
        return this.applySingleQubitGate(newState, op.qubits[0], [
          [{ real: 1, imag: 0 }, { real: 0, imag: 0 }],
          [{ real: 0, imag: 0 }, { real: -1, imag: 0 }],
        ])

      case 'Y':
        return this.applySingleQubitGate(newState, op.qubits[0], [
          [{ real: 0, imag: 0 }, { real: 0, imag: -1 }],
          [{ real: 0, imag: 1 }, { real: 0, imag: 0 }],
        ])

      case 'CNOT':
      case 'CX':
        return this.applyCNOT(newState, op.qubits[0], op.qubits[1])

      default:
        return newState
    }
  }

  private applySingleQubitGate(
    state: Complex[],
    target: number,
    matrix: Complex[][]
  ): Complex[] {
    const n = state.length
    const newState: Complex[] = new Array(n).fill(null).map(() => ({ real: 0, imag: 0 }))

    for (let i = 0; i < n; i++) {
      const bit = (i >> target) & 1
      const i0 = i & ~(1 << target)
      const i1 = i | (1 << target)

      if (bit === 0) {
        newState[i0] = this.addComplex(
          newState[i0],
          this.mulComplex(matrix[0][0], state[i0])
        )
        newState[i0] = this.addComplex(
          newState[i0],
          this.mulComplex(matrix[0][1], state[i1])
        )
        newState[i1] = this.addComplex(
          newState[i1],
          this.mulComplex(matrix[1][0], state[i0])
        )
        newState[i1] = this.addComplex(
          newState[i1],
          this.mulComplex(matrix[1][1], state[i1])
        )
      }
    }

    return newState
  }

  private applyCNOT(state: Complex[], control: number, target: number): Complex[] {
    const n = state.length
    const newState = [...state]

    for (let i = 0; i < n; i++) {
      const controlBit = (i >> control) & 1
      if (controlBit === 1) {
        const j = i ^ (1 << target)
        const temp = newState[i]
        newState[i] = newState[j]
        newState[j] = temp
      }
    }

    return newState
  }

  private mulComplex(a: Complex, b: Complex): Complex {
    return {
      real: a.real * b.real - a.imag * b.imag,
      imag: a.real * b.imag + a.imag * b.real,
    }
  }

  private addComplex(a: Complex, b: Complex): Complex {
    return {
      real: a.real + b.real,
      imag: a.imag + b.imag,
    }
  }

  private calculateProbabilities(state: Complex[]): Record<string, number> {
    const probs: Record<string, number> = {}

    for (let i = 0; i < state.length; i++) {
      const bitstring = i.toString(2).padStart(this.numQubits, '0')
      const prob = state[i].real ** 2 + state[i].imag ** 2
      if (prob > 1e-10) {
        probs[bitstring] = prob
      }
    }

    return probs
  }

  measure(shots: number = 1024): Record<string, number> {
    const result = this.simulate()
    const counts: Record<string, number> = {}

    for (let i = 0; i < shots; i++) {
      const r = Math.random()
      let cumulative = 0

      for (const [state, prob] of Object.entries(result.probabilities)) {
        cumulative += prob
        if (r < cumulative) {
          counts[state] = (counts[state] || 0) + 1
          break
        }
      }
    }

    return counts
  }

  getOperations(): CircuitOperation[] {
    return [...this.operations]
  }

  getNumQubits(): number {
    return this.numQubits
  }

  toJSON(): { numQubits: number; operations: CircuitOperation[] } {
    return {
      numQubits: this.numQubits,
      operations: this.operations,
    }
  }

  static fromJSON(json: { numQubits: number; operations: CircuitOperation[] }): QuantumCircuit {
    const circuit = new QuantumCircuit(json.numQubits)
    for (const op of json.operations) {
      circuit.addGate(op.gate, op.qubits, op.params)
    }
    return circuit
  }
}
