import Phaser from 'phaser'

interface ResultData {
  score: number
  correct: number
  total: number
  stars: number
}

export class ResultScene extends Phaser.Scene {
  private data!: ResultData

  constructor() {
    super({ key: 'ResultScene' })
  }

  init(data: ResultData) {
    this.data = data
  }

  create() {
    const { width, height } = this.cameras.main
    const { score, correct, total, stars } = this.data

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e293b, 0x1e293b, 1)
    bg.fillRect(0, 0, width, height)

    // Title
    this.add.text(width / 2, height * 0.12, '🎯 Quest Complete!', {
      fontSize: '36px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    // Stars display
    const starsY = height * 0.25
    for (let i = 0; i < 3; i++) {
      const star = this.add.text(width / 2 + (i - 1) * 70, starsY, '⭐', {
        fontSize: '50px',
      }).setOrigin(0.5)

      if (i < stars) {
        star.setAlpha(0)
        this.time.delayedCall(300 + i * 200, () => {
          this.tweens.add({
            targets: star,
            alpha: 1,
            scale: { from: 2, to: 1 },
            duration: 400,
            ease: 'Back.out',
          })
        })
      } else {
        star.setText('☆')
        star.setAlpha(0.3)
      }
    }

    // Score display
    this.add.text(width / 2, height * 0.42, `Score: ${score}`, {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.52, `Correct Predictions: ${correct}/${total}`, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5)

    // Quantum insight
    const insight = stars >= 2
      ? '🧠 You understand quantum superposition!\nUntil measured, particles exist in multiple states.'
      : '💡 Tip: Quantum coins only collapse to\na definite state when observed!'

    this.add.text(width / 2, height * 0.65, insight, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#64748b',
      align: 'center',
    }).setOrigin(0.5)

    // Buttons
    this.createButton(width / 2 - 100, height * 0.82, 'Play Again', 0x3b82f6, () => {
      this.scene.start('PlayScene')
    })

    this.createButton(width / 2 + 100, height * 0.82, 'Menu', 0x64748b, () => {
      this.scene.start('MenuScene')
    })

    this.cameras.main.fadeIn(500)
  }

  createButton(x: number, y: number, label: string, color: number, callback: () => void) {
    const container = this.add.container(x, y)

    const bg = this.add.graphics()
    bg.fillStyle(color, 1)
    bg.fillRoundedRect(-70, -22, 140, 44, 8)

    const text = this.add.text(0, 0, label, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    container.add([bg, text])
    container.setSize(140, 44)
    container.setInteractive({ useHandCursor: true })

    container.on('pointerover', () => {
      bg.clear()
      bg.fillStyle(color, 0.8)
      bg.fillRoundedRect(-70, -22, 140, 44, 8)
    })

    container.on('pointerout', () => {
      bg.clear()
      bg.fillStyle(color, 1)
      bg.fillRoundedRect(-70, -22, 140, 44, 8)
    })

    container.on('pointerdown', callback)
  }
}
