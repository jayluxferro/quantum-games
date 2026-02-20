import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, ArrowRight, Atom, Zap, Link as LinkIcon, Lightbulb } from 'lucide-react'

const concepts = [
  {
    slug: 'superposition',
    name: 'Superposition',
    icon: '🌀',
    description: 'A qubit can exist in multiple states simultaneously until measured.',
    level: 'Beginner',
  },
  {
    slug: 'entanglement',
    name: 'Entanglement',
    icon: '🔗',
    description: 'Two qubits become correlated in ways that defy classical explanation.',
    level: 'Beginner',
  },
  {
    slug: 'measurement',
    name: 'Measurement',
    icon: '📏',
    description: 'Observing a qubit collapses its quantum state to a definite value.',
    level: 'Beginner',
  },
  {
    slug: 'interference',
    name: 'Quantum Interference',
    icon: '🌊',
    description: 'Probability amplitudes can add or cancel each other out.',
    level: 'Intermediate',
  },
  {
    slug: 'gates',
    name: 'Quantum Gates',
    icon: '🚪',
    description: 'Operations that manipulate qubit states, like X, H, and CNOT.',
    level: 'Intermediate',
  },
  {
    slug: 'circuits',
    name: 'Quantum Circuits',
    icon: '🔌',
    description: 'Sequences of quantum gates that perform computations.',
    level: 'Intermediate',
  },
  {
    slug: 'qkd',
    name: 'Quantum Key Distribution',
    icon: '🔐',
    description: 'Using quantum mechanics to create unbreakable encryption keys.',
    level: 'Advanced',
  },
  {
    slug: 'algorithms',
    name: 'Quantum Algorithms',
    icon: '🧮',
    description: "Algorithms like Grover's and Shor's that exploit quantum properties.",
    level: 'Advanced',
  },
]

export default function LearnPage() {
  const { concept: conceptSlug } = useParams<{ concept?: string }>()

  const { data: conceptInfo } = useQuery({
    queryKey: ['concept', conceptSlug],
    queryFn: () => api.quantum.concept(conceptSlug!),
    enabled: !!conceptSlug,
  })

  if (conceptSlug && conceptInfo) {
    return (
      <div className="container py-8 max-w-4xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/learn">
            ← Back to Concepts
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{conceptInfo.name}</CardTitle>
            <CardDescription className="text-lg">
              {conceptInfo.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-secondary rounded-lg">
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <Lightbulb className="h-5 w-5 text-yellow-400" />
                Simple Analogy
              </h3>
              <p className="text-muted-foreground">{conceptInfo.analogy}</p>
            </div>

            {conceptInfo.gates && conceptInfo.gates.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Related Gates</h3>
                <div className="flex gap-2">
                  {conceptInfo.gates.map((gate) => (
                    <span
                      key={gate}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full font-mono"
                    >
                      {gate}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {conceptInfo.examples && conceptInfo.examples.length > 0 && (
              <div>
                <h3 className="font-semibold mb-4">Examples</h3>
                <div className="space-y-4">
                  {conceptInfo.examples.map((example, i) => (
                    <Card key={i}>
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground mb-2">
                          {example.description}
                        </p>
                        <pre className="bg-secondary p-3 rounded text-sm overflow-x-auto">
                          {JSON.stringify(example.circuit, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4">
              <Button variant="quantum" asChild>
                <Link to={`/games?concept=${conceptSlug}`}>
                  Practice with Games
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="text-center mb-12">
        <BookOpen className="h-12 w-12 mx-auto text-primary mb-4" />
        <h1 className="text-4xl font-bold mb-4">Learn Quantum Computing</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Explore fundamental quantum concepts through interactive explanations
          and hands-on games.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {concepts.map((concept) => (
          <Link key={concept.slug} to={`/learn/${concept.slug}`}>
            <Card className="h-full hover:border-primary/50 transition-all hover:scale-105 cursor-pointer">
              <CardHeader>
                <div className="text-4xl mb-2">{concept.icon}</div>
                <CardTitle className="text-lg">{concept.name}</CardTitle>
                <span className="text-xs bg-secondary px-2 py-1 rounded-full w-fit">
                  {concept.level}
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {concept.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-12">
        <CardContent className="p-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-bold mb-4">
                Learn by Doing
              </h2>
              <p className="text-muted-foreground mb-6">
                Our games let you experiment with quantum concepts in a safe,
                fun environment. Build quantum circuits, explore the Bloch sphere,
                and even try quantum cryptography!
              </p>
              <Button variant="quantum" asChild>
                <Link to="/games">
                  <Zap className="mr-2 h-4 w-4" />
                  Start Playing
                </Link>
              </Button>
            </div>
            <div className="flex justify-center">
              <div className="relative">
                <Atom className="h-32 w-32 text-primary animate-spin-slow" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full bg-primary animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
