import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface GateInfo {
  name: string
  symbol: string
  description: string
  color: string
}

const GATES: Record<string, GateInfo> = {
  H: { name: 'Hadamard', symbol: 'H', description: 'Creates superposition', color: '#3B82F6' },
  X: { name: 'Pauli-X', symbol: 'X', description: 'Quantum NOT gate', color: '#EF4444' },
  Y: { name: 'Pauli-Y', symbol: 'Y', description: 'Y rotation', color: '#22C55E' },
  Z: { name: 'Pauli-Z', symbol: 'Z', description: 'Phase flip', color: '#8B5CF6' },
  S: { name: 'S Gate', symbol: 'S', description: 'Phase gate', color: '#F59E0B' },
  T: { name: 'T Gate', symbol: 'T', description: 'π/8 gate', color: '#EC4899' },
  CNOT: { name: 'CNOT', symbol: '⊕', description: 'Controlled-NOT', color: '#06B6D4' },
  CZ: { name: 'CZ', symbol: 'CZ', description: 'Controlled-Z', color: '#6366F1' },
  SWAP: { name: 'SWAP', symbol: '×', description: 'Swap qubits', color: '#14B8A6' },
}

interface GatePaletteProps {
  availableGates?: string[]
  selectedGate?: string
  onSelectGate: (gate: string) => void
  showDescriptions?: boolean
  className?: string
}

export function GatePalette({
  availableGates = ['H', 'X', 'Y', 'Z', 'CNOT'],
  selectedGate,
  onSelectGate,
  showDescriptions = false,
  className,
}: GatePaletteProps) {
  const gates = availableGates.map(g => GATES[g]).filter(Boolean)

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Quantum Gates</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {gates.map((gate) => (
            <button
              key={gate.symbol}
              onClick={() => onSelectGate(gate.symbol)}
              className={cn(
                'flex flex-col items-center p-3 rounded-lg transition-all',
                'border-2 hover:scale-105',
                selectedGate === gate.symbol
                  ? 'border-white bg-white/10'
                  : 'border-transparent hover:border-white/20'
              )}
              style={{ borderColor: selectedGate === gate.symbol ? gate.color : undefined }}
            >
              <div
                className="w-10 h-10 rounded flex items-center justify-center font-bold text-white mb-1"
                style={{ backgroundColor: gate.color }}
              >
                {gate.symbol}
              </div>
              <span className="text-xs font-medium">{gate.name}</span>
              {showDescriptions && (
                <span className="text-xs text-muted-foreground text-center mt-1">
                  {gate.description}
                </span>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface GateToolbarProps {
  gates?: string[]
  selectedGate?: string
  onSelectGate: (gate: string) => void
  onClear?: () => void
  onUndo?: () => void
  onMeasure?: () => void
  className?: string
}

export function GateToolbar({
  gates = ['H', 'X', 'Z', 'CNOT'],
  selectedGate,
  onSelectGate,
  onClear,
  onUndo,
  onMeasure,
  className,
}: GateToolbarProps) {
  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <div className="flex gap-1 bg-secondary rounded-lg p-1">
        {gates.map((gate) => {
          const info = GATES[gate]
          if (!info) return null
          
          return (
            <button
              key={gate}
              onClick={() => onSelectGate(gate)}
              className={cn(
                'w-10 h-10 rounded font-bold text-white transition-all',
                'hover:scale-110 hover:ring-2 ring-white/50',
                selectedGate === gate && 'ring-2 ring-white'
              )}
              style={{ backgroundColor: info.color }}
              title={info.name}
            >
              {info.symbol === '⊕' ? (
                <span className="text-xl">⊕</span>
              ) : (
                info.symbol
              )}
            </button>
          )
        })}
      </div>

      <div className="flex gap-2 ml-auto">
        {onUndo && (
          <Button variant="outline" size="sm" onClick={onUndo}>
            Undo
          </Button>
        )}
        {onClear && (
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear
          </Button>
        )}
        {onMeasure && (
          <Button variant="default" size="sm" onClick={onMeasure}>
            Measure
          </Button>
        )}
      </div>
    </div>
  )
}

export default GatePalette
