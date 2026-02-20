import Phaser from 'phaser'

type QubitState = '|0⟩' | '|1⟩' | '|+⟩' | '|-⟩' | '|i⟩' | '|-i⟩'
type GateType = 'X' | 'Y' | 'Z' | 'H'

interface Puzzle {
  initial: QubitState
  target: QubitState
  optimalMoves: number
}

const STATE_COLORS: Record<QubitState, number> = {
  '|0⟩': 0x3b82f6,
  '|1⟩': 0xef4444,
  '|+⟩': 0x22c55e,
  '|-⟩': 0xf59e0b,
  '|i⟩': 0x8b5cf6,
  '|-i⟩': 0xec4899,
}

const GATE_COLORS: Record<GateType, number> = {
  X: 0xef4444,
  Y: 0x22c55e,
  Z: 0x3b82f6,
  H: 0xf59e0b,
}

export class PlayScene extends Phaser.Scene {
  private currentState: QubitState = '|0⟩'
  private targetState: QubitState = '|1⟩'
  private stateDisplay!: Phaser.GameObjects.Container
  private stateText!: Phaser.GameObjects.Text
  private targetDisplay!: Phaser.GameObjects.Text
  private moves: number = 0
  private level: number = 1
  private maxLevels: number = 8
  private score: number = 0
  private movesText!: Phaser.GameObjects.Text
  private levelText!: Phaser.GameObjects.Text
  private scoreText!: Phaser.GameObjects.Text
  private hintText!: Phaser.GameObjects.Text
  private gateHistory: GateType[] = []
  private historyText!: Phaser.GameObjects.Text

  private puzzles: Puzzle[] = [
    { initial: '|0⟩', target: '|1⟩', optimalMoves: 1 },
    { initial: '|1⟩', target: '|0⟩', optimalMoves: 1 },
    { initial: '|0⟩', target: '|+⟩', optimalMoves: 1 },
    { initial: '|0⟩', target: '|-⟩', optimalMoves: 2 },
    { initial: '|1⟩', target: '|+⟩', optimalMoves: 2 },
    { initial: '|+⟩', target: '|0⟩', optimalMoves: 1 },
    { initial: '|+⟩', target: '|1⟩', optimalMoves: 2 },
    { initial: '|-⟩', target: '|+⟩', optimalMoves: 1 },
  ]

  constructor() {
    super({ key: 'PlayScene' })
  }

  create() {
    const { width, height } = this.cameras.main

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e3a5f, 0x1e3a5f, 1)
    bg.fillRect(0, 0, width, height)

