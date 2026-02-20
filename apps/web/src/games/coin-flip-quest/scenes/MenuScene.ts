import Phaser from 'phaser'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' })
  }

  create() {
    const { width, height } = this.cameras.main

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e293b, 0x1e293b, 1)
    bg.fillRect(0, 0, width, height)

    // Animated coins
    const coin1 = this.add.text(width * 0.35, height * 0.2, '🪙', { fontSize: '60px' }).setOrigin(0.5)
    const coin2 = this.add.text(width * 0.65, height * 0.2, '⚛️', { fontSize: '60px' }).setOrigin(0.5)

    this.tweens.add({
      targets: coin1,
      y: coin1.y - 10,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })

    this.tweens.add({
      targets: coin2,
      y: coin2.y - 10,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      delay: 500,
    })

    this.add.text(width / 2, height * 0.38, 'Coin Flip Quest', {
      fontSize: '42px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.48, 'Classical vs Quantum Coins', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5)

    // Description
    const desc = this.add.text(width / 2, height * 0.58, 
      'A classical coin is either heads OR tails.\nA quantum coin can be BOTH until you look!', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#64748b',
      align: 'center',
    }).setOrigin(0.5)

    const startButton = this.add.container(width / 2, height * 0.75)
    
    const buttonBg = this.add.graphics()
    buttonBg.fillStyle(0x3b82f6, 1)
    buttonBg.fillRoundedRect(-90, -28, 180, 56, 12)
    
    const buttonText = this.add.text(0, 0, '🎲 Start Game', {
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
