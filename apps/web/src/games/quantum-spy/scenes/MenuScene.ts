import Phaser from 'phaser'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' })
  }

  create() {
    const { width, height } = this.cameras.main
    const centerX = width / 2
    const centerY = height / 2

    // Dark spy-themed background
    this.add.rectangle(centerX, centerY, width, height, 0x0a0f0a)

    // Matrix-like falling characters
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(50, width - 50)
      const startY = -50
      const chars = ['0', '1', '+', '×', '|', '⟩']
      
      const char = this.add.text(x, startY, Phaser.Math.RND.pick(chars), {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#22c55e',
      }).setAlpha(0.5)

      this.tweens.add({
        targets: char,
        y: height + 50,
        duration: Phaser.Math.Between(3000, 6000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
      })
    }

    // Title
    this.add.text(centerX, centerY - 120, '🔐 Quantum Spy', {
      fontSize: '48px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#22c55e',
    }).setOrigin(0.5)

    this.add.text(centerX, centerY - 70, 'BB84 Quantum Key Distribution', {
      fontSize: '18px',
      color: '#4ade80',
    }).setOrigin(0.5)

    // Story intro
    const storyBox = this.add.rectangle(centerX, centerY + 10, width - 100, 100, 0x1a2e1a, 0.8)
    storyBox.setStrokeStyle(1, 0x22c55e)

    this.add.text(centerX, centerY + 10, 
      'You are Agent Q, tasked with establishing a secure\ncommunication channel using quantum cryptography.\nBeware of Eve, the eavesdropper!', {
      fontSize: '14px',
      color: '#94a3b8',
      align: 'center',
    }).setOrigin(0.5)

    // Protocol preview
    const previewY = centerY + 100
    const bases = [
      { symbol: '+', states: ['↑', '→'], color: '#3b82f6' },
      { symbol: '×', states: ['↗', '↘'], color: '#f59e0b' },
    ]

    bases.forEach((base, i) => {
      const x = centerX - 100 + i * 200
      
      this.add.text(x, previewY - 15, `${base.symbol} basis`, {
        fontSize: '12px',
        color: '#64748b',
      }).setOrigin(0.5)

      this.add.text(x - 25, previewY + 15, base.states[0], {
        fontSize: '24px',
        color: base.color,
      }).setOrigin(0.5)

      this.add.text(x + 25, previewY + 15, base.states[1], {
        fontSize: '24px',
        color: base.color,
      }).setOrigin(0.5)

      this.add.text(x - 25, previewY + 40, '= 0', {
        fontSize: '12px',
        color: '#64748b',
      }).setOrigin(0.5)

      this.add.text(x + 25, previewY + 40, '= 1', {
        fontSize: '12px',
        color: '#64748b',
      }).setOrigin(0.5)
    })

    // Tutorial button
    const tutorialBtn = this.add.rectangle(centerX - 100, centerY + 180, 160, 45, 0x1e293b)
    tutorialBtn.setStrokeStyle(2, 0x22c55e)
    this.add.text(centerX - 100, centerY + 180, '📖 Tutorial', {
      fontSize: '18px',
      color: '#22c55e',
    }).setOrigin(0.5)

    tutorialBtn.setInteractive({ useHandCursor: true })
    tutorialBtn.on('pointerover', () => tutorialBtn.setFillStyle(0x2d3d2d))
    tutorialBtn.on('pointerout', () => tutorialBtn.setFillStyle(0x1e293b))
    tutorialBtn.on('pointerdown', () => this.scene.start('TutorialScene'))

    // Play button
    const playBtn = this.add.rectangle(centerX + 100, centerY + 180, 160, 45, 0x22c55e)
    this.add.text(centerX + 100, centerY + 180, '▶ Start Mission', {
      fontSize: '18px',
      color: '#000000',
    }).setOrigin(0.5)

    playBtn.setInteractive({ useHandCursor: true })
    playBtn.on('pointerover', () => playBtn.setFillStyle(0x4ade80))
    playBtn.on('pointerout', () => playBtn.setFillStyle(0x22c55e))
    playBtn.on('pointerdown', () => this.scene.start('PlayScene'))
  }
}
