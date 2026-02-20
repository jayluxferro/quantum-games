import Phaser from 'phaser'

type OracleType = 'constant_0' | 'constant_1' | 'balanced_01' | 'balanced_10'
type FunctionResult = 'constant' | 'balanced'

interface QueryResult {
  input: string
  output: string
}

export class PlayScene extends Phaser.Scene {
  private oracle!: OracleType
  private round: number = 1
  private maxRounds: number = 8
  private score: number = 0
  private classicalQueries: number = 0
  private quantumQueries: number = 0
  private queryHistory: QueryResult[] = []
  private hasGuessed: boolean = false

  private roundText!: Phaser.GameObjects.Text
  private scoreText!: Phaser.GameObjects.Text
  private oracleContainer!: Phaser.GameObjects.Container
  private historyContainer!: Phaser.GameObjects.Container
  private hintText!: Phaser.GameObjects.Text
  private classicalBtn!: Phaser.GameObjects.Container
  private quantumBtn!: Phaser.GameObjects.Container

  constructor() {
    super({ key: 'PlayScene' })
  }

  create() {
    const { width, height } = this.cameras.main

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x312e81, 0x312e81, 1)
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

    // Oracle display
    this.add.text(width / 2, 55, 'Mystery Oracle', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#a855f7',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.oracleContainer = this.add.container(width / 2, 120)
    const oracleBox = this.add.graphics()
    oracleBox.fillStyle(0x1e1b4b, 1)
    oracleBox.fillRoundedRect(-100, -40, 200, 80, 12)
    oracleBox.lineStyle(3, 0x8b5cf6, 1)
    oracleBox.strokeRoundedRect(-100, -40, 200, 80, 12)

    const oracleText = this.add.text(0, 0, 'f(x) = ???', {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setName('oracleText')

    this.oracleContainer.add([oracleBox, oracleText])

    // Query buttons
    this.add.text(width / 2, 190, 'Query the Oracle:', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5)

    this.createQueryButtons()

    // Query history
    this.add.text(width / 2, 290, 'Query Results:', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#64748b',
    }).setOrigin(0.5)

    this.historyContainer = this.add.container(width / 2, 340)

    // Guess buttons
    this.add.text(width / 2, 430, 'Make Your Guess:', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5)

    this.createGuessButtons()

    this.hintText = this.add.text(width / 2, height - 40, '', {
      fontSize: '15px',
      fontFamily: 'Arial',
      color: '#64748b',
    }).setOrigin(0.5)

    this.newRound()
    this.cameras.main.fadeIn(300)
  }

  createQueryButtons() {
    const { width } = this.cameras.main

    // Classical query (check specific input)
    this.classicalBtn = this.createButton(width / 2 - 120, 230, 'Classical: f(0) or f(1)', 0x3b82f6, () => {
      if (!this.hasGuessed) {
        this.classicalQuery()
      }
    })

    // Quantum query (superposition)
    this.quantumBtn = this.createButton(width / 2 + 120, 230, 'Quantum: f(|+⟩)', 0x8b5cf6, () => {
      if (!this.hasGuessed) {
        this.quantumQuery()
      }
    })
  }

  createGuessButtons() {
    const { width } = this.cameras.main

    this.createButton(width / 2 - 100, 480, '📊 Constant', 0x22c55e, () => {
      if (!this.hasGuessed) {
        this.makeGuess('constant')
      }
    })

    this.createButton(width / 2 + 100, 480, '⚖️ Balanced', 0xf59e0b, () => {
      if (!this.hasGuessed) {
        this.makeGuess('balanced')
      }
    })
  }

  createButton(x: number, y: number, label: string, color: number, callback: () => void): Phaser.GameObjects.Container {
    const btn = this.add.container(x, y)

    const bg = this.add.graphics()
    bg.fillStyle(color, 1)
    bg.fillRoundedRect(-90, -22, 180, 44, 8)
    bg.setName('bg')

    const text = this.add.text(0, 0, label, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    btn.add([bg, text])
    btn.setSize(180, 44)
    btn.setInteractive({ useHandCursor: true })
    btn.setData('color', color)

    btn.on('pointerover', () => {
      const bgGraphics = btn.getByName('bg') as Phaser.GameObjects.Graphics
      bgGraphics.clear()
      bgGraphics.fillStyle(color, 0.8)
      bgGraphics.fillRoundedRect(-90, -22, 180, 44, 8)
    })

    btn.on('pointerout', () => {
      const bgGraphics = btn.getByName('bg') as Phaser.GameObjects.Graphics
      bgGraphics.clear()
      bgGraphics.fillStyle(color, 1)
      bgGraphics.fillRoundedRect(-90, -22, 180, 44, 8)
    })

    btn.on('pointerdown', callback)

    return btn
  }

  newRound() {
    // Randomly select oracle type
    const types: OracleType[] = ['constant_0', 'constant_1', 'balanced_01', 'balanced_10']
    this.oracle = Phaser.Utils.Array.GetRandom(types)
    this.queryHistory = []
    this.classicalQueries = 0
    this.quantumQueries = 0
    this.hasGuessed = false

    this.updateHistoryDisplay()
    this.hintText.setText('Query the oracle to discover if f(x) is constant or balanced!')
    this.hintText.setColor('#64748b')
  }

  getOracleOutput(input: '0' | '1' | 'superposition'): string {
    if (input === 'superposition') {
      // Quantum query reveals the type directly through interference
      if (this.oracle.startsWith('constant')) {
        return '|0⟩ → Constant!'
      } else {
        return '|1⟩ → Balanced!'
      }
    }

    // Classical query
    switch (this.oracle) {
      case 'constant_0':
        return '0'
      case 'constant_1':
        return '1'
      case 'balanced_01':
        return input === '0' ? '0' : '1'
      case 'balanced_10':
        return input === '0' ? '1' : '0'
    }
  }

  classicalQuery() {
    // Alternate between f(0) and f(1) queries
    const input = this.classicalQueries % 2 === 0 ? '0' : '1'
    const output = this.getOracleOutput(input as '0' | '1')

    this.classicalQueries++
    this.queryHistory.push({ input: `f(${input})`, output })
    this.updateHistoryDisplay()

    // Animate oracle
    this.animateOracle(`f(${input}) = ${output}`)
  }

  quantumQuery() {
    const output = this.getOracleOutput('superposition')
    this.quantumQueries++
    this.queryHistory.push({ input: 'f(|+⟩)', output })
    this.updateHistoryDisplay()

    // Animate oracle with quantum effect
    this.animateOracle(output, true)

    this.hintText.setText('💡 Quantum parallelism: One query reveals all!')
    this.hintText.setColor('#a855f7')
  }

  animateOracle(result: string, isQuantum: boolean = false) {
    const oracleText = this.oracleContainer.getByName('oracleText') as Phaser.GameObjects.Text
    
    this.tweens.add({
      targets: this.oracleContainer,
      scale: 1.1,
      duration: 150,
      yoyo: true,
      onComplete: () => {
        oracleText.setText(result)
        if (isQuantum) {
          oracleText.setColor('#a855f7')
        }
      },
    })
  }

  updateHistoryDisplay() {
    this.historyContainer.removeAll(true)

    if (this.queryHistory.length === 0) {
      const noQueries = this.add.text(0, 0, '(No queries yet)', {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#64748b',
      }).setOrigin(0.5)
      this.historyContainer.add(noQueries)
      return
    }

    this.queryHistory.forEach((q, i) => {
      const y = i * 30 - ((this.queryHistory.length - 1) * 15)
      const isQuantum = q.input.includes('|+⟩')
      const color = isQuantum ? '#a855f7' : '#3b82f6'

      const text = this.add.text(0, y, `${q.input} → ${q.output}`, {
        fontSize: '16px',
        fontFamily: 'Arial',
        color,
        fontStyle: isQuantum ? 'bold' : 'normal',
      }).setOrigin(0.5)

      this.historyContainer.add(text)
    })
  }

  makeGuess(guess: FunctionResult) {
    this.hasGuessed = true

    const actualType: FunctionResult = this.oracle.startsWith('constant') ? 'constant' : 'balanced'
    const correct = guess === actualType

    // Calculate score based on query efficiency
    let points = 0
    if (correct) {
      if (this.quantumQueries === 1 && this.classicalQueries === 0) {
        points = 150 // Perfect quantum solution
      } else if (this.classicalQueries <= 1) {
        points = 100
      } else {
        points = Math.max(50 - (this.classicalQueries - 2) * 10, 10)
      }
    }

    this.score += points
    this.scoreText.setText(`Score: ${this.score}`)

    if (correct) {
      this.hintText.setText(`✅ Correct! The oracle was ${actualType}. +${points} points`)
      this.hintText.setColor('#22c55e')

      // Reveal the actual function
      const oracleText = this.oracleContainer.getByName('oracleText') as Phaser.GameObjects.Text
      oracleText.setText(this.getOracleDescription())
      oracleText.setColor('#22c55e')
    } else {
      this.hintText.setText(`❌ Wrong! The oracle was ${actualType}.`)
      this.hintText.setColor('#ef4444')

      const oracleText = this.oracleContainer.getByName('oracleText') as Phaser.GameObjects.Text
      oracleText.setText(this.getOracleDescription())
      oracleText.setColor('#ef4444')
    }

    this.time.delayedCall(2000, () => {
      this.round++
      if (this.round > this.maxRounds) {
        this.endGame()
      } else {
        this.roundText.setText(`Round: ${this.round}/${this.maxRounds}`)
        const oracleText = this.oracleContainer.getByName('oracleText') as Phaser.GameObjects.Text
        oracleText.setText('f(x) = ???')
        oracleText.setColor('#ffffff')
        this.newRound()
      }
    })
  }

  getOracleDescription(): string {
    switch (this.oracle) {
      case 'constant_0':
        return 'f(x) = 0 (constant)'
      case 'constant_1':
        return 'f(x) = 1 (constant)'
      case 'balanced_01':
        return 'f(x) = x (balanced)'
      case 'balanced_10':
        return 'f(x) = NOT x (balanced)'
    }
  }

  endGame() {
    const maxScore = this.maxRounds * 150
    const efficiency = this.score / maxScore
    const stars = efficiency >= 0.8 ? 3 : efficiency >= 0.5 ? 2 : efficiency > 0 ? 1 : 0

    this.scene.start('ResultScene', {
      score: this.score,
      rounds: this.maxRounds,
      stars,
    })

    this.game.events.emit('level_complete', {
      score: this.score,
      stars,
    })
  }
}
