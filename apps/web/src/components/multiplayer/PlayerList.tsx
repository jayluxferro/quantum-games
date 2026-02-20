import { cn } from '@/lib/utils'
import { Check, Wifi, WifiOff } from 'lucide-react'

export interface PlayerListPlayer {
  id: string
  name: string
  score: number
  ready: boolean
  connected: boolean
}

interface PlayerListProps {
  players: Map<string, PlayerListPlayer> | PlayerListPlayer[]
  currentPlayerId?: string
  myId?: string
  showReady?: boolean
  showScore?: boolean
  className?: string
}

export function PlayerList({
  players,
  currentPlayerId,
  myId,
  showReady = true,
  showScore = true,
  className,
}: PlayerListProps) {
  const playerArray = Array.isArray(players)
    ? players
    : Array.from(players.values())

  if (playerArray.length === 0) {
    return (
      <div className={cn('text-center text-muted-foreground py-4', className)}>
        Waiting for players...
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {playerArray.map((player) => (
        <div
          key={player.id}
          className={cn(
            'flex items-center justify-between p-3 rounded-lg bg-secondary/50',
            currentPlayerId === player.id && 'ring-2 ring-primary',
            player.id === myId && 'bg-primary/10'
          )}
        >
          <div className="flex items-center gap-3">
            {player.connected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="font-medium">
              {player.name}
              {player.id === myId && (
                <span className="text-xs text-muted-foreground ml-2">(You)</span>
              )}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {showScore && (
              <span className="text-sm font-mono">{player.score} pts</span>
            )}
            {showReady && (
              <div
                className={cn(
                  'flex items-center gap-1 text-xs',
                  player.ready ? 'text-green-500' : 'text-muted-foreground'
                )}
              >
                {player.ready && <Check className="h-3 w-3" />}
                {player.ready ? 'Ready' : 'Not Ready'}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default PlayerList
