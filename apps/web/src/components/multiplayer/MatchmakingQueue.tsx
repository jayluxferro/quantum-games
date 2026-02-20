import { useState, useEffect } from 'react'
import { useMatchmaking } from '@/hooks/useMultiplayer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Loader2, Users, X } from 'lucide-react'

interface MatchmakingQueueProps {
  gameSlug: string
  gameName: string
  playerName: string
  educationLevel: string
  onMatchFound?: (roomId: string, opponents: any[]) => void
  onCancel?: () => void
  className?: string
}

export function MatchmakingQueue({
  gameSlug,
  gameName,
  playerName,
  educationLevel,
  onMatchFound,
  onCancel,
  className,
}: MatchmakingQueueProps) {
  const [searchTime, setSearchTime] = useState(0)
  const [dots, setDots] = useState('')

  const {
    isConnected,
    isJoining,
    isQueued,
    queuePosition,
    matchFound,
    error,
    joinRoom,
    queue,
    dequeue,
    leaveRoom,
  } = useMatchmaking()

  // Connect to matchmaking room on mount
  useEffect(() => {
    joinRoom({})
  }, [])

  // Start queue when connected
  useEffect(() => {
    if (isConnected && !isQueued && !matchFound) {
      queue(gameSlug, playerName, educationLevel)
    }
  }, [isConnected, isQueued, matchFound, gameSlug, playerName, educationLevel, queue])

  // Search timer
  useEffect(() => {
    if (isQueued && !matchFound) {
      const timer = setInterval(() => {
        setSearchTime((t) => t + 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [isQueued, matchFound])

  // Animated dots
  useEffect(() => {
    if (isQueued) {
      const timer = setInterval(() => {
        setDots((d) => (d.length >= 3 ? '' : d + '.'))
      }, 500)
      return () => clearInterval(timer)
    }
  }, [isQueued])

  // Handle match found
  useEffect(() => {
    if (matchFound) {
      onMatchFound?.(matchFound.roomId, matchFound.opponents)
    }
  }, [matchFound, onMatchFound])

  const handleCancel = () => {
    dequeue()
    leaveRoom()
    onCancel?.()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (isJoining) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Connecting to matchmaking...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="py-8 text-center">
          <p className="text-red-500 mb-4">Matchmaking error</p>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={handleCancel}>Go Back</Button>
        </CardContent>
      </Card>
    )
  }

  if (matchFound) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="py-12 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-2xl font-bold mb-2">Match Found!</h3>
          <p className="text-muted-foreground mb-4">
            You're playing against:
          </p>
          <div className="space-y-2 mb-6">
            {matchFound.opponents.map((opp: any) => (
              <div
                key={opp.id}
                className="flex items-center justify-center gap-2"
              >
                <Users className="h-4 w-4" />
                <span className="font-medium">{opp.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({opp.rating} rating)
                </span>
              </div>
            ))}
          </div>
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Loading game...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="text-center">{gameName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center py-8">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-secondary" />
            <div
              className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"
              style={{ animationDuration: '1.5s' }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          
          <h3 className="text-xl font-medium mb-2">
            Finding opponent{dots}
          </h3>
          
          <p className="text-3xl font-mono font-bold mb-2">
            {formatTime(searchTime)}
          </p>
          
          <p className="text-sm text-muted-foreground">
            {queuePosition > 1
              ? `Position ${queuePosition} in queue`
              : 'Searching for players'}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Search Progress</span>
            <span className="text-muted-foreground">
              Expanding search range...
            </span>
          </div>
          <Progress value={Math.min(searchTime * 3, 100)} className="h-2" />
        </div>

        <div className="bg-secondary/50 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-2">Match Settings</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Game:</span>
            <span>{gameName}</span>
            <span className="text-muted-foreground">Level:</span>
            <span className="capitalize">{educationLevel.replace('_', ' ')}</span>
            <span className="text-muted-foreground">Mode:</span>
            <span>Ranked</span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleCancel}
          className="w-full"
        >
          <X className="h-4 w-4 mr-2" />
          Cancel Search
        </Button>
      </CardContent>
    </Card>
  )
}

export default MatchmakingQueue
