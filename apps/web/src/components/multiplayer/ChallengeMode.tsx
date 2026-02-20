import { useState, useEffect } from 'react'
import { useChallenge } from '@/hooks/useMultiplayer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { 
  Clock, 
  HelpCircle, 
  Loader2, 
  Trophy, 
  Upload,
  Users 
} from 'lucide-react'

interface ChallengeModeProps {
  challengeId?: string
  playerName: string
  onComplete?: (results: any) => void
  className?: string
}

export function ChallengeMode({
  challengeId = 'bell-state',
  playerName,
  onComplete,
  className,
}: ChallengeModeProps) {
  const [solution, setSolution] = useState('')
  const [score, setScore] = useState(0)

  const {
    isConnected,
    isJoining,
    roomState,
    sessionId,
    challengeInfo,
    hasSubmitted,
    leaderboard,
    results,
    error,
    joinRoom,
    leaveRoom,
    startChallenge,
    submitSolution,
    requestHint,
  } = useChallenge()

  useEffect(() => {
    joinRoom({ name: playerName, challengeId })
    return () => leaveRoom()
  }, [playerName, challengeId])

  useEffect(() => {
    if (results) {
      onComplete?.(results)
    }
  }, [results, onComplete])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (isJoining || !isConnected) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Joining challenge...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="py-8 text-center">
          <p className="text-red-500 mb-4">Error joining challenge</p>
          <Button onClick={() => joinRoom({ name: playerName, challengeId })}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Results screen
  if (results) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <CardTitle className="text-center">
            {challengeInfo?.title || 'Challenge'} - Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {results.winner && (
            <div className="text-center py-4">
              <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
              <h3 className="text-xl font-bold">
                {results.winner.name} Wins!
              </h3>
              <p className="text-muted-foreground">
                Score: {results.winner.score}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-medium">Final Standings</h4>
            {results.results.map((r: any) => (
              <div
                key={r.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg bg-secondary/50',
                  r.id === sessionId && 'ring-2 ring-primary'
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                      r.rank === 1 && 'bg-yellow-500 text-black',
                      r.rank === 2 && 'bg-gray-400 text-black',
                      r.rank === 3 && 'bg-amber-700 text-white',
                      r.rank > 3 && 'bg-secondary'
                    )}
                  >
                    {r.rank}
                  </span>
                  <span className="font-medium">{r.name}</span>
                </div>
                <span className="font-mono">{r.score} pts</span>
              </div>
            ))}
          </div>

          <Button onClick={leaveRoom} className="w-full">
            Leave Challenge
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Waiting room
  if (roomState.status === 'waiting') {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <CardTitle className="text-center">
            {challengeInfo?.title || 'Challenge'} - Lobby
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {challengeInfo && (
            <div className="bg-secondary/50 rounded-lg p-4">
              <p className="text-sm">{challengeInfo.description}</p>
              <div className="flex gap-4 mt-3 text-sm">
                <span>
                  <Clock className="h-4 w-4 inline mr-1" />
                  {challengeInfo.timeLimit}s
                </span>
                <span>
                  <Trophy className="h-4 w-4 inline mr-1" />
                  {challengeInfo.maxScore} max
                </span>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Participants</h4>
              <span className="text-sm text-muted-foreground">
                <Users className="h-4 w-4 inline mr-1" />
                {roomState.players.size}
              </span>
            </div>
            <div className="space-y-2">
              {Array.from(roomState.players.values()).map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2 bg-secondary/30 rounded"
                >
                  <span>{player.name}</span>
                  {player.id === sessionId && (
                    <span className="text-xs text-muted-foreground">(You)</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button onClick={startChallenge} className="w-full" variant="quantum">
            Start Challenge
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Active challenge
  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{challengeInfo?.title || 'Challenge'}</CardTitle>
          <div className="flex items-center gap-2 text-lg font-mono">
            <Clock className="h-5 w-5" />
            {formatTime(roomState.timeRemaining || 0)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timer progress */}
        <Progress
          value={
            ((roomState.timeRemaining || 0) / (challengeInfo?.timeLimit || 180)) *
            100
          }
          className="h-2"
        />

        {/* Challenge description */}
        <div className="bg-secondary/50 rounded-lg p-4">
          <p>{challengeInfo?.description}</p>
        </div>

        {/* Solution input (simplified - would be circuit builder in real impl) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Solution</label>
          <textarea
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            placeholder="Enter your circuit solution..."
            className="w-full h-32 p-3 bg-secondary rounded-lg resize-none"
            disabled={hasSubmitted}
          />
        </div>

        {/* Score input (simplified) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Self-reported Score</label>
          <input
            type="number"
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            min={0}
            max={challengeInfo?.maxScore || 100}
            className="w-full p-3 bg-secondary rounded-lg"
            disabled={hasSubmitted}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={requestHint}
            disabled={hasSubmitted}
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Hint (-5 pts)
          </Button>
          <Button
            variant="quantum"
            onClick={() => submitSolution(solution, score)}
            disabled={hasSubmitted || !solution}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            {hasSubmitted ? 'Submitted!' : 'Submit Solution'}
          </Button>
        </div>

        {/* Live leaderboard */}
        {leaderboard.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Live Standings</h4>
            <div className="space-y-1">
              {leaderboard.slice(0, 5).map((entry: any) => (
                <div
                  key={entry.id}
                  className={cn(
                    'flex items-center justify-between p-2 rounded text-sm',
                    entry.id === sessionId && 'bg-primary/20'
                  )}
                >
                  <span>
                    #{entry.rank} {entry.name}
                  </span>
                  <span className="font-mono">{entry.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ChallengeMode
