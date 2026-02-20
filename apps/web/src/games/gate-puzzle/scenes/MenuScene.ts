import Phaser from 'phaser'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' })
  }

  create() {
    const { width, height } = this.cameras.main

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e3a5f, 0x1e3a5f, 1)
    bg.fillRect(0, 0, width, height)

    // Gate icons
    const gates = ['X', 'Y', 'Z', 'H']
    const colors = [0xef4444, 0x22c55e, 0x3b82f6, 0xf59e0b]
    gates.forEach((gate, i) => {
      const x = width * 0.25 + i * 110
      const y = height * 0.2

      const box = this.add.graphics()
      box.fillStyle(colors[i], 1)
      box.fillRoundedRect(x - 30, y - 30, 60, 60, 8)

      const text = this.add.text(x, y, gate, {
        fontSize: '32px',
        fontFamily: 'Arial',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5)

      this.tweens.add({
        targets: [box, text],
        y: y - 5,
        duration: 600 + i * 100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      })
    })

    this.add.text(width / 2, height * 0.38, 'Gate Puzzle', {
      fontSize: '42px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.48, 'Transform Qubits with Quantum Gates!', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.58,
      '🎯 Apply gates to transform |0⟩ or |1⟩ into target states.\nX flips, H creates superposition, Z adds phase!', {
      fontSize: '15px',
      fontFamily: 'Arial',
      color: '#64748b',
      align: 'center',
    }).setOrigin(0.5)

    const startButton = this.add.container(width / 2, height * 0.75)

    const buttonBg = this.add.graphics()
    buttonBg.fillStyle(0x3b82f6, 1)
    buttonBg.fillRoundedRect(-90, -28, 180, 56, 12)

    const buttonText = this.add.text(0, 0, '⚡ Start Puzzle', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    startButton.add([buttonBg, buttonText])
    startButton.setSize(180, 56)
    startButton.setInteractive({ useHandCursor: true })

    startButton.on('pointerover', () => {
      buttonBg.clear()
      buttonBg.fillStyle(0x60a5fa, 1)
      buttonBg.fillRoundedRect(-90, -28, 180, 56, 12)
    })

    startButton.on('pointerout', () => {
      buttonBg.clear()
      buttonBg.fillStyle(0x3b82f6, 1)
      buttonBg.fillRoundedRect(-90, -28, 180, 56, 12)
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
