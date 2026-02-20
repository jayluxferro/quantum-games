import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Home, Search } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="container py-20 text-center">
      <div className="text-8xl mb-8">🔮</div>
      <h1 className="text-4xl font-bold mb-4">
        Lost in <span className="quantum-text-gradient">Superposition</span>
      </h1>
      <p className="text-xl text-muted-foreground mb-8 max-w-md mx-auto">
        The page you're looking for exists in a quantum state... 
        and unfortunately collapsed to "not found" when you observed it.
      </p>
      <div className="flex gap-4 justify-center">
        <Button asChild>
          <Link to="/">
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/games">
            <Search className="h-4 w-4 mr-2" />
            Browse Games
          </Link>
        </Button>
      </div>
    </div>
  )
}
