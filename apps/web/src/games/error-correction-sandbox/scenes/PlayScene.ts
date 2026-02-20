import Phaser from 'phaser'

type QubitValue = 0 | 1

interface EncodedQubit {
  original: QubitValue
  bits: [QubitValue, QubitValue, QubitValue]
  errorPosition: number | null
}

export class PlayScene extends Phaser.Scene {
  private logicalQubit: QubitValue = 0
  private encodedQubits: [QubitValue, QubitValue, QubitValue] = [0, 0, 0]
  private errorPosition: number | null = null
  private round: number = 1
  private maxRounds: number = 10
  private score: number = 0
  private errors: number = 0
  private corrected: number = 0
  private phase: 'encode' | 'noise' | 'syndrome' | 'correct' | 'verify' = 'encode'

  private roundText!: Phaser.GameObjects.Text
  private scoreText!: Phaser.GameObjects.Text
  private phaseText!: Phaser.GameObjects.Text
  private logicalDisplay!: Phaser.GameObjects.Text
  private qubitDisplays: Phaser.GameObjects.Container[] = []
  private syndromeDisplays: Phaser.GameObjects.Text[] = []
  private hintText!: Phaser.GameObjects.Text
  private actionButton!: Phaser.GameObjects.Container

  constructor() {
    super({ key: 'PlayScene' })
  }

  create() {
    const { width, height } = this.cameras.main

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x14532d, 0x14532d, 1)
    bg.fillRect(0, 0, width, height)

