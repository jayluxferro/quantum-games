import Phaser from 'phaser'

type CoinType = 'classical' | 'quantum'
type CoinState = 'heads' | 'tails' | 'superposition'

export class PlayScene extends Phaser.Scene {
  private classicalCoin!: Phaser.GameObjects.Container
  private quantumCoin!: Phaser.GameObjects.Container
  private classicalEmoji!: Phaser.GameObjects.Text
  private quantumEmoji!: Phaser.GameObjects.Text
  private classicalState: CoinState = 'heads'
  private quantumState: CoinState = 'superposition'
  private round: number = 1
  private maxRounds: number = 6
  private score: number = 0
  private correctPredictions: number = 0
  private instructionText!: Phaser.GameObjects.Text
  private roundText!: Phaser.GameObjects.Text
  private scoreText!: Phaser.GameObjects.Text
  private feedbackText!: Phaser.GameObjects.Text
  private predictionButtons: Phaser.GameObjects.Container[] = []
  private currentCoinType: CoinType = 'classical'
  private isFlipping: boolean = false
  private superpositionTimer?: Phaser.Time.TimerEvent

  constructor() {
    super({ key: 'PlayScene' })
  }

  create() {
    const { width, height } = this.cameras.main

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e293b, 0x1e293b, 1)
    bg.fillRect(0, 0, width, height)

