import Phaser from 'phaser'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' })
  }

  create() {
    const { width, height } = this.cameras.main

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1)
    bg.fillRect(0, 0, width, height)

    this.add.text(width / 2, height * 0.2, '🐱', {
      fontSize: '80px',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.35, 'Quantum Pet', {
      fontSize: '48px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.45, 'Your pet exists in multiple states!', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5)

    const startButton = this.add.container(width / 2, height * 0.65)
    
    const buttonBg = this.add.graphics()
    buttonBg.fillStyle(0x8b5cf6, 1)
    buttonBg.fillRoundedRect(-80, -25, 160, 50, 10)
    
    const buttonText = this.add.text(0, 0, 'Start Game', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    startButton.add([buttonBg, buttonText])
    startButton.setSize(160, 50)
    startButton.setInteractive({ useHandCursor: true })

    startButton.on('pointerover', () => {
      buttonBg.clear()
      buttonBg.fillStyle(0xa78bfa, 1)
      buttonBg.fillRoundedRect(-80, -25, 160, 50, 10)
    })

    startButton.on('pointerout', () => {
      buttonBg.clear()
      buttonBg.fillStyle(0x8b5cf6, 1)
      buttonBg.fillRoundedRect(-80, -25, 160, 50, 10)
    })

    startButton.on('pointerdown', () => {
      this.cameras.main.fadeOut(300)
      this.time.delayedCall(300, () => {
        this.scene.start('PlayScene')
      })
    })

    this.add.text(width / 2, height * 0.85, 'Learn about Superposition!', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#64748b',
    }).setOrigin(0.5)

    this.cameras.main.fadeIn(500)
  }
}
