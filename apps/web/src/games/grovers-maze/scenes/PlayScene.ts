import Phaser from 'phaser'

interface MazeCell {
  row: number
  col: number
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean }
  isExit: boolean
  amplitude: number
  phase: number
}

export class PlayScene extends Phaser.Scene {
  private mazeSize: number = 4
  private maze: MazeCell[][] = []
  private exitCell: { row: number; col: number } = { row: 3, col: 3 }
  private cellSize: number = 60
  private mazeOffsetX: number = 0
  private mazeOffsetY: number = 0
  
  private iterations: number = 0
  private optimalIterations: number = 2
  private score: number = 0
  private phase: 'setup' | 'oracle' | 'diffusion' | 'measure' | 'complete' = 'setup'
  
  private amplitudeGraphics!: Phaser.GameObjects.Graphics
  private phaseText!: Phaser.GameObjects.Text
  private iterationText!: Phaser.GameObjects.Text
  private instructionText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'PlayScene' })
  }

  create() {
    const { width, height } = this.cameras.main

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a)

    // Calculate maze position
    this.mazeOffsetX = 100
    this.mazeOffsetY = 100

    // Initialize maze
    this.initializeMaze()

    // Draw maze
    this.drawMaze()

    // Create amplitude visualization
    this.amplitudeGraphics = this.add.graphics()
    this.updateAmplitudeVisualization()

    // UI
    this.createUI()

    // Start in setup phase
    this.setPhase('setup')

    this.cameras.main.fadeIn(300)
  }

  initializeMaze() {
    this.maze = []
    const n = this.mazeSize * this.mazeSize
    const initialAmp = 1 / Math.sqrt(n)

    for (let row = 0; row < this.mazeSize; row++) {
      this.maze[row] = []
      for (let col = 0; col < this.mazeSize; col++) {
        this.maze[row][col] = {
          row,
          col,
          walls: {
            top: row === 0,
            right: col === this.mazeSize - 1,
            bottom: row === this.mazeSize - 1,
            left: col === 0,
          },
          isExit: row === this.exitCell.row && col === this.exitCell.col,
          amplitude: initialAmp,
          phase: 1,
        }
      }
    }

    // Generate simple maze walls
    this.generateMazeWalls()
  }

  generateMazeWalls() {
    // Add some internal walls for visual effect
    const wallPairs = [
      [{ r: 0, c: 1 }, { r: 1, c: 1 }],
      [{ r: 1, c: 2 }, { r: 1, c: 3 }],
      [{ r: 2, c: 0 }, { r: 2, c: 1 }],
      [{ r: 2, c: 2 }, { r: 3, c: 2 }],
    ]

    wallPairs.forEach(([a, b]) => {
      if (a.r === b.r) {
        // Horizontal wall
        if (a.c < b.c) {
          this.maze[a.r][a.c].walls.right = true
          this.maze[b.r][b.c].walls.left = true
        }
      } else {
        // Vertical wall
        if (a.r < b.r) {
          this.maze[a.r][a.c].walls.bottom = true
          this.maze[b.r][b.c].walls.top = true
        }
      }
    })
  }

  drawMaze() {
    const graphics = this.add.graphics()

    for (let row = 0; row < this.mazeSize; row++) {
      for (let col = 0; col < this.mazeSize; col++) {
        const cell = this.maze[row][col]
        const x = this.mazeOffsetX + col * this.cellSize
        const y = this.mazeOffsetY + row * this.cellSize

        // Cell background
        graphics.fillStyle(0x1e293b, 0.5)
        graphics.fillRect(x, y, this.cellSize, this.cellSize)

        // Walls
        graphics.lineStyle(3, 0x475569)
        if (cell.walls.top) graphics.lineBetween(x, y, x + this.cellSize, y)
        if (cell.walls.right) graphics.lineBetween(x + this.cellSize, y, x + this.cellSize, y + this.cellSize)
        if (cell.walls.bottom) graphics.lineBetween(x, y + this.cellSize, x + this.cellSize, y + this.cellSize)
        if (cell.walls.left) graphics.lineBetween(x, y, x, y + this.cellSize)

        // Cell label
        const index = row * this.mazeSize + col
        this.add.text(x + this.cellSize / 2, y + this.cellSize - 12, `|${index}⟩`, {
          fontSize: '10px',
          color: '#64748b',
        }).setOrigin(0.5)

        // Exit marker
        if (cell.isExit) {
          const exit = this.add.text(x + this.cellSize / 2, y + this.cellSize / 2, '🚪', {
            fontSize: '24px',
          }).setOrigin(0.5)

          this.tweens.add({
            targets: exit,
            scale: 1.2,
            duration: 500,
            yoyo: true,
            repeat: -1,
          })
        }
      }
    }

    // Entrance marker
    this.add.text(
      this.mazeOffsetX + this.cellSize / 2,
      this.mazeOffsetY + this.cellSize / 2,
      '🚶',
      { fontSize: '24px' }
    ).setOrigin(0.5)
  }

  updateAmplitudeVisualization() {
    this.amplitudeGraphics.clear()

    for (let row = 0; row < this.mazeSize; row++) {
      for (let col = 0; col < this.mazeSize; col++) {
        const cell = this.maze[row][col]
        const x = this.mazeOffsetX + col * this.cellSize + this.cellSize / 2
        const y = this.mazeOffsetY + row * this.cellSize + this.cellSize / 2

        // Amplitude visualization as circle
        const amp = Math.abs(cell.amplitude)
        const radius = amp * 40

        // Color based on phase
        const color = cell.phase > 0 ? 0xf59e0b : 0xef4444
        
        this.amplitudeGraphics.fillStyle(color, 0.6)
        this.amplitudeGraphics.fillCircle(x, y, radius)

        // Border
        this.amplitudeGraphics.lineStyle(2, color)
        this.amplitudeGraphics.strokeCircle(x, y, radius)
      }
    }
  }

  createUI() {
    const { width, height } = this.cameras.main
    const rightPanel = this.mazeOffsetX + this.mazeSize * this.cellSize + 50

    // Phase indicator
    this.phaseText = this.add.text(rightPanel, 100, 'Phase: Setup', {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#f59e0b',
    })

    // Iterations counter
    this.iterationText = this.add.text(rightPanel, 130, 'Iterations: 0', {
      fontSize: '14px',
      color: '#94a3b8',
    })

    // Instructions
    this.instructionText = this.add.text(rightPanel, 180, '', {
      fontSize: '12px',
      color: '#64748b',
      wordWrap: { width: 200 },
    })

    // Control buttons
    this.createControlButtons(rightPanel, 280)

    // Legend
    this.add.text(rightPanel, height - 120, 'Legend:', {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
    })

    this.add.circle(rightPanel + 10, height - 90, 8, 0xf59e0b)
    this.add.text(rightPanel + 25, height - 90, 'Positive phase', {
      fontSize: '12px',
      color: '#94a3b8',
    }).setOrigin(0, 0.5)

    this.add.circle(rightPanel + 10, height - 65, 8, 0xef4444)
    this.add.text(rightPanel + 25, height - 65, 'Negative phase', {
      fontSize: '12px',
      color: '#94a3b8',
    }).setOrigin(0, 0.5)

    // Back button
    const backBtn = this.add.text(30, height - 30, '← Menu', {
      fontSize: '14px',
      color: '#64748b',
    })
    backBtn.setInteractive({ useHandCursor: true })
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'))
  }

  createControlButtons(x: number, y: number) {
    const buttons = [
      { label: 'H (Hadamard)', action: () => this.applyHadamard() },
      { label: 'Oracle', action: () => this.applyOracle() },
      { label: 'Diffusion', action: () => this.applyDiffusion() },
      { label: 'Measure', action: () => this.measure() },
      { label: 'Reset', action: () => this.resetMaze() },
    ]

    buttons.forEach((btn, i) => {
      const by = y + i * 45
      const buttonBg = this.add.rectangle(x + 80, by, 150, 35, 0x1e293b)
      buttonBg.setStrokeStyle(1, 0x374151)

      const buttonText = this.add.text(x + 80, by, btn.label, {
        fontSize: '14px',
        color: '#ffffff',
      }).setOrigin(0.5)

      buttonBg.setInteractive({ useHandCursor: true })
      buttonBg.on('pointerover', () => buttonBg.setFillStyle(0x374151))
      buttonBg.on('pointerout', () => buttonBg.setFillStyle(0x1e293b))
      buttonBg.on('pointerdown', btn.action)
    })
  }

  setPhase(phase: typeof this.phase) {
    this.phase = phase
    this.phaseText.setText(`Phase: ${phase.charAt(0).toUpperCase() + phase.slice(1)}`)

    const instructions: Record<string, string> = {
      setup: 'Click "H (Hadamard)" to put all paths into superposition.',
      oracle: 'Click "Oracle" to mark the exit with a negative phase.',
      diffusion: 'Click "Diffusion" to amplify the marked state.',
      measure: 'Click "Measure" to find your path!',
      complete: 'Maze completed!',
    }

    this.instructionText.setText(instructions[phase] || '')
  }

  applyHadamard() {
    if (this.phase !== 'setup') return

    // Equal superposition
    const n = this.mazeSize * this.mazeSize
    const amp = 1 / Math.sqrt(n)

    for (let row = 0; row < this.mazeSize; row++) {
      for (let col = 0; col < this.mazeSize; col++) {
        this.maze[row][col].amplitude = amp
        this.maze[row][col].phase = 1
      }
    }

    this.updateAmplitudeVisualization()
    this.showMessage('Superposition created!')
    this.setPhase('oracle')
    this.score += 10
  }

  applyOracle() {
    if (this.phase !== 'oracle') return

    // Mark the exit with negative phase
    this.maze[this.exitCell.row][this.exitCell.col].phase = -1

    this.updateAmplitudeVisualization()
    this.showMessage('Exit marked with negative phase!')
    this.setPhase('diffusion')
    this.score += 10
  }

  applyDiffusion() {
    if (this.phase !== 'diffusion') return

    const n = this.mazeSize * this.mazeSize

    // Calculate mean amplitude
    let sum = 0
    for (let row = 0; row < this.mazeSize; row++) {
      for (let col = 0; col < this.mazeSize; col++) {
        sum += this.maze[row][col].amplitude * this.maze[row][col].phase
      }
    }
    const mean = sum / n

    // Reflect about mean (2*mean - amplitude)
    for (let row = 0; row < this.mazeSize; row++) {
      for (let col = 0; col < this.mazeSize; col++) {
        const cell = this.maze[row][col]
        const newAmp = 2 * mean - (cell.amplitude * cell.phase)
        cell.amplitude = Math.abs(newAmp)
        cell.phase = newAmp >= 0 ? 1 : -1
      }
    }

    this.iterations++
    this.iterationText.setText(`Iterations: ${this.iterations}`)

    this.updateAmplitudeVisualization()
    this.showMessage(`Diffusion applied! (${this.iterations} iteration${this.iterations > 1 ? 's' : ''})`)

    // Can do more iterations or measure
    this.setPhase('oracle')
    this.score += 15
  }

  measure() {
    // Find cell with highest probability
    let maxProb = 0
    let maxCell = { row: 0, col: 0 }

    for (let row = 0; row < this.mazeSize; row++) {
      for (let col = 0; col < this.mazeSize; col++) {
        const prob = this.maze[row][col].amplitude ** 2
        if (prob > maxProb) {
          maxProb = prob
          maxCell = { row, col }
        }
      }
    }

    // Check if found exit
    const foundExit = maxCell.row === this.exitCell.row && maxCell.col === this.exitCell.col

    // Collapse to measured state
    for (let row = 0; row < this.mazeSize; row++) {
      for (let col = 0; col < this.mazeSize; col++) {
        if (row === maxCell.row && col === maxCell.col) {
          this.maze[row][col].amplitude = 1
        } else {
          this.maze[row][col].amplitude = 0
        }
        this.maze[row][col].phase = 1
      }
    }

    this.updateAmplitudeVisualization()

    if (foundExit) {
      this.score += 50
      if (this.iterations <= this.optimalIterations) {
        this.score += 30
        this.showMessage('🎉 Perfect! Exit found with optimal iterations!')
      } else {
        this.showMessage('✓ Exit found!')
      }
      this.setPhase('complete')

      // Calculate stars
      const stars = this.iterations <= this.optimalIterations ? 3 :
                    this.iterations <= this.optimalIterations + 1 ? 2 : 1

      this.time.delayedCall(1500, () => {
        this.scene.start('ResultScene', {
          score: this.score,
          stars,
          iterations: this.iterations,
          optimal: this.optimalIterations,
        })
        this.game.events.emit('level_complete', { score: this.score, stars })
      })
    } else {
      this.showMessage('❌ Wrong path! Try again.')
      this.resetMaze()
    }
  }

  resetMaze() {
    this.iterations = 0
    this.score = 0
    this.iterationText.setText('Iterations: 0')
    this.initializeMaze()
    this.updateAmplitudeVisualization()
    this.setPhase('setup')
  }

  showMessage(text: string) {
    const { width, height } = this.cameras.main
    const msg = this.add.text(width / 2, height / 2, text, {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#1e293b',
      padding: { x: 15, y: 10 },
    }).setOrigin(0.5).setDepth(100)

    this.tweens.add({
      targets: msg,
      alpha: 0,
      y: height / 2 - 30,
      duration: 1500,
      onComplete: () => msg.destroy(),
    })
  }
}
