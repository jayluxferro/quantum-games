import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GameLobby, MatchmakingQueue, ChallengeMode } from '@/components/multiplayer'
import { cn, getLevelLabel } from '@/lib/utils'
import { ArrowLeft, Gamepad2, Search, Swords, Trophy, Users } from 'lucide-react'

type MultiplayerMode = 'select' | 'lobby' | 'matchmaking' | 'challenge'

export default function MultiplayerPage() {
  const [searchParams] = useSearchParams()
  const gameSlug = searchParams.get('game')
  const initialMode = searchParams.get('mode') as MultiplayerMode | null

  const { user, isAuthenticated } = useAuthStore()
  const [mode, setMode] = useState<MultiplayerMode>(initialMode || 'select')
  const [selectedGame, setSelectedGame] = useState<string | null>(gameSlug)
  const [playerName, setPlayerName] = useState(user?.name || 'Player')

  const { data: games } = useQuery({
    queryKey: ['games'],
    queryFn: () => api.games.list(),
  })

  const multiplayerGames = games?.filter(
    (g) => g.multiplayer_support && g.is_active
  )

  const selectedGameData = multiplayerGames?.find(
    (g) => g.slug === selectedGame
  )

  if (!isAuthenticated) {
    return (
      <div className="container py-12 text-center">
        <Gamepad2 className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold mb-4">Sign in to Play Multiplayer</h1>
        <p className="text-muted-foreground mb-6">
          Multiplayer features require an account to track your progress and
          match you with other players.
        </p>
        <Button asChild>
          <Link to="/login">Sign In</Link>
        </Button>
      </div>
    )
  }

  // Game selection
  if (mode === 'select') {
    return (
      <div className="container py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" asChild>
            <Link to="/games">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Multiplayer</h1>
            <p className="text-muted-foreground">
              Compete with players worldwide
            </p>
          </div>
        </div>

        {/* Player name input */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <label className="text-sm font-medium mb-2 block">
              Display Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full p-2 bg-secondary rounded-lg"
              maxLength={20}
            />
          </CardContent>
        </Card>

        {/* Mode selection */}
        <h2 className="text-lg font-semibold mb-4">Choose a Mode</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setMode('lobby')}
          >
            <CardContent className="p-6 text-center">
              <Users className="h-10 w-10 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Create/Join Lobby</h3>
              <p className="text-sm text-muted-foreground">
                Play with friends using a room code
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setMode('matchmaking')}
          >
            <CardContent className="p-6 text-center">
              <Search className="h-10 w-10 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Quick Match</h3>
              <p className="text-sm text-muted-foreground">
                Find opponents automatically
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setMode('challenge')}
          >
            <CardContent className="p-6 text-center">
              <Trophy className="h-10 w-10 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Challenges</h3>
              <p className="text-sm text-muted-foreground">
                Compete in quantum challenges
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Game selection */}
        <h2 className="text-lg font-semibold mb-4">Select a Game</h2>
        {!multiplayerGames?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Swords className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No multiplayer games available yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {multiplayerGames.map((game) => (
              <Card
                key={game.id}
                className={cn(
                  'cursor-pointer transition-colors',
                  selectedGame === game.slug
                    ? 'border-primary'
                    : 'hover:border-primary/50'
                )}
                onClick={() => setSelectedGame(game.slug)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="text-4xl">{game.thumbnail_url || '🎮'}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{game.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {game.description}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                        {getLevelLabel(game.education_level)}
                      </span>
                      {game.multiplayer_support && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                          Multiplayer
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Show appropriate component based on mode
  if (!selectedGame && mode !== 'challenge') {
    return (
      <div className="container py-8 max-w-xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Please select a game first</p>
            <Button onClick={() => setMode('select')}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8 max-w-xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => setMode('select')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Selection
        </Button>
      </div>

      {mode === 'lobby' && selectedGameData && (
        <GameLobby
          gameSlug={selectedGame!}
          gameName={selectedGameData.name}
          playerName={playerName}
          onGameStart={(players) => {
            console.log('Game starting with players:', players)
          }}
        />
      )}

      {mode === 'matchmaking' && selectedGameData && (
        <MatchmakingQueue
          gameSlug={selectedGame!}
          gameName={selectedGameData.name}
          playerName={playerName}
          educationLevel={user?.education_level || 'basic_school'}
          onMatchFound={(roomId, opponents) => {
            console.log('Match found:', roomId, opponents)
          }}
          onCancel={() => setMode('select')}
        />
      )}

      {mode === 'challenge' && (
        <ChallengeMode
          playerName={playerName}
          onComplete={(results) => {
            console.log('Challenge complete:', results)
          }}
        />
      )}
    </div>
  )
}
