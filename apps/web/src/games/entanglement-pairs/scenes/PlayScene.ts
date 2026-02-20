import Phaser from 'phaser'

interface Card {
  container: Phaser.GameObjects.Container
  pairId: number
  partnerId: number
  isRevealed: boolean
  isMatched: boolean
  spin: 'up' | 'down'
  color: number
}

export class PlayScene extends Phaser.Scene {
  private cards: Card[] = []
  private selectedCards: Card[] = []
  private score: number = 0
  private moves: number = 0
  private matches: number = 0
  private totalPairs: number = 6
  private canSelect: boolean = true
  private scoreText!: Phaser.GameObjects.Text
  private movesText!: Phaser.GameObjects.Text
  private hintText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'PlayScene' })
  }

  create() {
    const { width, height } = this.cameras.main

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e1b4b, 0x1e1b4b, 1)
    bg.fillRect(0, 0, width, height)

    this.add.text(width / 2, 25, '🔗 Entanglement Pairs', {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.scoreText = this.add.text(20, 60, 'Score: 0', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#22c55e',
    })

    this.movesText = this.add.text(width - 20, 60, 'Moves: 0', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#94a3b8',
    }).setOrigin(1, 0)

    this.hintText = this.add.text(width / 2, height - 30, 'Click a particle to reveal it and its entangled partner!', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#64748b',
    }).setOrigin(0.5)

    this.createCards()
    this.cameras.main.fadeIn(300)
  }

  createCards() {
    const { width, height } = this.cameras.main
    const cols = 4
    const rows = 3
    const cardWidth = 100
    const cardHeight = 100
    const spacing = 20
    const totalWidth = cols * cardWidth + (cols - 1) * spacing
    const totalHeight = rows * cardHeight + (rows - 1) * spacing
    const startX = (width - totalWidth) / 2 + cardWidth / 2
    const startY = (height - totalHeight) / 2 + cardHeight / 2 + 20

    // Create pairs with colors
    const colors = [0xef4444, 0x22c55e, 0x3b82f6, 0xf59e0b, 0x8b5cf6, 0xec4899]
    const cardData: { pairId: number; spin: 'up' | 'down'; color: number }[] = []

    for (let i = 0; i < this.totalPairs; i++) {
      cardData.push({ pairId: i, spin: 'up', color: colors[i % colors.length] })
      cardData.push({ pairId: i, spin: 'down', color: colors[i % colors.length] })
    }

    // Shuffle cards
    Phaser.Utils.Array.Shuffle(cardData)

    // Create card objects
    let cardIndex = 0
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = startX + col * (cardWidth + spacing)
        const y = startY + row * (cardHeight + spacing)
        const data = cardData[cardIndex]

        const container = this.add.container(x, y)

        // Card back
        const cardBack = this.add.graphics()
        cardBack.fillStyle(0x334155, 1)
        cardBack.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 10)
        cardBack.lineStyle(2, 0x8b5cf6, 1)
        cardBack.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 10)
        cardBack.setName('back')

        // Question mark on back
        const questionMark = this.add.text(0, 0, '❓', {
          fontSize: '40px',
        }).setOrigin(0.5).setName('question')

        // Card front (hidden initially)
        const cardFront = this.add.graphics()
        cardFront.fillStyle(data.color, 1)
        cardFront.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 10)
        cardFront.setName('front')
        cardFront.setVisible(false)

        // Spin indicator
        const spinEmoji = data.spin === 'up' ? '⬆️' : '⬇️'
        const spinText = this.add.text(0, 0, spinEmoji, {
          fontSize: '50px',
        }).setOrigin(0.5).setName('spin')
        spinText.setVisible(false)

        container.add([cardBack, questionMark, cardFront, spinText])
        container.setSize(cardWidth, cardHeight)
        container.setInteractive({ useHandCursor: true })

        const card: Card = {
          container,
          pairId: data.pairId,
          partnerId: -1,
          isRevealed: false,
          isMatched: false,
          spin: data.spin,
          color: data.color,
        }

        container.on('pointerdown', () => this.onCardClick(card))
        container.on('pointerover', () => {
          if (!card.isRevealed && !card.isMatched) {
            container.setScale(1.05)
          }
        })
        container.on('pointerout', () => {
          if (!card.isRevealed && !card.isMatched) {
            container.setScale(1)
          }
        })

        this.cards.push(card)
        cardIndex++
      }
    }

    // Link entangled pairs
    for (let i = 0; i < this.cards.length; i++) {
      for (let j = i + 1; j < this.cards.length; j++) {
        if (this.cards[i].pairId === this.cards[j].pairId) {
          this.cards[i].partnerId = j
          this.cards[j].partnerId = i
        }
      }
    }
  }

  onCardClick(card: Card) {
    if (!this.canSelect || card.isRevealed || card.isMatched) return

    this.moves++
    this.movesText.setText(`Moves: ${this.moves}`)

    // Reveal this card AND its entangled partner (quantum entanglement!)
    this.revealCard(card)

    const partner = this.cards[card.partnerId]
    if (!partner.isRevealed && !partner.isMatched) {
      this.time.delayedCall(200, () => {
        this.revealCard(partner)
        this.showEntanglementEffect(card, partner)

        this.hintText.setText('🔗 Both particles revealed! They were entangled!')
        this.hintText.setColor('#a855f7')

        // Check match
        this.time.delayedCall(1500, () => {
          this.checkMatch(card, partner)
        })
      })
    }
  }

  revealCard(card: Card) {
    card.isRevealed = true

    const back = card.container.getByName('back') as Phaser.GameObjects.Graphics
    const question = card.container.getByName('question') as Phaser.GameObjects.Text
    const front = card.container.getByName('front') as Phaser.GameObjects.Graphics
    const spin = card.container.getByName('spin') as Phaser.GameObjects.Text

    // Flip animation
    this.tweens.add({
      targets: card.container,
      scaleX: 0,
      duration: 150,
      onComplete: () => {
        back.setVisible(false)
        question.setVisible(false)
        front.setVisible(true)
        spin.setVisible(true)

        this.tweens.add({
          targets: card.container,
          scaleX: 1,
          duration: 150,
        })
      },
    })
  }

  showEntanglementEffect(card1: Card, card2: Card) {
    // Draw a line connecting the entangled particles
    const line = this.add.graphics()
    line.lineStyle(3, 0xa855f7, 0.8)

    const x1 = card1.container.x
    const y1 = card1.container.y
    const x2 = card2.container.x
    const y2 = card2.container.y

    line.lineBetween(x1, y1, x2, y2)

    // Pulse effect
    this.tweens.add({
      targets: [card1.container, card2.container],
      scale: 1.1,
      duration: 200,
      yoyo: true,
      repeat: 1,
    })

    // Fade out the line
    this.tweens.add({
      targets: line,
      alpha: 0,
      delay: 1000,
      duration: 500,
      onComplete: () => line.destroy(),
    })
  }

  checkMatch(card1: Card, card2: Card) {
    // In this version, entangled pairs always match!
    card1.isMatched = true
    card2.isMatched = true
    this.matches++
    this.score += Math.max(100 - this.moves * 5, 10)
    this.scoreText.setText(`Score: ${this.score}`)

    // Success animation
    this.tweens.add({
      targets: [card1.container, card2.container],
      alpha: 0.6,
      scale: 0.9,
      duration: 300,
    })

    this.hintText.setText('✅ Entangled pair matched!')
    this.hintText.setColor('#22c55e')

    if (this.matches >= this.totalPairs) {
      this.time.delayedCall(500, () => this.endGame())
    } else {
      this.time.delayedCall(1000, () => {
        this.hintText.setText('Click another particle to find its partner!')
        this.hintText.setColor('#64748b')
      })
    }
  }

  hideCards(card1: Card, card2: Card) {
    card1.isRevealed = false
    card2.isRevealed = false

    [card1, card2].forEach((card) => {
      const back = card.container.getByName('back') as Phaser.GameObjects.Graphics
      const question = card.container.getByName('question') as Phaser.GameObjects.Text
      const front = card.container.getByName('front') as Phaser.GameObjects.Graphics
      const spin = card.container.getByName('spin') as Phaser.GameObjects.Text

      this.tweens.add({
        targets: card.container,
        scaleX: 0,
        duration: 150,
        onComplete: () => {
          back.setVisible(true)
          question.setVisible(true)
          front.setVisible(false)
          spin.setVisible(false)

          this.tweens.add({
            targets: card.container,
            scaleX: 1,
            duration: 150,
          })
        },
      })
    })
  }

  endGame() {
    const maxScore = this.totalPairs * 100
    const efficiency = this.score / maxScore
    const stars = efficiency >= 0.8 ? 3 : efficiency >= 0.5 ? 2 : efficiency > 0 ? 1 : 0

    this.scene.start('ResultScene', {
      score: this.score,
      moves: this.moves,
      pairs: this.totalPairs,
      stars,
    })

    this.game.events.emit('level_complete', {
      score: this.score,
      stars,
    })
  }
}
