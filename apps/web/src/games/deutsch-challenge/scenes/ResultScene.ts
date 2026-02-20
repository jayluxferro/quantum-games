import Phaser from 'phaser'

interface ResultData {
  score: number
  rounds: number
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
    const { score, rounds, stars } = this.data

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x312e81, 0x312e81, 1)
    bg.fillRect(0, 0, width, height)

    this.add.text(width / 2, height * 0.1, '🔮 Challenge Complete!', {
      fontSize: '36px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    // Stars
    const starsY = height * 0.22
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

    this.add.text(width / 2, height * 0.38, `Score: ${score}`, {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#a855f7',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.48, `Oracles Analyzed: ${rounds}`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5)

    // Quantum insight
    const insight = stars >= 2
      ? '🧠 You understand quantum speedup!\n\nDeutsch-Jozsa Algorithm:\n• Classical: Need to check both f(0) and f(1)\n• Quantum: ONE query reveals everything!\n\nThis is exponential speedup!'
      : '💡 The Deutsch-Jozsa algorithm shows\nquantum computers can solve some\nproblems exponentially faster!'

    this.add.text(width / 2, height * 0.66, insight, {
      fontSize: '13px',
      fontFamily: 'Arial',
      color: '#64748b',
      align: 'center',
    }).setOrigin(0.5)

    this.createButton(width / 2 - 100, height * 0.88, 'Play Again', 0x8b5cf6, () => {
      this.scene.start('PlayScene')
    })

    this.createButton(width / 2 + 100, height * 0.88, 'Menu', 0x64748b, () => {
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
