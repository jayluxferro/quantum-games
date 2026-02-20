import { Room, Client } from '@colyseus/core'
import { QuantumCircuit } from '@quantum-games/quantum-sim'
import { GameState, Player, GateOperation, CircuitState } from '../schemas/GameState.js'

interface CircuitOptions {
  numQubits?: number
  targetState?: Record<string, number>
  timeLimit?: number
}

export class CircuitRoom extends Room<GameState> {
  maxClients = 2
  targetState: Record<string, number> = {}

  onCreate(options: CircuitOptions) {
    this.setState(new GameState())
    this.state.gameSlug = 'circuit-challenge'
    this.state.mode = 'turn_based'
    this.state.status = 'waiting'
    this.state.circuit.numQubits = options.numQubits || 2
    this.targetState = options.targetState || { '00': 0.5, '11': 0.5 }

    this.onMessage('place_gate', (client, data: { gate: string; qubit: number; params?: number[] }) => {
      if (this.state.status !== 'playing') return

      const operation = new GateOperation()
      operation.gate = data.gate
      operation.qubits.push(data.qubit)
      if (data.params) {
        operation.params.push(...data.params)
      }
      operation.playerId = client.sessionId
      operation.timestamp = Date.now()

      this.state.circuit.operations.push(operation)

      this.broadcast('gate_placed', {
        playerId: client.sessionId,
        gate: data.gate,
        qubit: data.qubit,
        totalGates: this.state.circuit.operations.length,
      })
    })

    this.onMessage('measure', (client) => {
      const results = this.simulateCircuit()
      
      const player = this.state.players.get(client.sessionId)
      if (player) {
        player.score = this.calculateScore(results)
      }

      this.broadcast('measurement_result', {
        playerId: client.sessionId,
        results,
        score: player?.score || 0,
        targetState: this.targetState,
      })

      this.checkGameEnd()
    })

    this.onMessage('ready', (client) => {
      const player = this.state.players.get(client.sessionId)
      if (player) {
        player.ready = true
        this.checkAllReady()
      }
    })
  }

  onJoin(client: Client, options: { name?: string }) {
    const player = new Player()
    player.id = client.sessionId
    player.name = options.name || `Player ${this.state.players.size + 1}`
    player.connected = true

    this.state.players.set(client.sessionId, player)

    if (this.state.players.size >= 2) {
      this.lock()
    }
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId)
    if (player) {
      player.connected = false
    }
  }

  checkAllReady() {
    if (this.state.players.size < 2) return

    let allReady = true
    this.state.players.forEach((player: Player) => {
      if (!player.ready) allReady = false
    })

    if (allReady) {
      this.startGame()
    }
  }

  startGame() {
    this.state.status = 'playing'
    this.state.startedAt = Date.now()
    this.state.timeRemaining = 120

    this.broadcast('game_started', {
      numQubits: this.state.circuit.numQubits,
      targetState: this.targetState,
      timeLimit: this.state.timeRemaining,
    })
  }

  simulateCircuit(): Record<string, number> {
    const numQubits = this.state.circuit.numQubits
    
    // Create quantum circuit from server state
    const circuit = new QuantumCircuit(numQubits)
    
    // Apply all operations from the authoritative server state
    for (const op of this.state.circuit.operations) {
      const qubits = Array.from(op.qubits) as number[]
      const params = op.params.length > 0 ? (Array.from(op.params) as number[]) : undefined
      circuit.addGate(op.gate, qubits, params)
    }
    
    // Run actual quantum simulation
    const result = circuit.simulate()
    
    console.log(`[CircuitRoom] Simulated circuit with ${this.state.circuit.operations.length} gates`)
    
    return result.probabilities
  }

  calculateScore(results: Record<string, number>): number {
    let totalDiff = 0
    const allStates = new Set([...Object.keys(results), ...Object.keys(this.targetState)])

    allStates.forEach((state) => {
      const actual = results[state] || 0
      const target = this.targetState[state] || 0
      totalDiff += Math.abs(actual - target)
    })

    const avgDiff = totalDiff / allStates.size
    return Math.round(Math.max(0, 100 - avgDiff * 100))
  }

  checkGameEnd() {
    let allMeasured = true
    this.state.players.forEach((player: Player) => {
      if (player.score === 0) allMeasured = false
    })

    if (allMeasured) {
      this.state.status = 'finished'

      let winner = ''
      let highScore = 0
      this.state.players.forEach((player: Player, id: string) => {
        if (player.score > highScore) {
          highScore = player.score
          winner = id
        }
      })
      this.state.winner = winner

      const scores: Array<{ id: string; name: string; score: number }> = []
      this.state.players.forEach((p: Player, id: string) => {
        scores.push({ id, name: p.name, score: p.score })
      })

      this.broadcast('game_ended', {
        winner,
        scores,
      })
    }
  }
}
