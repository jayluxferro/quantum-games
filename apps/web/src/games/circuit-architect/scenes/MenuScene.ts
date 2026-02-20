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

    // Circuit decoration
    const graphics = this.add.graphics()
    graphics.lineStyle(2, 0x3b82f6, 0.3)
    
    for (let i = 0; i < 4; i++) {
      const y = 100 + i * 80
      graphics.lineBetween(50, y, width - 50, y)
      
      // Add some gate boxes
      for (let j = 0; j < 5; j++) {
        const x = 100 + j * 150
        if (Math.random() > 0.3) {
          graphics.strokeRect(x - 20, y - 20, 40, 40)
        }
      }
    }

    // Title
    this.add.text(centerX, centerY - 80, '⚡ Circuit Architect', {
      fontSize: '42px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#3b82f6',
    }).setOrigin(0.5)

    // Subtitle
    this.add.text(centerX, centerY - 30, 'Build quantum circuits to match target states', {
      fontSize: '18px',
      color: '#94a3b8',
    }).setOrigin(0.5)

    // Gate legend
    const gates = [
      { symbol: 'H', color: '#8b5cf6', name: 'Hadamard' },
      { symbol: 'X', color: '#ef4444', name: 'NOT' },
      { symbol: 'Z', color: '#3b82f6', name: 'Phase' },
      { symbol: '●', color: '#22c55e', name: 'CNOT' },
    ]

    this.add.text(centerX, centerY + 30, 'Available Gates:', {
      fontSize: '14px',
      color: '#64748b',
    }).setOrigin(0.5)

    gates.forEach((gate, i) => {
      const x = centerX - 150 + i * 100
      const y = centerY + 70
      
      const box = this.add.rectangle(x, y, 35, 35, 0x1e293b)
      box.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(gate.color).color)
      
      this.add.text(x, y, gate.symbol, {
        fontSize: '18px',
        fontStyle: 'bold',
        color: gate.color,
      }).setOrigin(0.5)
      
      this.add.text(x, y + 30, gate.name, {
        fontSize: '10px',
        color: '#64748b',
      }).setOrigin(0.5)
    })

    // Challenge button
    const challengeBtn = this.add.rectangle(centerX - 110, centerY + 150, 180, 50, 0x1e293b)
    challengeBtn.setStrokeStyle(2, 0x3b82f6)
    this.add.text(centerX - 110, centerY + 150, '🎯 Challenges', {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5)
    
    challengeBtn.setInteractive({ useHandCursor: true })
    challengeBtn.on('pointerover', () => challengeBtn.setFillStyle(0x2d3748))
    challengeBtn.on('pointerout', () => challengeBtn.setFillStyle(0x1e293b))
    challengeBtn.on('pointerdown', () => {
      this.scene.start('BuildScene', { mode: 'challenge' })
    })

    // Sandbox button
    const sandboxBtn = this.add.rectangle(centerX + 110, centerY + 150, 180, 50, 0x3b82f6)
    this.add.text(centerX + 110, centerY + 150, '🧪 Sandbox', {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5)
    
    sandboxBtn.setInteractive({ useHandCursor: true })
    sandboxBtn.on('pointerover', () => sandboxBtn.setFillStyle(0x2563eb))
    sandboxBtn.on('pointerout', () => sandboxBtn.setFillStyle(0x3b82f6))
    sandboxBtn.on('pointerdown', () => {
      this.scene.start('BuildScene', { mode: 'sandbox' })
    })
  }
}
