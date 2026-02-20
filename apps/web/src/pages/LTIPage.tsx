import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import GameLoader from '@/components/GameLoader'
import { cn } from '@/lib/utils'
import { CheckCircle, Loader2, Star, Trophy } from 'lucide-react'

interface LTIContext {
  userId: string
  userName: string
  contextId: string
  contextTitle: string
  resourceLinkId: string
  gameSlug: string
  level?: number
  returnUrl?: string
  lineitemUrl?: string
}

export default function LTIPage() {
  const [searchParams] = useSearchParams()
  const [ltiContext, setLtiContext] = useState<LTIContext | null>(null)
  const [gameCompleted, setGameCompleted] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [finalStars, setFinalStars] = useState(0)
  const [gradeSubmitted, setGradeSubmitted] = useState(false)
  const [submittingGrade, setSubmittingGrade] = useState(false)

  const { setUser, setToken } = useAuthStore()

  // Parse LTI parameters from URL
  useEffect(() => {
    const context: LTIContext = {
      userId: searchParams.get('user_id') || '',
      userName: searchParams.get('user_name') || 'Student',
      contextId: searchParams.get('context_id') || '',
      contextTitle: searchParams.get('context_title') || 'Course',
      resourceLinkId: searchParams.get('resource_link_id') || '',
      gameSlug: searchParams.get('game') || '',
      level: searchParams.get('level') ? parseInt(searchParams.get('level')!, 10) : undefined,
      returnUrl: searchParams.get('return_url') || undefined,
      lineitemUrl: searchParams.get('lineitem_url') || undefined,
    }

    if (context.userId && context.gameSlug) {
      setLtiContext(context)
      
      // Set up minimal auth for LTI user
      setUser({
        id: context.userId,
        name: context.userName,
        email: '',
        education_level: 'basic_school',
        xp: 0,
      })
      
      // Get LTI token from params if provided
      const token = searchParams.get('token')
      if (token) {
        setToken(token)
      }
    }
  }, [searchParams, setUser, setToken])

  const { data: game, isLoading: gameLoading } = useQuery({
    queryKey: ['game', ltiContext?.gameSlug],
    queryFn: () => api.games.get(ltiContext!.gameSlug),
    enabled: !!ltiContext?.gameSlug,
  })

  const handleGameComplete = useCallback(async (score: number, stars: number) => {
    setFinalScore(score)
    setFinalStars(stars)
    setGameCompleted(true)

    // Submit grade to LMS
    if (ltiContext?.lineitemUrl) {
      setSubmittingGrade(true)
      try {
        const gradeValue = Math.round((score / 100) * 100) // Normalize to 0-100
        
        await fetch(`/lti/grades/${ltiContext.contextId}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lineitemUrl: ltiContext.lineitemUrl,
            userId: ltiContext.userId,
            score: gradeValue,
            activityProgress: 'Completed',
            gradingProgress: 'FullyGraded',
            comment: `Completed ${game?.name} with ${stars} star${stars !== 1 ? 's' : ''}`,
          }),
        })
        
        setGradeSubmitted(true)
      } catch (error) {
        console.error('Failed to submit grade:', error)
      } finally {
        setSubmittingGrade(false)
      }
    }
  }, [ltiContext, game])

  const handleReturn = () => {
    if (ltiContext?.returnUrl) {
      window.location.href = ltiContext.returnUrl
    }
  }

  const handleRetry = () => {
    setGameCompleted(false)
    setGradeSubmitted(false)
  }

  // Loading state
  if (!ltiContext || gameLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading assignment...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <div className="text-4xl mb-4">❓</div>
            <h2 className="text-xl font-bold mb-2">Game Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The requested game "{ltiContext.gameSlug}" could not be found.
            </p>
            {ltiContext.returnUrl && (
              <Button onClick={handleReturn}>Return to {ltiContext.contextTitle}</Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Completion state
  if (gameCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Trophy className="h-16 w-16 text-yellow-500" />
            </div>
            <CardTitle className="text-2xl">Assignment Complete!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stars */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3].map((i) => (
                <Star
                  key={i}
                  className={cn(
                    'h-10 w-10 transition-all',
                    i <= finalStars
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-600'
                  )}
                />
              ))}
            </div>

            {/* Score */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Your Score</p>
              <p className="text-4xl font-bold text-primary">{finalScore}</p>
            </div>

            {/* Grade submission status */}
            {ltiContext.lineitemUrl && (
              <div className={cn(
                'flex items-center justify-center gap-2 p-3 rounded-lg',
                gradeSubmitted ? 'bg-green-500/10' : 'bg-secondary'
              )}>
                {submittingGrade ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Submitting grade...</span>
                  </>
                ) : gradeSubmitted ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-500">Grade submitted to {ltiContext.contextTitle}</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Grade submission pending...</span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleRetry} className="flex-1">
                Try Again
              </Button>
              {ltiContext.returnUrl && (
                <Button onClick={handleReturn} className="flex-1">
                  Return to Course
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Game play state
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-secondary/50 border-b px-4 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-semibold">{game.name}</h1>
            <p className="text-sm text-muted-foreground">
              {ltiContext.contextTitle} • {ltiContext.userName}
            </p>
          </div>
          {ltiContext.returnUrl && (
            <Button variant="ghost" size="sm" onClick={handleReturn}>
              Return to Course
            </Button>
          )}
        </div>
      </div>

      {/* Game */}
      <div className="max-w-4xl mx-auto p-4">
        <GameLoader
          gameSlug={ltiContext.gameSlug}
          level={ltiContext.level}
          onComplete={handleGameComplete}
          className="rounded-lg overflow-hidden shadow-lg"
        />

        {/* Level info */}
        {game.levels && ltiContext.level && (
          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">
                    Level {ltiContext.level}: {game.levels.find(l => l.sequence === ltiContext.level)?.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Complete this level to submit your grade
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">XP Reward</p>
                  <p className="text-lg font-bold text-primary">
                    +{game.levels.find(l => l.sequence === ltiContext.level)?.xp_reward || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
