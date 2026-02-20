import { useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface GateOperation {
  gate: string
  qubits: number[]
  params?: number[]
}

interface CircuitVisualizerProps {
  numQubits: number
  operations: GateOperation[]
  onGateClick?: (index: number, gate: GateOperation) => void
  onAddGate?: (qubit: number, column: number) => void
  interactive?: boolean
  className?: string
}

const GATE_COLORS: Record<string, string> = {
  H: '#3B82F6',
  X: '#EF4444',
  Y: '#22C55E',
  Z: '#8B5CF6',
  S: '#F59E0B',
  T: '#EC4899',
  CNOT: '#06B6D4',
  CX: '#06B6D4',
  CZ: '#6366F1',
  SWAP: '#14B8A6',
  RX: '#F97316',
  RY: '#84CC16',
  RZ: '#A855F7',
  M: '#6B7280',
}

export function CircuitVisualizer({
  numQubits,
  operations,
  onGateClick,
  onAddGate,
  interactive = false,
  className,
}: CircuitVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredGate, setHoveredGate] = useState<number | null>(null)

  const QUBIT_SPACING = 60
  const GATE_WIDTH = 40
  const GATE_SPACING = 50
  const PADDING = 40

  const columns = organizeIntoColumns(operations, numQubits)
  const canvasWidth = PADDING * 2 + Math.max(columns.length, 5) * GATE_SPACING + 100
  const canvasHeight = PADDING * 2 + numQubits * QUBIT_SPACING

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasWidth * dpr
    canvas.height = canvasHeight * dpr
    ctx.scale(dpr, dpr)

    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 2
    for (let q = 0; q < numQubits; q++) {
      const y = PADDING + q * QUBIT_SPACING + QUBIT_SPACING / 2
      ctx.beginPath()
      ctx.moveTo(PADDING, y)
      ctx.lineTo(canvasWidth - PADDING, y)
      ctx.stroke()

      ctx.fillStyle = '#94a3b8'
      ctx.font = '14px monospace'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(`|q${q}⟩`, PADDING - 10, y)
    }

    let opIndex = 0
    columns.forEach((column, colIdx) => {
      column.forEach((op) => {
        if (op) {
          const x = PADDING + 50 + colIdx * GATE_SPACING
          drawGate(ctx, op, x, opIndex, hoveredGate === opIndex)
          opIndex++
        }
      })
    })

  }, [numQubits, operations, columns, hoveredGate, canvasWidth, canvasHeight])

  function drawGate(
    ctx: CanvasRenderingContext2D,
    op: GateOperation,
    x: number,
    index: number,
    highlighted: boolean
  ) {
    const color = GATE_COLORS[op.gate.toUpperCase()] || '#64748b'
    const qubit = op.qubits[0]
    const y = PADDING + qubit * QUBIT_SPACING + QUBIT_SPACING / 2

    if (op.gate.toUpperCase() === 'CNOT' || op.gate.toUpperCase() === 'CX') {
      const control = op.qubits[0]
      const target = op.qubits[1]
      const cy = PADDING + control * QUBIT_SPACING + QUBIT_SPACING / 2
      const ty = PADDING + target * QUBIT_SPACING + QUBIT_SPACING / 2

      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, cy)
      ctx.lineTo(x, ty)
      ctx.stroke()

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, cy, 6, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, ty, 12, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x - 12, ty)
      ctx.lineTo(x + 12, ty)
      ctx.moveTo(x, ty - 12)
      ctx.lineTo(x, ty + 12)
      ctx.stroke()
      return
    }

    if (op.gate.toUpperCase() === 'SWAP') {
      const q1 = op.qubits[0]
      const q2 = op.qubits[1]
      const y1 = PADDING + q1 * QUBIT_SPACING + QUBIT_SPACING / 2
      const y2 = PADDING + q2 * QUBIT_SPACING + QUBIT_SPACING / 2

      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, y1)
      ctx.lineTo(x, y2)
      ctx.stroke()

      const drawX = (cy: number) => {
        ctx.beginPath()
        ctx.moveTo(x - 8, cy - 8)
        ctx.lineTo(x + 8, cy + 8)
        ctx.moveTo(x + 8, cy - 8)
        ctx.lineTo(x - 8, cy + 8)
        ctx.stroke()
      }
      drawX(y1)
      drawX(y2)
      return
    }

    ctx.fillStyle = highlighted ? '#ffffff' : color
    ctx.strokeStyle = color
    ctx.lineWidth = highlighted ? 3 : 2

    const halfWidth = GATE_WIDTH / 2
    ctx.beginPath()
    ctx.roundRect(x - halfWidth, y - halfWidth, GATE_WIDTH, GATE_WIDTH, 4)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(op.gate.toUpperCase(), x, y)

    if (op.params && op.params.length > 0) {
      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px monospace'
      ctx.fillText(
        `(${op.params.map(p => p.toFixed(2)).join(',')})`,
        x,
        y + halfWidth + 10
      )
    }
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const qubit = Math.floor((y - PADDING) / QUBIT_SPACING)
    const column = Math.floor((x - PADDING - 50) / GATE_SPACING)

    if (qubit >= 0 && qubit < numQubits && column >= 0) {
      onAddGate?.(qubit, column)
    }
  }

  return (
    <div className={cn('relative overflow-auto', className)}>
      <canvas
        ref={canvasRef}
        style={{ width: canvasWidth, height: canvasHeight }}
        onClick={handleCanvasClick}
        className={cn(interactive && 'cursor-pointer')}
      />
    </div>
  )
}

function organizeIntoColumns(
  operations: GateOperation[],
  numQubits: number
): (GateOperation | null)[][] {
  const columns: (GateOperation | null)[][] = []
  const qubitLastColumn: number[] = new Array(numQubits).fill(-1)

  for (const op of operations) {
    const involvedQubits = op.qubits
    const minColumn = Math.max(...involvedQubits.map(q => qubitLastColumn[q])) + 1

    while (columns.length <= minColumn) {
      columns.push(new Array(numQubits).fill(null))
    }

    columns[minColumn][involvedQubits[0]] = op
    involvedQubits.forEach(q => {
      qubitLastColumn[q] = minColumn
    })
  }

  return columns
}

export default CircuitVisualizer
