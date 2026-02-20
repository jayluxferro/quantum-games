import Phaser from 'phaser'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' })
  }

  create() {
    const { width, height } = this.cameras.main

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x14532d, 0x14532d, 1)
    bg.fillRect(0, 0, width, height)

    // Three qubits with noise effect
    const qubits = ['|0⟩', '|0⟩', '|0⟩']
    const xPositions = [width * 0.3, width * 0.5, width * 0.7]

    qubits.forEach((q, i) => {
      const qubit = this.add.text(xPositions[i], height * 0.2, q, {
        fontSize: '36px',
        fontFamily: 'Arial',
        color: '#22c55e',
        fontStyle: 'bold',
      }).setOrigin(0.5)

      // Simulate noise by occasionally flipping one
      if (i === 1) {
        this.time.addEvent({
          delay: 1500,
          callback: () => {
            qubit.setText(qubit.text === '|0⟩' ? '|1⟩' : '|0⟩')
            qubit.setColor(qubit.text === '|0⟩' ? '#22c55e' : '#ef4444')
          },
          loop: true,
        })
      }
    })

    // Error indication
    const errorText = this.add.text(width / 2, height * 0.3, '⚠️ Noise corrupts data!', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#f59e0b',
    }).setOrigin(0.5)

    this.tweens.add({
      targets: errorText,
      alpha: 0.5,
      duration: 800,
      yoyo: true,
      repeat: -1,
    })

    this.add.text(width / 2, height * 0.42, 'Error Correction Sandbox', {
      fontSize: '38px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.52, 'Protect Qubits from Noise!', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.64,
      '🛡️ Quantum computers are fragile - noise causes errors.\nUse redundancy (3-qubit code) to detect & correct errors!\n\n|0⟩ → |000⟩ (encode), then majority vote to correct.', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#64748b',
      align: 'center',
    }).setOrigin(0.5)

    const startButton = this.add.container(width / 2, height * 0.82)

    const buttonBg = this.add.graphics()
    buttonBg.fillStyle(0x22c55e, 1)
    buttonBg.fillRoundedRect(-100, -28, 200, 56, 12)

    const buttonText = this.add.text(0, 0, '🛡️ Start Sandbox', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    startButton.add([buttonBg, buttonText])
    startButton.setSize(200, 56)
    startButton.setInteractive({ useHandCursor: true })

    startButton.on('pointerover', () => {
      buttonBg.clear()
      buttonBg.fillStyle(0x4ade80, 1)
      buttonBg.fillRoundedRect(-100, -28, 200, 56, 12)
    })

    startButton.on('pointerout', () => {
      buttonBg.clear()
      buttonBg.fillStyle(0x22c55e, 1)
      buttonBg.fillRoundedRect(-100, -28, 200, 56, 12)
    })

    startButton.on('pointerdown', () => {
      this.cameras.main.fadeOut(300)
      this.time.delayedCall(300, () => {
        this.scene.start('PlayScene')
      })
    })

    this.cameras.main.fadeIn(500)
  }
}
