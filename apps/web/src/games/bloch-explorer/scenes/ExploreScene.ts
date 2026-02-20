import Phaser from 'phaser'

interface QubitState {
  theta: number // Polar angle (0 to PI)
  phi: number   // Azimuthal angle (0 to 2PI)
}

export class ExploreScene extends Phaser.Scene {
  private state: QubitState = { theta: 0, phi: 0 }
  private sphereGraphics!: Phaser.GameObjects.Graphics
  private stateVector!: Phaser.GameObjects.Graphics
  private statePoint!: Phaser.GameObjects.Arc
  private centerX!: number
  private centerY!: number
  private radius: number = 120
  
  private thetaText!: Phaser.GameObjects.Text
  private phiText!: Phaser.GameObjects.Text
  private stateText!: Phaser.GameObjects.Text
  private probText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'ExploreScene' })
  }

  create() {
    const { width, height } = this.cameras.main
    this.centerX = width / 2 - 100
    this.centerY = height / 2

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0f0f1a)

    // Draw sphere
    this.drawBlochSphere()

    // Create state visualization
    this.createStateVisualization()

    // UI Controls
    this.createControls()

    // Gate buttons
    this.createGateButtons()

    // Info panel
    this.createInfoPanel()

    // Back button
    const backBtn = this.add.text(30, height - 30, '← Back', {
      fontSize: '14px',
      color: '#64748b',
    })
    backBtn.setInteractive({ useHandCursor: true })
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'))

    this.cameras.main.fadeIn(300)
  }

  drawBlochSphere() {
    this.sphereGraphics = this.add.graphics()

    // Main circle
    this.sphereGraphics.lineStyle(2, 0x374151)
    this.sphereGraphics.strokeCircle(this.centerX, this.centerY, this.radius)

    // Equator (ellipse for 3D effect)
    this.sphereGraphics.lineStyle(1, 0x374151, 0.6)
    this.sphereGraphics.strokeEllipse(
      this.centerX,
      this.centerY,
      this.radius * 2,
      this.radius * 0.5
    )

    // Meridian
    this.sphereGraphics.lineStyle(1, 0x374151, 0.3)
    this.sphereGraphics.strokeEllipse(
      this.centerX,
      this.centerY,
      this.radius * 0.5,
      this.radius * 2
    )

    // Axes
    this.sphereGraphics.lineStyle(1, 0x64748b, 0.5)
    // Z axis
    this.sphereGraphics.lineBetween(
      this.centerX,
      this.centerY - this.radius - 20,
      this.centerX,
      this.centerY + this.radius + 20
    )
    // X axis
    this.sphereGraphics.lineBetween(
      this.centerX - this.radius - 20,
      this.centerY,
      this.centerX + this.radius + 20,
      this.centerY
    )

    // Axis labels
    this.add.text(this.centerX, this.centerY - this.radius - 35, '|0⟩', {
      fontSize: '16px',
      color: '#22c55e',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(this.centerX, this.centerY + this.radius + 35, '|1⟩', {
      fontSize: '16px',
      color: '#ef4444',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(this.centerX + this.radius + 25, this.centerY, '|+⟩', {
      fontSize: '14px',
      color: '#3b82f6',
    }).setOrigin(0.5)

    this.add.text(this.centerX - this.radius - 25, this.centerY, '|-⟩', {
      fontSize: '14px',
      color: '#3b82f6',
    }).setOrigin(0.5)

    this.add.text(this.centerX + this.radius + 5, this.centerY - this.radius / 2 - 10, '|+i⟩', {
      fontSize: '12px',
      color: '#8b5cf6',
    }).setOrigin(0.5)

    this.add.text(this.centerX - this.radius - 5, this.centerY + this.radius / 2 + 10, '|-i⟩', {
      fontSize: '12px',
      color: '#8b5cf6',
    }).setOrigin(0.5)
  }

  createStateVisualization() {
    this.stateVector = this.add.graphics()
    this.statePoint = this.add.circle(
      this.centerX,
      this.centerY - this.radius,
      8,
      0x06b6d4
    )
    
    // Glow effect
    this.add.circle(this.centerX, this.centerY - this.radius, 15, 0x06b6d4, 0.3)
    
    this.updateStateVisualization()
  }

  updateStateVisualization() {
    // Calculate 3D position on sphere
    const x3d = Math.sin(this.state.theta) * Math.cos(this.state.phi)
    const y3d = Math.sin(this.state.theta) * Math.sin(this.state.phi)
    const z3d = Math.cos(this.state.theta)

    // Project to 2D (simple orthographic projection)
    const x2d = this.centerX + x3d * this.radius
    const y2d = this.centerY - z3d * this.radius

    // Update state vector line
    this.stateVector.clear()
    this.stateVector.lineStyle(3, 0x06b6d4)
    this.stateVector.lineBetween(this.centerX, this.centerY, x2d, y2d)

    // Update state point
    this.statePoint.setPosition(x2d, y2d)

    // Update text displays
    this.updateDisplays()
  }

  updateDisplays() {
    const theta = this.state.theta
    const phi = this.state.phi

    // Angles
    this.thetaText.setText(`θ: ${(theta * 180 / Math.PI).toFixed(1)}°`)
    this.phiText.setText(`φ: ${(phi * 180 / Math.PI).toFixed(1)}°`)

    // State in Dirac notation
    const alpha = Math.cos(theta / 2)
    const betaReal = Math.sin(theta / 2) * Math.cos(phi)
    const betaImag = Math.sin(theta / 2) * Math.sin(phi)

    let stateStr = ''
    if (Math.abs(alpha) > 0.01) {
      stateStr += `${alpha.toFixed(2)}|0⟩`
    }
    if (Math.abs(betaReal) > 0.01 || Math.abs(betaImag) > 0.01) {
      if (stateStr) stateStr += ' + '
      if (Math.abs(betaImag) < 0.01) {
        stateStr += `${betaReal.toFixed(2)}|1⟩`
      } else {
        stateStr += `(${betaReal.toFixed(2)} + ${betaImag.toFixed(2)}i)|1⟩`
      }
    }
    this.stateText.setText(`|ψ⟩ = ${stateStr || '|0⟩'}`)

    // Probabilities
    const prob0 = Math.cos(theta / 2) ** 2
    const prob1 = Math.sin(theta / 2) ** 2
    this.probText.setText(`P(0) = ${(prob0 * 100).toFixed(1)}%\nP(1) = ${(prob1 * 100).toFixed(1)}%`)
  }

  createControls() {
    const { width } = this.cameras.main
    const panelX = width - 120

    this.add.text(panelX, 30, 'Angles', {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#06b6d4',
    }).setOrigin(0.5)

    // Theta control
    this.add.text(panelX - 50, 60, 'θ (polar)', {
      fontSize: '12px',
      color: '#64748b',
    })

    this.thetaText = this.add.text(panelX + 40, 60, 'θ: 0°', {
      fontSize: '12px',
      color: '#ffffff',
    })

    this.createSlider(panelX, 85, 100, (value) => {
      this.state.theta = value * Math.PI
      this.updateStateVisualization()
    })

    // Phi control
    this.add.text(panelX - 50, 120, 'φ (azimuth)', {
      fontSize: '12px',
      color: '#64748b',
    })

    this.phiText = this.add.text(panelX + 40, 120, 'φ: 0°', {
      fontSize: '12px',
      color: '#ffffff',
    })

    this.createSlider(panelX, 145, 100, (value) => {
      this.state.phi = value * 2 * Math.PI
      this.updateStateVisualization()
    })
  }

  createSlider(x: number, y: number, width: number, onChange: (value: number) => void) {
    const track = this.add.rectangle(x, y, width, 6, 0x374151)
    const thumb = this.add.circle(x - width / 2, y, 10, 0x06b6d4)
    thumb.setInteractive({ draggable: true, useHandCursor: true })

    thumb.on('drag', (_pointer: any, dragX: number) => {
      const minX = x - width / 2
      const maxX = x + width / 2
      const clampedX = Phaser.Math.Clamp(dragX, minX, maxX)
      thumb.x = clampedX
      const value = (clampedX - minX) / width
      onChange(value)
    })
  }

  createGateButtons() {
    const { width, height } = this.cameras.main
    const panelX = width - 120
    const startY = 200

    this.add.text(panelX, startY, 'Gates', {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#06b6d4',
    }).setOrigin(0.5)

    const gates = [
      { name: 'H', color: 0x8b5cf6, action: () => this.applyHadamard() },
      { name: 'X', color: 0xef4444, action: () => this.applyPauliX() },
      { name: 'Y', color: 0x22c55e, action: () => this.applyPauliY() },
      { name: 'Z', color: 0x3b82f6, action: () => this.applyPauliZ() },
      { name: 'S', color: 0xf59e0b, action: () => this.applySGate() },
      { name: 'T', color: 0x06b6d4, action: () => this.applyTGate() },
    ]

    gates.forEach((gate, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const gx = panelX - 40 + col * 40
      const gy = startY + 35 + row * 45

      const btn = this.add.rectangle(gx, gy, 35, 35, 0x1e293b)
      btn.setStrokeStyle(2, gate.color)

      this.add.text(gx, gy, gate.name, {
        fontSize: '16px',
        fontStyle: 'bold',
        color: `#${gate.color.toString(16).padStart(6, '0')}`,
      }).setOrigin(0.5)

      btn.setInteractive({ useHandCursor: true })
      btn.on('pointerdown', gate.action)
    })

    // Reset button
    const resetBtn = this.add.rectangle(panelX, startY + 140, 80, 30, 0x374151)
    this.add.text(panelX, startY + 140, 'Reset', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5)

    resetBtn.setInteractive({ useHandCursor: true })
    resetBtn.on('pointerdown', () => {
      this.state = { theta: 0, phi: 0 }
      this.updateStateVisualization()
    })
  }

  createInfoPanel() {
    const { height } = this.cameras.main
    const panelX = this.centerX
    const panelY = height - 80

    this.add.rectangle(panelX, panelY, 300, 100, 0x1e293b, 0.8).setStrokeStyle(1, 0x374151)

    this.stateText = this.add.text(panelX, panelY - 30, '|ψ⟩ = |0⟩', {
      fontSize: '14px',
      color: '#06b6d4',
      fontFamily: 'monospace',
    }).setOrigin(0.5)

    this.probText = this.add.text(panelX, panelY + 10, 'P(0) = 100%\nP(1) = 0%', {
      fontSize: '12px',
      color: '#94a3b8',
      align: 'center',
    }).setOrigin(0.5)
  }

  // Gate implementations
  applyHadamard() {
    // H rotates around (X+Z)/√2 axis by π
    const newTheta = Math.PI - this.state.theta
    const newPhi = Math.PI - this.state.phi
    this.animateTransition(newTheta, newPhi)
  }

  applyPauliX() {
    // X gate: flip around X axis (π rotation)
    const newTheta = Math.PI - this.state.theta
    this.animateTransition(newTheta, this.state.phi)
  }

  applyPauliY() {
    // Y gate: flip around Y axis
    const newTheta = Math.PI - this.state.theta
    const newPhi = this.state.phi + Math.PI
    this.animateTransition(newTheta, newPhi)
  }

  applyPauliZ() {
    // Z gate: rotate around Z axis by π
    const newPhi = this.state.phi + Math.PI
    this.animateTransition(this.state.theta, newPhi)
  }

  applySGate() {
    // S gate: rotate around Z axis by π/2
    const newPhi = this.state.phi + Math.PI / 2
    this.animateTransition(this.state.theta, newPhi)
  }

  applyTGate() {
    // T gate: rotate around Z axis by π/4
    const newPhi = this.state.phi + Math.PI / 4
    this.animateTransition(this.state.theta, newPhi)
  }

  animateTransition(newTheta: number, newPhi: number) {
    // Normalize angles
    newTheta = ((newTheta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    if (newTheta > Math.PI) newTheta = 2 * Math.PI - newTheta
    newPhi = ((newPhi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

    this.tweens.add({
      targets: this.state,
      theta: newTheta,
      phi: newPhi,
      duration: 500,
      ease: 'Sine.easeInOut',
      onUpdate: () => this.updateStateVisualization(),
    })
  }
}
