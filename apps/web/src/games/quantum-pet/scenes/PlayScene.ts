import Phaser from 'phaser'

interface PetState {
  emoji: string
  name: string
  color: number
}

const PET_STATES: PetState[] = [
  { emoji: '😺', name: 'Happy', color: 0x22c55e },
  { emoji: '😿', name: 'Sad', color: 0x3b82f6 },
  { emoji: '😸', name: 'Excited', color: 0xfbbf24 },
  { emoji: '😾', name: 'Grumpy', color: 0xef4444 },
]

export class PlayScene extends Phaser.Scene {
  private pet!: Phaser.GameObjects.Container
  private petEmoji!: Phaser.GameObjects.Text
  private isInSuperposition: boolean = true
  private observeCount: number = 0
  private correctGuesses: number = 0
  private targetState!: PetState
  private score: number = 0
  private round: number = 1
  private maxRounds: number = 5
  private stateButtons: Phaser.GameObjects.Container[] = []
  private feedbackText!: Phaser.GameObjects.Text
  private roundText!: Phaser.GameObjects.Text
  private scoreText!: Phaser.GameObjects.Text
  private instructionText!: Phaser.GameObjects.Text
  private superpositionTimer?: Phaser.Time.TimerEvent

  constructor() {
    super({ key: 'PlayScene' })
  }

  create() {
    const { width, height } = this.cameras.main

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1)
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

    this.instructionText = this.add.text(width / 2, 80, 'Your pet is in superposition!', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5)

    this.createPet(width / 2, height * 0.35)

    this.createObserveButton(width / 2, height * 0.55)

    this.createStateButtons(width / 2, height * 0.75)

    this.feedbackText = this.add.text(width / 2, height * 0.9, '', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5)

    this.startNewRound()

