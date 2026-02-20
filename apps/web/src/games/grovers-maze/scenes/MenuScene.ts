import Phaser from 'phaser'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' })
  }

  create() {
    const { width, height } = this.cameras.main
    const centerX = width / 2
    const centerY = height / 2

    // Background
    this.add.rectangle(centerX, centerY, width, height, 0x0a0a1a)

    // Maze preview decoration
    this.drawMazePreview(centerX, centerY - 50)

    // Title
    this.add.text(centerX, centerY + 70, "🔍 Grover's Maze", {
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#f59e0b',
    }).setOrigin(0.5)

    this.add.text(centerX, centerY + 110, 'Find the exit using quantum search', {
      fontSize: '16px',
      color: '#94a3b8',
    }).setOrigin(0.5)

    // Algorithm explanation
    const explanation = this.add.text(centerX, centerY + 150,
      'Classical: Check each path one by one (N steps)\n' +
      'Quantum: Find the solution in √N steps using Grover\'s algorithm!',
      {
        fontSize: '12px',
        color: '#64748b',
        align: 'center',
      }
    ).setOrigin(0.5)

    // Tutorial button
    const tutorialBtn = this.add.rectangle(centerX - 100, centerY + 220, 160, 45, 0x1e293b)
    tutorialBtn.setStrokeStyle(2, 0xf59e0b)
    this.add.text(centerX - 100, centerY + 220, '📚 How It Works', {
      fontSize: '16px',
      color: '#f59e0b',
    }).setOrigin(0.5)

    tutorialBtn.setInteractive({ useHandCursor: true })
    tutorialBtn.on('pointerdown', () => this.scene.start('TutorialScene'))

    // Play button
    const playBtn = this.add.rectangle(centerX + 100, centerY + 220, 160, 45, 0xf59e0b)
    this.add.text(centerX + 100, centerY + 220, '▶ Enter Maze', {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#000000',
    }).setOrigin(0.5)

    playBtn.setInteractive({ useHandCursor: true })
    playBtn.on('pointerdown', () => this.scene.start('PlayScene'))
  }

  drawMazePreview(x: number, y: number) {
    const size = 120
    const cellSize = size / 4
    const graphics = this.add.graphics()

    // Maze grid
    graphics.lineStyle(2, 0x374151)
    
    // Draw maze walls (simple pattern)
    const walls = [
      [1, 0, 1, 1],
      [0, 0, 0, 1],
      [1, 1, 0, 0],
      [1, 0, 0, 1],
    ]

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const cx = x - size / 2 + col * cellSize + cellSize / 2
        const cy = y - size / 2 + row * cellSize + cellSize / 2

        if (walls[row][col]) {
          graphics.fillStyle(0x1e293b)
          graphics.fillRect(
            cx - cellSize / 2,
            cy - cellSize / 2,
            cellSize,
            cellSize
          )
        } else {
          // Open path cells have subtle glow
          graphics.fillStyle(0x0a0a1a)
          graphics.fillRect(
            cx - cellSize / 2,
            cy - cellSize / 2,
            cellSize,
            cellSize
          )
        }
      }
    }

    // Border
    graphics.strokeRect(x - size / 2, y - size / 2, size, size)

    // Entrance marker
    const entranceCircle = this.add.circle(
      x - size / 2 + cellSize / 2,
      y - size / 2 + cellSize / 2,
      8,
      0x22c55e
    )

    // Exit marker (pulsing)
    const exitCircle = this.add.circle(
      x + size / 2 - cellSize / 2,
      y + size / 2 - cellSize / 2,
      8,
      0xf59e0b
    )

    this.tweens.add({
      targets: exitCircle,
      scale: 1.3,
      alpha: 0.5,
      duration: 800,
      yoyo: true,
      repeat: -1,
    })

    // Quantum search visualization (paths being checked simultaneously)
    for (let i = 0; i < 6; i++) {
      const pathIndicator = this.add.circle(
        x + Phaser.Math.Between(-40, 40),
        y + Phaser.Math.Between(-40, 40),
        3,
        0xf59e0b,
        0.5
      )

      this.tweens.add({
        targets: pathIndicator,
        alpha: 0,
        scale: 2,
        duration: 1500,
        delay: i * 200,
        repeat: -1,
      })
    }
  }
}
