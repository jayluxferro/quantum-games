export interface GateInfo {
  name: string
  symbol: string
  description: string
  qubits: number
  params?: string[]
  matrix?: number[][]
}

export const gates: Record<string, GateInfo> = {
  I: {
    name: 'Identity',
    symbol: 'I',
    description: 'Does nothing - leaves qubit unchanged',
    qubits: 1,
    matrix: [[1, 0], [0, 1]],
  },
  X: {
    name: 'Pauli-X',
    symbol: 'X',
    description: 'Quantum NOT gate - flips |0⟩ to |1⟩ and vice versa',
    qubits: 1,
    matrix: [[0, 1], [1, 0]],
  },
  Y: {
    name: 'Pauli-Y',
    symbol: 'Y',
    description: 'Pauli-Y rotation',
    qubits: 1,
  },
  Z: {
    name: 'Pauli-Z',
    symbol: 'Z',
    description: 'Phase flip - adds -1 phase to |1⟩',
    qubits: 1,
    matrix: [[1, 0], [0, -1]],
  },
  H: {
    name: 'Hadamard',
    symbol: 'H',
    description: 'Creates superposition - puts qubit in equal |0⟩ and |1⟩',
    qubits: 1,
  },
  S: {
    name: 'S Gate',
    symbol: 'S',
    description: 'Phase gate - √Z',
    qubits: 1,
  },
  T: {
    name: 'T Gate',
    symbol: 'T',
    description: 'π/8 gate - √S',
    qubits: 1,
  },
  RX: {
    name: 'X Rotation',
    symbol: 'Rx',
    description: 'Rotation around X-axis by angle θ',
    qubits: 1,
    params: ['θ'],
  },
  RY: {
    name: 'Y Rotation',
    symbol: 'Ry',
    description: 'Rotation around Y-axis by angle θ',
    qubits: 1,
    params: ['θ'],
  },
  RZ: {
    name: 'Z Rotation',
    symbol: 'Rz',
    description: 'Rotation around Z-axis by angle θ',
    qubits: 1,
    params: ['θ'],
  },
  CNOT: {
    name: 'Controlled-NOT',
    symbol: 'CX',
    description: 'Flips target qubit if control is |1⟩ - creates entanglement',
    qubits: 2,
  },
  CZ: {
    name: 'Controlled-Z',
    symbol: 'CZ',
    description: 'Applies Z to target if control is |1⟩',
    qubits: 2,
  },
  SWAP: {
    name: 'SWAP',
    symbol: 'SWAP',
    description: 'Exchanges the states of two qubits',
    qubits: 2,
  },
  CCX: {
    name: 'Toffoli',
    symbol: 'CCX',
    description: 'Controlled-controlled-NOT - universal for classical computation',
    qubits: 3,
  },
  CSWAP: {
    name: 'Fredkin',
    symbol: 'CSWAP',
    description: 'Controlled-SWAP',
    qubits: 3,
  },
}

export function getGatesByQubits(numQubits: number): GateInfo[] {
  return Object.values(gates).filter(g => g.qubits === numQubits)
}

export function getBeginnerGates(): string[] {
  return ['X', 'H', 'CNOT']
}

export function getIntermediateGates(): string[] {
  return ['X', 'Y', 'Z', 'H', 'S', 'T', 'CNOT', 'CZ', 'SWAP']
}

export function getAdvancedGates(): string[] {
  return Object.keys(gates)
}
