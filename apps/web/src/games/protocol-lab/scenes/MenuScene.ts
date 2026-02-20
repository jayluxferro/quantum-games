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
    this.add.rectangle(centerX, centerY, width, height, 0x0f172a)

    // Lab equipment decoration
    this.drawLabDecoration(centerX, centerY - 50)

    // Title
    this.add.text(centerX, centerY + 60, '🔬 Protocol Lab', {
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#8b5cf6',
    }).setOrigin(0.5)

    this.add.text(centerX, centerY + 100, 'Design and test quantum protocols', {
      fontSize: '16px',
      color: '#94a3b8',
    }).setOrigin(0.5)

    // Protocol list
    const protocols = [
      { name: 'Quantum Teleportation', emoji: '📡', difficulty: 'Medium' },
      { name: 'Dense Coding', emoji: '📦', difficulty: 'Medium' },
      { name: 'Entanglement Swapping', emoji: '🔗', difficulty: 'Hard' },
      { name: 'Quantum Error Correction', emoji: '🛡️', difficulty: 'Hard' },
    ]

    this.add.text(centerX, centerY + 140, 'Available Protocols:', {
      fontSize: '14px',
      color: '#64748b',
    }).setOrigin(0.5)

    protocols.forEach((p, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const px = centerX - 100 + col * 200
      const py = centerY + 175 + row * 35

      this.add.text(px, py, `${p.emoji} ${p.name}`, {
        fontSize: '12px',
        color: '#94a3b8',
      }).setOrigin(0.5)
    })

    // Start button
    const startBtn = this.add.rectangle(centerX, centerY + 270, 200, 50, 0x8b5cf6)
    this.add.text(centerX, centerY + 270, '▶ Enter Lab', {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5)

    startBtn.setInteractive({ useHandCursor: true })
    startBtn.on('pointerover', () => startBtn.setFillStyle(0xa855f7))
    startBtn.on('pointerout', () => startBtn.setFillStyle(0x8b5cf6))
    startBtn.on('pointerdown', () => this.scene.start('LabScene'))
  }

  drawLabDecoration(x: number, y: number) {
    const graphics = this.add.graphics()

    // Lab equipment outlines
    graphics.lineStyle(2, 0x374151)
    
    // Flask shape
    graphics.beginPath()
    graphics.moveTo(x - 80, y - 30)
    graphics.lineTo(x - 60, y - 30)
    graphics.lineTo(x - 50, y + 20)
    graphics.lineTo(x - 90, y + 20)
    graphics.lineTo(x - 80, y - 30)
    graphics.strokePath()

    // Beaker
    graphics.strokeRect(x + 40, y - 20, 40, 50)
    graphics.lineBetween(x + 30, y - 20, x + 40, y - 20)
    graphics.lineBetween(x + 80, y - 20, x + 90, y - 20)

    // Quantum state symbols
    const states = ['|ψ⟩', '|φ⟩', '|+⟩', '|-⟩']
    states.forEach((state, i) => {
      const sx = x - 60 + i * 40
      const sy = y - 10 + Math.sin(i) * 10
      
      const text = this.add.text(sx, sy, state, {
        fontSize: '14px',
        color: '#8b5cf6',
      }).setOrigin(0.5)

      this.tweens.add({
        targets: text,
        y: sy - 10,
        alpha: 0.5,
        duration: 1000 + i * 200,
        yoyo: true,
        repeat: -1,
      })
    })

    // Entanglement lines
    graphics.lineStyle(1, 0x8b5cf6, 0.5)
    for (let i = 0; i < 5; i++) {
      const startX = x - 100 + Math.random() * 200
      const startY = y - 30 + Math.random() * 60
      const endX = x - 100 + Math.random() * 200
      const endY = y - 30 + Math.random() * 60
      graphics.lineBetween(startX, startY, endX, endY)
    }
  }
}
