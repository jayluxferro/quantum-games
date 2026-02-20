import Phaser from 'phaser'

interface ResultData {
  score: number
  rounds: number
  stars: number
}

export class ResultScene extends Phaser.Scene {
  private resultData!: ResultData

  constructor() {
    super({ key: 'ResultScene' })
  }

  init(data: ResultData) {
    this.resultData = data
  }

  create() {
    const { width, height } = this.cameras.main
    const { score, rounds, stars } = this.resultData

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e1b4b, 0x1e1b4b, 1)
    bg.fillRect(0, 0, width, height)

    this.add.text(width / 2, height * 0.15, stars >= 2 ? '🎉' : '🎱', {
      fontSize: '80px',
    }).setOrigin(0.5)

    const titleText = stars >= 3 ? 'Probability Master!' : stars >= 2 ? 'Great Predictions!' : stars >= 1 ? 'Good Try!' : 'Keep Learning!'
    this.add.text(width / 2, height * 0.3, titleText, {
      fontSize: '42px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    const starsY = height * 0.42
    const starSpacing = 60
    const startX = width / 2 - starSpacing

    for (let i = 0; i < 3; i++) {
      const starEmoji = i < stars ? '⭐' : '☆'
      const star = this.add.text(startX + i * starSpacing, starsY, starEmoji, {
        fontSize: '48px',
      }).setOrigin(0.5)

      if (i < stars) {
        this.tweens.add({
          targets: star,
          scale: { from: 0, to: 1 },
          duration: 300,
          delay: 500 + i * 200,
          ease: 'Back.out',
        })
      }
    }

    this.add.text(width / 2, height * 0.55, `Score: ${score}`, {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.62, `${rounds} Rounds Played`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5)

    const infoBox = this.add.graphics()
    infoBox.fillStyle(0x334155, 0.5)
    infoBox.fillRoundedRect(width * 0.1, height * 0.68, width * 0.8, 70, 10)

    this.add.text(width / 2, height * 0.71 + 20, '💡 You learned: Quantum measurements are probabilistic!\nWe can predict patterns, but not exact outcomes.', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#e2e8f0',
      align: 'center',
    }).setOrigin(0.5)

    this.createButton(width / 2 - 100, height * 0.88, 'Play Again', 0x22c55e, () => {
      this.scene.start('PlayScene')
    })

    this.createButton(width / 2 + 100, height * 0.88, 'Menu', 0x6366f1, () => {
      this.scene.start('MenuScene')
    })

    this.cameras.main.fadeIn(500)
  }

  createButton(x: number, y: number, text: string, color: number, onClick: () => void) {
    const container = this.add.container(x, y)
    
    const bg = this.add.graphics()
    bg.fillStyle(color, 1)
    bg.fillRoundedRect(-70, -22, 140, 44, 8)
    
    const label = this.add.text(0, 0, text, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    container.add([bg, label])
    container.setSize(140, 44)
    container.setInteractive({ useHandCursor: true })

    container.on('pointerover', () => {
      container.setScale(1.05)
    })

    container.on('pointerout', () => {
      container.setScale(1)
    })

    container.on('pointerdown', onClick)

    return container
  }
}
