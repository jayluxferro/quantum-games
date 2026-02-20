import { useState, useEffect, useCallback, useRef } from 'react'
import * as Colyseus from 'colyseus.js'

const MULTIPLAYER_URL = import.meta.env.VITE_MULTIPLAYER_URL || 'ws://localhost:2567'

export interface Player {
  id: string
  name: string
  score: number
  ready: boolean
  connected: boolean
}

export interface RoomState {
  status: string
  players: Map<string, Player>
  currentPlayerId?: string
  timeRemaining?: number
  winner?: string
}

interface UseMultiplayerOptions {
  roomName: string
  onStateChange?: (state: RoomState) => void
  onMessage?: (type: string, data: any) => void
  onError?: (error: Error) => void
}

export function useMultiplayer(options: UseMultiplayerOptions) {
  const { roomName, onStateChange, onMessage, onError } = options
  
  const clientRef = useRef<Colyseus.Client | null>(null)
  const roomRef = useRef<Colyseus.Room | null>(null)
  
  const [isConnected, setIsConnected] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [roomState, setRoomState] = useState<RoomState>({
    status: 'disconnected',
    players: new Map(),
  })
  const [error, setError] = useState<Error | null>(null)

  // Initialize client
  useEffect(() => {
    clientRef.current = new Colyseus.Client(MULTIPLAYER_URL)
    
    return () => {
      if (roomRef.current) {
        roomRef.current.leave()
        roomRef.current = null
      }
    }
  }, [])

  const joinRoom = useCallback(async (joinOptions: Record<string, any> = {}) => {
    if (!clientRef.current || isJoining) return

    setIsJoining(true)
    setError(null)

    try {
      const room = await clientRef.current.joinOrCreate(roomName, joinOptions)
      roomRef.current = room
      setIsConnected(true)

      // Set up state change listener
      room.onStateChange((state: any) => {
        const players = new Map<string, Player>()
        if (state.players) {
          state.players.forEach((player: any, id: string) => {
            players.set(id, {
              id: player.id,
              name: player.name,
              score: player.score,
              ready: player.ready,
              connected: player.connected,
            })
          })
        }

        const newState: RoomState = {
          status: state.status || 'unknown',
          players,
          currentPlayerId: state.currentPlayerId,
          timeRemaining: state.timeRemaining,
          winner: state.winner,
        }

        setRoomState(newState)
        onStateChange?.(newState)
      })

      // Set up message listeners
      room.onMessage('*', (type: string, message: any) => {
        onMessage?.(type, message)
      })

      room.onLeave((code) => {
        setIsConnected(false)
        setRoomState(prev => ({ ...prev, status: 'disconnected' }))
        console.log(`Left room with code ${code}`)
      })

      room.onError((code, message) => {
        const err = new Error(`Room error ${code}: ${message}`)
        setError(err)
        onError?.(err)
      })

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to join room')
      setError(error)
      onError?.(error)
    } finally {
      setIsJoining(false)
    }
  }, [roomName, onStateChange, onMessage, onError, isJoining])

  const leaveRoom = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.leave()
      roomRef.current = null
      setIsConnected(false)
      setRoomState({ status: 'disconnected', players: new Map() })
    }
  }, [])

  const sendMessage = useCallback((type: string, data?: any) => {
    if (roomRef.current) {
      roomRef.current.send(type, data)
    }
  }, [])

  const setReady = useCallback(() => {
    sendMessage('ready')
  }, [sendMessage])

  return {
    client: clientRef.current,
    room: roomRef.current,
    isConnected,
    isJoining,
    roomState,
    error,
    sessionId: roomRef.current?.sessionId,
    joinRoom,
    leaveRoom,
    sendMessage,
    setReady,
  }
}

export function useMatchmaking() {
  const [isQueued, setIsQueued] = useState(false)
  const [queuePosition, setQueuePosition] = useState(0)
  const [matchFound, setMatchFound] = useState<{ roomId: string; opponents: any[] } | null>(null)

  const multiplayer = useMultiplayer({
    roomName: 'matchmaking',
    onMessage: (type, data) => {
      switch (type) {
        case 'queued':
          setIsQueued(true)
          setQueuePosition(data.position)
          break
        case 'match_found':
          setMatchFound(data)
          setIsQueued(false)
          break
      }
    },
  })

  const queue = useCallback((gameSlug: string, name: string, educationLevel: string) => {
    multiplayer.sendMessage('queue', { gameSlug, name, educationLevel })
  }, [multiplayer])

  const dequeue = useCallback(() => {
    multiplayer.sendMessage('dequeue')
    setIsQueued(false)
    setMatchFound(null)
  }, [multiplayer])

  return {
    ...multiplayer,
    isQueued,
    queuePosition,
    matchFound,
    queue,
    dequeue,
  }
}

export function useTurnBased() {
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [turnNumber, setTurnNumber] = useState(0)
  const [history, setHistory] = useState<any[]>([])

  const multiplayer = useMultiplayer({
    roomName: 'turn_based',
    onStateChange: (state) => {
      if (multiplayer.sessionId) {
        setIsMyTurn(state.currentPlayerId === multiplayer.sessionId)
      }
    },
    onMessage: (type, data) => {
      switch (type) {
        case 'turn_changed':
          setTurnNumber(data.turn)
          break
        case 'action':
          setHistory(prev => [...prev, data])
          break
      }
    },
  })

  const performAction = useCallback((actionType: string, data: any) => {
    if (isMyTurn) {
      multiplayer.sendMessage('action', { actionType, data })
    }
  }, [isMyTurn, multiplayer])

  const endTurn = useCallback(() => {
    if (isMyTurn) {
      multiplayer.sendMessage('end_turn')
    }
  }, [isMyTurn, multiplayer])

  return {
    ...multiplayer,
    isMyTurn,
    turnNumber,
    history,
    performAction,
    endTurn,
  }
}

export function useChallenge() {
  const [challengeInfo, setChallengeInfo] = useState<any>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [results, setResults] = useState<any>(null)

  const multiplayer = useMultiplayer({
    roomName: 'challenge',
    onMessage: (type, data) => {
      switch (type) {
        case 'challenge_info':
          setChallengeInfo(data.challenge)
          break
        case 'challenge_started':
          setChallengeInfo(data.challenge)
          setHasSubmitted(false)
          setLeaderboard([])
          break
        case 'submission_confirmed':
          setHasSubmitted(true)
          break
        case 'new_submission':
          setLeaderboard(prev => {
            const updated = prev.filter(p => p.id !== data.id)
            updated.push(data)
            return updated.sort((a, b) => a.rank - b.rank)
          })
          break
        case 'challenge_ended':
          setResults(data)
          break
      }
    },
  })

  const startChallenge = useCallback(() => {
    multiplayer.sendMessage('start')
  }, [multiplayer])

  const submitSolution = useCallback((solution: string, score: number) => {
    if (!hasSubmitted) {
      multiplayer.sendMessage('submit', { solution, score })
    }
  }, [hasSubmitted, multiplayer])

  const requestHint = useCallback(() => {
    multiplayer.sendMessage('request_hint')
  }, [multiplayer])

  return {
    ...multiplayer,
    challengeInfo,
    hasSubmitted,
    leaderboard,
    results,
    startChallenge,
    submitSolution,
    requestHint,
  }
}
