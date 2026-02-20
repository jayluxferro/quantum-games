import Phaser from 'phaser'

interface Protocol {
  name: string
  description: string
  steps: string[]
  requiredGates: string[]
  qubits: number
}

export class LabScene extends Phaser.Scene {
  private selectedProtocol: Protocol | null = null
  private currentStep: number = 0
  private score: number = 0
  private circuit: string[][] = []
  private selectedGate: string | null = null

  private protocols: Protocol[] = [
    {
      name: 'Quantum Teleportation',
      description: 'Transfer a quantum state using entanglement and classical communication',
      steps: [
        'Create Bell pair between Alice and Bob (H, CNOT)',
        'Alice applies CNOT with her qubit and Bell qubit',
        'Alice applies H to her qubit',
        'Alice measures both qubits',
        'Bob applies corrections based on measurements',
      ],
      requiredGates: ['H', 'CNOT', 'X', 'Z'],
      qubits: 3,
    },
    {
      name: 'Dense Coding',
      description: 'Send 2 classical bits using 1 qubit and shared entanglement',
      steps: [
        'Create Bell pair between Alice and Bob',
        'Alice encodes message by applying gates',
        'Alice sends her qubit to Bob',
        'Bob measures in Bell basis',
        'Bob decodes the 2-bit message',
      ],
      requiredGates: ['H', 'CNOT', 'X', 'Z'],
      qubits: 2,
    },
    {
      name: 'Entanglement Swapping',
      description: 'Create entanglement between particles that never interacted',
      steps: [
        'Create two Bell pairs: (1,2) and (3,4)',
        'Perform Bell measurement on qubits 2 and 3',
        'Apply corrections to qubit 4',
        'Qubits 1 and 4 are now entangled!',
      ],
      requiredGates: ['H', 'CNOT', 'X', 'Z'],
      qubits: 4,
    },
  ]

  constructor() {
    super({ key: 'LabScene' })
  }

  create() {
    const { width, height } = this.cameras.main

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0f172a)

