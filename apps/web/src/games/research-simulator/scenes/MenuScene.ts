import Phaser from 'phaser'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' })
  }

  create() {
    const { width, height } = this.cameras.main

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x0c4a6e, 0x0c4a6e, 1)
    bg.fillRect(0, 0, width, height)

    // Circuit visualization
    const circuitY = height * 0.18
    
    // Qubit lines
    for (let i = 0; i < 3; i++) {
      const y = circuitY + i * 40
      this.add.graphics()
        .lineStyle(2, 0x475569, 1)
        .lineBetween(width * 0.2, y, width * 0.8, y)
      
      this.add.text(width * 0.15, y, `|0⟩`, {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#94a3b8',
      }).setOrigin(0.5)
    }

    // Sample gates
    const gates = [
      { x: width * 0.35, y: circuitY, label: 'H', color: 0xf59e0b },
      { x: width * 0.5, y: circuitY, label: '●', color: 0x3b82f6, target: circuitY + 40 },
      { x: width * 0.5, y: circuitY + 40, label: '⊕', color: 0x3b82f6 },
      { x: width * 0.65, y: circuitY + 80, label: 'X', color: 0xef4444 },
    ]

    gates.forEach((gate) => {
      const box = this.add.graphics()
      box.fillStyle(gate.color, 1)
      if (gate.label === '●' || gate.label === '⊕') {
        box.fillCircle(gate.x, gate.y, 15)
      } else {
        box.fillRoundedRect(gate.x - 20, gate.y - 20, 40, 40, 6)
      }

      if (gate.label !== '●' && gate.label !== '⊕') {
        this.add.text(gate.x, gate.y, gate.label, {
          fontSize: '20px',
          fontFamily: 'Arial',
          color: '#ffffff',
          fontStyle: 'bold',
        }).setOrigin(0.5)
      }

      // CNOT line
      if (gate.target) {
        this.add.graphics()
          .lineStyle(2, gate.color, 1)
          .lineBetween(gate.x, gate.y, gate.x, gate.target)
      }
    })

    this.add.text(width / 2, height * 0.42, 'Research Simulator', {
      fontSize: '42px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.52, 'Build & Simulate Quantum Circuits', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.64,
      '🔬 Open-ended sandbox for quantum research.\nBuild circuits with H, X, Y, Z, CNOT, and more.\nVisualize state vectors and run simulations!', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#64748b',
      align: 'center',
    }).setOrigin(0.5)

    const startButton = this.add.container(width / 2, height * 0.8)

    const buttonBg = this.add.graphics()
    buttonBg.fillStyle(0x0ea5e9, 1)
    buttonBg.fillRoundedRect(-100, -28, 200, 56, 12)

    const buttonText = this.add.text(0, 0, '🔬 Open Simulator', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    startButton.add([buttonBg, buttonText])
    startButton.setSize(200, 56)
    startButton.setInteractive({ useHandCursor: true })

    startButton.on('pointerover', () => {
      buttonBg.clear()
      buttonBg.fillStyle(0x38bdf8, 1)
      buttonBg.fillRoundedRect(-100, -28, 200, 56, 12)
    })

    startButton.on('pointerout', () => {
      buttonBg.clear()
      buttonBg.fillStyle(0x0ea5e9, 1)
      buttonBg.fillRoundedRect(-100, -28, 200, 56, 12)
    })

    startButton.on('pointerdown', () => {
      this.cameras.main.fadeOut(300)
      this.time.delayedCall(300, () => {
        this.scene.start('PlayScene')
      })
    })

    this.cameras.main.fadeIn(500)
  }
}
