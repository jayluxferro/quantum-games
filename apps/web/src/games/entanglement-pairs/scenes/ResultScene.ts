import Phaser from 'phaser'

interface ResultData {
  score: number
  moves: number
  pairs: number
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
    const { score, moves, pairs, stars } = this.data

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e1b4b, 0x1e1b4b, 1)
    bg.fillRect(0, 0, width, height)

    this.add.text(width / 2, height * 0.12, '🔗 All Pairs Found!', {
      fontSize: '36px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    // Stars
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

    this.add.text(width / 2, height * 0.42, `Score: ${score}`, {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#a855f7',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.52, `Moves: ${moves}  |  Pairs: ${pairs}`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5)

    // Quantum insight
    const insight = stars >= 2
      ? '🧠 You understand entanglement!\nMeasuring one particle instantly reveals its partner,\nno matter the distance!'
      : '💡 Tip: Entangled particles share their fate.\nWhen you measure one, you know both!'

    this.add.text(width / 2, height * 0.66, insight, {
      fontSize: '15px',
      fontFamily: 'Arial',
      color: '#64748b',
      align: 'center',
    }).setOrigin(0.5)

    this.createButton(width / 2 - 100, height * 0.84, 'Play Again', 0x8b5cf6, () => {
      this.scene.start('PlayScene')
    })

    this.createButton(width / 2 + 100, height * 0.84, 'Menu', 0x64748b, () => {
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
