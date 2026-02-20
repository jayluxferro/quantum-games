import Phaser from 'phaser'

export class ResultScene extends Phaser.Scene {
  private score: number = 0
  private stars: number = 0
  private iterations: number = 0
  private optimal: number = 2

  constructor() {
    super({ key: 'ResultScene' })
  }

  init(data: { score: number; stars: number; iterations: number; optimal: number }) {
    this.score = data.score || 0
    this.stars = data.stars || 1
    this.iterations = data.iterations || 0
    this.optimal = data.optimal || 2
  }

  create() {
    const { width, height } = this.cameras.main
    const centerX = width / 2
    const centerY = height / 2

    // Background
    this.add.rectangle(centerX, centerY, width, height, 0x0a0a1a)

    // Title
    this.add.text(centerX, centerY - 130, '🔍 Maze Completed!', {
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#f59e0b',
    }).setOrigin(0.5)

    // Stars
    for (let i = 0; i < 3; i++) {
      const starX = centerX + (i - 1) * 50
      const filled = i < this.stars

      const star = this.add.text(starX, centerY - 60, '★', {
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

    // Stats
    this.add.text(centerX - 80, centerY + 10, 'Iterations:', {
      fontSize: '16px',
      color: '#64748b',
    }).setOrigin(0, 0.5)
    this.add.text(centerX + 80, centerY + 10, `${this.iterations}`, {
      fontSize: '16px',
      fontStyle: 'bold',
      color: this.iterations <= this.optimal ? '#22c55e' : '#f59e0b',
    }).setOrigin(1, 0.5)

    this.add.text(centerX - 80, centerY + 40, 'Optimal:', {
      fontSize: '16px',
      color: '#64748b',
    }).setOrigin(0, 0.5)
    this.add.text(centerX + 80, centerY + 40, `${this.optimal}`, {
      fontSize: '16px',
      color: '#94a3b8',
    }).setOrigin(1, 0.5)

    // Efficiency message
    const efficiency = this.iterations <= this.optimal
      ? '✓ Quantum advantage achieved!'
      : this.iterations <= this.optimal + 2
        ? 'Good! Close to optimal.'
        : 'Try fewer iterations next time.'

    this.add.text(centerX, centerY + 80, efficiency, {
      fontSize: '14px',
      color: this.iterations <= this.optimal ? '#22c55e' : '#94a3b8',
    }).setOrigin(0.5)

    // Score
    this.add.text(centerX, centerY + 120, `Score: ${this.score}`, {
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#f59e0b',
    }).setOrigin(0.5)

    // Buttons
    const retryBtn = this.add.rectangle(centerX - 80, centerY + 180, 120, 40, 0x374151)
    this.add.text(centerX - 80, centerY + 180, 'Try Again', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5)
    retryBtn.setInteractive({ useHandCursor: true })
    retryBtn.on('pointerdown', () => this.scene.start('PlayScene'))

    const menuBtn = this.add.rectangle(centerX + 80, centerY + 180, 120, 40, 0xf59e0b)
    this.add.text(centerX + 80, centerY + 180, 'Menu', {
      fontSize: '16px',
      color: '#000000',
    }).setOrigin(0.5)
    menuBtn.setInteractive({ useHandCursor: true })
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'))
  }
}