    // Protocol selection or experiment view
    if (!this.selectedProtocol) {
      this.showProtocolSelection()
    } else {
      this.showExperiment()
    }
  }

  showProtocolSelection() {
    const { width, height } = this.cameras.main
    const centerX = width / 2

    this.add.text(centerX, 40, 'Select Protocol', {
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#8b5cf6',
    }).setOrigin(0.5)

    this.protocols.forEach((protocol, i) => {
      const y = 120 + i * 100

      const card = this.add.rectangle(centerX, y, width - 80, 80, 0x1e293b)
      card.setStrokeStyle(2, 0x374151)

      this.add.text(centerX - 280, y - 20, protocol.name, {
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0, 0.5)

      this.add.text(centerX - 280, y + 10, protocol.description, {
        fontSize: '12px',
        color: '#64748b',
      }).setOrigin(0, 0.5)

      this.add.text(centerX + 250, y, `${protocol.qubits} qubits`, {
        fontSize: '12px',
        color: '#8b5cf6',
      }).setOrigin(1, 0.5)

      card.setInteractive({ useHandCursor: true })
      card.on('pointerover', () => card.setStrokeStyle(2, 0x8b5cf6))
      card.on('pointerout', () => card.setStrokeStyle(2, 0x374151))
      card.on('pointerdown', () => {
        this.selectedProtocol = protocol
        this.circuit = Array(protocol.qubits).fill(null).map(() => [])
        this.scene.restart()
      })
    })

    // Back button
    const backBtn = this.add.text(50, height - 40, '← Menu', {
      fontSize: '14px',
      color: '#64748b',
    })
    backBtn.setInteractive({ useHandCursor: true })
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'))
  }

  showExperiment() {
    const { width, height } = this.cameras.main

    if (!this.selectedProtocol) return

    // Title
    this.add.text(width / 2, 30, this.selectedProtocol.name, {
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#8b5cf6',
    }).setOrigin(0.5)

    // Steps panel
    this.createStepsPanel()

    // Circuit diagram
    this.createCircuitDiagram()

    // Gate palette
    this.createGatePalette()

    // Controls
    this.createControls()
  }

  createStepsPanel() {
    const { height } = this.cameras.main
    if (!this.selectedProtocol) return

    const panelX = 30
    const panelY = 70

    this.add.text(panelX, panelY, 'Protocol Steps:', {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
    })

    this.selectedProtocol.steps.forEach((step, i) => {
      const y = panelY + 25 + i * 30
      const isActive = i === this.currentStep
      const isComplete = i < this.currentStep

      const bullet = isComplete ? '✓' : isActive ? '►' : '○'
      const color = isComplete ? '#22c55e' : isActive ? '#8b5cf6' : '#64748b'

      this.add.text(panelX, y, `${bullet} ${step}`, {
        fontSize: '11px',
        color: color,
        wordWrap: { width: 200 },
      })
    })
  }

  createCircuitDiagram() {
    const { width, height } = this.cameras.main
    if (!this.selectedProtocol) return

    const circuitX = 280
    const circuitY = 80
    const qubitSpacing = 50
    const gateSpacing = 60
    const numSteps = 8

    const graphics = this.add.graphics()

    // Draw qubit lines
    for (let q = 0; q < this.selectedProtocol.qubits; q++) {
      const y = circuitY + q * qubitSpacing

      // Qubit label
      this.add.text(circuitX - 30, y, `|q${q}⟩`, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#94a3b8',
      }).setOrigin(0.5)

      // Wire
      graphics.lineStyle(2, 0x475569)
      graphics.lineBetween(circuitX, y, circuitX + numSteps * gateSpacing, y)
    }

    // Draw placed gates
    this.circuit.forEach((qubitGates, q) => {
      qubitGates.forEach((gate, step) => {
        if (gate) {
          const x = circuitX + step * gateSpacing + gateSpacing / 2
          const y = circuitY + q * qubitSpacing
          this.drawGate(x, y, gate)
        }
      })
    })

    // Make cells interactive for placing gates
    for (let q = 0; q < this.selectedProtocol.qubits; q++) {
      for (let step = 0; step < numSteps; step++) {
        const x = circuitX + step * gateSpacing + gateSpacing / 2
        const y = circuitY + q * qubitSpacing

        const cell = this.add.rectangle(x, y, gateSpacing - 5, qubitSpacing - 5, 0x000000, 0)
        cell.setInteractive({ useHandCursor: true })

        cell.on('pointerover', () => {
          if (this.selectedGate) {
            cell.setFillStyle(0x8b5cf6, 0.2)
          }
        })
        cell.on('pointerout', () => {
          cell.setFillStyle(0x000000, 0)
        })
        cell.on('pointerdown', () => {
          if (this.selectedGate) {
            this.placeGate(q, step, this.selectedGate)
          }
        })
      }
    }
  }

  drawGate(x: number, y: number, gate: string) {
    const gateColors: Record<string, number> = {
      H: 0x8b5cf6,
      X: 0xef4444,
      Y: 0x22c55e,
      Z: 0x3b82f6,
      CNOT: 0x22c55e,
      M: 0xf59e0b,
    }

    const color = gateColors[gate] || 0xffffff

    if (gate === 'CNOT') {
      // Control dot
      this.add.circle(x, y, 6, color)
    } else if (gate === 'M') {
      // Measurement
      const box = this.add.rectangle(x, y, 30, 30, 0x1e293b)
      box.setStrokeStyle(2, color)
      this.add.text(x, y, '📊', { fontSize: '16px' }).setOrigin(0.5)
    } else {
      const box = this.add.rectangle(x, y, 30, 30, 0x1e293b)
      box.setStrokeStyle(2, color)
      this.add.text(x, y, gate, {
        fontSize: '14px',
        fontStyle: 'bold',
        color: `#${color.toString(16).padStart(6, '0')}`,
      }).setOrigin(0.5)
    }
  }

  createGatePalette() {
    const { width, height } = this.cameras.main

    const paletteY = height - 80
    const gates = ['H', 'X', 'Y', 'Z', 'CNOT', 'M']

    this.add.text(width / 2, paletteY - 30, 'Gates (click to select):', {
      fontSize: '12px',
      color: '#64748b',
    }).setOrigin(0.5)

    gates.forEach((gate, i) => {
      const x = width / 2 - 150 + i * 60

      const gateColors: Record<string, number> = {
        H: 0x8b5cf6,
        X: 0xef4444,
        Y: 0x22c55e,
        Z: 0x3b82f6,
        CNOT: 0x22c55e,
        M: 0xf59e0b,
      }

      const color = gateColors[gate] || 0xffffff
      const btn = this.add.rectangle(x, paletteY, 45, 40, 0x1e293b)
      btn.setStrokeStyle(2, color)

      this.add.text(x, paletteY, gate === 'M' ? '📊' : gate, {
        fontSize: gate === 'M' ? '18px' : '16px',
        fontStyle: 'bold',
        color: `#${color.toString(16).padStart(6, '0')}`,
      }).setOrigin(0.5)

      btn.setInteractive({ useHandCursor: true })
      btn.on('pointerdown', () => {
        this.selectedGate = gate
        // Visual feedback
        this.children.list.forEach(child => {
          if ((child as any).isGateBtn) {
            (child as any).setStrokeStyle(2, gateColors[(child as any).gateName] || 0xffffff)
          }
        })
        btn.setStrokeStyle(3, 0xffffff);
        (btn as any).isGateBtn = true;
        (btn as any).gateName = gate
      })
    })
  }

  createControls() {
    const { width, height } = this.cameras.main

    // Run button
    const runBtn = this.add.rectangle(width - 80, height - 80, 100, 40, 0x22c55e)
    this.add.text(width - 80, height - 80, '▶ Run', {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#000000',
    }).setOrigin(0.5)

    runBtn.setInteractive({ useHandCursor: true })
    runBtn.on('pointerdown', () => this.runCircuit())

    // Clear button
    const clearBtn = this.add.rectangle(width - 80, height - 35, 100, 30, 0x374151)
    this.add.text(width - 80, height - 35, 'Clear', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5)

    clearBtn.setInteractive({ useHandCursor: true })
    clearBtn.on('pointerdown', () => {
      if (this.selectedProtocol) {
        this.circuit = Array(this.selectedProtocol.qubits).fill(null).map(() => [])
        this.scene.restart()
      }
    })

    // Back button
    const backBtn = this.add.text(50, height - 40, '← Back', {
      fontSize: '14px',
      color: '#64748b',
    })
    backBtn.setInteractive({ useHandCursor: true })
    backBtn.on('pointerdown', () => {
      this.selectedProtocol = null
      this.scene.restart()
    })
  }

  placeGate(qubit: number, step: number, gate: string) {
    while (this.circuit[qubit].length <= step) {
      this.circuit[qubit].push('')
    }
    this.circuit[qubit][step] = gate
    this.score += 5

    // Refresh the circuit display
    this.scene.restart()
  }

  runCircuit() {
    if (!this.selectedProtocol) return

    // Simple validation - check if essential gates are present
    const usedGates = new Set<string>()
    this.circuit.forEach(qubitGates => {
      qubitGates.forEach(gate => {
        if (gate) usedGates.add(gate)
      })
    })

    const hasRequired = this.selectedProtocol.requiredGates.every(g => usedGates.has(g))
    const gateCount = this.circuit.flat().filter(g => g).length

    if (hasRequired && gateCount >= 4) {
      this.score += 50
      const stars = gateCount <= 6 ? 3 : gateCount <= 8 ? 2 : 1

      this.scene.start('ResultScene', {
        score: this.score,
        stars,
        protocolName: this.selectedProtocol.name,
        gateCount,
      })

      this.game.events.emit('level_complete', { score: this.score, stars })
    } else {
      this.showMessage('Missing required gates or incomplete circuit')
    }
  }

  showMessage(text: string) {
    const { width, height } = this.cameras.main
    const msg = this.add.text(width / 2, height / 2, text, {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#1e293b',
      padding: { x: 15, y: 10 },
    }).setOrigin(0.5).setDepth(100)

    this.tweens.add({
      targets: msg,
      alpha: 0,
      duration: 2000,
      onComplete: () => msg.destroy(),
    })
  }
}
