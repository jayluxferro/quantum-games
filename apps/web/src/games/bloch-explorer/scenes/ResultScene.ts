import Phaser from 'phaser'

export class ResultScene extends Phaser.Scene {
  private score: number = 0
  private stars: number = 0
  private completed: number = 0
  private total: number = 0

  constructor() {
    super({ key: 'ResultScene' })
  }

  init(data: { score: number; stars: number; completed: number; total: number }) {
    this.score = data.score || 0
    this.stars = data.stars || 1
    this.completed = data.completed || 0
    this.total = data.total || 5
  }

  create() {
    const { width, height } = this.cameras.main
    const centerX = width / 2
    const centerY = height / 2

    // Background
    this.add.rectangle(centerX, centerY, width, height, 0x0f0f1a)

    // Title
    this.add.text(centerX, centerY - 120, '🌐 Exploration Complete!', {
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#06b6d4',
    }).setOrigin(0.5)

    // Progress
    this.add.text(centerX, centerY - 70, `Challenges: ${this.completed}/${this.total}`, {
      fontSize: '16px',
      color: '#94a3b8',
    }).setOrigin(0.5)

    // Stars
    for (let i = 0; i < 3; i++) {
      const starX = centerX + (i - 1) * 50
      const filled = i < this.stars

      const star = this.add.text(starX, centerY - 20, '★', {
        fontSize: '42px',
        color: filled ? '#fbbf24' : '#374151',
      }).setOrigin(0.5)

      if (filled) {
        star.setScale(0)
        this.tweens.add({
          targets: star,
          scale: 1,
          duration: 400,
          delay: i * 200,
          ease: 'Back.easeOut',
        })
      }
    }

    // Score
    this.add.text(centerX, centerY + 50, `Score: ${this.score}`, {
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#06b6d4',
    }).setOrigin(0.5)

    // Buttons
    const retryBtn = this.add.rectangle(centerX - 80, centerY + 120, 120, 40, 0x374151)
    this.add.text(centerX - 80, centerY + 120, 'Try Again', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5)
    retryBtn.setInteractive({ useHandCursor: true })
    retryBtn.on('pointerdown', () => this.scene.start('ChallengeScene'))

    const menuBtn = this.add.rectangle(centerX + 80, centerY + 120, 120, 40, 0x06b6d4)
    this.add.text(centerX + 80, centerY + 120, 'Menu', {
      fontSize: '16px',
      color: '#000000',
    }).setOrigin(0.5)
    menuBtn.setInteractive({ useHandCursor: true })
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'))
  }
}
