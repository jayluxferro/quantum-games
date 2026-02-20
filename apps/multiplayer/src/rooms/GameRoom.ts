import { Room, Client } from '@colyseus/core'
import { QuantumCircuit } from '@quantum-games/quantum-sim'
import { GameState, Player, GateOperation } from '../schemas/GameState.js'

interface JoinOptions {
  name?: string
  gameSlug?: string
  mode?: string
  educationLevel?: string
  targetState?: Record<string, number>
  numQubits?: number
}

interface SubmitData {
  score: number
  solution?: string
  numQubits?: number
}

export class GameRoom extends Room<GameState> {
  maxClients = 4

  onCreate(options: JoinOptions) {
    this.autoDispose = true
    this.setState(new GameState())
    this.state.gameSlug = options.gameSlug || 'unknown'
    this.state.mode = options.mode || 'single_player'
    this.state.status = 'waiting'

    this.onMessage('ready', (client) => {
      const player = this.state.players.get(client.sessionId)
      if (player) {
        player.ready = true
        this.checkAllReady()
      }
    })

    this.onMessage('gate', (client, data: { gate: string; qubits: number[]; params?: number[] }) => {
      if (this.state.status !== 'playing') return

      const operation = new GateOperation()
      operation.gate = data.gate
      operation.qubits.push(...data.qubits)
      if (data.params) {
        operation.params.push(...data.params)
      }
      operation.playerId = client.sessionId
      operation.timestamp = Date.now()

      this.state.circuit.operations.push(operation)
      this.broadcast('gate_applied', {
        playerId: client.sessionId,
        gate: data.gate,
        qubits: data.qubits,
      })
    })

    this.onMessage('submit', (client, data: SubmitData) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return

      // Minimum time-on-task validation (at least 5 seconds of play)
      const timeElapsed = (Date.now() - this.state.startedAt) / 1000
      if (timeElapsed < 5) {
        console.log(`[GameRoom] Rejected submission from ${player.name}: too fast (${timeElapsed}s)`)
        return
      }

      let validatedScore = 0

      // If solution provided, validate server-side
      if (data.solution) {
        try {
          const circuitData = JSON.parse(data.solution)
          const numQubits = circuitData.numQubits || data.numQubits || 2
          
          const circuit = new QuantumCircuit(numQubits)
          if (circuitData.operations && Array.isArray(circuitData.operations)) {
            for (const op of circuitData.operations) {
              circuit.addGate(op.gate, op.qubits, op.params)
            }
          }
          
          // Simulate and compute basic validity score
          const result = circuit.simulate()
          const hasValidOutput = Object.keys(result.probabilities).length > 0
          validatedScore = hasValidOutput ? Math.min(data.score, 100) : 0
          
          console.log(`[GameRoom] Validated circuit submission: client=${data.score}, validated=${validatedScore}`)
        } catch (err) {
          console.error(`[GameRoom] Invalid solution:`, err)
          validatedScore = 0
        }
      } else if (this.state.circuit.operations.length > 0) {
        // Use server-side circuit state if no solution provided
        const numQubits = this.state.circuit.numQubits
        const circuit = new QuantumCircuit(numQubits)
        
        for (const op of this.state.circuit.operations) {
          const qubits = Array.from(op.qubits) as number[]
          const params = op.params.length > 0 ? (Array.from(op.params) as number[]) : undefined
          circuit.addGate(op.gate, qubits, params)
        }
        
        const result = circuit.simulate()
        const hasValidOutput = Object.keys(result.probabilities).length > 0
        validatedScore = hasValidOutput ? Math.min(data.score, 100) : 0
        
        console.log(`[GameRoom] Validated from server state: client=${data.score}, validated=${validatedScore}`)
      } else {
        // Non-circuit game: apply reasonable cap and time-based validation
        validatedScore = Math.min(data.score, 100)
        console.log(`[GameRoom] Non-circuit submission: score=${validatedScore}`)
      }

      if (validatedScore > player.score) {
        player.score = validatedScore
      }
      this.checkGameEnd()
    })

    this.onMessage('chat', (client, message: string) => {
      const player = this.state.players.get(client.sessionId)
      this.broadcast('chat', {
        playerId: client.sessionId,
        name: player?.name || 'Unknown',
        message: message.substring(0, 200),
      })
    })

    this.setSimulationInterval(() => this.update(), 1000)
  }

  onJoin(client: Client, options: JoinOptions) {
    const player = new Player()
    player.id = client.sessionId
    player.name = options.name || `Player ${this.state.players.size + 1}`
    player.educationLevel = options.educationLevel || 'basic_school'
    player.connected = true

    this.state.players.set(client.sessionId, player)

    this.broadcast('player_joined', {
      id: client.sessionId,
      name: player.name,
    })

    console.log(`${player.name} joined room ${this.roomId}`)
  }

  onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId)
    
    if (player) {
      if (consented) {
        this.state.players.delete(client.sessionId)
        this.broadcast('player_left', { id: client.sessionId })
      } else {
        player.connected = false
        this.allowReconnection(client, 60)
          .then(() => {
            player.connected = true
          })
          .catch(() => {
            this.state.players.delete(client.sessionId)
            this.broadcast('player_left', { id: client.sessionId })
          })
      }
    }

    console.log(`Player ${client.sessionId} left room ${this.roomId}`)
  }

  update() {
    if (this.state.status === 'playing' && this.state.timeRemaining > 0) {
      this.state.timeRemaining--
      
      if (this.state.timeRemaining <= 0) {
        this.endGame()
      }
    }
  }

  checkAllReady() {
    if (this.state.players.size < 2 && this.state.mode !== 'single_player') {
      return
    }

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
    this.state.timeRemaining = 300

    this.broadcast('game_started', {
      level: this.state.currentLevel,
      timeLimit: this.state.timeRemaining,
    })

    console.log(`Game started in room ${this.roomId}`)
  }

  checkGameEnd() {
    if (this.state.mode === 'single_player') {
      return
    }

    let allSubmitted = true
    this.state.players.forEach((player: Player) => {
      if (player.score === 0) allSubmitted = false
    })

    if (allSubmitted) {
      this.endGame()
    }
  }

  endGame() {
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

    console.log(`Game ended in room ${this.roomId}, winner: ${winner}`)
  }
}
