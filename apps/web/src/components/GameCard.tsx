import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getEducationLevelLabel, getEducationLevelColor, cn } from '@/lib/utils'
import { Users, Clock, Star, Play } from 'lucide-react'
import type { Game } from '@/lib/api'

interface GameCardProps {
  game: Game
  progress?: {
    completed: number
    total: number
    stars: number
  }
}

export default function GameCard({ game, progress }: GameCardProps) {
  return (
    <Card className="group hover:border-primary/50 transition-colors overflow-hidden">
      <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden">
        {game.thumbnail_url ? (
          <img
            src={game.thumbnail_url}
            alt={game.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-6xl opacity-50">🎮</div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <span
            className={cn(
              "px-2 py-1 rounded text-xs font-medium text-white",
              getEducationLevelColor(game.target_level)
            )}
          >
            {getEducationLevelLabel(game.target_level)}
          </span>
          {game.multiplayer_enabled && (
            <span className="flex items-center gap-1 text-xs bg-background/80 px-2 py-1 rounded">
              <Users className="h-3 w-3" />
              Multiplayer
            </span>
          )}
        </div>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{game.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {game.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-1">
          {game.quantum_concepts.slice(0, 3).map((concept) => (
            <span
              key={concept}
              className="text-xs bg-secondary px-2 py-0.5 rounded-full"
            >
              {concept.replace(/_/g, ' ')}
            </span>
          ))}
          {game.quantum_concepts.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{game.quantum_concepts.length - 3} more
            </span>
          )}
        </div>
        {progress && (
          <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {progress.completed}/{progress.total} levels
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-400" />
              {progress.stars}
            </span>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full group-hover:quantum-gradient">
          <Link to={`/games/${game.slug}`}>
            <Play className="h-4 w-4 mr-2" />
            {progress?.completed ? 'Continue' : 'Play'}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
