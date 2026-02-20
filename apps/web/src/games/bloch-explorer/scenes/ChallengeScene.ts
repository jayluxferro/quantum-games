import Phaser from 'phaser'

interface Challenge {
  name: string
  description: string
  targetTheta: number
  targetPhi: number
  hint: string
}

export class ChallengeScene extends Phaser.Scene {
  private state = { theta: 0, phi: 0 }
  private challenge: Challenge | null = null
  private challengeIndex: number = 0
  private score: number = 0
  private gatesUsed: number = 0
  
  private centerX!: number
  private centerY!: number
  private radius: number = 100
  
  private stateVector!: Phaser.GameObjects.Graphics
  private targetVector!: Phaser.GameObjects.Graphics
  private statePoint!: Phaser.GameObjects.Arc
  private targetPoint!: Phaser.GameObjects.Arc

  private challenges: Challenge[] = [
    {
      name: 'Go South',
      description: 'Move from |0⟩ to |1⟩',
      targetTheta: Math.PI,
      targetPhi: 0,
      hint: 'Use X gate (Pauli-X)',
    },
    {
      name: 'Superposition',
      description: 'Create the |+⟩ state',
      targetTheta: Math.PI / 2,
      targetPhi: 0,
      hint: 'Use H gate (Hadamard)',
    },
    {
      name: 'Minus State',
      description: 'Create the |-⟩ state',
      targetTheta: Math.PI / 2,
      targetPhi: Math.PI,
      hint: 'Try X then H gates',
    },
    {
      name: 'Plus i',
      description: 'Create the |+i⟩ state',
      targetTheta: Math.PI / 2,
      targetPhi: Math.PI / 2,
      hint: 'Use H then S gates',
    },
    {
      name: 'Halfway',
      description: 'Reach θ = 45°',
      targetTheta: Math.PI / 4,
      targetPhi: 0,
      hint: 'Use H then T gates',
    },
  ]

  constructor() {
    super({ key: 'ChallengeScene' })
  }

  create() {
    const { width, height } = this.cameras.main
    this.centerX = width / 2 - 80
    this.centerY = height / 2 + 20

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0f0f1a)

    // Load challenge
    this.challenge = this.challenges[this.challengeIndex]
    this.state = { theta: 0, phi: 0 }
    this.gatesUsed = 0

    // Draw sphere
    this.drawBlochSphere()

    // Create visualizations
    this.createVisualization()

    // UI
    this.createChallengeUI()
    this.createGateButtons()

