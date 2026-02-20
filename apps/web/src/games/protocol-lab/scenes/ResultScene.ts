import Phaser from 'phaser'

export class ResultScene extends Phaser.Scene {
  private score: number = 0
  private stars: number = 0
  private protocolName: string = ''
  private gateCount: number = 0

  constructor() {
    super({ key: 'ResultScene' })
  }

  init(data: { score: number; stars: number; protocolName: string; gateCount: number }) {
    this.score = data.score || 0
    this.stars = data.stars || 1
    this.protocolName = data.protocolName || 'Protocol'
    this.gateCount = data.gateCount || 0
  }

  create() {
    const { width, height } = this.cameras.main
    const centerX = width / 2
    const centerY = height / 2

    // Background
    this.add.rectangle(centerX, centerY, width, height, 0x0f172a)

    // Title
    this.add.text(centerX, centerY - 120, '🔬 Experiment Complete!', {
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#8b5cf6',
    }).setOrigin(0.5)

    this.add.text(centerX, centerY - 80, this.protocolName, {
      fontSize: '16px',
      color: '#94a3b8',
    }).setOrigin(0.5)

    // Stars
    for (let i = 0; i < 3; i++) {
      const starX = centerX + (i - 1) * 50
      const filled = i < this.stars

      const star = this.add.text(starX, centerY - 30, '★', {
        fontSize: '40px',
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
    this.add.text(centerX, centerY + 40, `Gates Used: ${this.gateCount}`, {
      fontSize: '16px',
      color: '#94a3b8',
    }).setOrigin(0.5)

    // Score
    this.add.text(centerX, centerY + 80, `Score: ${this.score}`, {
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#8b5cf6',
    }).setOrigin(0.5)

    // Buttons
    const retryBtn = this.add.rectangle(centerX - 80, centerY + 140, 120, 40, 0x374151)
    this.add.text(centerX - 80, centerY + 140, 'Try Again', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5)
    retryBtn.setInteractive({ useHandCursor: true })
    retryBtn.on('pointerdown', () => this.scene.start('LabScene'))

    const menuBtn = this.add.rectangle(centerX + 80, centerY + 140, 120, 40, 0x8b5cf6)
    this.add.text(centerX + 80, centerY + 140, 'Menu', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5)
    menuBtn.setInteractive({ useHandCursor: true })
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'))
  }
}
