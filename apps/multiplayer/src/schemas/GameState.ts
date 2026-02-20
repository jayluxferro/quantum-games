import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema'

export class Player extends Schema {
  @type('string') id: string = ''
  @type('string') name: string = ''
  @type('number') score: number = 0
  @type('boolean') ready: boolean = false
  @type('boolean') connected: boolean = true
  @type('string') educationLevel: string = 'basic_school'
}

export class QubitState extends Schema {
  @type('number') alpha_real: number = 1
  @type('number') alpha_imag: number = 0
  @type('number') beta_real: number = 0
  @type('number') beta_imag: number = 0
}

export class GateOperation extends Schema {
  @type('string') gate: string = ''
  @type(['number']) qubits = new ArraySchema<number>()
  @type(['number']) params = new ArraySchema<number>()
  @type('string') playerId: string = ''
  @type('number') timestamp: number = 0
}

export class CircuitState extends Schema {
  @type('number') numQubits: number = 1
  @type([GateOperation]) operations = new ArraySchema<GateOperation>()
  @type({ map: 'number' }) measurements = new MapSchema<number>()
}

export class GameState extends Schema {
  @type('string') gameSlug: string = ''
  @type('string') mode: string = 'single_player'
  @type('string') status: string = 'waiting'
  @type('number') currentLevel: number = 1
  @type('number') timeRemaining: number = 0
  @type('number') maxPlayers: number = 4
  @type({ map: Player }) players = new MapSchema<Player>()
  @type(CircuitState) circuit = new CircuitState()
  @type('string') winner: string = ''
  @type('number') startedAt: number = 0
}
