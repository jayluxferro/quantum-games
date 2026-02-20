import { Room, Client, matchMaker } from '@colyseus/core'
import { Schema, type, MapSchema } from '@colyseus/schema'

class LobbyPlayer extends Schema {
  @type('string') id: string = ''
  @type('string') name: string = ''
  @type('string') status: string = 'idle'
}

class LobbyState extends Schema {
  @type({ map: LobbyPlayer }) players = new MapSchema<LobbyPlayer>()
  @type('number') gamesInProgress: number = 0
}

export class LobbyRoom extends Room<LobbyState> {
  maxClients = 100

  onCreate() {
    this.autoDispose = false
    this.setState(new LobbyState())

    this.onMessage('find_match', (client, options: { gameSlug: string; mode: string }) => {
      this.matchmake(client, options)
    })

    this.onMessage('cancel_match', (client) => {
      const player = this.state.players.get(client.sessionId)
      if (player) {
        player.status = 'idle'
      }
    })
  }

  onJoin(client: Client, options: { name?: string }) {
    const player = new LobbyPlayer()
    player.id = client.sessionId
    player.name = options.name || `Guest ${client.sessionId.substring(0, 6)}`
    player.status = 'idle'

    this.state.players.set(client.sessionId, player)
    console.log(`${player.name} joined lobby`)
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId)
  }

  async matchmake(client: Client, options: { gameSlug: string; mode: string }) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    player.status = 'searching'

    try {
      const room = await this.presence.hget('matchmaking', `${options.gameSlug}:${options.mode}`)
      
      if (room) {
        client.send('match_found', { roomId: room })
        player.status = 'matched'
      } else {
        const newRoom = await matchMaker.createRoom('game', {
          gameSlug: options.gameSlug,
          mode: options.mode,
        })
        
        await this.presence.hset('matchmaking', `${options.gameSlug}:${options.mode}`, newRoom.roomId)
        
        setTimeout(() => {
          this.presence.hdel('matchmaking', `${options.gameSlug}:${options.mode}`)
        }, 30000)

        client.send('match_found', { roomId: newRoom.roomId })
        player.status = 'matched'
      }
    } catch (error) {
      console.error('Matchmaking error:', error)
      player.status = 'idle'
      client.send('match_error', { message: 'Failed to find match' })
    }
  }
}
