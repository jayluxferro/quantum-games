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

    const ballColors = [0xef4444, 0x3b82f6, 0x22c55e, 0xfbbf24]
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(50, width - 50)
      const y = Phaser.Math.Between(50, height - 50)
      const radius = Phaser.Math.Between(10, 25)
      const color = Phaser.Math.RND.pick(ballColors)
      
      const ball = this.add.graphics()
      ball.fillStyle(color, 0.3)
      ball.fillCircle(x, y, radius)
    }

    this.add.text(width / 2, height * 0.2, '🎱', {
      fontSize: '80px',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.35, 'Probability Playground', {
      fontSize: '42px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.45, 'Drop balls and discover quantum randomness!', {
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

    this.add.text(width / 2, height * 0.85, 'Learn about Quantum Probability!', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#64748b',
    }).setOrigin(0.5)

    this.cameras.main.fadeIn(500)
  }
}
