import { useState, useCallback, useMemo } from 'react'
import { api, type GateOperation } from '@/lib/api'

interface UseQuantumCircuitOptions {
  numQubits: number
  maxOperations?: number
}

interface CircuitState {
  operations: GateOperation[]
  probabilities: Record<string, number> | null
  measurements: Record<string, number> | null
  isSimulating: boolean
  error: string | null
}

export function useQuantumCircuit({ numQubits, maxOperations = 50 }: UseQuantumCircuitOptions) {
  const [state, setState] = useState<CircuitState>({
    operations: [],
    probabilities: null,
    measurements: null,
    isSimulating: false,
    error: null,
  })

  const addGate = useCallback((gate: string, qubits: number[], params?: number[]) => {
    setState((prev) => {
      if (prev.operations.length >= maxOperations) {
        return { ...prev, error: `Maximum ${maxOperations} operations allowed` }
      }

      const validQubits = qubits.every(q => q >= 0 && q < numQubits)
      if (!validQubits) {
        return { ...prev, error: 'Invalid qubit index' }
      }

      return {
        ...prev,
        operations: [...prev.operations, { gate, qubits, params }],
        probabilities: null,
        measurements: null,
        error: null,
      }
    })
  }, [numQubits, maxOperations])

  const removeGate = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      operations: prev.operations.filter((_, i) => i !== index),
      probabilities: null,
      measurements: null,
    }))
  }, [])

  const undoGate = useCallback(() => {
    setState((prev) => ({
      ...prev,
      operations: prev.operations.slice(0, -1),
      probabilities: null,
      measurements: null,
    }))
  }, [])

  const clearCircuit = useCallback(() => {
    setState({
      operations: [],
      probabilities: null,
      measurements: null,
      isSimulating: false,
      error: null,
    })
  }, [])

  const simulate = useCallback(async (shots: number = 1024) => {
    setState((prev) => ({ ...prev, isSimulating: true, error: null }))

    try {
      const result = await api.quantum.simulate({
        num_qubits: numQubits,
        operations: state.operations,
        shots,
      })

      setState((prev) => ({
        ...prev,
        probabilities: result.probabilities,
        measurements: result.counts,
        isSimulating: false,
      }))

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Simulation failed'
      setState((prev) => ({
        ...prev,
        isSimulating: false,
        error: message,
      }))
      throw error
    }
  }, [numQubits, state.operations])

  const verify = useCallback(async (targetState: Record<string, number>, tolerance = 0.1) => {
    try {
      const result = await api.quantum.verify({
        num_qubits: numQubits,
        operations: state.operations,
        target_state: targetState,
        tolerance,
      })

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed'
      setState((prev) => ({ ...prev, error: message }))
      throw error
    }
  }, [numQubits, state.operations])

  const h = useCallback((qubit: number) => addGate('H', [qubit]), [addGate])
  const x = useCallback((qubit: number) => addGate('X', [qubit]), [addGate])
  const y = useCallback((qubit: number) => addGate('Y', [qubit]), [addGate])
  const z = useCallback((qubit: number) => addGate('Z', [qubit]), [addGate])
  const s = useCallback((qubit: number) => addGate('S', [qubit]), [addGate])
  const t = useCallback((qubit: number) => addGate('T', [qubit]), [addGate])
  const rx = useCallback((qubit: number, theta: number) => addGate('RX', [qubit], [theta]), [addGate])
  const ry = useCallback((qubit: number, theta: number) => addGate('RY', [qubit], [theta]), [addGate])
  const rz = useCallback((qubit: number, theta: number) => addGate('RZ', [qubit], [theta]), [addGate])
  const cnot = useCallback((control: number, target: number) => addGate('CNOT', [control, target]), [addGate])
  const cz = useCallback((control: number, target: number) => addGate('CZ', [control, target]), [addGate])
  const swap = useCallback((qubit1: number, qubit2: number) => addGate('SWAP', [qubit1, qubit2]), [addGate])

  const circuitJSON = useMemo(() => ({
    num_qubits: numQubits,
    operations: state.operations,
  }), [numQubits, state.operations])

  return {
    ...state,
    numQubits,
    addGate,
    removeGate,
    undoGate,
    clearCircuit,
    simulate,
    verify,
    h, x, y, z, s, t,
    rx, ry, rz,
    cnot, cz, swap,
    circuitJSON,
  }
}

export default useQuantumCircuit
