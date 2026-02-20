import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useGameStore } from '@/stores/gameStore'
import { useAuthStore } from '@/stores/authStore'
import { formatTime } from '@/lib/utils'
import GameLoader from '@/components/GameLoader'
import { 
  ArrowLeft, 
  Maximize,
  Star
} from 'lucide-react'

export default function PlayPage() {
  const { slug, level } = useParams<{ slug: string; level?: string }>()
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const [gameCompleted, setGameCompleted] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [finalStars, setFinalStars] = useState(0)

  const { token } = useAuthStore()
  const {
    setCurrentGame,
    setCurrentLevel,
    setScore,
    setComplete,
    resetGame,
  } = useGameStore()

  const { data: game, isLoading } = useQuery({
    queryKey: ['game', slug],
    queryFn: () => api.games.get(slug!),
    enabled: !!slug,
  })

  const currentLevelNum = level ? parseInt(level, 10) : 1
  const currentLevelData = game?.levels?.find((l) => l.sequence === currentLevelNum)

  useEffect(() => {
    if (slug) {
      setCurrentGame(slug)
      setCurrentLevel(currentLevelNum)
      resetGame()
      setGameCompleted(false)
    }
  }, [slug, currentLevelNum, setCurrentGame, setCurrentLevel, resetGame])

  const handleGameComplete = useCallback(async (score: number, stars: number) => {
    setFinalScore(score)
    setFinalStars(stars)
    setScore(score)
    setComplete(true)
    setGameCompleted(true)

    if (token && currentLevelData) {
      try {
        await api.progress.complete(
          currentLevelData.id,
          { score, time_seconds: 0 },
          token
        )
      } catch (e) {
        console.error('Failed to save progress:', e)
      }
    }
  }, [token, currentLevelData, setScore, setComplete])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      gameContainerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const handleRetry = () => {
    setGameCompleted(false)
    resetGame()
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-secondary rounded mb-4" />
          <div className="aspect-[4/3] bg-secondary rounded-lg" />
        </div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Game not found</h1>
        <Button asChild>
          <Link to="/games">Browse Games</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container py-4 max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/games/${slug}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="font-bold">{game.name}</h1>
            {currentLevelData && (
              <p className="text-sm text-muted-foreground">
                Level {currentLevelNum}: {currentLevelData.title}
              </p>
            )}
          </div>
        </div>
        
        <Button variant="secondary" size="icon" onClick={toggleFullscreen}>
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      <div ref={gameContainerRef} className="relative">
        {gameCompleted ? (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="aspect-[4/3] bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-2xl font-bold mb-2">Level Complete!</h2>
                  <div className="flex justify-center gap-1 mb-4">
                    {[1, 2, 3].map((i) => (
                      <Star
                        key={i}
                        className={`h-8 w-8 ${
                          i <= finalStars
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Score: {finalScore}
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button variant="outline" onClick={handleRetry}>
                      Play Again
                    </Button>
                    {currentLevelNum < (game.levels?.length || 0) && (
                      <Button variant="quantum" asChild>
                        <Link to={`/play/${slug}/${currentLevelNum + 1}`}>
                          Next Level
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <GameLoader
            key={`${slug}-${currentLevelNum}-${gameCompleted}`}
            gameSlug={slug!}
            level={currentLevelNum}
            onComplete={handleGameComplete}
            className="rounded-lg overflow-hidden"
          />
        )}
      </div>

      {currentLevelData && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <h3 className="font-semibold mb-1">Objectives</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {currentLevelData.objectives?.map((obj, i) => (
                    <li key={i}>• {obj}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Concepts</h3>
                <div className="flex flex-wrap gap-1">
                  {currentLevelData.quantum_concepts?.map((c, i) => (
                    <span
                      key={i}
                      className="text-xs bg-secondary px-2 py-1 rounded-full"
                    >
                      {typeof c === 'string' ? c.replace(/_/g, ' ') : c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-sm text-muted-foreground">XP Reward</div>
                <div className="text-xl font-bold text-primary">
                  +{currentLevelData.xp_reward} XP
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