    this.roundText = this.add.text(20, 20, `Round: ${this.round}/${this.maxRounds}`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    })

    this.scoreText = this.add.text(width - 20, 20, `Score: ${this.score}`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#22c55e',
    }).setOrigin(1, 0)

    this.phaseText = this.add.text(width / 2, 25, 'Phase: Encode', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#f59e0b',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    // Logical qubit display
    this.add.text(width / 2, 65, 'Logical Qubit (your data):', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5)

    this.logicalDisplay = this.add.text(width / 2, 100, '|0⟩', {
      fontSize: '40px',
      fontFamily: 'Arial',
      color: '#22c55e',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    // Encoded qubits display
    this.add.text(width / 2, 155, 'Encoded (3-qubit code):', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5)

    const qubitXs = [width * 0.3, width * 0.5, width * 0.7]
    qubitXs.forEach((x, i) => {
      const container = this.add.container(x, 210)

      const bg = this.add.graphics()
      bg.fillStyle(0x166534, 1)
      bg.fillRoundedRect(-40, -35, 80, 70, 10)
      bg.setName('bg')

      const label = this.add.text(0, -50, `Q${i + 1}`, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#64748b',
      }).setOrigin(0.5)

      const value = this.add.text(0, 0, '|0⟩', {
        fontSize: '32px',
        fontFamily: 'Arial',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5).setName('value')

      container.add([bg, label, value])
      container.setSize(80, 70)
      container.setInteractive({ useHandCursor: true })
      container.setData('index', i)

      container.on('pointerdown', () => this.onQubitClick(i))

      this.qubitDisplays.push(container)
    })

    // Syndrome measurements
    this.add.text(width / 2, 290, 'Syndrome Measurements:', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5)

    const syndromeLabels = ['Q1⊕Q2', 'Q2⊕Q3']
    const syndromeXs = [width * 0.35, width * 0.65]
    syndromeXs.forEach((x, i) => {
      this.add.text(x, 320, syndromeLabels[i], {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#64748b',
      }).setOrigin(0.5)

      const synText = this.add.text(x, 350, '?', {
        fontSize: '28px',
        fontFamily: 'Arial',
        color: '#64748b',
        fontStyle: 'bold',
      }).setOrigin(0.5)

      this.syndromeDisplays.push(synText)
    })

    // Syndrome interpretation
    this.add.text(width / 2, 395, 'Syndrome Guide:', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#64748b',
    }).setOrigin(0.5)

    this.add.text(width / 2, 420, '00: No error | 10: Q1 error | 11: Q2 error | 01: Q3 error', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#475569',
    }).setOrigin(0.5)

    // Hint text
    this.hintText = this.add.text(width / 2, height - 100, '', {
      fontSize: '15px',
      fontFamily: 'Arial',
      color: '#64748b',
      align: 'center',
    }).setOrigin(0.5)

    // Action button
    this.actionButton = this.createActionButton(width / 2, height - 50)

    this.startRound()
    this.cameras.main.fadeIn(300)
  }

  createActionButton(x: number, y: number): Phaser.GameObjects.Container {
    const btn = this.add.container(x, y)

    const bg = this.add.graphics()
    bg.fillStyle(0x3b82f6, 1)
    bg.fillRoundedRect(-80, -22, 160, 44, 8)
    bg.setName('bg')

    const text = this.add.text(0, 0, 'Encode', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setName('text')

    btn.add([bg, text])
    btn.setSize(160, 44)
    btn.setInteractive({ useHandCursor: true })

    btn.on('pointerdown', () => this.onActionClick())

    return btn
  }

  updateActionButton(label: string, color: number) {
    const bg = this.actionButton.getByName('bg') as Phaser.GameObjects.Graphics
    const text = this.actionButton.getByName('text') as Phaser.GameObjects.Text

    bg.clear()
    bg.fillStyle(color, 1)
    bg.fillRoundedRect(-80, -22, 160, 44, 8)
    text.setText(label)
  }

  startRound() {
    // Randomly choose logical qubit value
    this.logicalQubit = Phaser.Math.RND.pick([0, 1]) as QubitValue
    this.encodedQubits = [this.logicalQubit, this.logicalQubit, this.logicalQubit]
    this.errorPosition = null
    this.phase = 'encode'

    this.logicalDisplay.setText(`|${this.logicalQubit}⟩`)
    this.logicalDisplay.setColor('#22c55e')

    this.qubitDisplays.forEach((container, i) => {
      const value = container.getByName('value') as Phaser.GameObjects.Text
      value.setText('|?⟩')
      value.setColor('#64748b')

      const bg = container.getByName('bg') as Phaser.GameObjects.Graphics
      bg.clear()
      bg.fillStyle(0x334155, 1)
      bg.fillRoundedRect(-40, -35, 80, 70, 10)
    })

    this.syndromeDisplays.forEach((text) => {
      text.setText('?')
      text.setColor('#64748b')
    })

    this.phaseText.setText('Phase: Encode')
    this.updateActionButton('Encode |' + this.logicalQubit + '⟩', 0x3b82f6)
    this.hintText.setText(`Encode |${this.logicalQubit}⟩ using 3-qubit repetition code`)
  }

  onActionClick() {
    switch (this.phase) {
      case 'encode':
        this.doEncode()
        break
      case 'noise':
        this.applyNoise()
        break
      case 'syndrome':
        this.measureSyndrome()
        break
      case 'correct':
        // Handled by qubit clicks
        break
      case 'verify':
        this.verifyAndScore()
        break
    }
  }

  doEncode() {
    // Show encoded qubits
    this.qubitDisplays.forEach((container, i) => {
      const value = container.getByName('value') as Phaser.GameObjects.Text
      value.setText(`|${this.logicalQubit}⟩`)
      value.setColor('#22c55e')

      const bg = container.getByName('bg') as Phaser.GameObjects.Graphics
      bg.clear()
      bg.fillStyle(0x166534, 1)
      bg.fillRoundedRect(-40, -35, 80, 70, 10)

      // Animate
      this.tweens.add({
        targets: container,
        scale: 1.1,
        duration: 150,
        yoyo: true,
        delay: i * 100,
      })
    })

    this.phase = 'noise'
    this.phaseText.setText('Phase: Noise')
    this.updateActionButton('⚠️ Apply Noise', 0xf59e0b)
    this.hintText.setText('Noise will randomly flip one qubit. Click to simulate!')
  }

  applyNoise() {
    // Randomly flip one qubit (or no error with 20% chance)
    const hasError = Math.random() > 0.2
    
    if (hasError) {
      this.errorPosition = Phaser.Math.RND.integerInRange(0, 2)
      this.encodedQubits[this.errorPosition] = this.encodedQubits[this.errorPosition] === 0 ? 1 : 0

      const container = this.qubitDisplays[this.errorPosition]
      const value = container.getByName('value') as Phaser.GameObjects.Text
      const bg = container.getByName('bg') as Phaser.GameObjects.Graphics

      value.setText(`|${this.encodedQubits[this.errorPosition]}⟩`)
      value.setColor('#ef4444')
      bg.clear()
      bg.fillStyle(0x991b1b, 1)
      bg.fillRoundedRect(-40, -35, 80, 70, 10)

      // Shake animation
      this.tweens.add({
        targets: container,
        x: container.x - 5,
        duration: 50,
        yoyo: true,
        repeat: 3,
      })

      this.errors++
    }

    this.phase = 'syndrome'
    this.phaseText.setText('Phase: Syndrome')
    this.updateActionButton('🔍 Measure Syndrome', 0x8b5cf6)
    this.hintText.setText('Measure syndrome to detect which qubit (if any) has an error')
  }

  measureSyndrome() {
    // Calculate syndromes
    const s1 = this.encodedQubits[0] ^ this.encodedQubits[1]
    const s2 = this.encodedQubits[1] ^ this.encodedQubits[2]

    this.syndromeDisplays[0].setText(s1.toString())
    this.syndromeDisplays[0].setColor(s1 ? '#ef4444' : '#22c55e')
    this.syndromeDisplays[1].setText(s2.toString())
    this.syndromeDisplays[1].setColor(s2 ? '#ef4444' : '#22c55e')

    // Determine which qubit to flip based on syndrome
    let errorHint = ''
    if (s1 === 0 && s2 === 0) {
      errorHint = 'Syndrome 00: No error detected!'
    } else if (s1 === 1 && s2 === 0) {
      errorHint = 'Syndrome 10: Error in Q1 - click to fix!'
    } else if (s1 === 1 && s2 === 1) {
      errorHint = 'Syndrome 11: Error in Q2 - click to fix!'
    } else if (s1 === 0 && s2 === 1) {
      errorHint = 'Syndrome 01: Error in Q3 - click to fix!'
    }

    this.phase = 'correct'
    this.phaseText.setText('Phase: Correct')
    this.updateActionButton('Verify (No Fix)', 0x22c55e)
    this.hintText.setText(errorHint)
  }

  onQubitClick(index: number) {
    if (this.phase !== 'correct') return

    // Flip the clicked qubit
    this.encodedQubits[index] = this.encodedQubits[index] === 0 ? 1 : 0

    const container = this.qubitDisplays[index]
    const value = container.getByName('value') as Phaser.GameObjects.Text
    const bg = container.getByName('bg') as Phaser.GameObjects.Graphics

    value.setText(`|${this.encodedQubits[index]}⟩`)
    
    // Update color based on whether it matches original
    const isCorrect = this.encodedQubits[index] === this.logicalQubit
    value.setColor(isCorrect ? '#22c55e' : '#ef4444')
    bg.clear()
    bg.fillStyle(isCorrect ? 0x166534 : 0x991b1b, 1)
    bg.fillRoundedRect(-40, -35, 80, 70, 10)

    // Animation
    this.tweens.add({
      targets: container,
      scale: 1.15,
      duration: 100,
      yoyo: true,
    })

    // Move to verify phase
    this.phase = 'verify'
    this.phaseText.setText('Phase: Verify')
    this.updateActionButton('✓ Verify Result', 0x22c55e)
    this.hintText.setText('Click Verify to check if the correction was successful!')
  }

  verifyAndScore() {
    // Check if all qubits match the original logical qubit
    const allCorrect = this.encodedQubits.every((q) => q === this.logicalQubit)

    if (allCorrect) {
      this.score += this.errorPosition !== null ? 20 : 10
      if (this.errorPosition !== null) this.corrected++

      this.hintText.setText('✅ Data recovered successfully!')
      this.hintText.setColor('#22c55e')

      // Success animation
      this.qubitDisplays.forEach((container) => {
        const bg = container.getByName('bg') as Phaser.GameObjects.Graphics
        bg.clear()
        bg.fillStyle(0x166534, 1)
        bg.fillRoundedRect(-40, -35, 80, 70, 10)
      })
    } else {
      this.hintText.setText('❌ Data corrupted - wrong correction!')
      this.hintText.setColor('#ef4444')
    }

    this.scoreText.setText(`Score: ${this.score}`)

    this.time.delayedCall(1500, () => {
      this.round++
      if (this.round > this.maxRounds) {
        this.endGame()
      } else {
        this.roundText.setText(`Round: ${this.round}/${this.maxRounds}`)
        this.hintText.setColor('#64748b')
        this.startRound()
      }
    })
  }

  endGame() {
    const maxScore = this.maxRounds * 20
    const efficiency = this.score / maxScore
    const stars = efficiency >= 0.8 ? 3 : efficiency >= 0.5 ? 2 : efficiency > 0 ? 1 : 0

    this.scene.start('ResultScene', {
      score: this.score,
      rounds: this.maxRounds,
      errors: this.errors,
      corrected: this.corrected,
      stars,
    })

    this.game.events.emit('level_complete', {
      score: this.score,
      stars,
    })
  }
}
