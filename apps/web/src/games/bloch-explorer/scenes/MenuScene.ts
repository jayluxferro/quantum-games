import Phaser from 'phaser'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' })
  }

  create() {
    const { width, height } = this.cameras.main
    const centerX = width / 2
    const centerY = height / 2

    // Background
    this.add.rectangle(centerX, centerY, width, height, 0x0f0f1a)

    // Animated Bloch sphere preview
    this.createBlochPreview(centerX, centerY - 60)

    // Title
    this.add.text(centerX, centerY + 80, '🌐 Bloch Sphere Explorer', {
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#06b6d4',
    }).setOrigin(0.5)

    this.add.text(centerX, centerY + 120, 'Visualize qubit states in 3D', {
      fontSize: '16px',
      color: '#94a3b8',
    }).setOrigin(0.5)

    // Key concepts
    const concepts = [
      '• |0⟩ at North Pole, |1⟩ at South Pole',
      '• |+⟩ and |-⟩ on the equator',
      '• Gates rotate the state vector',
    ]

    concepts.forEach((text, i) => {
      this.add.text(centerX, centerY + 155 + i * 22, text, {
        fontSize: '12px',
        color: '#64748b',
      }).setOrigin(0.5)
    })

    // Explore button
    const exploreBtn = this.add.rectangle(centerX - 100, centerY + 250, 160, 50, 0x1e293b)
    exploreBtn.setStrokeStyle(2, 0x06b6d4)
    this.add.text(centerX - 100, centerY + 250, '🔍 Free Explore', {
      fontSize: '16px',
      color: '#06b6d4',
    }).setOrigin(0.5)

    exploreBtn.setInteractive({ useHandCursor: true })
    exploreBtn.on('pointerover', () => exploreBtn.setFillStyle(0x2d3d4d))
    exploreBtn.on('pointerout', () => exploreBtn.setFillStyle(0x1e293b))
    exploreBtn.on('pointerdown', () => this.scene.start('ExploreScene'))

    // Challenge button
    const challengeBtn = this.add.rectangle(centerX + 100, centerY + 250, 160, 50, 0x06b6d4)
    this.add.text(centerX + 100, centerY + 250, '🎯 Challenges', {
      fontSize: '16px',
      color: '#000000',
    }).setOrigin(0.5)

    challengeBtn.setInteractive({ useHandCursor: true })
    challengeBtn.on('pointerover', () => challengeBtn.setFillStyle(0x22d3ee))
    challengeBtn.on('pointerout', () => challengeBtn.setFillStyle(0x06b6d4))
    challengeBtn.on('pointerdown', () => this.scene.start('ChallengeScene'))
  }

  createBlochPreview(x: number, y: number) {
    const graphics = this.add.graphics()
    const radius = 80

    // Sphere outline
    graphics.lineStyle(2, 0x374151)
    graphics.strokeCircle(x, y, radius)

    // Equator ellipse
    graphics.lineStyle(1, 0x374151, 0.5)
    graphics.strokeEllipse(x, y, radius * 2, radius * 0.6)

    // Axes
    graphics.lineStyle(1, 0x64748b, 0.5)
    // Z axis
    graphics.lineBetween(x, y - radius - 10, x, y + radius + 10)
    // X axis
    graphics.lineBetween(x - radius - 10, y, x + radius + 10, y)

    // Labels
    this.add.text(x, y - radius - 20, '|0⟩', {
      fontSize: '14px',
      color: '#22c55e',
    }).setOrigin(0.5)

    this.add.text(x, y + radius + 20, '|1⟩', {
      fontSize: '14px',
      color: '#ef4444',
    }).setOrigin(0.5)

    this.add.text(x + radius + 20, y, '|+⟩', {
      fontSize: '12px',
      color: '#06b6d4',
    }).setOrigin(0.5)

    this.add.text(x - radius - 20, y, '|-⟩', {
      fontSize: '12px',
      color: '#06b6d4',
    }).setOrigin(0.5)

    // Animated state vector
    const stateVector = this.add.graphics()
    stateVector.lineStyle(3, 0x06b6d4)
    stateVector.lineBetween(x, y, x, y - radius * 0.8)

    // State point
    const statePoint = this.add.circle(x, y - radius * 0.8, 6, 0x06b6d4)

    // Animate rotation
    let angle = 0
    this.time.addEvent({
      delay: 50,
      callback: () => {
        angle += 0.02
        const px = x + Math.sin(angle) * radius * 0.8
        const py = y - Math.cos(angle) * radius * 0.5
        
        stateVector.clear()
        stateVector.lineStyle(3, 0x06b6d4)
        stateVector.lineBetween(x, y, px, py)
        
        statePoint.setPosition(px, py)
      },
      loop: true,
    })
  }
}