    // Back button
    const backBtn = this.add.text(30, height - 30, '← Back', {
      fontSize: '14px',
      color: '#64748b',
    })
    backBtn.setInteractive({ useHandCursor: true })
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'))
  }

  drawBlochSphere() {
    const graphics = this.add.graphics()

    graphics.lineStyle(2, 0x374151)
    graphics.strokeCircle(this.centerX, this.centerY, this.radius)

    graphics.lineStyle(1, 0x374151, 0.5)
    graphics.strokeEllipse(this.centerX, this.centerY, this.radius * 2, this.radius * 0.5)

    graphics.lineStyle(1, 0x64748b, 0.3)
    graphics.lineBetween(this.centerX, this.centerY - this.radius - 10, this.centerX, this.centerY + this.radius + 10)
    graphics.lineBetween(this.centerX - this.radius - 10, this.centerY, this.centerX + this.radius + 10, this.centerY)

    // Labels
    this.add.text(this.centerX, this.centerY - this.radius - 20, '|0⟩', {
      fontSize: '14px',
      color: '#22c55e',
    }).setOrigin(0.5)

    this.add.text(this.centerX, this.centerY + this.radius + 20, '|1⟩', {
      fontSize: '14px',
      color: '#ef4444',
    }).setOrigin(0.5)
  }

  createVisualization() {
    // Target visualization (yellow)
    this.targetVector = this.add.graphics()
    this.targetPoint = this.add.circle(0, 0, 6, 0xfbbf24)
    this.updateTargetVisualization()

    // State visualization (cyan)
    this.stateVector = this.add.graphics()
    this.statePoint = this.add.circle(this.centerX, this.centerY - this.radius, 8, 0x06b6d4)
    this.updateStateVisualization()
  }

  updateStateVisualization() {
    const x3d = Math.sin(this.state.theta) * Math.cos(this.state.phi)
    const z3d = Math.cos(this.state.theta)
    const x2d = this.centerX + x3d * this.radius
    const y2d = this.centerY - z3d * this.radius

    this.stateVector.clear()
    this.stateVector.lineStyle(3, 0x06b6d4)
    this.stateVector.lineBetween(this.centerX, this.centerY, x2d, y2d)
    this.statePoint.setPosition(x2d, y2d)
  }

  updateTargetVisualization() {
    if (!this.challenge) return

    const x3d = Math.sin(this.challenge.targetTheta) * Math.cos(this.challenge.targetPhi)
    const z3d = Math.cos(this.challenge.targetTheta)
    const x2d = this.centerX + x3d * this.radius
    const y2d = this.centerY - z3d * this.radius

    this.targetVector.clear()
    this.targetVector.lineStyle(2, 0xfbbf24, 0.5)
    this.targetVector.lineBetween(this.centerX, this.centerY, x2d, y2d)
    this.targetPoint.setPosition(x2d, y2d)
  }

  createChallengeUI() {
    const { width } = this.cameras.main

    if (!this.challenge) return

    // Challenge info
    this.add.text(width / 2, 30, `Challenge ${this.challengeIndex + 1}/${this.challenges.length}`, {
      fontSize: '14px',
      color: '#64748b',
    }).setOrigin(0.5)

    this.add.text(width / 2, 55, this.challenge.name, {
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#06b6d4',
    }).setOrigin(0.5)

    this.add.text(width / 2, 85, this.challenge.description, {
      fontSize: '14px',
      color: '#94a3b8',
    }).setOrigin(0.5)

    // Legend
    const legendY = 120
    this.add.circle(width / 2 - 80, legendY, 6, 0x06b6d4)
    this.add.text(width / 2 - 65, legendY, 'Your state', {
      fontSize: '12px',
      color: '#64748b',
    }).setOrigin(0, 0.5)

    this.add.circle(width / 2 + 20, legendY, 6, 0xfbbf24)
    this.add.text(width / 2 + 35, legendY, 'Target', {
      fontSize: '12px',
      color: '#64748b',
    }).setOrigin(0, 0.5)

    // Hint button
    const hintBtn = this.add.text(width - 60, 30, '💡 Hint', {
      fontSize: '14px',
      color: '#64748b',
    })
    hintBtn.setInteractive({ useHandCursor: true })
    hintBtn.on('pointerdown', () => this.showHint())
  }

  createGateButtons() {
    const { width, height } = this.cameras.main
    const panelX = width - 80
    const startY = 180

    this.add.text(panelX, startY, 'Gates', {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#06b6d4',
    }).setOrigin(0.5)

    const gates = [
      { name: 'H', color: 0x8b5cf6, action: () => this.applyGate('H') },
      { name: 'X', color: 0xef4444, action: () => this.applyGate('X') },
      { name: 'Y', color: 0x22c55e, action: () => this.applyGate('Y') },
      { name: 'Z', color: 0x3b82f6, action: () => this.applyGate('Z') },
      { name: 'S', color: 0xf59e0b, action: () => this.applyGate('S') },
      { name: 'T', color: 0x06b6d4, action: () => this.applyGate('T') },
    ]

    gates.forEach((gate, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const gx = panelX - 25 + col * 50
      const gy = startY + 30 + row * 50

      const btn = this.add.rectangle(gx, gy, 40, 40, 0x1e293b)
      btn.setStrokeStyle(2, gate.color)

      this.add.text(gx, gy, gate.name, {
        fontSize: '18px',
        fontStyle: 'bold',
        color: `#${gate.color.toString(16).padStart(6, '0')}`,
      }).setOrigin(0.5)

      btn.setInteractive({ useHandCursor: true })
      btn.on('pointerdown', gate.action)
    })

    // Reset button
    const resetBtn = this.add.rectangle(panelX, startY + 200, 80, 30, 0x374151)
    this.add.text(panelX, startY + 200, 'Reset', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5)

    resetBtn.setInteractive({ useHandCursor: true })
    resetBtn.on('pointerdown', () => {
      this.state = { theta: 0, phi: 0 }
      this.gatesUsed = 0
      this.updateStateVisualization()
    })

    // Check button
    const checkBtn = this.add.rectangle(panelX, startY + 240, 80, 35, 0x22c55e)
    this.add.text(panelX, startY + 240, 'Check', {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#000000',
    }).setOrigin(0.5)

    checkBtn.setInteractive({ useHandCursor: true })
    checkBtn.on('pointerdown', () => this.checkSolution())
  }

  applyGate(gateName: string) {
    let newTheta = this.state.theta
    let newPhi = this.state.phi

    switch (gateName) {
      case 'H':
        newTheta = Math.PI - this.state.theta
        newPhi = Math.PI - this.state.phi
        break
      case 'X':
        newTheta = Math.PI - this.state.theta
        break
      case 'Y':
        newTheta = Math.PI - this.state.theta
        newPhi = this.state.phi + Math.PI
        break
      case 'Z':
        newPhi = this.state.phi + Math.PI
        break
      case 'S':
        newPhi = this.state.phi + Math.PI / 2
        break
      case 'T':
        newPhi = this.state.phi + Math.PI / 4
        break
    }

    this.gatesUsed++
    this.animateTransition(newTheta, newPhi)
  }

  animateTransition(newTheta: number, newPhi: number) {
    newTheta = ((newTheta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    if (newTheta > Math.PI) newTheta = 2 * Math.PI - newTheta
    newPhi = ((newPhi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

    this.tweens.add({
      targets: this.state,
      theta: newTheta,
      phi: newPhi,
      duration: 400,
      ease: 'Sine.easeInOut',
      onUpdate: () => this.updateStateVisualization(),
    })
  }

  checkSolution() {
    if (!this.challenge) return

    const tolerance = 0.15
    const thetaDiff = Math.abs(this.state.theta - this.challenge.targetTheta)
    const phiDiff = Math.abs(this.state.phi - this.challenge.targetPhi)
    const phiDiffAlt = Math.abs((this.state.phi + 2 * Math.PI) % (2 * Math.PI) - this.challenge.targetPhi)

    const success = thetaDiff < tolerance && (phiDiff < tolerance || phiDiffAlt < tolerance)

    if (success) {
      // Calculate score based on gates used
      const baseScore = 100
      const gatePenalty = Math.max(0, this.gatesUsed - 2) * 10
      this.score += Math.max(10, baseScore - gatePenalty)

      const stars = this.gatesUsed <= 2 ? 3 : this.gatesUsed <= 4 ? 2 : 1

      this.challengeIndex++

      if (this.challengeIndex < this.challenges.length) {
        this.showSuccess()
        this.time.delayedCall(1500, () => {
          this.scene.restart()
        })
      } else {
        this.scene.start('ResultScene', {
          score: this.score,
          stars,
          completed: this.challengeIndex,
          total: this.challenges.length,
        })
        this.game.events.emit('level_complete', { score: this.score, stars })
      }
    } else {
      this.showError()
    }
  }

  showSuccess() {
    const { width, height } = this.cameras.main
    const msg = this.add.text(width / 2, height / 2 - 50, '✓ Correct!', {
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#22c55e',
    }).setOrigin(0.5)

    this.tweens.add({
      targets: msg,
      scale: 1.2,
      duration: 300,
      yoyo: true,
    })
  }

  showError() {
    const { width, height } = this.cameras.main
    const msg = this.add.text(width / 2, height / 2 - 50, 'Not quite - try again!', {
      fontSize: '20px',
      color: '#ef4444',
    }).setOrigin(0.5)

    this.tweens.add({
      targets: msg,
      alpha: 0,
      duration: 2000,
      onComplete: () => msg.destroy(),
    })
  }

  showHint() {
    if (!this.challenge) return

    const { width, height } = this.cameras.main
    const hint = this.add.text(width / 2, height - 60, `💡 ${this.challenge.hint}`, {
      fontSize: '14px',
      color: '#fbbf24',
      backgroundColor: '#1e293b',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5)

    this.tweens.add({
      targets: hint,
      alpha: 0,
      delay: 3000,
      duration: 1000,
      onComplete: () => hint.destroy(),
    })
  }
}
