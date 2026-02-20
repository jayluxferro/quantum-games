import { useState, useEffect } from 'react'
import { useMultiplayer, Player } from '@/hooks/useMultiplayer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlayerList } from './PlayerList'
import { cn } from '@/lib/utils'
import { Copy, Check, Loader2, Users } from 'lucide-react'

interface GameLobbyProps {
  gameSlug: string
  gameName: string
  playerName: string
  onGameStart?: (players: Player[]) => void
  onError?: (error: Error) => void
  className?: string
}

export function GameLobby({
  gameSlug,
  gameName,
  playerName,
  onGameStart,
  onError,
  className,
}: GameLobbyProps) {
  const [copied, setCopied] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)

  const {
    isConnected,
    isJoining,
    roomState,
    error,
    sessionId,
    room,
    joinRoom,
    leaveRoom,
    setReady,
  } = useMultiplayer({
    roomName: 'game',
    onMessage: (type, data) => {
      if (type === 'game_started') {
        setGameStarted(true)
        onGameStart?.(Array.from(roomState.players.values()))
      }
    },
    onError,
  })

  useEffect(() => {
    if (playerName && gameSlug) {
      joinRoom({ name: playerName, gameSlug, mode: 'multiplayer' })
    }

    return () => {
      leaveRoom()
    }
  }, [playerName, gameSlug])

  const copyRoomCode = () => {
    if (room?.roomId) {
      navigator.clipboard.writeText(room.roomId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const isReady = sessionId ? roomState.players.get(sessionId)?.ready : false
  const allReady = roomState.players.size >= 2 && 
    Array.from(roomState.players.values()).every(p => p.ready)

  if (isJoining) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Joining lobby...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="py-8 text-center">
          <p className="text-red-500 mb-4">Failed to join lobby</p>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => joinRoom({ name: playerName, gameSlug })}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (gameStarted) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="py-12 text-center">
          <div className="text-4xl mb-4">🎮</div>
          <h3 className="text-xl font-bold mb-2">Game Starting!</h3>
          <p className="text-muted-foreground">Loading game...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{gameName} - Lobby</span>
          <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
            <Users className="h-4 w-4" />
            {roomState.players.size}/4
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Room Code */}
        {room?.roomId && (
          <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Room Code</p>
              <p className="font-mono text-lg">{room.roomId}</p>
            </div>
            <Button variant="outline" size="sm" onClick={copyRoomCode}>
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {/* Players */}
        <div>
          <h4 className="font-medium mb-3">Players</h4>
          <PlayerList
            players={roomState.players}
            myId={sessionId}
            showScore={false}
          />
        </div>

        {/* Status */}
        {roomState.players.size < 2 && (
          <p className="text-center text-sm text-muted-foreground">
            Waiting for more players to join...
          </p>
        )}

        {roomState.players.size >= 2 && !allReady && (
          <p className="text-center text-sm text-muted-foreground">
            Waiting for all players to be ready...
          </p>
        )}

        {allReady && (
          <p className="text-center text-sm text-green-500">
            All players ready! Starting game...
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={leaveRoom}
            className="flex-1"
          >
            Leave
          </Button>
          <Button
            variant={isReady ? 'secondary' : 'quantum'}
            onClick={setReady}
            disabled={isReady}
            className="flex-1"
          >
            {isReady ? 'Ready!' : 'Ready Up'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default GameLobby
