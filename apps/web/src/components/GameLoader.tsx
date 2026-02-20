import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { createGame, games } from '@/games'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface GameLoaderProps {
  gameSlug: string
  level?: number
  onComplete?: (score: number, stars: number) => void
  onError?: (error: string) => void
  className?: string
}

export function GameLoader({
  gameSlug,
  level = 1,
  onComplete,
  onError,
  className,
}: GameLoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Store callbacks in refs to avoid re-creating game on callback changes
  const onCompleteRef = useRef(onComplete)
  const onErrorRef = useRef(onError)
  
  useEffect(() => {
    onCompleteRef.current = onComplete
    onErrorRef.current = onError
  }, [onComplete, onError])

  useEffect(() => {
    if (!containerRef.current) return

    setIsLoading(true)
    setError(null)

    if (!games[gameSlug]) {
      const errorMsg = `Game "${gameSlug}" is not yet implemented`
      setError(errorMsg)
      onErrorRef.current?.(errorMsg)
      setIsLoading(false)
      return
    }

    try {
      const game = createGame(gameSlug, containerRef.current, (score, stars) => {
        onCompleteRef.current?.(score, stars)
      })

      if (game) {
        gameRef.current = game

        game.events.once('ready', () => {
          setIsLoading(false)
        })

        setTimeout(() => {
          setIsLoading(false)
        }, 1000)
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to load game'
      setError(errorMsg)
      onErrorRef.current?.(errorMsg)
      setIsLoading(false)
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
    }
  }, [gameSlug, level])

  if (error) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center bg-secondary/50 rounded-lg',
          className
        )}
        style={{ aspectRatio: '4/3' }}
      >
        <div className="text-6xl mb-4">🎮</div>
        <p className="text-lg font-medium mb-2">Game Coming Soon</p>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {error}
        </p>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-background/80 z-10"
          style={{ aspectRatio: '4/3', minHeight: '450px' }}
        >
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Loading game...</p>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden bg-[#1a1a2e]"
        style={{ aspectRatio: '4/3', minHeight: '450px' }}
      />
    </div>
  )
}

export default GameLoader
