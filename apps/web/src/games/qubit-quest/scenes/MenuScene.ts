import Phaser from 'phaser'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' })
  }

  create() {
    const { width, height } = this.cameras.main
    const centerX = width / 2
    const centerY = height / 2

    // Background gradient
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x1a0a2e, 0x1a0a2e, 0x0a1628, 0x0a1628)
    bg.fillRect(0, 0, width, height)

    // Animated qubit particles
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, width)
      const y = Phaser.Math.Between(0, height)
      const particle = this.add.circle(x, y, 2, 0x6366f1, 0.5)
      
      this.tweens.add({
        targets: particle,
        y: y - 100,
        alpha: 0,
        duration: Phaser.Math.Between(2000, 4000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      })
    }

    // Title with glow
    const titleShadow = this.add.text(centerX + 3, centerY - 103, '🔮 Qubit Quest', {
      fontSize: '48px',
      fontFamily: 'Arial',
      color: '#4c1d95',
    }).setOrigin(0.5)

    const title = this.add.text(centerX, centerY - 100, '🔮 Qubit Quest', {
      fontSize: '48px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#a855f7',
    }).setOrigin(0.5)

    // Subtitle
    this.add.text(centerX, centerY - 40, 'Navigate through quantum gates', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5)

    // Animated qubit sprite
    const qubit = this.add.circle(centerX, centerY + 40, 25, 0x8b5cf6)
    const qubitGlow = this.add.circle(centerX, centerY + 40, 35, 0x8b5cf6, 0.3)
    
    this.tweens.add({
      targets: [qubit, qubitGlow],
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // State labels
    this.add.text(centerX - 50, centerY + 40, '|0⟩', {
      fontSize: '16px',
      color: '#22c55e',
    }).setOrigin(0.5)

    this.add.text(centerX + 50, centerY + 40, '|1⟩', {
      fontSize: '16px',
      color: '#ef4444',
    }).setOrigin(0.5)

    // Instructions
    const instructions = [
      '• Move your qubit through quantum gates',
      '• Reach the target state to complete each level',
      '• Avoid obstacles and collect power-ups',
    ]

    instructions.forEach((text, i) => {
      this.add.text(centerX, centerY + 100 + i * 25, text, {
        fontSize: '14px',
        color: '#64748b',
      }).setOrigin(0.5)
    })

    // Start button
    const startBtn = this.add.rectangle(centerX, centerY + 200, 200, 50, 0x8b5cf6)
    const startText = this.add.text(centerX, centerY + 200, 'START QUEST', {
      fontSize: '20px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5)

    startBtn.setInteractive({ useHandCursor: true })
    startBtn.on('pointerover', () => {
      startBtn.setFillStyle(0xa855f7)
    })
    startBtn.on('pointerout', () => {
      startBtn.setFillStyle(0x8b5cf6)
    })
    startBtn.on('pointerdown', () => {
      this.cameras.main.fade(500, 0, 0, 0)
      this.time.delayedCall(500, () => {
        this.scene.start('PlayScene')
      })
    })
  }
}
