import { Server, matchMaker } from '@colyseus/core'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { monitor } from '@colyseus/monitor'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import 'dotenv/config'

import { GameRoom } from './rooms/GameRoom.js'
import { LobbyRoom } from './rooms/LobbyRoom.js'
import { CircuitRoom } from './rooms/CircuitRoom.js'
import { MatchmakingRoom } from './rooms/MatchmakingRoom.js'
import { TurnBasedRoom } from './rooms/TurnBasedRoom.js'
import { ChallengeRoom } from './rooms/ChallengeRoom.js'

const app = express()
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}))
app.use(express.json())

const port = parseInt(process.env.COLYSEUS_PORT || '2567', 10)
const server = createServer(app)

const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
  }),
})

// Room definitions
gameServer.define('lobby', LobbyRoom)
gameServer.define('game', GameRoom)
gameServer.define('circuit', CircuitRoom)
gameServer.define('matchmaking', MatchmakingRoom)
gameServer.define('turn_based', TurnBasedRoom)
gameServer.define('challenge', ChallengeRoom)

// Colyseus monitor dashboard
app.use('/colyseus', monitor())

// Health check endpoint
app.get('/health', async (_, res) => {
  try {
    const rooms = await matchMaker.query({})
    res.json({ 
      status: 'healthy', 
      rooms: rooms.length,
      timestamp: new Date().toISOString(),
    })
  } catch {
    res.json({ status: 'healthy', rooms: 0, timestamp: new Date().toISOString() })
  }
})

// Room info endpoint
app.get('/rooms', async (_, res) => {
  try {
    const rooms = await matchMaker.query({})
    res.json(rooms.map((room: { roomId: string; name: string; clients: number; maxClients: number; metadata: unknown }) => ({
      roomId: room.roomId,
      name: room.name,
      clients: room.clients,
      maxClients: room.maxClients,
      metadata: room.metadata,
    })))
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rooms' })
  }
})

// Available challenges endpoint
app.get('/challenges', (_, res) => {
  res.json([
    { id: 'bell-state', title: 'Create a Bell State', difficulty: 'Easy', timeLimit: 180 },
    { id: 'ghz-state', title: 'Create a GHZ State', difficulty: 'Medium', timeLimit: 300 },
    { id: 'superposition-all', title: 'Equal Superposition', difficulty: 'Easy', timeLimit: 120 },
    { id: 'swap-qubits', title: 'Swap Two Qubits', difficulty: 'Medium', timeLimit: 180 },
  ])
})

server.listen(port, () => {
  console.log(`🎮 Quantum Games Multiplayer Server`)
  console.log(`   Listening on port ${port}`)
  console.log(`   Monitor: http://localhost:${port}/colyseus`)
  console.log(`   Rooms: lobby, game, circuit, matchmaking, turn_based, challenge`)
})
