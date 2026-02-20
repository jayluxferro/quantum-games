import Phaser from 'phaser'

interface Gate {
  type: 'H' | 'X' | 'Y' | 'Z' | 'S' | 'T'
  sprite: Phaser.GameObjects.Container
  applied: boolean
}

interface QubitState {
  alpha: number  // |0⟩ amplitude
  beta: number   // |1⟩ amplitude
}

export class PlayScene extends Phaser.Scene {
  private qubit!: Phaser.GameObjects.Container
  private gates: Gate[] = []
  private state: QubitState = { alpha: 1, beta: 0 }
  private targetState: QubitState = { alpha: 0, beta: 1 }
  private score: number = 0
  private level: number = 1
  private scoreText!: Phaser.GameObjects.Text
  private stateText!: Phaser.GameObjects.Text
  private targetText!: Phaser.GameObjects.Text
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys

  constructor() {
    super({ key: 'PlayScene' })
  }

  create() {
    const { width, height } = this.cameras.main

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a)

    // Grid lines
    const graphics = this.add.graphics()
    graphics.lineStyle(1, 0x1e293b, 0.5)
    for (let x = 0; x < width; x += 50) {
      graphics.lineBetween(x, 0, x, height)
    }
    for (let y = 0; y < height; y += 50) {
      graphics.lineBetween(0, y, width, y)
    }

    // Create qubit
    this.createQubit()

    // Create gates for level
    this.createLevelGates()

    // UI
    this.createUI()

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys()

    // Physics
    this.physics.add.existing(this.qubit)
    const body = this.qubit.body as Phaser.Physics.Arcade.Body
    body.setCollideWorldBounds(true)
    body.setDrag(200, 200)

