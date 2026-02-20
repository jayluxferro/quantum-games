import { Room, Client } from '@colyseus/core'
import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema'

class Challenger extends Schema {
  @type('string') id: string = ''
  @type('string') name: string = ''
  @type('number') score: number = 0
  @type('boolean') submitted: boolean = false
  @type('number') submittedAt: number = 0
  @type('string') solution: string = ''
}

class Challenge extends Schema {
  @type('string') id: string = ''
  @type('string') type: string = ''
  @type('string') title: string = ''
  @type('string') description: string = ''
  @type('string') targetState: string = ''
  @type('number') maxScore: number = 100
  @type('number') timeLimit: number = 180
}

class ChallengeRoomState extends Schema {
  @type('string') status: string = 'waiting'
  @type(Challenge) challenge = new Challenge()
  @type('number') timeRemaining: number = 0
  @type({ map: Challenger }) challengers = new MapSchema<Challenger>()
  @type(['string']) leaderboard = new ArraySchema<string>()
}

interface JoinOptions {
  name?: string
  challengeId?: string
}

const CHALLENGES: Record<string, Partial<Challenge>> = {
  'bell-state': {
    type: 'circuit_building',
    title: 'Create a Bell State',
    description: 'Build a quantum circuit that creates a Bell state (|00⟩ + |11⟩)/√2',
    targetState: JSON.stringify({ '00': 0.5, '11': 0.5 }),
    maxScore: 100,
    timeLimit: 180,
  },
  'ghz-state': {
    type: 'circuit_building',
    title: 'Create a GHZ State',
    description: 'Build a 3-qubit GHZ state (|000⟩ + |111⟩)/√2',
    targetState: JSON.stringify({ '000': 0.5, '111': 0.5 }),
    maxScore: 150,
    timeLimit: 300,
  },
  'superposition-all': {
    type: 'circuit_building',
    title: 'Equal Superposition',
    description: 'Create an equal superposition of all 2-qubit basis states',
    targetState: JSON.stringify({ '00': 0.25, '01': 0.25, '10': 0.25, '11': 0.25 }),
    maxScore: 80,
    timeLimit: 120,
  },
  'swap-qubits': {
    type: 'circuit_building',
    title: 'Swap Two Qubits',
    description: 'Swap the states of qubit 0 and qubit 1 using only CNOT gates',
    targetState: JSON.stringify({ requirement: 'swap' }),
    maxScore: 100,
    timeLimit: 180,
  },
}

export class ChallengeRoom extends Room<ChallengeRoomState> {
  maxClients = 20

  onCreate(options: JoinOptions) {
    this.autoDispose = true
    this.setState(new ChallengeRoomState())
    this.state.status = 'waiting'

    // Set up challenge
    const challengeId = options.challengeId || 'bell-state'
    const challengeData = CHALLENGES[challengeId] || CHALLENGES['bell-state']
    
    this.state.challenge.id = challengeId
    this.state.challenge.type = challengeData.type || 'circuit_building'
    this.state.challenge.title = challengeData.title || 'Unknown Challenge'
    this.state.challenge.description = challengeData.description || ''
    this.state.challenge.targetState = challengeData.targetState || '{}'
    this.state.challenge.maxScore = challengeData.maxScore || 100
    this.state.challenge.timeLimit = challengeData.timeLimit || 180
    this.state.timeRemaining = this.state.challenge.timeLimit

    this.onMessage('start', () => {
      if (this.state.status === 'waiting' && this.state.challengers.size > 0) {
        this.startChallenge()
      }
    })

    this.onMessage('submit', (client, data: { solution: string; score: number }) => {
      if (this.state.status !== 'active') return
      this.handleSubmission(client.sessionId, data.solution, data.score)
    })

    this.onMessage('request_hint', (client) => {
      if (this.state.status !== 'active') return
      this.sendHint(client)
    })

    this.setSimulationInterval(() => this.update(), 1000)
  }

  onJoin(client: Client, options: JoinOptions) {
    const challenger = new Challenger()
    challenger.id = client.sessionId
    challenger.name = options.name || `Player ${this.state.challengers.size + 1}`
    challenger.submitted = false

    this.state.challengers.set(client.sessionId, challenger)

    this.broadcast('challenger_joined', {
      id: client.sessionId,
      name: challenger.name,
      count: this.state.challengers.size,
    })

    // Send current state to new player
    client.send('challenge_info', {
      challenge: {
        id: this.state.challenge.id,
        type: this.state.challenge.type,
        title: this.state.challenge.title,
        description: this.state.challenge.description,
        maxScore: this.state.challenge.maxScore,
        timeLimit: this.state.challenge.timeLimit,
      },
      status: this.state.status,
      timeRemaining: this.state.timeRemaining,
    })

    console.log(`${challenger.name} joined challenge ${this.state.challenge.id}`)
  }

  onLeave(client: Client, consented: boolean) {
    const challenger = this.state.challengers.get(client.sessionId)
    
    if (challenger && !consented && this.state.status === 'active') {
      // Allow reconnection during active challenge
      challenger.submitted = false
      this.allowReconnection(client, 60)
        .then(() => {
          client.send('reconnected', {
            timeRemaining: this.state.timeRemaining,
          })
        })
        .catch(() => {
          this.state.challengers.delete(client.sessionId)
          this.updateLeaderboard()
        })
    } else {
      this.state.challengers.delete(client.sessionId)
      this.updateLeaderboard()
    }
  }

