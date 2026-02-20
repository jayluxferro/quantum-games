import { Room, Client } from '@colyseus/core'
import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema'

class TurnPlayer extends Schema {
  @type('string') id: string = ''
  @type('string') name: string = ''
  @type('number') score: number = 0
  @type('boolean') ready: boolean = false
  @type('boolean') connected: boolean = true
}

class TurnAction extends Schema {
  @type('string') playerId: string = ''
  @type('string') actionType: string = ''
  @type('string') data: string = ''
  @type('number') timestamp: number = 0
}

class TurnBasedState extends Schema {
  @type('string') gameSlug: string = ''
  @type('string') status: string = 'waiting'
  @type('number') currentTurn: number = 0
  @type('string') currentPlayerId: string = ''
  @type('number') turnTimeLimit: number = 60
  @type('number') turnTimeRemaining: number = 60
  @type({ map: TurnPlayer }) players = new MapSchema<TurnPlayer>()
  @type(['string']) turnOrder = new ArraySchema<string>()
  @type([TurnAction]) history = new ArraySchema<TurnAction>()
  @type('string') winner: string = ''
}

interface JoinOptions {
  name?: string
  gameSlug?: string
}

export class TurnBasedRoom extends Room<TurnBasedState> {
  maxClients = 2

  onCreate(options: JoinOptions) {
    this.autoDispose = true
    this.setState(new TurnBasedState())
    this.state.gameSlug = options.gameSlug || 'unknown'
    this.state.status = 'waiting'
    this.state.turnTimeLimit = 60
    this.state.turnTimeRemaining = 60

    this.onMessage('ready', (client) => {
      const player = this.state.players.get(client.sessionId)
      if (player) {
        player.ready = true
        this.checkAllReady()
      }
    })

    this.onMessage('action', (client, data: { actionType: string; data: any }) => {
      if (this.state.status !== 'playing') return
      if (client.sessionId !== this.state.currentPlayerId) {
        client.send('error', { message: 'Not your turn' })
        return
      }

      const action = new TurnAction()
      action.playerId = client.sessionId
      action.actionType = data.actionType
      action.data = JSON.stringify(data.data)
      action.timestamp = Date.now()
      
      this.state.history.push(action)

      // Broadcast action to all players
      this.broadcast('action', {
        playerId: client.sessionId,
        actionType: data.actionType,
        data: data.data,
        turn: this.state.currentTurn,
      })

      // Process action result
      this.processAction(client.sessionId, data)
    })

    this.onMessage('end_turn', (client) => {
      if (client.sessionId !== this.state.currentPlayerId) return
      this.nextTurn()
    })

    this.onMessage('forfeit', (client) => {
      const player = this.state.players.get(client.sessionId)
      if (player) {
        this.broadcast('player_forfeit', { playerId: client.sessionId, name: player.name })
        this.endGame(this.getOpponentId(client.sessionId))
      }
    })

    // Turn timer
    this.setSimulationInterval(() => this.update(), 1000)
  }

  onJoin(client: Client, options: JoinOptions) {
    const player = new TurnPlayer()
    player.id = client.sessionId
    player.name = options.name || `Player ${this.state.players.size + 1}`
    player.connected = true

    this.state.players.set(client.sessionId, player)
    this.state.turnOrder.push(client.sessionId)

    this.broadcast('player_joined', {
      id: client.sessionId,
      name: player.name,
      playerCount: this.state.players.size,
    })

    console.log(`${player.name} joined turn-based room ${this.roomId}`)
  }

  onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId)
    
    if (player) {
      if (consented) {
        // Player intentionally left - they forfeit
        if (this.state.status === 'playing') {
          this.endGame(this.getOpponentId(client.sessionId))
        }
        this.state.players.delete(client.sessionId)
        const idx = this.state.turnOrder.indexOf(client.sessionId)
        if (idx !== -1) this.state.turnOrder.splice(idx, 1)
      } else {
        player.connected = false
        this.allowReconnection(client, 120)
          .then(() => {
            player.connected = true
            client.send('reconnected', {
              turn: this.state.currentTurn,
              currentPlayer: this.state.currentPlayerId,
              history: this.state.history.map((a: TurnAction) => ({
                playerId: a.playerId,
                actionType: a.actionType,
                data: JSON.parse(a.data),
              })),
            })
          })
          .catch(() => {
            if (this.state.status === 'playing') {
              this.endGame(this.getOpponentId(client.sessionId))
            }
            this.state.players.delete(client.sessionId)
          })
      }
    }
  }

  update() {
    if (this.state.status === 'playing') {
      this.state.turnTimeRemaining--
      
      if (this.state.turnTimeRemaining <= 0) {
        // Time ran out - auto-skip turn
        this.broadcast('turn_timeout', { playerId: this.state.currentPlayerId })
        this.nextTurn()
      }
    }
  }

  checkAllReady() {
    if (this.state.players.size < 2) return

    let allReady = true
    this.state.players.forEach((player: TurnPlayer) => {
      if (!player.ready) allReady = false
    })

    if (allReady) {
      this.startGame()
    }
  }

  startGame() {
    this.state.status = 'playing'
    this.state.currentTurn = 1
    this.state.currentPlayerId = this.state.turnOrder[0] || ''
    this.state.turnTimeRemaining = this.state.turnTimeLimit

    this.broadcast('game_started', {
      firstPlayer: this.state.currentPlayerId,
      turnTimeLimit: this.state.turnTimeLimit,
    })

    console.log(`Turn-based game started in room ${this.roomId}`)
  }

  nextTurn() {
    const currentIdx = this.state.turnOrder.indexOf(this.state.currentPlayerId)
    const nextIdx = (currentIdx + 1) % this.state.turnOrder.length
    
    this.state.currentTurn++
    this.state.currentPlayerId = this.state.turnOrder[nextIdx] || ''
    this.state.turnTimeRemaining = this.state.turnTimeLimit

    this.broadcast('turn_changed', {
      turn: this.state.currentTurn,
      currentPlayer: this.state.currentPlayerId,
      timeLimit: this.state.turnTimeLimit,
    })
  }

  processAction(playerId: string, data: { actionType: string; data: any }) {
    const player = this.state.players.get(playerId)
    if (!player) return

    // Game-specific action processing
    switch (data.actionType) {
      case 'score':
        if (typeof data.data.points === 'number') {
          player.score += data.data.points
        }
        break
      case 'win':
        this.endGame(playerId)
        break
      default:
        // Custom action - let the game handle it
        break
    }
  }

  getOpponentId(playerId: string): string {
    let opponentId = ''
    this.state.players.forEach((_player: TurnPlayer, id: string) => {
      if (id !== playerId) opponentId = id
    })
    return opponentId
  }

  endGame(winnerId: string) {
    this.state.status = 'finished'
    this.state.winner = winnerId

    const scores: { id: string; name: string; score: number }[] = []
    this.state.players.forEach((player: TurnPlayer, id: string) => {
      scores.push({ id, name: player.name, score: player.score })
    })

    this.broadcast('game_ended', {
      winner: winnerId,
      winnerName: this.state.players.get(winnerId)?.name,
      scores,
      totalTurns: this.state.currentTurn,
    })

    console.log(`Turn-based game ended in room ${this.roomId}`)
  }
}
