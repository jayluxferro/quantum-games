import Phaser from 'phaser'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' })
  }

  create() {
    const { width, height } = this.cameras.main

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e1b4b, 0x1e1b4b, 1)
    bg.fillRect(0, 0, width, height)

    // Entangled particle animation
    const particle1 = this.add.text(width * 0.35, height * 0.2, '🔴', { fontSize: '50px' }).setOrigin(0.5)
    const particle2 = this.add.text(width * 0.65, height * 0.2, '🔵', { fontSize: '50px' }).setOrigin(0.5)

    // Connection line
    const line = this.add.graphics()
    line.lineStyle(3, 0xa855f7, 0.6)
    line.lineBetween(width * 0.35 + 30, height * 0.2, width * 0.65 - 30, height * 0.2)

    // Pulsing animation showing connection
    this.tweens.add({
      targets: [particle1, particle2],
      scale: 1.2,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })

    this.add.text(width / 2, height * 0.36, 'Entanglement Pairs', {
      fontSize: '42px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.46, 'Match Quantum Particles!', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.56,
      '🔗 Entangled particles are linked!\nMeasure one, and you instantly know the other.', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#64748b',
      align: 'center',
    }).setOrigin(0.5)

    const startButton = this.add.container(width / 2, height * 0.75)

    const buttonBg = this.add.graphics()
    buttonBg.fillStyle(0x8b5cf6, 1)
    buttonBg.fillRoundedRect(-90, -28, 180, 56, 12)

    const buttonText = this.add.text(0, 0, '🔗 Start Game', {
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
      buttonBg.fillStyle(0xa78bfa, 1)
      buttonBg.fillRoundedRect(-90, -28, 180, 56, 12)
    })

    startButton.on('pointerout', () => {
      buttonBg.clear()
      buttonBg.fillStyle(0x8b5cf6, 1)
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
