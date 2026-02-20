import Phaser from 'phaser'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' })
  }

  create() {
    const { width, height } = this.cameras.main

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x312e81, 0x312e81, 1)
    bg.fillRect(0, 0, width, height)

    // Oracle box illustration
    const oracleBox = this.add.container(width / 2, height * 0.22)

    const box = this.add.graphics()
    box.fillStyle(0x1e1b4b, 1)
    box.fillRoundedRect(-80, -40, 160, 80, 10)
    box.lineStyle(3, 0x8b5cf6, 1)
    box.strokeRoundedRect(-80, -40, 160, 80, 10)

    const oracleText = this.add.text(0, 0, 'f(x) = ?', {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#a855f7',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    oracleBox.add([box, oracleText])

    // Pulsing glow effect
    this.tweens.add({
      targets: oracleBox,
      scale: 1.05,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })

    this.add.text(width / 2, height * 0.42, 'Deutsch Challenge', {
      fontSize: '42px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.52, 'Discover Quantum Speedup!', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.62,
      '🔮 A mystery oracle hides a function.\nIs it CONSTANT (same output) or BALANCED (mixed)?\n\nClassical: Need to check multiple inputs\nQuantum: Just ONE query!', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#64748b',
      align: 'center',
    }).setOrigin(0.5)

    const startButton = this.add.container(width / 2, height * 0.82)

    const buttonBg = this.add.graphics()
    buttonBg.fillStyle(0x8b5cf6, 1)
    buttonBg.fillRoundedRect(-100, -28, 200, 56, 12)

    const buttonText = this.add.text(0, 0, '🔮 Start Challenge', {
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
      buttonBg.fillStyle(0xa78bfa, 1)
      buttonBg.fillRoundedRect(-100, -28, 200, 56, 12)
    })

    startButton.on('pointerout', () => {
      buttonBg.clear()
      buttonBg.fillStyle(0x8b5cf6, 1)
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
