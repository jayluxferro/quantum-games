import Phaser from 'phaser'

interface GatePlacement {
  type: string
  qubit: number
  step: number
  control?: number
  sprite?: Phaser.GameObjects.Container
}

interface Challenge {
  name: string
  description: string
  numQubits: number
  targetState: string
  maxGates: number
}

export class BuildScene extends Phaser.Scene {
  private mode: 'challenge' | 'sandbox' = 'challenge'
  private numQubits: number = 2
  private numSteps: number = 6
  private gates: GatePlacement[] = []
  private selectedGate: string | null = null
  private challenge: Challenge | null = null
  private challengeIndex: number = 0
  
  private gridStartX: number = 150
  private gridStartY: number = 100
  private cellWidth: number = 80
  private cellHeight: number = 80
  
  private stateText!: Phaser.GameObjects.Text
  private targetText!: Phaser.GameObjects.Text
  private gateCountText!: Phaser.GameObjects.Text

  private challenges: Challenge[] = [
    {
      name: 'Bell State',
      description: 'Create entanglement: (|00⟩ + |11⟩)/√2',
      numQubits: 2,
      targetState: '|00⟩ + |11⟩',
      maxGates: 2,
    },
    {
      name: 'Superposition',
      description: 'Put both qubits in superposition',
      numQubits: 2,
      targetState: '|00⟩ + |01⟩ + |10⟩ + |11⟩',
      maxGates: 2,
    },
    {
      name: 'Swap States',
      description: 'Swap qubit 0 and qubit 1 states',
      numQubits: 2,
      targetState: 'Swapped',
      maxGates: 3,
    },
    {
      name: 'GHZ State',
      description: '3-qubit entanglement: (|000⟩ + |111⟩)/√2',
      numQubits: 3,
      targetState: '|000⟩ + |111⟩',
      maxGates: 4,
    },
  ]

  constructor() {
    super({ key: 'BuildScene' })
  }

  init(data: { mode: 'challenge' | 'sandbox' }) {
    this.mode = data.mode || 'challenge'
    this.gates = []
    this.selectedGate = null
    
    if (this.mode === 'challenge') {
      this.challenge = this.challenges[this.challengeIndex]
      this.numQubits = this.challenge.numQubits
    } else {
      this.numQubits = 2
    }
  }

  create() {
    const { width, height } = this.cameras.main

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0f172a)

    // Draw circuit grid
    this.drawCircuitGrid()

    // Gate palette
    this.createGatePalette()

    // UI
    this.createUI()

    // Instructions
    this.add.text(width / 2, height - 25, 'Click a gate, then click on the circuit to place it', {
      fontSize: '12px',
      color: '#64748b',
    }).setOrigin(0.5)