    // Camera fade in
    this.cameras.main.fadeIn(500)
  }

  createQubit() {
    const { width, height } = this.cameras.main
    
    this.qubit = this.add.container(100, height / 2)
    
    // Glow effect
    const glow = this.add.circle(0, 0, 35, 0x8b5cf6, 0.3)
    
    // Main qubit sphere
    const sphere = this.add.circle(0, 0, 25, 0x8b5cf6)
    
    // State indicator (color based on |0⟩ vs |1⟩)
    const indicator = this.add.circle(0, 0, 15, 0x22c55e) // Green for |0⟩
    
    // Label
    const label = this.add.text(0, 0, '|ψ⟩', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.qubit.add([glow, sphere, indicator, label])
    
    // Pulsing animation
    this.tweens.add({
      targets: glow,
      alpha: 0.1,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    })
  }

  createLevelGates() {
    const { width, height } = this.cameras.main
    
    // Define level layouts
    const levels: { gates: Array<{ type: Gate['type']; x: number; y: number }> }[] = [
      // Level 1: Single X gate
      { gates: [{ type: 'X', x: 400, y: height / 2 }] },
      // Level 2: H then X
      { gates: [
        { type: 'H', x: 300, y: height / 2 },
        { type: 'X', x: 500, y: height / 2 },
      ]},
      // Level 3: Multiple gates
      { gates: [
        { type: 'H', x: 250, y: height / 3 },
        { type: 'Z', x: 400, y: height / 2 },
        { type: 'H', x: 550, y: 2 * height / 3 },
      ]},
    ]

    const currentLevel = levels[Math.min(this.level - 1, levels.length - 1)]
    
    currentLevel.gates.forEach(gateData => {
      this.createGate(gateData.type, gateData.x, gateData.y)
    })

    // Target zone
    this.createTargetZone(width - 100, height / 2)
  }

  createGate(type: Gate['type'], x: number, y: number) {
    const container = this.add.container(x, y)
    
    // Gate background
    const bg = this.add.rectangle(0, 0, 60, 60, 0x1e293b)
    bg.setStrokeStyle(2, this.getGateColor(type))
    
    // Gate label
    const label = this.add.text(0, 0, type, {
      fontSize: '24px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5)
    
    // Gate name below
    const name = this.add.text(0, 45, this.getGateName(type), {
      fontSize: '10px',
      color: '#64748b',
    }).setOrigin(0.5)

    container.add([bg, label, name])
    
    // Make interactive zone
    const zone = this.add.zone(x, y, 60, 60)
    this.physics.add.existing(zone, true)
    
    this.gates.push({
      type,
      sprite: container,
      applied: false,
    })

    // Check overlap with qubit
    this.physics.add.overlap(this.qubit, zone, () => {
      const gate = this.gates.find(g => g.sprite === container)
      if (gate && !gate.applied) {
        this.applyGate(gate)
      }
    })
  }

  createTargetZone(x: number, y: number) {
    const target = this.add.container(x, y)
    
    // Target ring
    const ring = this.add.circle(0, 0, 50, 0x000000, 0)
    ring.setStrokeStyle(3, 0x22c55e)
    
    // Target state
    const stateLabel = this.add.text(0, 0, '|1⟩', {
      fontSize: '20px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#22c55e',
    }).setOrigin(0.5)
    
    const label = this.add.text(0, 35, 'TARGET', {
      fontSize: '10px',
      color: '#22c55e',
    }).setOrigin(0.5)

    target.add([ring, stateLabel, label])
    
    // Pulsing
    this.tweens.add({
      targets: ring,
      scaleX: 1.1,
      scaleY: 1.1,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    })

    // Target zone physics
    const zone = this.add.zone(x, y, 80, 80)
    this.physics.add.existing(zone, true)
    
    this.physics.add.overlap(this.qubit, zone, () => {
      this.checkWin()
    })
  }

  createUI() {
    const { width } = this.cameras.main
    
    // Score
    this.scoreText = this.add.text(20, 20, `Score: ${this.score}`, {
      fontSize: '18px',
      color: '#ffffff',
    })
    
    // Level
    this.add.text(20, 50, `Level: ${this.level}`, {
      fontSize: '18px',
      color: '#8b5cf6',
    })
    
    // Current state
    this.stateText = this.add.text(width - 20, 20, this.formatState(this.state), {
      fontSize: '16px',
      color: '#22c55e',
    }).setOrigin(1, 0)
    
    // Target state
    this.targetText = this.add.text(width - 20, 45, `Target: |1⟩`, {
      fontSize: '14px',
      color: '#64748b',
    }).setOrigin(1, 0)
    
    // Controls hint
    this.add.text(width / 2, this.cameras.main.height - 30, 
      'Use arrow keys to move the qubit through gates', {
      fontSize: '12px',
      color: '#64748b',
    }).setOrigin(0.5)
  }

  getGateColor(type: Gate['type']): number {
    const colors: Record<Gate['type'], number> = {
      H: 0x8b5cf6,
      X: 0xef4444,
      Y: 0x22c55e,
      Z: 0x3b82f6,
      S: 0xf59e0b,
      T: 0x06b6d4,
    }
    return colors[type] || 0xffffff
  }

  getGateName(type: Gate['type']): string {
    const names: Record<Gate['type'], string> = {
      H: 'Hadamard',
      X: 'Pauli-X',
      Y: 'Pauli-Y',
      Z: 'Pauli-Z',
      S: 'S Gate',
      T: 'T Gate',
    }
    return names[type] || ''
  }

  applyGate(gate: Gate) {
    gate.applied = true
    
    // Visual feedback
    this.tweens.add({
      targets: gate.sprite,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 100,
      yoyo: true,
    })
    
    // Flash effect
    this.cameras.main.flash(100, 139, 92, 246)
    
    // Apply gate transformation
    const newState = this.applyGateToState(gate.type, this.state)
    this.state = newState
    
    // Update UI
    this.stateText.setText(this.formatState(this.state))
    this.updateQubitVisual()
    
    // Score
    this.score += 10
    this.scoreText.setText(`Score: ${this.score}`)
    
    // Mark gate as used
    gate.sprite.setAlpha(0.5)
  }

  applyGateToState(type: Gate['type'], state: QubitState): QubitState {
    const sqrt2 = Math.SQRT2
    
    switch (type) {
      case 'H': // Hadamard
        return {
          alpha: (state.alpha + state.beta) / sqrt2,
          beta: (state.alpha - state.beta) / sqrt2,
        }
      case 'X': // Pauli-X (NOT gate)
        return {
          alpha: state.beta,
          beta: state.alpha,
        }
      case 'Y': // Pauli-Y
        return {
          alpha: -state.beta,
          beta: state.alpha,
        }
      case 'Z': // Pauli-Z
        return {
          alpha: state.alpha,
          beta: -state.beta,
        }
      case 'S': // S gate
        return {
          alpha: state.alpha,
          beta: state.beta, // In reality would multiply by i
        }
      case 'T': // T gate
        return {
          alpha: state.alpha,
          beta: state.beta * Math.SQRT1_2, // Simplified
        }
      default:
        return state
    }
  }

  formatState(state: QubitState): string {
    const a = Math.abs(state.alpha).toFixed(2)
    const b = Math.abs(state.beta).toFixed(2)
    
    if (Math.abs(state.alpha) > 0.99) return '|ψ⟩ = |0⟩'
    if (Math.abs(state.beta) > 0.99) return '|ψ⟩ = |1⟩'
    return `|ψ⟩ = ${a}|0⟩ + ${b}|1⟩`
  }

  updateQubitVisual() {
    // Update the qubit indicator color based on state
    const indicator = this.qubit.getAt(2) as Phaser.GameObjects.Arc
    
    // Interpolate color from green (|0⟩) to red (|1⟩)
    const ratio = Math.abs(this.state.beta)
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(34, 197, 94),  // Green
      new Phaser.Display.Color(239, 68, 68),  // Red
      100,
      ratio * 100
    )
    
    indicator.setFillStyle(
      Phaser.Display.Color.GetColor(color.r, color.g, color.b)
    )
  }

  checkWin() {
    // Check if current state matches target
    const tolerance = 0.1
    const matchesTarget = 
      Math.abs(this.state.beta) > (1 - tolerance) && 
      Math.abs(this.state.alpha) < tolerance

    if (matchesTarget) {
      this.score += 50
      this.levelComplete()
    }
  }

  levelComplete() {
    this.physics.pause()
    
    // Calculate stars
    const stars = this.score >= 100 ? 3 : this.score >= 70 ? 2 : 1
    
    // Show completion
    this.time.delayedCall(500, () => {
      this.scene.start('ResultScene', { 
        score: this.score, 
        stars,
        level: this.level,
      })
    })
    
    // Emit event
    this.game.events.emit('level_complete', { score: this.score, stars })
  }

  update() {
    const body = this.qubit.body as Phaser.Physics.Arcade.Body
    const speed = 200

    if (this.cursors.left.isDown) {
      body.setVelocityX(-speed)
    } else if (this.cursors.right.isDown) {
      body.setVelocityX(speed)
    }

    if (this.cursors.up.isDown) {
      body.setVelocityY(-speed)
    } else if (this.cursors.down.isDown) {
      body.setVelocityY(speed)
    }
  }
}
