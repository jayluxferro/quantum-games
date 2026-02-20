import { Room, Client } from '@colyseus/core'
import { Schema, type, MapSchema } from '@colyseus/schema'

class QueuedPlayer extends Schema {
  @type('string') id: string = ''
  @type('string') name: string = ''
  @type('string') gameSlug: string = ''
  @type('string') educationLevel: string = ''
  @type('number') queuedAt: number = 0
  @type('number') rating: number = 1000
}

class MatchmakingState extends Schema {
  @type({ map: QueuedPlayer }) queue = new MapSchema<QueuedPlayer>()
  @type('number') matchesCreated: number = 0
}

interface QueueOptions {
  name: string
  gameSlug: string
  educationLevel: string
  rating?: number
}

export class MatchmakingRoom extends Room<MatchmakingState> {
  private matchCheckInterval: NodeJS.Timeout | null = null
  private readonly MATCH_INTERVAL = 2000 // Check for matches every 2 seconds
  private readonly MAX_RATING_DIFF = 200
  private readonly MAX_WAIT_TIME = 30000 // 30 seconds max wait

  onCreate() {
    this.setState(new MatchmakingState())
    this.autoDispose = false // Keep room alive

    this.onMessage('queue', (client, data: QueueOptions) => {
      this.addToQueue(client, data)
    })

    this.onMessage('dequeue', (client) => {
      this.removeFromQueue(client)
    })

    // Start match checking loop
    this.matchCheckInterval = setInterval(() => {
      this.findMatches()
    }, this.MATCH_INTERVAL)

    console.log('Matchmaking room created')
  }

  onJoin(client: Client) {
    console.log(`Client ${client.sessionId} joined matchmaking`)
  }

  onLeave(client: Client) {
    this.removeFromQueue(client)
    console.log(`Client ${client.sessionId} left matchmaking`)
  }

  onDispose() {
    if (this.matchCheckInterval) {
      clearInterval(this.matchCheckInterval)
    }
    console.log('Matchmaking room disposed')
  }

  private addToQueue(client: Client, options: QueueOptions) {
    const player = new QueuedPlayer()
    player.id = client.sessionId
    player.name = options.name
    player.gameSlug = options.gameSlug
    player.educationLevel = options.educationLevel
    player.rating = options.rating || 1000
    player.queuedAt = Date.now()

    this.state.queue.set(client.sessionId, player)
    
    client.send('queued', {
      position: this.getQueuePosition(options.gameSlug, client.sessionId),
      estimatedWait: this.estimateWaitTime(options.gameSlug),
    })

    console.log(`${options.name} queued for ${options.gameSlug}`)
  }

  private removeFromQueue(client: Client) {
    this.state.queue.delete(client.sessionId)
  }

  private getQueuePosition(gameSlug: string, clientId: string): number {
    let position = 1
    this.state.queue.forEach((player: QueuedPlayer, id: string) => {
      if (player.gameSlug === gameSlug && player.queuedAt < (this.state.queue.get(clientId)?.queuedAt || 0)) {
        position++
      }
    })
    return position
  }

  private estimateWaitTime(gameSlug: string): number {
    let count = 0
    this.state.queue.forEach((player: QueuedPlayer) => {
      if (player.gameSlug === gameSlug) count++
    })
    // Simple estimate: 10s base + 5s per missing player
    return Math.max(10000, (2 - count) * 5000)
  }

  private findMatches() {
    const now = Date.now()
    const matchedPlayers = new Set<string>()

    // Group players by game
    const gameQueues = new Map<string, QueuedPlayer[]>()
    this.state.queue.forEach((player: QueuedPlayer, id: string) => {
      if (!gameQueues.has(player.gameSlug)) {
        gameQueues.set(player.gameSlug, [])
      }
      gameQueues.get(player.gameSlug)!.push(player)
    })

    // Find matches for each game
    gameQueues.forEach((players: QueuedPlayer[], gameSlug: string) => {
      // Sort by queue time
      players.sort((a, b) => a.queuedAt - b.queuedAt)

      for (let i = 0; i < players.length; i++) {
        if (matchedPlayers.has(players[i].id)) continue

        const player1 = players[i]
        const waitTime = now - player1.queuedAt

        // Try to find a suitable opponent
        for (let j = i + 1; j < players.length; j++) {
          if (matchedPlayers.has(players[j].id)) continue

          const player2 = players[j]
          
          // Check education level compatibility
          if (player1.educationLevel !== player2.educationLevel) continue

          // Check rating difference (relaxed over time)
          const ratingDiff = Math.abs(player1.rating - player2.rating)
          const allowedDiff = this.MAX_RATING_DIFF + Math.floor(waitTime / 10000) * 50

          if (ratingDiff <= allowedDiff) {
            // Match found!
            this.createMatch([player1, player2], gameSlug)
            matchedPlayers.add(player1.id)
            matchedPlayers.add(player2.id)
            break
          }
        }

        // If player waited too long, match with anyone
        if (!matchedPlayers.has(player1.id) && waitTime > this.MAX_WAIT_TIME) {
          for (let j = i + 1; j < players.length; j++) {
            if (matchedPlayers.has(players[j].id)) continue
            
            this.createMatch([player1, players[j]], gameSlug)
            matchedPlayers.add(player1.id)
            matchedPlayers.add(players[j].id)
            break
          }
        }
      }
    })

    // Remove matched players from queue
    matchedPlayers.forEach((id) => {
      this.state.queue.delete(id)
    })
  }

  private async createMatch(players: QueuedPlayer[], gameSlug: string) {
    try {
      // Create a game room
      const room = await this.presence.hget('rooms', 'game')
      
      // Notify players of match
      players.forEach((player) => {
        const client = this.clients.find((c) => c.sessionId === player.id)
        if (client) {
          client.send('match_found', {
            roomId: `game-${Date.now()}`,
            gameSlug,
            opponents: players.filter((p) => p.id !== player.id).map((p) => ({
              id: p.id,
              name: p.name,
              rating: p.rating,
            })),
          })
        }
      })

      this.state.matchesCreated++
      console.log(`Match created for ${gameSlug}: ${players.map(p => p.name).join(' vs ')}`)
    } catch (error) {
      console.error('Failed to create match:', error)
    }
  }
}
