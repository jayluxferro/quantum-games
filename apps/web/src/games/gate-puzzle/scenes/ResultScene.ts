import Phaser from 'phaser'

interface ResultData {
  score: number
  levels: number
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
    const { score, levels, stars } = this.data

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e3a5f, 0x1e3a5f, 1)
    bg.fillRect(0, 0, width, height)

    this.add.text(width / 2, height * 0.12, '⚡ All Puzzles Complete!', {
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
      color: '#3b82f6',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.52, `Completed: ${levels} puzzles`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5)

    // Quantum insight
    const insight = stars >= 2
      ? '🧠 You\'ve mastered quantum gates!\n\nX gate: Bit flip (|0⟩↔|1⟩)\nH gate: Creates superposition\nZ gate: Phase flip'
      : '💡 Remember: X flips the qubit,\nH creates superposition (|0⟩→|+⟩),\nand Z affects the phase!'

    this.add.text(width / 2, height * 0.66, insight, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#64748b',
      align: 'center',
    }).setOrigin(0.5)

    this.createButton(width / 2 - 100, height * 0.85, 'Play Again', 0x3b82f6, () => {
      this.scene.start('PlayScene')
    })

    this.createButton(width / 2 + 100, height * 0.85, 'Menu', 0x64748b, () => {
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
