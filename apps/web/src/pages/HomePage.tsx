import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import GameCard from '@/components/GameCard'
import { 
  Atom, 
  Sparkles, 
  Users, 
  GraduationCap, 
  ArrowRight,
  Zap,
  Shield,
  Brain
} from 'lucide-react'

export default function HomePage() {
  const { data: games } = useQuery({
    queryKey: ['games'],
    queryFn: () => api.games.list(),
  })

  const featuredGames = games?.slice(0, 4) || []

  const educationLevels = [
    { level: 'basic_school', label: 'Basic School', ages: '6-10', icon: '🎨', color: 'from-green-500 to-emerald-500' },
    { level: 'junior_high', label: 'Junior High', ages: '11-14', icon: '🧩', color: 'from-blue-500 to-cyan-500' },
    { level: 'senior_high', label: 'Senior High', ages: '15-18', icon: '🔬', color: 'from-purple-500 to-violet-500' },
    { level: 'undergraduate', label: 'Undergraduate', ages: '18-22', icon: '🎓', color: 'from-orange-500 to-amber-500' },
    { level: 'postgraduate', label: 'Postgraduate+', ages: '22+', icon: '🔮', color: 'from-pink-500 to-rose-500' },
  ]

  const features = [
    { icon: Brain, title: 'Learn by Playing', description: 'Interactive games that make quantum concepts intuitive and fun' },
    { icon: Zap, title: 'Real Simulations', description: 'Actual quantum circuit simulations powered by Qiskit' },
    { icon: Shield, title: 'QKD Security', description: 'Master quantum key distribution protocols like BB84' },
    { icon: Users, title: 'Multiplayer', description: 'Compete and collaborate with other quantum learners' },
  ]

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(139,92,246,0.1),transparent_50%)]" />
        
        <div className="container relative">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <div className="mb-6 p-4 rounded-full bg-primary/10 animate-quantum-pulse">
              <Atom className="h-16 w-16 text-primary" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Learn{' '}
              <span className="quantum-text-gradient">Quantum Computing</span>
              {' '}Through Play
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
              From superposition to quantum key distribution, master the fundamentals
              of quantum computing through interactive games designed for all ages.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="xl" variant="quantum" asChild>
                <Link to="/games">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Start Playing
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <Link to="/learn">
                  Learn More
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Education Levels */}
      <section className="py-16 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              <GraduationCap className="inline h-8 w-8 mr-2 text-primary" />
              For Every Level
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our games adapt to your knowledge level, from elementary school students
              to advanced researchers.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {educationLevels.map(({ level, label, ages, icon, color }) => (
              <Link
                key={level}
                to={`/games?level=${level}`}
                className="group"
              >
                <Card className="h-full hover:border-primary/50 transition-all hover:scale-105">
                  <CardContent className="p-4 text-center">
                    <div className={`text-4xl mb-2 group-hover:animate-bounce`}>
                      {icon}
                    </div>
                    <div className="font-semibold text-sm">{label}</div>
                    <div className="text-xs text-muted-foreground">Ages {ages}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="bg-gradient-to-br from-card to-secondary/20">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg quantum-gradient flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Games */}
      <section className="py-16 bg-secondary/30">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Featured Games</h2>
            <Button variant="ghost" asChild>
              <Link to="/games">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <Card className="quantum-gradient p-1">
            <div className="bg-background rounded-lg p-8 md:p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Ready to Enter the Quantum Realm?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Join thousands of students, educators, and researchers learning
                quantum computing through interactive games.
              </p>
              <Button size="xl" variant="quantum" asChild>
                <Link to="/games">
                  Start Your Quantum Journey
                  <Sparkles className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
