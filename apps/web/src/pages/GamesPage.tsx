import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import GameCard from '@/components/GameCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getEducationLevelLabel } from '@/lib/utils'
import { Gamepad2, Filter, X } from 'lucide-react'

const educationLevels = [
  'basic_school',
  'junior_high',
  'senior_high',
  'undergraduate',
  'postgraduate',
]

export default function GamesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedLevel = searchParams.get('level') || ''
  const multiplayerOnly = searchParams.get('multiplayer') === 'true'

  const { data: games, isLoading } = useQuery({
    queryKey: ['games', selectedLevel, multiplayerOnly],
    queryFn: () =>
      api.games.list({
        education_level: selectedLevel || undefined,
        multiplayer: multiplayerOnly || undefined,
      }),
  })

  const { data: concepts } = useQuery({
    queryKey: ['concepts'],
    queryFn: () => api.games.getConcepts(),
  })

  const setFilter = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams)
    if (value) {
      newParams.set(key, value)
    } else {
      newParams.delete(key)
    }
    setSearchParams(newParams)
  }

  const clearFilters = () => {
    setSearchParams(new URLSearchParams())
  }

  const hasFilters = selectedLevel || multiplayerOnly

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="md:w-64 shrink-0">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </h2>
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Education Level</h3>
                  <div className="space-y-1">
                    {educationLevels.map((level) => (
                      <button
                        key={level}
                        onClick={() =>
                          setFilter('level', selectedLevel === level ? null : level)
                        }
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          selectedLevel === level
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-secondary'
                        }`}
                      >
                        {getEducationLevelLabel(level)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Game Mode</h3>
                  <button
                    onClick={() =>
                      setFilter('multiplayer', multiplayerOnly ? null : 'true')
                    }
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      multiplayerOnly
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-secondary'
                    }`}
                  >
                    Multiplayer Only
                  </button>
                </div>

                {concepts && concepts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Concepts</h3>
                    <div className="flex flex-wrap gap-1">
                      {concepts.slice(0, 10).map((concept) => (
                        <span
                          key={concept}
                          className="text-xs bg-secondary px-2 py-1 rounded-full"
                        >
                          {concept.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Games Grid */}
        <main className="flex-1">
          <div className="flex items-center gap-4 mb-6">
            <Gamepad2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Games</h1>
              <p className="text-muted-foreground">
                {games?.length || 0} games available
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="h-80 animate-pulse bg-secondary" />
              ))}
            </div>
          ) : games && games.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Gamepad2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No games found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters to find more games.
              </p>
              <Button onClick={clearFilters}>Clear Filters</Button>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}
