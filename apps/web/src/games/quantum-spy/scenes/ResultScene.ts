import Phaser from 'phaser'

export class ResultScene extends Phaser.Scene {
  private score: number = 0
  private stars: number = 0
  private keyLength: number = 0
  private evePresent: boolean = false
  private eveDetected: boolean = false

  constructor() {
    super({ key: 'ResultScene' })
  }

  init(data: {
    score: number
    stars: number
    keyLength: number
    evePresent: boolean
    eveDetected: boolean
  }) {
    this.score = data.score || 0
    this.stars = data.stars || 1
    this.keyLength = data.keyLength || 0
    this.evePresent = data.evePresent || false
    this.eveDetected = data.eveDetected || false
  }

  create() {
    const { width, height } = this.cameras.main
    const centerX = width / 2
    const centerY = height / 2

    // Background
    this.add.rectangle(centerX, centerY, width, height, 0x0a0f0a)

    // Title
    const title = this.eveDetected && this.evePresent
      ? '🔐 Eve Detected!'
      : '🔐 Mission Complete!'
    
    this.add.text(centerX, centerY - 130, title, {
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#22c55e',
    }).setOrigin(0.5)

    // Mission summary
    const summary = this.evePresent
      ? this.eveDetected
        ? 'You correctly identified the eavesdropper!'
        : 'Eve was present but went undetected...'
      : 'Secure key exchange completed successfully!'

    this.add.text(centerX, centerY - 80, summary, {
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
    const statsY = centerY + 40
    this.add.text(centerX - 100, statsY, 'Key Length:', {
      fontSize: '14px',
      color: '#64748b',
    }).setOrigin(0, 0.5)
    this.add.text(centerX + 100, statsY, `${this.keyLength} bits`, {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#22c55e',
    }).setOrigin(1, 0.5)

    this.add.text(centerX - 100, statsY + 30, 'Eve Present:', {
      fontSize: '14px',
      color: '#64748b',
    }).setOrigin(0, 0.5)
    this.add.text(centerX + 100, statsY + 30, this.evePresent ? 'Yes' : 'No', {
      fontSize: '14px',
      fontStyle: 'bold',
      color: this.evePresent ? '#ef4444' : '#22c55e',
    }).setOrigin(1, 0.5)

    // Score
    this.add.text(centerX, centerY + 110, `Score: ${this.score}`, {
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#22c55e',
    }).setOrigin(0.5)

    // Buttons
    const retryBtn = this.add.rectangle(centerX - 80, centerY + 170, 120, 40, 0x374151)
    this.add.text(centerX - 80, centerY + 170, 'Try Again', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5)
    retryBtn.setInteractive({ useHandCursor: true })
    retryBtn.on('pointerdown', () => this.scene.start('PlayScene'))

    const menuBtn = this.add.rectangle(centerX + 80, centerY + 170, 120, 40, 0x22c55e)
    this.add.text(centerX + 80, centerY + 170, 'Menu', {
      fontSize: '16px',
      color: '#000000',
    }).setOrigin(0.5)
    menuBtn.setInteractive({ useHandCursor: true })
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'))
  }
}
