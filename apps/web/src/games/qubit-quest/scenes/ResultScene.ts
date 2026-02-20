import Phaser from 'phaser'

export class ResultScene extends Phaser.Scene {
  private score: number = 0
  private stars: number = 0
  private level: number = 1

  constructor() {
    super({ key: 'ResultScene' })
  }

  init(data: { score: number; stars: number; level: number }) {
    this.score = data.score || 0
    this.stars = data.stars || 1
    this.level = data.level || 1
  }

  create() {
    const { width, height } = this.cameras.main
    const centerX = width / 2
    const centerY = height / 2

    // Background
    this.add.rectangle(centerX, centerY, width, height, 0x0a0a1a)

    // Celebration particles
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, width)
      const y = height + 50
      const colors = [0x8b5cf6, 0x22c55e, 0x3b82f6, 0xf59e0b]
      const particle = this.add.circle(
        x, y, 
        Phaser.Math.Between(3, 8), 
        Phaser.Math.RND.pick(colors)
      )
      
      this.tweens.add({
        targets: particle,
        y: Phaser.Math.Between(-50, height / 2),
        x: x + Phaser.Math.Between(-100, 100),
        alpha: 0,
        duration: Phaser.Math.Between(2000, 4000),
        delay: Phaser.Math.Between(0, 1000),
      })
    }

    // Title
    this.add.text(centerX, centerY - 150, '✨ Level Complete! ✨', {
      fontSize: '36px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#a855f7',
    }).setOrigin(0.5)

    // Level indicator
    this.add.text(centerX, centerY - 100, `Level ${this.level}`, {
      fontSize: '20px',
      color: '#64748b',
    }).setOrigin(0.5)

    // Stars
    const starY = centerY - 30
    for (let i = 0; i < 3; i++) {
      const starX = centerX + (i - 1) * 60
      const filled = i < this.stars
      
      const star = this.add.text(starX, starY, '★', {
        fontSize: '48px',
        color: filled ? '#fbbf24' : '#374151',
      }).setOrigin(0.5)
      
      if (filled) {
        star.setAlpha(0)
        this.tweens.add({
          targets: star,
          alpha: 1,
          scale: { from: 2, to: 1 },
          duration: 500,
          delay: i * 300,
          ease: 'Back.easeOut',
        })
      }
    }

    // Score
    const scoreLabel = this.add.text(centerX, centerY + 50, 'Score', {
      fontSize: '18px',
      color: '#64748b',
    }).setOrigin(0.5)

    const scoreValue = this.add.text(centerX, centerY + 85, '0', {
      fontSize: '48px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#22c55e',
    }).setOrigin(0.5)

    // Animate score count
    this.tweens.addCounter({
      from: 0,
      to: this.score,
      duration: 1500,
      ease: 'Power2',
      onUpdate: (tween) => {
        scoreValue.setText(Math.floor(tween.getValue()).toString())
      },
    })

    // Buttons
    const buttonY = centerY + 170

    // Retry button
    const retryBtn = this.add.rectangle(centerX - 100, buttonY, 150, 45, 0x374151)
    this.add.text(centerX - 100, buttonY, '↻ Retry', {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5)
    
    retryBtn.setInteractive({ useHandCursor: true })
    retryBtn.on('pointerover', () => retryBtn.setFillStyle(0x4b5563))
    retryBtn.on('pointerout', () => retryBtn.setFillStyle(0x374151))
    retryBtn.on('pointerdown', () => {
      this.scene.start('PlayScene')
    })

    // Next level button
    const nextBtn = this.add.rectangle(centerX + 100, buttonY, 150, 45, 0x8b5cf6)
    this.add.text(centerX + 100, buttonY, 'Next Level →', {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5)
    
    nextBtn.setInteractive({ useHandCursor: true })
    nextBtn.on('pointerover', () => nextBtn.setFillStyle(0xa855f7))
    nextBtn.on('pointerout', () => nextBtn.setFillStyle(0x8b5cf6))
    nextBtn.on('pointerdown', () => {
      // Would pass next level number
      this.scene.start('PlayScene')
    })

    // Fade in
    this.cameras.main.fadeIn(500)
  }
}
