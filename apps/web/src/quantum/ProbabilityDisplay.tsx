import { cn } from '@/lib/utils'

interface ProbabilityDisplayProps {
  probabilities: Record<string, number>
  labels?: Record<string, string>
  showPercentages?: boolean
  animated?: boolean
  className?: string
}

export function ProbabilityDisplay({
  probabilities,
  labels,
  showPercentages = true,
  animated = true,
  className,
}: ProbabilityDisplayProps) {
  const sortedStates = Object.entries(probabilities)
    .sort((a, b) => b[1] - a[1])

  const maxProb = Math.max(...Object.values(probabilities), 0.001)

  return (
    <div className={cn('space-y-2', className)}>
      {sortedStates.map(([state, probability]) => (
        <div key={state} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-mono">
              |{state}⟩
              {labels?.[state] && (
                <span className="text-muted-foreground ml-2">
                  ({labels[state]})
                </span>
              )}
            </span>
            {showPercentages && (
              <span className="text-muted-foreground">
                {(probability * 100).toFixed(1)}%
              </span>
            )}
          </div>
          <div className="h-4 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full quantum-gradient rounded-full',
                animated && 'transition-all duration-500 ease-out'
              )}
              style={{ width: `${(probability / maxProb) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

interface MeasurementResultsProps {
  counts: Record<string, number>
  shots: number
  className?: string
}

export function MeasurementResults({
  counts,
  shots,
  className,
}: MeasurementResultsProps) {
  const sortedResults = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Measurement Results</span>
        <span>{shots} shots</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {sortedResults.map(([state, count]) => (
          <div
            key={state}
            className="bg-secondary rounded-lg p-3 text-center"
          >
            <div className="font-mono text-lg font-bold">|{state}⟩</div>
            <div className="text-sm text-muted-foreground">
              {count} ({((count / shots) * 100).toFixed(1)}%)
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface StateVectorDisplayProps {
  statevector: Array<{ real: number; imag: number }>
  numQubits: number
  className?: string
}

export function StateVectorDisplay({
  statevector,
  numQubits,
  className,
}: StateVectorDisplayProps) {
  const formatComplex = (c: { real: number; imag: number }): string => {
    const r = c.real
    const i = c.imag

    if (Math.abs(r) < 1e-10 && Math.abs(i) < 1e-10) return '0'
    if (Math.abs(i) < 1e-10) return r.toFixed(3)
    if (Math.abs(r) < 1e-10) return `${i.toFixed(3)}i`
    return `${r.toFixed(3)}${i >= 0 ? '+' : ''}${i.toFixed(3)}i`
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="text-sm text-muted-foreground">State Vector</div>
      <div className="font-mono text-sm bg-secondary rounded-lg p-3 overflow-x-auto">
        {statevector.map((amplitude, index) => {
          const prob = amplitude.real ** 2 + amplitude.imag ** 2
          if (prob < 1e-10) return null

          const basisState = index.toString(2).padStart(numQubits, '0')
          return (
            <span key={index} className="mr-2">
              {formatComplex(amplitude)}|{basisState}⟩
              {index < statevector.length - 1 && ' + '}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default ProbabilityDisplay
