import Phaser from 'phaser'

export class ResultScene extends Phaser.Scene {
  private score: number = 0
  private stars: number = 0
  private challengeName: string = ''

  constructor() {
    super({ key: 'ResultScene' })
  }

  init(data: { score: number; stars: number; challengeName: string }) {
    this.score = data.score || 0
    this.stars = data.stars || 1
    this.challengeName = data.challengeName || 'Challenge'
  }

  create() {
    const { width, height } = this.cameras.main
    const centerX = width / 2
    const centerY = height / 2

    // Background
    this.add.rectangle(centerX, centerY, width, height, 0x0f172a)

    // Success effect
    const ring = this.add.circle(centerX, centerY - 50, 0, 0x000000, 0)
    ring.setStrokeStyle(4, 0x3b82f6)
    
    this.tweens.add({
      targets: ring,
      radius: 80,
      alpha: 0,
      duration: 1000,
      repeat: 2,
    })

    // Title
    this.add.text(centerX, centerY - 120, '✓ Challenge Complete!', {
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#22c55e',
    }).setOrigin(0.5)

    this.add.text(centerX, centerY - 80, this.challengeName, {
      fontSize: '18px',
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
          delay: 300 + i * 200,
          ease: 'Back.easeOut',
        })
      }
    }

    // Score
    this.add.text(centerX, centerY + 50, `Score: ${this.score}`, {
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#3b82f6',
    }).setOrigin(0.5)

    // Buttons
    const nextBtn = this.add.rectangle(centerX + 80, centerY + 120, 140, 45, 0x3b82f6)
    this.add.text(centerX + 80, centerY + 120, 'Next Challenge', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5)

    nextBtn.setInteractive({ useHandCursor: true })
    nextBtn.on('pointerdown', () => {
      this.scene.start('BuildScene', { mode: 'challenge' })
    })

    const menuBtn = this.add.rectangle(centerX - 80, centerY + 120, 100, 45, 0x374151)
    this.add.text(centerX - 80, centerY + 120, 'Menu', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5)

    menuBtn.setInteractive({ useHandCursor: true })
    menuBtn.on('pointerdown', () => {
      this.scene.start('MenuScene')
    })
  }
}