  update() {
    if (this.state.status === 'active') {
      this.state.timeRemaining--

      // Broadcast time update every 10 seconds
      if (this.state.timeRemaining % 10 === 0) {
        this.broadcast('time_update', { timeRemaining: this.state.timeRemaining })
      }

      // Time warnings
      if (this.state.timeRemaining === 60) {
        this.broadcast('time_warning', { message: '1 minute remaining!' })
      } else if (this.state.timeRemaining === 30) {
        this.broadcast('time_warning', { message: '30 seconds remaining!' })
      } else if (this.state.timeRemaining === 10) {
        this.broadcast('time_warning', { message: '10 seconds remaining!' })
      }

      // Check if time is up or all submitted
      if (this.state.timeRemaining <= 0 || this.allSubmitted()) {
        this.endChallenge()
      }
    }
  }

  startChallenge() {
    this.state.status = 'active'
    this.state.timeRemaining = this.state.challenge.timeLimit

    // Reset all challengers
    this.state.challengers.forEach((challenger: Challenger) => {
      challenger.score = 0
      challenger.submitted = false
      challenger.solution = ''
    })

    this.broadcast('challenge_started', {
      challenge: {
        id: this.state.challenge.id,
        type: this.state.challenge.type,
        title: this.state.challenge.title,
        description: this.state.challenge.description,
        targetState: this.state.challenge.targetState,
        maxScore: this.state.challenge.maxScore,
      },
      timeLimit: this.state.challenge.timeLimit,
    })

    console.log(`Challenge ${this.state.challenge.id} started`)
  }

  handleSubmission(playerId: string, solution: string, score: number) {
    const challenger = this.state.challengers.get(playerId)
    if (!challenger || challenger.submitted) return

    // Calculate time bonus (up to 20% for fast submissions)
    const timeBonus = Math.floor(
      (this.state.timeRemaining / this.state.challenge.timeLimit) * 0.2 * score
    )

    challenger.solution = solution
    challenger.score = Math.min(score + timeBonus, this.state.challenge.maxScore)
    challenger.submitted = true
    challenger.submittedAt = Date.now()

    this.updateLeaderboard()

    // Confirm submission to player
    const client = this.clients.find(c => c.sessionId === playerId)
    if (client) {
      client.send('submission_confirmed', {
        score: challenger.score,
        timeBonus,
        rank: this.state.leaderboard.indexOf(playerId) + 1,
      })
    }

    // Broadcast submission (without solution)
    this.broadcast('new_submission', {
      playerId,
      name: challenger.name,
      score: challenger.score,
      rank: this.state.leaderboard.indexOf(playerId) + 1,
    })

    console.log(`${challenger.name} submitted with score ${challenger.score}`)
  }

  sendHint(client: Client) {
    const hints: Record<string, string[]> = {
      'bell-state': [
        'Start with a Hadamard gate on qubit 0',
        'Follow with a CNOT gate',
        'The circuit only needs 2 gates',
      ],
      'ghz-state': [
        'Apply Hadamard to the first qubit',
        'Use CNOT gates to entangle all qubits',
        'The CNOT cascade propagates the superposition',
      ],
      'superposition-all': [
        'Hadamard gates create superposition',
        'Apply Hadamard to each qubit',
        'No entanglement needed for this one',
      ],
      'swap-qubits': [
        'CNOT can be used to swap',
        'You need exactly 3 CNOT gates',
        'The pattern is: CNOT(0,1), CNOT(1,0), CNOT(0,1)',
      ],
    }

    const challengeHints = hints[this.state.challenge.id] || ['No hints available']
    const challenger = this.state.challengers.get(client.sessionId)
    
    // Give next hint based on implicit hint count (simplified)
    const hintIndex = Math.floor(Math.random() * challengeHints.length)
    
    client.send('hint', {
      hint: challengeHints[hintIndex],
      scorePenalty: 5,
    })

    // Apply score penalty if already submitted
    if (challenger) {
      challenger.score = Math.max(0, challenger.score - 5)
    }
  }

  updateLeaderboard() {
    const entries: Array<[string, Challenger]> = []
    this.state.challengers.forEach((c: Challenger, id: string) => {
      if (c.submitted) {
        entries.push([id, c])
      }
    })
    
    entries.sort((a, b) => {
      if (b[1].score !== a[1].score) return b[1].score - a[1].score
      return a[1].submittedAt - b[1].submittedAt
    })

    this.state.leaderboard.clear()
    entries.forEach(([id]) => this.state.leaderboard.push(id))
  }

  allSubmitted(): boolean {
    let all = true
    this.state.challengers.forEach((challenger: Challenger) => {
      if (!challenger.submitted) all = false
    })
    return all && this.state.challengers.size > 0
  }

  endChallenge() {
    this.state.status = 'finished'

    const results = this.state.leaderboard.map((id: string, index: number) => {
      const challenger = this.state.challengers.get(id)
      return {
        rank: index + 1,
        id,
        name: challenger?.name || 'Unknown',
        score: challenger?.score || 0,
      }
    })

    this.broadcast('challenge_ended', {
      results,
      winner: results[0] || null,
      challengeId: this.state.challenge.id,
    })

    console.log(`Challenge ${this.state.challenge.id} ended`)
  }
}