    // Camera fade
    this.cameras.main.fadeIn(300)
  }

  drawCircuitGrid() {
    const { width } = this.cameras.main
    const graphics = this.add.graphics()

    // Qubit lines
    for (let q = 0; q < this.numQubits; q++) {
      const y = this.gridStartY + q * this.cellHeight

      // Qubit label
      this.add.text(this.gridStartX - 60, y, `|q${q}⟩`, {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#94a3b8',
      }).setOrigin(0.5)

      // Initial state
      this.add.text(this.gridStartX - 25, y, '|0⟩', {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#22c55e',
      }).setOrigin(0.5)

      // Wire
      graphics.lineStyle(2, 0x475569)
      graphics.lineBetween(
        this.gridStartX,
        y,
        this.gridStartX + this.numSteps * this.cellWidth,
        y
      )

      // Output
      this.add.text(
        this.gridStartX + this.numSteps * this.cellWidth + 40,
        y,
        '→',
        {
          fontSize: '18px',
          color: '#475569',
        }
      ).setOrigin(0.5)
    }

    // Step markers
    for (let s = 0; s < this.numSteps; s++) {
      const x = this.gridStartX + s * this.cellWidth + this.cellWidth / 2
      this.add.text(x, this.gridStartY - 35, `${s + 1}`, {
        fontSize: '12px',
        color: '#475569',
      }).setOrigin(0.5)
    }

    // Clickable cells
    for (let q = 0; q < this.numQubits; q++) {
      for (let s = 0; s < this.numSteps; s++) {
        const x = this.gridStartX + s * this.cellWidth + this.cellWidth / 2
        const y = this.gridStartY + q * this.cellHeight

        const cell = this.add.rectangle(
          x, y,
          this.cellWidth - 10,
          this.cellHeight - 10,
          0x1e293b, 0
        )
        cell.setStrokeStyle(1, 0x374151, 0.5)
        cell.setInteractive({ useHandCursor: true })

        cell.on('pointerover', () => {
          if (this.selectedGate) {
            cell.setStrokeStyle(2, 0x3b82f6)
          }
        })

        cell.on('pointerout', () => {
          cell.setStrokeStyle(1, 0x374151, 0.5)
        })

        cell.on('pointerdown', () => {
          if (this.selectedGate) {
            this.placeGate(this.selectedGate, q, s)
          }
        })
      }
    }
  }

  createGatePalette() {
    const { width, height } = this.cameras.main
    const paletteY = height - 80

    // Palette background
    this.add.rectangle(width / 2, paletteY, width - 40, 70, 0x1e293b)
      .setStrokeStyle(1, 0x374151)

    this.add.text(70, paletteY - 25, 'Gates:', {
      fontSize: '12px',
      color: '#64748b',
    }).setOrigin(0, 0.5)

    const gateTypes = [
      { type: 'H', color: 0x8b5cf6, name: 'Hadamard' },
      { type: 'X', color: 0xef4444, name: 'Pauli-X' },
      { type: 'Y', color: 0x22c55e, name: 'Pauli-Y' },
      { type: 'Z', color: 0x3b82f6, name: 'Pauli-Z' },
      { type: 'S', color: 0xf59e0b, name: 'S Gate' },
      { type: 'T', color: 0x06b6d4, name: 'T Gate' },
      { type: 'CNOT', color: 0x22c55e, name: 'CNOT' },
    ]

    gateTypes.forEach((gate, i) => {
      const x = 130 + i * 80
      this.createPaletteGate(x, paletteY, gate.type, gate.color, gate.name)
    })

    // Clear button
    const clearBtn = this.add.rectangle(width - 100, paletteY, 80, 35, 0x991b1b)
    this.add.text(width - 100, paletteY, 'Clear', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5)

    clearBtn.setInteractive({ useHandCursor: true })
    clearBtn.on('pointerdown', () => this.clearCircuit())
  }

  createPaletteGate(x: number, y: number, type: string, color: number, name: string) {
    const container = this.add.container(x, y)

    const bg = this.add.rectangle(0, 0, 50, 40, 0x0f172a)
    bg.setStrokeStyle(2, color)

    const label = this.add.text(0, 0, type === 'CNOT' ? '●' : type, {
      fontSize: type === 'CNOT' ? '24px' : '18px',
      fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5)

    container.add([bg, label])
    container.setSize(50, 40)
    container.setInteractive({ useHandCursor: true })

    container.on('pointerdown', () => {
      this.selectedGate = type
      // Visual feedback - highlight selected gate
    })
  }

  placeGate(type: string, qubit: number, step: number) {
    // Check if position is occupied
    const existing = this.gates.find(g => g.qubit === qubit && g.step === step)
    if (existing) {
      // Remove existing gate
      existing.sprite?.destroy()
      this.gates = this.gates.filter(g => g !== existing)
    }

    // Check gate limit in challenge mode
    if (this.mode === 'challenge' && this.challenge) {
      if (this.gates.length >= this.challenge.maxGates) {
        this.showMessage('Gate limit reached!')
        return
      }
    }

    const x = this.gridStartX + step * this.cellWidth + this.cellWidth / 2
    const y = this.gridStartY + qubit * this.cellHeight

    // Create gate visual
    const container = this.add.container(x, y)

    const gateColors: Record<string, number> = {
      H: 0x8b5cf6, X: 0xef4444, Y: 0x22c55e, Z: 0x3b82f6,
      S: 0xf59e0b, T: 0x06b6d4, CNOT: 0x22c55e,
    }

    const color = gateColors[type] || 0xffffff

    if (type === 'CNOT') {
      // CNOT needs two qubits
      if (qubit >= this.numQubits - 1) {
        this.showMessage('CNOT needs a target qubit below')
        return
      }

      const targetY = this.cellHeight
      
      // Control dot
      const control = this.add.circle(0, 0, 8, color)
      
      // Line to target
      const line = this.add.graphics()
      line.lineStyle(2, color)
      line.lineBetween(0, 0, 0, targetY)
      
      // Target circle
      const target = this.add.circle(0, targetY, 15, 0x000000, 0)
      target.setStrokeStyle(3, color)
      const plus = this.add.graphics()
      plus.lineStyle(2, color)
      plus.lineBetween(-10, targetY, 10, targetY)
      plus.lineBetween(0, targetY - 10, 0, targetY + 10)

      container.add([line, control, target, plus])
    } else {
      const bg = this.add.rectangle(0, 0, 40, 40, 0x0f172a)
      bg.setStrokeStyle(2, color)

      const text = this.add.text(0, 0, type, {
        fontSize: '20px',
        fontStyle: 'bold',
        color: `#${color.toString(16).padStart(6, '0')}`,
      }).setOrigin(0.5)

      container.add([bg, text])
    }

    // Scale animation
    container.setScale(0)
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    })

    const placement: GatePlacement = {
      type,
      qubit,
      step,
      sprite: container,
      control: type === 'CNOT' ? qubit + 1 : undefined,
    }

    this.gates.push(placement)
    this.updateState()
  }

  createUI() {
    const { width } = this.cameras.main

    // Mode/Challenge info
    if (this.mode === 'challenge' && this.challenge) {
      this.add.text(20, 20, this.challenge.name, {
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#3b82f6',
      })

      this.add.text(20, 45, this.challenge.description, {
        fontSize: '14px',
        color: '#94a3b8',
      })

      this.gateCountText = this.add.text(20, 70, `Gates: 0/${this.challenge.maxGates}`, {
        fontSize: '14px',
        color: '#64748b',
      })

      // Target state
      this.targetText = this.add.text(width - 20, 20, `Target: ${this.challenge.targetState}`, {
        fontSize: '14px',
        color: '#22c55e',
      }).setOrigin(1, 0)
    } else {
      this.add.text(20, 20, 'Sandbox Mode', {
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#8b5cf6',
      })

      this.add.text(20, 45, 'Build any circuit you want!', {
        fontSize: '14px',
        color: '#94a3b8',
      })
    }

    // Current state display
    this.stateText = this.add.text(width - 20, 50, 'State: |00⟩', {
      fontSize: '14px',
      color: '#94a3b8',
    }).setOrigin(1, 0)

    // Run button
    const runBtn = this.add.rectangle(width - 80, 100, 100, 35, 0x22c55e)
    this.add.text(width - 80, 100, '▶ Run', {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#000000',
    }).setOrigin(0.5)

    runBtn.setInteractive({ useHandCursor: true })
    runBtn.on('pointerdown', () => this.runCircuit())

    // Back button
    const backBtn = this.add.text(70, this.cameras.main.height - 110, '← Back', {
      fontSize: '14px',
      color: '#64748b',
    })
    backBtn.setInteractive({ useHandCursor: true })
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'))
  }

  updateState() {
    // Update gate count
    if (this.gateCountText && this.challenge) {
      this.gateCountText.setText(`Gates: ${this.gates.length}/${this.challenge.maxGates}`)
    }

    // Calculate current state (simplified)
    const state = this.calculateState()
    this.stateText.setText(`State: ${state}`)
  }

  calculateState(): string {
    // Sort gates by step
    const sortedGates = [...this.gates].sort((a, b) => a.step - b.step)

    // Track state (simplified - just tracking classical-like states)
    let states = ['0'.repeat(this.numQubits)]

    for (const gate of sortedGates) {
      const newStates: string[] = []

      for (const state of states) {
        const chars = state.split('')

        switch (gate.type) {
          case 'H':
            // Hadamard creates superposition
            const h0 = [...chars]
            const h1 = [...chars]
            h0[gate.qubit] = '0'
            h1[gate.qubit] = '1'
            newStates.push(h0.join(''), h1.join(''))
            break

          case 'X':
            chars[gate.qubit] = chars[gate.qubit] === '0' ? '1' : '0'
            newStates.push(chars.join(''))
            break

          case 'CNOT':
            if (gate.control !== undefined && chars[gate.qubit] === '1') {
              chars[gate.control] = chars[gate.control] === '0' ? '1' : '0'
            }
            newStates.push(chars.join(''))
            break

          default:
            newStates.push(state)
        }
      }

      states = [...new Set(newStates)]
    }

    if (states.length === 1) {
      return `|${states[0]}⟩`
    }

    return states.map(s => `|${s}⟩`).join(' + ')
  }

  runCircuit() {
    // Animate gates in sequence
    const sortedGates = [...this.gates].sort((a, b) => a.step - b.step)

    sortedGates.forEach((gate, i) => {
      this.time.delayedCall(i * 300, () => {
        if (gate.sprite) {
          this.tweens.add({
            targets: gate.sprite,
            scale: 1.2,
            duration: 150,
            yoyo: true,
          })
        }
      })
    })

    // Check result after animation
    this.time.delayedCall(sortedGates.length * 300 + 500, () => {
      if (this.mode === 'challenge') {
        this.checkChallenge()
      } else {
        this.showMessage('Circuit executed!')
      }
    })
  }

  checkChallenge() {
    if (!this.challenge) return

    const state = this.calculateState()
    const target = this.challenge.targetState

    // Simple check (would need proper state comparison in real impl)
    const success = state.includes(target.replace('(|', '|').replace(')/√2', ''))
      || (target.includes('+') && state.includes('+'))

    if (success) {
      const score = Math.max(0, 100 - (this.gates.length - 1) * 10)
      const stars = this.gates.length <= this.challenge.maxGates - 1 ? 3 :
                    this.gates.length <= this.challenge.maxGates ? 2 : 1

      this.scene.start('ResultScene', {
        score,
        stars,
        challengeName: this.challenge.name,
      })

      this.game.events.emit('level_complete', { score, stars })
    } else {
      this.showMessage('Not quite right. Try again!')
    }
  }

  clearCircuit() {
    this.gates.forEach(gate => gate.sprite?.destroy())
    this.gates = []
    this.updateState()
  }

  showMessage(text: string) {
    const { width, height } = this.cameras.main
    const msg = this.add.text(width / 2, height / 2, text, {
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#1e293b',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5)

    this.tweens.add({
      targets: msg,
      alpha: 0,
      y: height / 2 - 50,
      duration: 1500,
      onComplete: () => msg.destroy(),
    })
  }
}
