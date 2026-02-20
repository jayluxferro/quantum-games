import Phaser from 'phaser'

interface BinCount {
  red: number
  blue: number
}

export class PlayScene extends Phaser.Scene {
  private bins: Phaser.GameObjects.Container[] = []
  private binCounts: BinCount[] = []
  private balls: Phaser.Physics.Arcade.Sprite[] = []
  private pegs: Phaser.Physics.Arcade.StaticGroup!
  private dropZone!: Phaser.GameObjects.Zone
  private totalDrops: number = 0
  private maxDrops: number = 20
  private round: number = 1
  private maxRounds: number = 3
  private score: number = 0
  private targetBin: number = 0
  private dropsText!: Phaser.GameObjects.Text
  private roundText!: Phaser.GameObjects.Text
  private scoreText!: Phaser.GameObjects.Text
  private instructionText!: Phaser.GameObjects.Text
  private predictButtons: Phaser.GameObjects.Container[] = []
  private hasPredicted: boolean = false
  private prediction: number = -1

  constructor() {
    super({ key: 'PlayScene' })
  }

  create() {
    const { width, height } = this.cameras.main

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e1b4b, 0x1e1b4b, 1)
    bg.fillRect(0, 0, width, height)

    this.roundText = this.add.text(20, 20, `Round: ${this.round}/${this.maxRounds}`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    })

    this.dropsText = this.add.text(width / 2, 20, `Drops: ${this.totalDrops}/${this.maxDrops}`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(0.5, 0)

    this.scoreText = this.add.text(width - 20, 20, `Score: ${this.score}`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#fbbf24',
    }).setOrigin(1, 0)

    this.instructionText = this.add.text(width / 2, 50, 'Predict: Which bin will have MORE balls?', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5)

    this.createPegs()
    this.createBins()
    this.createPredictionButtons()
    this.createDropZone()

    this.cameras.main.fadeIn(300)
  }

  createPegs() {
    this.pegs = this.physics.add.staticGroup()

    const { width, height } = this.cameras.main
    const rows = 6
    const startY = 150
    const rowHeight = 40
    const pegRadius = 8

    for (let row = 0; row < rows; row++) {
      const cols = row + 3
      const rowWidth = cols * 50
      const startX = (width - rowWidth) / 2 + 25

      for (let col = 0; col < cols; col++) {
        const x = startX + col * 50
        const y = startY + row * rowHeight

        const peg = this.add.graphics()
        peg.fillStyle(0x6366f1, 1)
        peg.fillCircle(x, y, pegRadius)

        const collider = this.add.circle(x, y, pegRadius)
        this.physics.add.existing(collider, true)
        this.pegs.add(collider)
      }
    }
  }

  createBins() {
    const { width, height } = this.cameras.main
    const binCount = 5
    const binWidth = 80
    const binHeight = 80
    const binY = height - 50
    const totalWidth = binCount * binWidth + (binCount - 1) * 10
    const startX = (width - totalWidth) / 2 + binWidth / 2

    this.binCounts = []

    for (let i = 0; i < binCount; i++) {
      const x = startX + i * (binWidth + 10)
      
      const bin = this.add.container(x, binY)
      
      const binGraphics = this.add.graphics()
      binGraphics.lineStyle(2, 0x3b82f6, 1)
      binGraphics.strokeRect(-binWidth / 2, -binHeight / 2, binWidth, binHeight)
      binGraphics.fillStyle(0x1e3a5f, 0.5)
      binGraphics.fillRect(-binWidth / 2, -binHeight / 2, binWidth, binHeight)

      const label = this.add.text(0, -binHeight / 2 - 12, `${i + 1}`, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#94a3b8',
      }).setOrigin(0.5)

      const countText = this.add.text(0, 0, '0', {
        fontSize: '28px',
        fontFamily: 'Arial',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5).setName('countText')

      bin.add([binGraphics, label, countText])
      bin.setData('index', i)

      this.bins.push(bin)
      this.binCounts.push({ red: 0, blue: 0 })

      const zone = this.add.zone(x, binY, binWidth - 5, binHeight)
      this.physics.add.existing(zone, true)
      zone.setData('binIndex', i)
    }
  }

  createPredictionButtons() {
    const { width, height } = this.cameras.main
    const buttonY = height - 145

    const labels = ['1', '2', '3', '4', '5']
    const totalWidth = labels.length * 70
    const startX = (width - totalWidth) / 2 + 35

    labels.forEach((label, i) => {
      const btn = this.add.container(startX + i * 70, buttonY)
      
      const bg = this.add.graphics()
      bg.fillStyle(0x334155, 1)
      bg.fillRoundedRect(-28, -16, 56, 32, 6)
      bg.setName('bg')
      
      const text = this.add.text(0, 0, `Bin ${label}`, {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: '#ffffff',
      }).setOrigin(0.5)

      btn.add([bg, text])
      btn.setSize(56, 32)
      btn.setInteractive({ useHandCursor: true })
      btn.setData('binIndex', i)

      btn.on('pointerover', () => {
        if (!this.hasPredicted) {
          const bgGraphics = btn.getByName('bg') as Phaser.GameObjects.Graphics
          bgGraphics.clear()
          bgGraphics.fillStyle(0x8b5cf6, 1)
          bgGraphics.fillRoundedRect(-28, -16, 56, 32, 6)
        }
      })

      btn.on('pointerout', () => {
        if (!this.hasPredicted && this.prediction !== i) {
          const bgGraphics = btn.getByName('bg') as Phaser.GameObjects.Graphics
          bgGraphics.clear()
          bgGraphics.fillStyle(0x334155, 1)
          bgGraphics.fillRoundedRect(-28, -16, 56, 32, 6)
        }
      })

      btn.on('pointerdown', () => {
        if (!this.hasPredicted) {
          this.makePrediction(i)
        }
      })

      this.predictButtons.push(btn)
    })
  }

  createDropZone() {
    const { width } = this.cameras.main

    this.dropZone = this.add.zone(width / 2, 90, 200, 40)
    this.dropZone.setInteractive({ useHandCursor: true })

    const dropArea = this.add.graphics()
    dropArea.lineStyle(2, 0x22c55e, 0.8)
    dropArea.strokeRoundedRect(width / 2 - 100, 70, 200, 40, 10)
    dropArea.fillStyle(0x22c55e, 0.2)
    dropArea.fillRoundedRect(width / 2 - 100, 70, 200, 40, 10)

    const dropText = this.add.text(width / 2, 90, 'Click to drop ball!', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#22c55e',
    }).setOrigin(0.5).setName('dropText')

    this.dropZone.on('pointerdown', () => {
      if (this.hasPredicted && this.totalDrops < this.maxDrops) {
        this.dropBall()
      }
    })
  }

  makePrediction(binIndex: number) {
    this.hasPredicted = true
    this.prediction = binIndex

    this.predictButtons.forEach((btn, i) => {
      const bgGraphics = btn.getByName('bg') as Phaser.GameObjects.Graphics
      bgGraphics.clear()
      
      if (i === binIndex) {
        bgGraphics.fillStyle(0x8b5cf6, 1)
        bgGraphics.lineStyle(2, 0xfbbf24, 1)
        bgGraphics.fillRoundedRect(-28, -16, 56, 32, 6)
        bgGraphics.strokeRoundedRect(-28, -16, 56, 32, 6)
      } else {
        bgGraphics.fillStyle(0x334155, 0.5)
        bgGraphics.fillRoundedRect(-28, -16, 56, 32, 6)
      }
      
      btn.disableInteractive()
    })

    this.instructionText.setText('Drop balls and see where they land!')

    const dropText = this.children.getByName('dropText') as Phaser.GameObjects.Text
    if (dropText) {
      dropText.setColor('#22c55e')
    }
  }

  dropBall() {
    const { width } = this.cameras.main
    
    const ball = this.add.graphics()
    ball.fillStyle(0xef4444, 1)
    ball.fillCircle(0, 0, 10)
    
    const ballSprite = this.physics.add.sprite(width / 2 + Phaser.Math.Between(-20, 20), 100, '')
    ballSprite.setCircle(10)
    ballSprite.setBounce(0.6)
    ballSprite.setVelocity(Phaser.Math.Between(-50, 50), 0)
    
    ball.x = ballSprite.x
    ball.y = ballSprite.y
    
    this.physics.add.collider(ballSprite, this.pegs, () => {
      ballSprite.setVelocityX(Phaser.Math.Between(-100, 100))
    })

    this.balls.push(ballSprite)
    this.totalDrops++
    this.dropsText.setText(`Drops: ${this.totalDrops}/${this.maxDrops}`)

    this.time.addEvent({
      delay: 16,
      callback: () => {
        ball.x = ballSprite.x
        ball.y = ballSprite.y
      },
      loop: true,
    })

    this.time.delayedCall(3000, () => {
      const binIndex = this.getBinIndex(ballSprite.x)
      if (binIndex >= 0 && binIndex < this.binCounts.length) {
        this.binCounts[binIndex].red++
        this.updateBinCount(binIndex)
      }
      
      if (this.totalDrops >= this.maxDrops) {
        this.time.delayedCall(500, () => {
          this.evaluateRound()
        })
      }
    })
  }

  getBinIndex(x: number): number {
    const { width } = this.cameras.main
    const binCount = 5
    const binWidth = 80
    const spacing = 10
    const totalWidth = binCount * binWidth + (binCount - 1) * spacing
    const startX = (width - totalWidth) / 2

    const relX = x - startX
    return Math.floor(relX / (binWidth + spacing))
  }

  updateBinCount(binIndex: number) {
    const bin = this.bins[binIndex]
    const countText = bin.getByName('countText') as Phaser.GameObjects.Text
    const total = this.binCounts[binIndex].red + this.binCounts[binIndex].blue
    countText.setText(total.toString())
  }

  evaluateRound() {
    let maxBalls = 0
    let winningBin = 0
    
    this.binCounts.forEach((count, i) => {
      const total = count.red + count.blue
      if (total > maxBalls) {
        maxBalls = total
        winningBin = i
      }
    })

    const correct = this.prediction === winningBin
    
    if (correct) {
      this.score += 100
      this.instructionText.setText('🎉 Correct prediction!')
      this.instructionText.setColor('#22c55e')
    } else {
      this.instructionText.setText(`Bin ${winningBin + 1} won with ${maxBalls} balls!`)
      this.instructionText.setColor('#ef4444')
    }

    this.scoreText.setText(`Score: ${this.score}`)

    this.time.delayedCall(2500, () => {
      this.round++
      
      if (this.round > this.maxRounds) {
        this.endGame()
      } else {
        this.resetRound()
      }
    })
  }

  resetRound() {
    this.balls.forEach(ball => ball.destroy())
    this.balls = []
    
    this.binCounts = this.binCounts.map(() => ({ red: 0, blue: 0 }))
    this.bins.forEach((bin, i) => {
      const countText = bin.getByName('countText') as Phaser.GameObjects.Text
      countText.setText('0')
    })

    this.totalDrops = 0
    this.hasPredicted = false
    this.prediction = -1
    
    this.predictButtons.forEach((btn) => {
      btn.setInteractive({ useHandCursor: true })
      const bgGraphics = btn.getByName('bg') as Phaser.GameObjects.Graphics
      bgGraphics.clear()
      bgGraphics.fillStyle(0x334155, 1)
      bgGraphics.fillRoundedRect(-28, -16, 56, 32, 6)
    })

    this.roundText.setText(`Round: ${this.round}/${this.maxRounds}`)
    this.dropsText.setText(`Drops: 0/${this.maxDrops}`)
    this.instructionText.setText('Predict: Which bin will have MORE balls?')
    this.instructionText.setColor('#ffffff')
  }

  endGame() {
    const stars = this.score >= 250 ? 3 : this.score >= 150 ? 2 : this.score >= 50 ? 1 : 0

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