    this.cameras.main.fadeIn(300)
  }

  createPet(x: number, y: number) {
    this.pet = this.add.container(x, y)

    const glow = this.add.graphics()
    glow.fillStyle(0x8b5cf6, 0.3)
    glow.fillCircle(0, 0, 80)
    
    this.petEmoji = this.add.text(0, 0, '🐱', {
      fontSize: '80px',
    }).setOrigin(0.5)

    const stateLabel = this.add.text(0, 60, '???', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5).setName('stateLabel')

    this.pet.add([glow, this.petEmoji, stateLabel])

    this.superpositionTimer = this.time.addEvent({
      delay: 150,
      callback: () => {
        if (this.isInSuperposition) {
          const randomState = Phaser.Math.RND.pick(PET_STATES)
          this.petEmoji.setText(randomState.emoji)
        }
      },
      loop: true,
    })
  }

  createObserveButton(x: number, y: number) {
    const button = this.add.container(x, y)
    
    const bg = this.add.graphics()
    bg.fillStyle(0x8b5cf6, 1)
    bg.fillRoundedRect(-100, -30, 200, 60, 10)
    
    const text = this.add.text(0, 0, '👀 Observe!', {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    button.add([bg, text])
    button.setSize(200, 60)
    button.setInteractive({ useHandCursor: true })
    button.setName('observeButton')

    button.on('pointerover', () => {
      bg.clear()
      bg.fillStyle(0xa78bfa, 1)
      bg.fillRoundedRect(-100, -30, 200, 60, 10)
    })

    button.on('pointerout', () => {
      bg.clear()
      bg.fillStyle(0x8b5cf6, 1)
      bg.fillRoundedRect(-100, -30, 200, 60, 10)
    })

    button.on('pointerdown', () => {
      this.observePet()
    })
  }

  createStateButtons(x: number, y: number) {
    const spacing = 150
    const startX = x - (spacing * 1.5)

    PET_STATES.forEach((state, index) => {
      const btn = this.add.container(startX + index * spacing, y)
      
      const bg = this.add.graphics()
      bg.fillStyle(0x334155, 1)
      bg.fillRoundedRect(-55, -40, 110, 80, 8)
      bg.setName('bg')
      
      const emoji = this.add.text(0, -10, state.emoji, {
        fontSize: '32px',
      }).setOrigin(0.5)
      
      const label = this.add.text(0, 25, state.name, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#94a3b8',
      }).setOrigin(0.5)

      btn.add([bg, emoji, label])
      btn.setSize(110, 80)
      btn.setInteractive({ useHandCursor: true })
      btn.setData('state', state)
      btn.setVisible(false)
      btn.setAlpha(0)

      btn.on('pointerover', () => {
        const bgGraphics = btn.getByName('bg') as Phaser.GameObjects.Graphics
        bgGraphics.clear()
        bgGraphics.fillStyle(state.color, 0.5)
        bgGraphics.fillRoundedRect(-55, -40, 110, 80, 8)
      })

      btn.on('pointerout', () => {
        const bgGraphics = btn.getByName('bg') as Phaser.GameObjects.Graphics
        bgGraphics.clear()
        bgGraphics.fillStyle(0x334155, 1)
        bgGraphics.fillRoundedRect(-55, -40, 110, 80, 8)
      })

      btn.on('pointerdown', () => {
        this.makeGuess(state)
      })

      this.stateButtons.push(btn)
    })
  }

  startNewRound() {
    this.isInSuperposition = true
    this.targetState = Phaser.Math.RND.pick(PET_STATES)
    
    this.instructionText.setText('Your pet is in superposition!')
    this.feedbackText.setText('')
    
    this.stateButtons.forEach((btn) => {
      btn.setVisible(false)
      btn.setAlpha(0)
    })

    const observeBtn = this.children.getByName('observeButton') as Phaser.GameObjects.Container
    if (observeBtn) {
      observeBtn.setVisible(true)
      observeBtn.setAlpha(1)
    }

    const stateLabel = this.pet.getByName('stateLabel') as Phaser.GameObjects.Text
    if (stateLabel) {
      stateLabel.setText('???')
      stateLabel.setColor('#94a3b8')
    }
  }

  observePet() {
    this.isInSuperposition = false
    this.observeCount++

    this.petEmoji.setText(this.targetState.emoji)

    const stateLabel = this.pet.getByName('stateLabel') as Phaser.GameObjects.Text
    if (stateLabel) {
      stateLabel.setText(this.targetState.name)
      stateLabel.setColor(`#${this.targetState.color.toString(16)}`)
    }

    this.tweens.add({
      targets: this.pet,
      scale: 1.2,
      duration: 200,
      yoyo: true,
      ease: 'Bounce.out',
    })

    const observeBtn = this.children.getByName('observeButton') as Phaser.GameObjects.Container
    if (observeBtn) {
      this.tweens.add({
        targets: observeBtn,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          observeBtn.setVisible(false)
        },
      })
    }

    this.instructionText.setText('What mood did you observe?')

    this.time.delayedCall(500, () => {
      this.stateButtons.forEach((btn, index) => {
        btn.setVisible(true)
        this.tweens.add({
          targets: btn,
          alpha: 1,
          duration: 200,
          delay: index * 100,
        })
      })
    })
  }

  makeGuess(guessedState: PetState) {
    const correct = guessedState.name === this.targetState.name

    if (correct) {
      this.correctGuesses++
      this.score += 100
      this.feedbackText.setText('✨ Correct! Great observation!')
      this.feedbackText.setColor('#22c55e')
      
      this.tweens.add({
        targets: this.pet,
        y: this.pet.y - 20,
        duration: 200,
        yoyo: true,
        repeat: 2,
      })
    } else {
      this.feedbackText.setText(`Not quite! It was ${this.targetState.name}`)
      this.feedbackText.setColor('#ef4444')
      
      this.tweens.add({
        targets: this.pet,
        x: this.pet.x - 10,
        duration: 50,
        yoyo: true,
        repeat: 3,
      })
    }

    this.scoreText.setText(`Score: ${this.score}`)

    this.stateButtons.forEach((btn) => {
      btn.disableInteractive()
    })

    this.time.delayedCall(2000, () => {
      this.round++
      
      if (this.round > this.maxRounds) {
        this.endGame()
      } else {
        this.roundText.setText(`Round: ${this.round}/${this.maxRounds}`)
        this.stateButtons.forEach((btn) => {
          btn.setInteractive({ useHandCursor: true })
        })
        this.startNewRound()
      }
    })
  }

  endGame() {
    const stars = this.correctGuesses >= 4 ? 3 : this.correctGuesses >= 3 ? 2 : this.correctGuesses >= 1 ? 1 : 0

    this.scene.start('ResultScene', {
      score: this.score,
      correct: this.correctGuesses,
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
