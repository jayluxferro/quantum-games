import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import Stars from '@/components/Stars'
import { getEducationLevelLabel, getEducationLevelColor, cn } from '@/lib/utils'
import { 
  Play, 
  Clock, 
  Target, 
  Users,
  ArrowLeft,
  Lock,
  CheckCircle,
  Zap
} from 'lucide-react'

export default function GameDetailPage() {
  const { slug } = useParams<{ slug: string }>()

  const { data: game, isLoading } = useQuery({
    queryKey: ['game', slug],
    queryFn: () => api.games.get(slug!),
    enabled: !!slug,
  })

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-secondary rounded" />
          <div className="h-64 bg-secondary rounded-lg" />
        </div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Game not found</h1>
        <Button asChild>
          <Link to="/games">Back to Games</Link>
        </Button>
      </div>
    )
  }

  const totalXP = game.levels?.reduce((sum, l) => sum + l.xp_reward, 0) || 0

  return (
    <div className="container py-8">
      <Button variant="ghost" asChild className="mb-6">
        <Link to="/games">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Games
        </Link>
      </Button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero Card */}
          <Card className="overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 relative">
              {game.thumbnail_url ? (
                <img
                  src={game.thumbnail_url}
                  alt={game.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-8xl">🎮</div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium text-white",
                    getEducationLevelColor(game.target_level)
                  )}
                >
                  {getEducationLevelLabel(game.target_level)}
                </span>
              </div>
            </div>
            <CardHeader>
              <CardTitle className="text-3xl">{game.name}</CardTitle>
              <p className="text-muted-foreground">{game.description}</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{game.levels?.length || 0} levels</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span>{totalXP} XP total</span>
                </div>
                {game.multiplayer_enabled && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Multiplayer</span>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <h3 className="font-semibold mb-2">Quantum Concepts</h3>
                <div className="flex flex-wrap gap-2">
                  {game.quantum_concepts.map((concept) => (
                    <Link
                      key={concept}
                      to={`/learn/${concept}`}
                      className="text-sm bg-secondary hover:bg-primary/20 px-3 py-1 rounded-full transition-colors"
                    >
                      {concept.replace(/_/g, ' ')}
                    </Link>
                  ))}
                </div>
              </div>

              <Button size="lg" className="w-full mt-6" variant="quantum" asChild>
                <Link to={`/play/${game.slug}`}>
                  <Play className="h-5 w-5 mr-2" />
                  Start Playing
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Levels */}
          <Card>
            <CardHeader>
              <CardTitle>Levels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {game.levels?.map((level, index) => {
                  const isLocked = index > 0
                  
                  return (
                    <Link
                      key={level.id}
                      to={isLocked ? '#' : `/play/${game.slug}/${level.sequence}`}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border transition-colors",
                        isLocked
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-primary/50"
                      )}
                    >
                      <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold">
                        {isLocked ? (
                          <Lock className="h-4 w-4" />
                        ) : (
                          level.sequence
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{level.title}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            Difficulty {level.difficulty}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            ~{level.estimated_minutes} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {level.xp_reward} XP
                          </span>
                        </div>
                      </div>
                      <Stars count={0} />
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Completion</span>
                    <span>0%</span>
                  </div>
                  <Progress value={0} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-secondary rounded-lg">
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-xs text-muted-foreground">
                      Levels Complete
                    </div>
                  </div>
                  <div className="p-3 bg-secondary rounded-lg">
                    <div className="text-2xl font-bold flex items-center justify-center gap-1">
                      0 <Stars count={0} max={1} size="sm" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Stars Earned
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Game Modes */}
          {game.supported_modes && game.supported_modes.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Game Modes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {game.supported_modes.map((mode) => (
                    <div
                      key={mode}
                      className="flex items-center gap-2 p-2 rounded bg-secondary"
                    >
                      {mode === 'single_player' && '🎮'}
                      {mode === 'turn_based' && '🎯'}
                      {mode === 'real_time' && '⚡'}
                      {mode === 'cooperative' && '🤝'}
                      <span className="text-sm capitalize">
                        {mode.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Objectives */}
          {game.levels?.[0]?.objectives && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Learning Objectives</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {game.levels[0].objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
