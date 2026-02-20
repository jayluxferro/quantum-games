import Phaser from 'phaser'

type GateType = 'H' | 'X' | 'Y' | 'Z' | 'S' | 'T' | 'CNOT' | 'SWAP' | 'M'

interface Gate {
  type: GateType
  qubit: number
  target?: number
  column: number
}

interface Complex {
  re: number
  im: number
}

export class PlayScene extends Phaser.Scene {
  private numQubits: number = 3
  private maxColumns: number = 8
  private gates: Gate[] = []
  private selectedGate: GateType | null = null
  private stateVector: Complex[] = []

  private circuitContainer!: Phaser.GameObjects.Container
  private stateContainer!: Phaser.GameObjects.Container
  private gateButtons: Phaser.GameObjects.Container[] = []
  private infoText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'PlayScene' })
  }

  create() {
    const { width, height } = this.cameras.main

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x0c4a6e, 0x0c4a6e, 1)
    bg.fillRect(0, 0, width, height)

    // Title
    this.add.text(width / 2, 20, '🔬 Quantum Circuit Simulator', {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    // Gate palette
    this.createGatePalette()

    // Circuit area
    this.circuitContainer = this.add.container(50, 120)
    this.drawCircuit()

    // State vector display
    this.add.text(width - 180, 120, 'State Vector:', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5)

    this.stateContainer = this.add.container(width - 180, 150)

    // Control buttons
    this.createControlButtons()

    // Info text
    this.infoText = this.add.text(width / 2, height - 25, 'Select a gate, then click on the circuit to place it', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#64748b',
    }).setOrigin(0.5)

    // Initialize state
    this.initializeState()
    this.updateStateDisplay()

    this.cameras.main.fadeIn(300)
  }

  createGatePalette() {
    const { width } = this.cameras.main
    const gates: { type: GateType; label: string; color: number; desc: string }[] = [
      { type: 'H', label: 'H', color: 0xf59e0b, desc: 'Hadamard' },
      { type: 'X', label: 'X', color: 0xef4444, desc: 'Pauli-X' },
      { type: 'Y', label: 'Y', color: 0x22c55e, desc: 'Pauli-Y' },
      { type: 'Z', label: 'Z', color: 0x3b82f6, desc: 'Pauli-Z' },
      { type: 'S', label: 'S', color: 0x8b5cf6, desc: 'S Gate' },
      { type: 'T', label: 'T', color: 0xec4899, desc: 'T Gate' },
      { type: 'CNOT', label: 'CX', color: 0x06b6d4, desc: 'CNOT' },
      { type: 'M', label: 'M', color: 0x64748b, desc: 'Measure' },
    ]

    const startX = 60
    const spacing = 55

    gates.forEach((gate, i) => {
      const x = startX + i * spacing
      const y = 70

      const btn = this.add.container(x, y)

      const bg = this.add.graphics()
      bg.fillStyle(gate.color, 1)
      bg.fillRoundedRect(-22, -22, 44, 44, 6)
      bg.setName('bg')

      const text = this.add.text(0, 0, gate.label, {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5)

      btn.add([bg, text])
      btn.setSize(44, 44)
      btn.setInteractive({ useHandCursor: true })
      btn.setData('gateType', gate.type)
      btn.setData('color', gate.color)
      btn.setData('desc', gate.desc)

      btn.on('pointerover', () => {
        this.infoText.setText(`${gate.desc} - Click to select`)
      })

      btn.on('pointerout', () => {
        if (!this.selectedGate) {
          this.infoText.setText('Select a gate, then click on the circuit to place it')
        }
      })

      btn.on('pointerdown', () => {
        this.selectGate(gate.type, btn)
      })

      this.gateButtons.push(btn)
    })
  }

  selectGate(type: GateType, btn: Phaser.GameObjects.Container) {
    this.selectedGate = type

    // Reset all button highlights
    this.gateButtons.forEach((b) => {
      const bg = b.getByName('bg') as Phaser.GameObjects.Graphics
      const color = b.getData('color') as number
      bg.clear()
      bg.fillStyle(color, 1)
      bg.fillRoundedRect(-22, -22, 44, 44, 6)
    })

    // Highlight selected
    const bg = btn.getByName('bg') as Phaser.GameObjects.Graphics
    const color = btn.getData('color') as number
    bg.clear()
    bg.fillStyle(color, 1)
    bg.fillRoundedRect(-22, -22, 44, 44, 6)
    bg.lineStyle(3, 0xffffff, 1)
    bg.strokeRoundedRect(-22, -22, 44, 44, 6)

    this.infoText.setText(`${btn.getData('desc')} selected - Click on circuit to place`)
  }

  drawCircuit() {
    this.circuitContainer.removeAll(true)

    const lineSpacing = 50
    const columnWidth = 60
    const startX = 40

    // Draw qubit lines
    for (let q = 0; q < this.numQubits; q++) {
      const y = q * lineSpacing

      // Qubit label
      this.circuitContainer.add(
        this.add.text(0, y, `|0⟩`, {
          fontSize: '18px',
          fontFamily: 'Arial',
          color: '#94a3b8',
        }).setOrigin(0, 0.5)
      )

      // Wire
      const wire = this.add.graphics()
      wire.lineStyle(2, 0x475569, 1)
      wire.lineBetween(startX, y, startX + this.maxColumns * columnWidth, y)
      this.circuitContainer.add(wire)

      // Clickable zones for placing gates
      for (let col = 0; col < this.maxColumns; col++) {
        const x = startX + col * columnWidth + columnWidth / 2
        
        const zone = this.add.zone(x, y, columnWidth - 10, lineSpacing - 10)
        zone.setInteractive({ useHandCursor: true })
        zone.setData('qubit', q)
        zone.setData('column', col)

        zone.on('pointerdown', () => {
          this.placeGate(q, col)
        })

        // Visual indicator
        const indicator = this.add.graphics()
        indicator.lineStyle(1, 0x334155, 0.5)
        indicator.strokeRect(x - 25, y - 20, 50, 40)
        this.circuitContainer.add(indicator)

        this.circuitContainer.add(zone)
      }
    }

    // Draw placed gates
    this.gates.forEach((gate) => {
      this.drawGate(gate)
    })
  }

  drawGate(gate: Gate) {
    const lineSpacing = 50
    const columnWidth = 60
    const startX = 40

    const x = startX + gate.column * columnWidth + columnWidth / 2
    const y = gate.qubit * lineSpacing

    const colors: Record<GateType, number> = {
      H: 0xf59e0b,
      X: 0xef4444,
      Y: 0x22c55e,
      Z: 0x3b82f6,
      S: 0x8b5cf6,
      T: 0xec4899,
      CNOT: 0x06b6d4,
      SWAP: 0x64748b,
      M: 0x64748b,
    }

    if (gate.type === 'CNOT' && gate.target !== undefined) {
      // Control dot
      const control = this.add.graphics()
      control.fillStyle(colors.CNOT, 1)
      control.fillCircle(x, y, 8)
      this.circuitContainer.add(control)

      // Target
      const targetY = gate.target * lineSpacing
      const target = this.add.graphics()
      target.lineStyle(3, colors.CNOT, 1)
      target.strokeCircle(x, targetY, 15)
      target.lineBetween(x - 15, targetY, x + 15, targetY)
      target.lineBetween(x, targetY - 15, x, targetY + 15)
      this.circuitContainer.add(target)

      // Connecting line
      const line = this.add.graphics()
      line.lineStyle(2, colors.CNOT, 1)
      line.lineBetween(x, y, x, targetY)
      this.circuitContainer.add(line)
    } else if (gate.type === 'M') {
      // Measurement symbol
      const mBox = this.add.graphics()
      mBox.fillStyle(colors.M, 1)
      mBox.fillRoundedRect(x - 20, y - 20, 40, 40, 6)
      this.circuitContainer.add(mBox)

      // Meter arc
      const arc = this.add.graphics()
      arc.lineStyle(2, 0xffffff, 1)
      arc.arc(x, y + 5, 12, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(0), true)
      arc.lineBetween(x, y - 7, x + 8, y + 5)
      this.circuitContainer.add(arc)
    } else {
      // Standard gate box
      const box = this.add.graphics()
      box.fillStyle(colors[gate.type], 1)
      box.fillRoundedRect(x - 20, y - 20, 40, 40, 6)
      this.circuitContainer.add(box)

      const label = this.add.text(x, y, gate.type, {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5)
      this.circuitContainer.add(label)
    }
  }

  placeGate(qubit: number, column: number) {
    if (!this.selectedGate) {
      this.infoText.setText('Please select a gate first!')
      return
    }

    // Check if slot is occupied
    const existing = this.gates.find((g) => g.column === column && g.qubit === qubit)
    if (existing) {
      // Remove existing gate
      this.gates = this.gates.filter((g) => g !== existing)
    } else {
      // Add new gate
      const newGate: Gate = {
        type: this.selectedGate,
        qubit,
        column,
      }

      // For CNOT, set target to next qubit
      if (this.selectedGate === 'CNOT') {
        newGate.target = (qubit + 1) % this.numQubits
      }

      this.gates.push(newGate)
    }

    this.drawCircuit()
    this.simulateCircuit()
    this.updateStateDisplay()
  }

  initializeState() {
    const dim = Math.pow(2, this.numQubits)
    this.stateVector = Array(dim).fill(null).map(() => ({ re: 0, im: 0 }))
    this.stateVector[0] = { re: 1, im: 0 } // |000⟩
  }

  simulateCircuit() {
    this.initializeState()

    // Sort gates by column
    const sortedGates = [...this.gates].sort((a, b) => a.column - b.column)

    sortedGates.forEach((gate) => {
      this.applyGate(gate)
    })
  }

  applyGate(gate: Gate) {
    const dim = Math.pow(2, this.numQubits)

    if (gate.type === 'H') {
      this.applyHadamard(gate.qubit)
    } else if (gate.type === 'X') {
      this.applyPauliX(gate.qubit)
    } else if (gate.type === 'Y') {
      this.applyPauliY(gate.qubit)
    } else if (gate.type === 'Z') {
      this.applyPauliZ(gate.qubit)
    } else if (gate.type === 'S') {
      this.applySGate(gate.qubit)
    } else if (gate.type === 'T') {
      this.applyTGate(gate.qubit)
    } else if (gate.type === 'CNOT' && gate.target !== undefined) {
      this.applyCNOT(gate.qubit, gate.target)
    }
    // Measurement not fully simulated in this simple version
  }

  applyHadamard(qubit: number) {
    const dim = Math.pow(2, this.numQubits)
    const newState: Complex[] = Array(dim).fill(null).map(() => ({ re: 0, im: 0 }))
    const h = 1 / Math.sqrt(2)

    for (let i = 0; i < dim; i++) {
      const bit = (i >> (this.numQubits - 1 - qubit)) & 1
      const j = i ^ (1 << (this.numQubits - 1 - qubit))

      if (bit === 0) {
        newState[i].re += h * this.stateVector[i].re
        newState[i].im += h * this.stateVector[i].im
        newState[j].re += h * this.stateVector[i].re
        newState[j].im += h * this.stateVector[i].im
      } else {
        newState[i].re += -h * this.stateVector[i].re
        newState[i].im += -h * this.stateVector[i].im
        newState[j].re += h * this.stateVector[i].re
        newState[j].im += h * this.stateVector[i].im
      }
    }

    this.stateVector = newState
  }

  applyPauliX(qubit: number) {
    const dim = Math.pow(2, this.numQubits)
    const newState: Complex[] = Array(dim).fill(null).map(() => ({ re: 0, im: 0 }))

    for (let i = 0; i < dim; i++) {
      const j = i ^ (1 << (this.numQubits - 1 - qubit))
      newState[j] = { ...this.stateVector[i] }
    }

    this.stateVector = newState
  }

  applyPauliY(qubit: number) {
    const dim = Math.pow(2, this.numQubits)
    const newState: Complex[] = Array(dim).fill(null).map(() => ({ re: 0, im: 0 }))

    for (let i = 0; i < dim; i++) {
      const bit = (i >> (this.numQubits - 1 - qubit)) & 1
      const j = i ^ (1 << (this.numQubits - 1 - qubit))

      if (bit === 0) {
        newState[j].re = this.stateVector[i].im
        newState[j].im = -this.stateVector[i].re
      } else {
        newState[j].re = -this.stateVector[i].im
        newState[j].im = this.stateVector[i].re
      }
    }

    this.stateVector = newState
  }

  applyPauliZ(qubit: number) {
    const dim = Math.pow(2, this.numQubits)

    for (let i = 0; i < dim; i++) {
      const bit = (i >> (this.numQubits - 1 - qubit)) & 1
      if (bit === 1) {
        this.stateVector[i].re *= -1
        this.stateVector[i].im *= -1
      }
    }
  }

  applySGate(qubit: number) {
    const dim = Math.pow(2, this.numQubits)

    for (let i = 0; i < dim; i++) {
      const bit = (i >> (this.numQubits - 1 - qubit)) & 1
      if (bit === 1) {
        const re = this.stateVector[i].re
        const im = this.stateVector[i].im
        this.stateVector[i].re = -im
        this.stateVector[i].im = re
      }
    }
  }

  applyTGate(qubit: number) {
    const dim = Math.pow(2, this.numQubits)
    const t = Math.PI / 4

    for (let i = 0; i < dim; i++) {
      const bit = (i >> (this.numQubits - 1 - qubit)) & 1
      if (bit === 1) {
        const re = this.stateVector[i].re
        const im = this.stateVector[i].im
        const cos = Math.cos(t)
        const sin = Math.sin(t)
        this.stateVector[i].re = re * cos - im * sin
        this.stateVector[i].im = re * sin + im * cos
      }
    }
  }

  applyCNOT(control: number, target: number) {
    const dim = Math.pow(2, this.numQubits)
    const newState: Complex[] = Array(dim).fill(null).map(() => ({ re: 0, im: 0 }))

    for (let i = 0; i < dim; i++) {
      const controlBit = (i >> (this.numQubits - 1 - control)) & 1
      if (controlBit === 1) {
        const j = i ^ (1 << (this.numQubits - 1 - target))
        newState[j] = { ...this.stateVector[i] }
      } else {
        newState[i] = { ...this.stateVector[i] }
      }
    }

    this.stateVector = newState
  }

  updateStateDisplay() {
    this.stateContainer.removeAll(true)

    const dim = Math.pow(2, this.numQubits)
    let y = 0

    for (let i = 0; i < dim; i++) {
      const amp = this.stateVector[i]
      const mag = Math.sqrt(amp.re * amp.re + amp.im * amp.im)

      if (mag > 0.001) {
        const basis = i.toString(2).padStart(this.numQubits, '0')
        const ampStr = this.formatComplex(amp)
        const prob = (mag * mag * 100).toFixed(1)

        const text = this.add.text(0, y, `|${basis}⟩: ${ampStr} (${prob}%)`, {
          fontSize: '12px',
          fontFamily: 'Arial',
          color: '#94a3b8',
        }).setOrigin(0.5, 0)

        this.stateContainer.add(text)
        y += 20
      }
    }

    if (y === 0) {
      const text = this.add.text(0, 0, '|000⟩: 1.00 (100%)', {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: '#94a3b8',
      }).setOrigin(0.5, 0)
      this.stateContainer.add(text)
    }
  }

  formatComplex(c: Complex): string {
    const re = Math.abs(c.re) < 0.001 ? 0 : c.re
    const im = Math.abs(c.im) < 0.001 ? 0 : c.im

    if (im === 0) return re.toFixed(2)
    if (re === 0) return `${im.toFixed(2)}i`
    return `${re.toFixed(2)}${im >= 0 ? '+' : ''}${im.toFixed(2)}i`
  }

  createControlButtons() {
    const { width, height } = this.cameras.main

    // Clear button
    this.createButton(width - 180, height - 80, 'Clear Circuit', 0xef4444, () => {
      this.gates = []
      this.initializeState()
      this.drawCircuit()
      this.updateStateDisplay()
    })

    // Back button
    this.createButton(width - 180, height - 35, 'Back to Menu', 0x64748b, () => {
      this.scene.start('MenuScene')
    })
  }

  createButton(x: number, y: number, label: string, color: number, callback: () => void) {
    const btn = this.add.container(x, y)

    const bg = this.add.graphics()
    bg.fillStyle(color, 1)
    bg.fillRoundedRect(-70, -18, 140, 36, 8)

    const text = this.add.text(0, 0, label, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5)

    btn.add([bg, text])
    btn.setSize(140, 36)
    btn.setInteractive({ useHandCursor: true })

    btn.on('pointerover', () => {
      bg.clear()
      bg.fillStyle(color, 0.8)
      bg.fillRoundedRect(-70, -18, 140, 36, 8)
    })

    btn.on('pointerout', () => {
      bg.clear()
      bg.fillStyle(color, 1)
      bg.fillRoundedRect(-70, -18, 140, 36, 8)
    })

    btn.on('pointerdown', callback)
  }
}