    this.levelText = this.add.text(20, 20, `Level: ${this.level}/${this.maxLevels}`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    })

    this.movesText = this.add.text(width / 2, 20, `Moves: ${this.moves}`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5, 0)

    this.scoreText = this.add.text(width - 20, 20, `Score: ${this.score}`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#22c55e',
    }).setOrigin(1, 0)

    // Current state display
    this.add.text(width * 0.3, 70, 'Current State', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#64748b',
    }).setOrigin(0.5)

    this.stateDisplay = this.add.container(width * 0.3, 140)
    const stateBg = this.add.graphics()
    stateBg.fillStyle(STATE_COLORS['|0⟩'], 1)
    stateBg.fillRoundedRect(-60, -50, 120, 100, 12)
    stateBg.setName('bg')

    this.stateText = this.add.text(0, 0, '|0⟩', {
      fontSize: '48px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.stateDisplay.add([stateBg, this.stateText])

    // Arrow
    this.add.text(width / 2, 140, '→', {
      fontSize: '48px',
      fontFamily: 'Arial',
      color: '#64748b',
    }).setOrigin(0.5)

    // Target state display
    this.add.text(width * 0.7, 70, 'Target State', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#64748b',
    }).setOrigin(0.5)

    const targetBg = this.add.graphics()
    targetBg.lineStyle(3, STATE_COLORS['|1⟩'], 1)
    targetBg.strokeRoundedRect(width * 0.7 - 60, 90, 120, 100, 12)
    targetBg.fillStyle(STATE_COLORS['|1⟩'], 0.2)
    targetBg.fillRoundedRect(width * 0.7 - 60, 90, 120, 100, 12)
    targetBg.setName('targetBg')

    this.targetDisplay = this.add.text(width * 0.7, 140, '|1⟩', {
      fontSize: '48px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    // Gate buttons
    this.add.text(width / 2, 230, 'Apply a Gate:', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5)

    this.createGateButtons()

    // History
    this.add.text(width / 2, 360, 'Gate History:', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#64748b',
    }).setOrigin(0.5)

    this.historyText = this.add.text(width / 2, 390, '(none)', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5)

    // Hint
    this.hintText = this.add.text(width / 2, height - 80, 'Apply gates to transform the current state into the target!', {
      fontSize: '15px',
      fontFamily: 'Arial',
      color: '#64748b',
    }).setOrigin(0.5)

    // Reset button
    this.createResetButton(width / 2, height - 35)

    // Gate explanations
    this.createGateExplanations()

    this.loadPuzzle()
    this.cameras.main.fadeIn(300)
  }

  createGateButtons() {
    const { width } = this.cameras.main
    const gates: GateType[] = ['X', 'Y', 'Z', 'H']
    const startX = width / 2 - 150

    gates.forEach((gate, i) => {
      const x = startX + i * 100
      const y = 290

      const btn = this.add.container(x, y)

      const bg = this.add.graphics()
      bg.fillStyle(GATE_COLORS[gate], 1)
      bg.fillRoundedRect(-35, -35, 70, 70, 10)
      bg.setName('bg')

      const text = this.add.text(0, 0, gate, {
        fontSize: '36px',
        fontFamily: 'Arial',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5)

      btn.add([bg, text])
      btn.setSize(70, 70)
      btn.setInteractive({ useHandCursor: true })

      btn.on('pointerover', () => {
        const bgGraphics = btn.getByName('bg') as Phaser.GameObjects.Graphics
        bgGraphics.clear()
        bgGraphics.fillStyle(GATE_COLORS[gate], 0.8)
        bgGraphics.fillRoundedRect(-35, -35, 70, 70, 10)
        btn.setScale(1.1)
      })

      btn.on('pointerout', () => {
        const bgGraphics = btn.getByName('bg') as Phaser.GameObjects.Graphics
        bgGraphics.clear()
        bgGraphics.fillStyle(GATE_COLORS[gate], 1)
        bgGraphics.fillRoundedRect(-35, -35, 70, 70, 10)
        btn.setScale(1)
      })

      btn.on('pointerdown', () => {
        this.applyGate(gate)
      })
    })
  }

  createResetButton(x: number, y: number) {
    const btn = this.add.container(x, y)

    const bg = this.add.graphics()
    bg.fillStyle(0x64748b, 1)
    bg.fillRoundedRect(-50, -18, 100, 36, 8)

    const text = this.add.text(0, 0, '↺ Reset', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5)

    btn.add([bg, text])
    btn.setSize(100, 36)
    btn.setInteractive({ useHandCursor: true })

    btn.on('pointerdown', () => this.resetPuzzle())
  }

  createGateExplanations() {
    const { width, height } = this.cameras.main
    const explanations = [
      { gate: 'X', desc: 'Flip |0⟩↔|1⟩' },
      { gate: 'Y', desc: 'Flip + phase' },
      { gate: 'Z', desc: 'Phase flip' },
      { gate: 'H', desc: 'Superposition' },
    ]

    explanations.forEach((e, i) => {
      const x = width / 2 - 150 + i * 100
      this.add.text(x, height - 130, e.desc, {
        fontSize: '11px',
        fontFamily: 'Arial',
        color: '#64748b',
      }).setOrigin(0.5)
    })
  }

  loadPuzzle() {
    const puzzle = this.puzzles[this.level - 1]
    this.currentState = puzzle.initial
    this.targetState = puzzle.target
    this.moves = 0
    this.gateHistory = []

    this.updateDisplay()
    this.movesText.setText(`Moves: ${this.moves}`)
    this.historyText.setText('(none)')
    this.hintText.setText(`Optimal solution: ${puzzle.optimalMoves} move(s)`)
    this.hintText.setColor('#64748b')
  }

  resetPuzzle() {
    const puzzle = this.puzzles[this.level - 1]
    this.currentState = puzzle.initial
    this.moves = 0
    this.gateHistory = []

    this.updateDisplay()
    this.movesText.setText(`Moves: ${this.moves}`)
    this.historyText.setText('(none)')
  }

  applyGate(gate: GateType) {
    this.currentState = this.transformState(this.currentState, gate)
    this.moves++
    this.gateHistory.push(gate)

    this.movesText.setText(`Moves: ${this.moves}`)
    this.historyText.setText(this.gateHistory.join(' → '))

    this.updateDisplay()

    // Animate the state change
    this.tweens.add({
      targets: this.stateDisplay,
      scale: 1.2,
      duration: 100,
      yoyo: true,
    })

    // Check if solved
    if (this.currentState === this.targetState) {
      this.solvePuzzle()
    }
  }

  transformState(state: QubitState, gate: GateType): QubitState {
    const transitions: Record<QubitState, Record<GateType, QubitState>> = {
      '|0⟩': { X: '|1⟩', Y: '|1⟩', Z: '|0⟩', H: '|+⟩' },
      '|1⟩': { X: '|0⟩', Y: '|0⟩', Z: '|1⟩', H: '|-⟩' },
      '|+⟩': { X: '|+⟩', Y: '|-⟩', Z: '|-⟩', H: '|0⟩' },
      '|-⟩': { X: '|-⟩', Y: '|+⟩', Z: '|+⟩', H: '|1⟩' },
      '|i⟩': { X: '|-i⟩', Y: '|i⟩', Z: '|-i⟩', H: '|-i⟩' },
      '|-i⟩': { X: '|i⟩', Y: '|-i⟩', Z: '|i⟩', H: '|i⟩' },
    }

    return transitions[state][gate]
  }

  updateDisplay() {
    this.stateText.setText(this.currentState)
    this.targetDisplay.setText(this.targetState)

    const stateBg = this.stateDisplay.getByName('bg') as Phaser.GameObjects.Graphics
    stateBg.clear()
    stateBg.fillStyle(STATE_COLORS[this.currentState], 1)
    stateBg.fillRoundedRect(-60, -50, 120, 100, 12)

    // Highlight if matching
    if (this.currentState === this.targetState) {
      stateBg.lineStyle(4, 0x22c55e, 1)
      stateBg.strokeRoundedRect(-60, -50, 120, 100, 12)
    }
  }

  solvePuzzle() {
    const puzzle = this.puzzles[this.level - 1]
    const bonus = this.moves <= puzzle.optimalMoves ? 50 : 0
    const points = Math.max(100 - (this.moves - puzzle.optimalMoves) * 20, 20) + bonus

    this.score += points
    this.scoreText.setText(`Score: ${this.score}`)

    this.hintText.setText(`✅ Solved in ${this.moves} moves! +${points} points`)
    this.hintText.setColor('#22c55e')

    // Success animation
    this.tweens.add({
      targets: this.stateDisplay,
      scale: 1.3,
      duration: 200,
      yoyo: true,
      repeat: 1,
    })

    this.time.delayedCall(1500, () => {
      this.level++

      if (this.level > this.maxLevels) {
        this.endGame()
      } else {
        this.levelText.setText(`Level: ${this.level}/${this.maxLevels}`)
        this.loadPuzzle()
      }
    })
  }

  endGame() {
    const maxScore = this.maxLevels * 150
    const efficiency = this.score / maxScore
    const stars = efficiency >= 0.8 ? 3 : efficiency >= 0.5 ? 2 : efficiency > 0 ? 1 : 0

    this.scene.start('ResultScene', {
      score: this.score,
      levels: this.maxLevels,
      stars,
    })

    this.game.events.emit('level_complete', {
      score: this.score,
      stars,
    })
  }
}