    this.roundText = this.add.text(20, 20, `Round: ${this.round}/${this.maxRounds}`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    })

    this.scoreText = this.add.text(width - 20, 20, `Score: ${this.score}`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(1, 0)

    // Classical coin label
    this.add.text(width * 0.25, 80, '🪙 Classical Coin', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#f59e0b',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    // Quantum coin label
    this.add.text(width * 0.75, 80, '⚛️ Quantum Coin', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#8b5cf6',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    // Create coins
    this.createClassicalCoin(width * 0.25, height * 0.32)
    this.createQuantumCoin(width * 0.75, height * 0.32)

    this.instructionText = this.add.text(width / 2, height * 0.52, '', {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5)

    this.createPredictionButtons(width / 2, height * 0.68)

    this.feedbackText = this.add.text(width / 2, height * 0.85, '', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5)

    // State labels
    this.add.text(width * 0.25, height * 0.45, 'Heads or Tails\n(Definite State)', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#64748b',
      align: 'center',
    }).setOrigin(0.5)

    this.add.text(width * 0.75, height * 0.45, 'Both Until Observed!\n(Superposition)', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#64748b',
      align: 'center',
    }).setOrigin(0.5)

    this.startNewRound()
    this.cameras.main.fadeIn(300)
  }

  createClassicalCoin(x: number, y: number) {
    this.classicalCoin = this.add.container(x, y)

    const glow = this.add.graphics()
    glow.fillStyle(0xf59e0b, 0.2)
    glow.fillCircle(0, 0, 60)

    const coinBg = this.add.graphics()
    coinBg.fillStyle(0xfbbf24, 1)
    coinBg.fillCircle(0, 0, 50)

    this.classicalEmoji = this.add.text(0, 0, '😊', {
      fontSize: '50px',
    }).setOrigin(0.5)

    this.classicalCoin.add([glow, coinBg, this.classicalEmoji])
  }

  createQuantumCoin(x: number, y: number) {
    this.quantumCoin = this.add.container(x, y)

    const glow = this.add.graphics()
    glow.fillStyle(0x8b5cf6, 0.3)
    glow.fillCircle(0, 0, 60)
    glow.setName('glow')

    const coinBg = this.add.graphics()
    coinBg.fillStyle(0xa78bfa, 1)
    coinBg.fillCircle(0, 0, 50)

    this.quantumEmoji = this.add.text(0, 0, '❓', {
      fontSize: '50px',
    }).setOrigin(0.5)

    this.quantumCoin.add([glow, coinBg, this.quantumEmoji])

    // Superposition animation
    this.superpositionTimer = this.time.addEvent({
      delay: 100,
      callback: () => {
        if (this.quantumState === 'superposition') {
          this.quantumEmoji.setText(Phaser.Math.RND.pick(['😊', '😢']))
        }
      },
      loop: true,
    })
  }

  createPredictionButtons(x: number, y: number) {
    const buttons = [
      { label: '😊 Heads', value: 'heads', color: 0x22c55e },
      { label: '😢 Tails', value: 'tails', color: 0xef4444 },
    ]

    buttons.forEach((btn, index) => {
      const container = this.add.container(x + (index - 0.5) * 180, y)

      const bg = this.add.graphics()
      bg.fillStyle(btn.color, 1)
      bg.fillRoundedRect(-75, -30, 150, 60, 10)
      bg.setName('bg')

      const text = this.add.text(0, 0, btn.label, {
        fontSize: '22px',
        fontFamily: 'Arial',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5)

      container.add([bg, text])
      container.setSize(150, 60)
      container.setInteractive({ useHandCursor: true })
      container.setData('value', btn.value)
      container.setData('color', btn.color)
      container.setVisible(false)

      container.on('pointerover', () => {
        const bgGraphics = container.getByName('bg') as Phaser.GameObjects.Graphics
        bgGraphics.clear()
        bgGraphics.fillStyle(btn.color, 0.8)
        bgGraphics.fillRoundedRect(-75, -30, 150, 60, 10)
      })

      container.on('pointerout', () => {
        const bgGraphics = container.getByName('bg') as Phaser.GameObjects.Graphics
        bgGraphics.clear()
        bgGraphics.fillStyle(btn.color, 1)
        bgGraphics.fillRoundedRect(-75, -30, 150, 60, 10)
      })

      container.on('pointerdown', () => {
        if (!this.isFlipping) {
          this.makePrediction(btn.value as CoinState)
        }
      })

      this.predictionButtons.push(container)
    })
  }

  startNewRound() {
    this.isFlipping = false
    
    // Alternate between classical and quantum
    this.currentCoinType = this.round % 2 === 1 ? 'classical' : 'quantum'

    // Reset quantum coin to superposition
    this.quantumState = 'superposition'
    this.quantumEmoji.setText('❓')

    // Set random classical state
    this.classicalState = Phaser.Math.RND.pick(['heads', 'tails']) as CoinState
    this.classicalEmoji.setText(this.classicalState === 'heads' ? '😊' : '😢')

    if (this.currentCoinType === 'classical') {
      this.instructionText.setText('The Classical coin has been flipped!\nPredict: Heads or Tails?')
      this.highlightCoin(this.classicalCoin)
      this.dimCoin(this.quantumCoin)
    } else {
      this.instructionText.setText('The Quantum coin is in superposition!\nPredict what you\'ll see when observed:')
      this.highlightCoin(this.quantumCoin)
      this.dimCoin(this.classicalCoin)
    }

    // Show prediction buttons
    this.predictionButtons.forEach((btn) => {
      btn.setVisible(true)
      btn.setAlpha(0)
      this.tweens.add({
        targets: btn,
        alpha: 1,
        duration: 300,
      })
    })

    this.feedbackText.setText('')
  }

  highlightCoin(coin: Phaser.GameObjects.Container) {
    coin.setAlpha(1)
    this.tweens.add({
      targets: coin,
      scale: 1.1,
      duration: 300,
      ease: 'Back.out',
    })
  }

  dimCoin(coin: Phaser.GameObjects.Container) {
    coin.setAlpha(0.4)
    this.tweens.add({
      targets: coin,
      scale: 0.9,
      duration: 300,
    })
  }

  makePrediction(prediction: CoinState) {
    this.isFlipping = true

    // Hide buttons
    this.predictionButtons.forEach((btn) => btn.setVisible(false))

    let actualResult: CoinState
    let correct: boolean

    if (this.currentCoinType === 'classical') {
      // Classical coin - result was already determined
      actualResult = this.classicalState
      correct = prediction === actualResult

      this.instructionText.setText(`You predicted: ${prediction === 'heads' ? '😊 Heads' : '😢 Tails'}`)

      // Reveal animation
      this.tweens.add({
        targets: this.classicalCoin,
        angle: 360,
        duration: 500,
        onComplete: () => {
          this.showResult(correct, actualResult, 'classical')
        },
      })
    } else {
      // Quantum coin - result determined upon observation (measurement)
      actualResult = Phaser.Math.RND.pick(['heads', 'tails']) as CoinState
      this.quantumState = actualResult
      correct = prediction === actualResult

      this.instructionText.setText(`Observing the quantum coin...`)

      // Collapse animation
      this.tweens.add({
        targets: this.quantumCoin,
        scale: 0.5,
        duration: 200,
        yoyo: true,
        onComplete: () => {
          this.quantumEmoji.setText(actualResult === 'heads' ? '😊' : '😢')
          this.showResult(correct, actualResult, 'quantum')
        },
      })
    }
  }

  showResult(correct: boolean, result: CoinState, coinType: CoinType) {
    const resultEmoji = result === 'heads' ? '😊' : '😢'

    if (correct) {
      this.correctPredictions++
      this.score += coinType === 'quantum' ? 20 : 10 // Quantum predictions worth more
      this.feedbackText.setText(`✅ Correct! It was ${resultEmoji} ${result}!`)
      this.feedbackText.setColor('#22c55e')

      // Celebration animation
      const coin = coinType === 'classical' ? this.classicalCoin : this.quantumCoin
      this.tweens.add({
        targets: coin,
        y: coin.y - 30,
        duration: 200,
        yoyo: true,
        repeat: 2,
      })
    } else {
      this.feedbackText.setText(`❌ It was ${resultEmoji} ${result}!`)
      this.feedbackText.setColor('#ef4444')

      // Shake animation
      const coin = coinType === 'classical' ? this.classicalCoin : this.quantumCoin
      this.tweens.add({
        targets: coin,
        x: coin.x - 10,
        duration: 50,
        yoyo: true,
        repeat: 3,
      })
    }

    // Add explanation for quantum
    if (coinType === 'quantum') {
      this.time.delayedCall(1000, () => {
        this.feedbackText.setText(
          this.feedbackText.text + '\n💡 Quantum: Result only exists after measurement!'
        )
      })
    }

    this.scoreText.setText(`Score: ${this.score}`)

    this.time.delayedCall(2500, () => {
      this.round++
      if (this.round > this.maxRounds) {
        this.endGame()
      } else {
        this.roundText.setText(`Round: ${this.round}/${this.maxRounds}`)
        this.startNewRound()
      }
    })
  }

  endGame() {
    const stars = this.correctPredictions >= 5 ? 3 : this.correctPredictions >= 3 ? 2 : this.correctPredictions >= 1 ? 1 : 0

    this.scene.start('ResultScene', {
      score: this.score,
      correct: this.correctPredictions,
      total: this.maxRounds,
      stars,
    })

    this.game.events.emit('level_complete', {
      score: this.score,
      stars,
    })
  }

  shutdown() {
    if (this.superpositionTimer) {
      this.superpositionTimer.destroy()
    }
  }
}
