import Phaser from 'phaser'

interface Photon {
  bit: number
  aliceBasis: '+' | '×'
  bobBasis: '+' | '×' | null
  measured: boolean
  eveIntercepted: boolean
}

export class PlayScene extends Phaser.Scene {
  private photons: Photon[] = []
  private currentPhase: 'alice' | 'eve' | 'bob' | 'sift' | 'verify' = 'alice'
  private currentIndex: number = 0
  private score: number = 0
  private numPhotons: number = 8
  private eveActive: boolean = false
  private sharedKey: number[] = []
  private errorRate: number = 0

  private photonSprites: Phaser.GameObjects.Container[] = []
  private phaseText!: Phaser.GameObjects.Text
  private instructionText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'PlayScene' })
  }

  create() {
    const { width, height } = this.cameras.main

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0f0a)

    // Initialize photons
    this.initializePhotons()

    // Draw the scene
    this.drawCharacters()
    this.drawPhotonRow()
    this.createUI()

    // Start with Alice's phase
    this.startPhase('alice')

    this.cameras.main.fadeIn(500)
  }

  initializePhotons() {
    this.photons = []
    for (let i = 0; i < this.numPhotons; i++) {
      this.photons.push({
        bit: Math.random() > 0.5 ? 1 : 0,
        aliceBasis: Math.random() > 0.5 ? '+' : '×',
        bobBasis: null,
        measured: false,
        eveIntercepted: false,
      })
    }

    // Randomly make Eve active in some games
    this.eveActive = Math.random() > 0.4
  }

  drawCharacters() {
    const { width, height } = this.cameras.main

    // Alice (left)
    this.add.text(80, 80, '👤', { fontSize: '48px' }).setOrigin(0.5)
    this.add.text(80, 120, 'Alice', {
      fontSize: '14px',
      color: '#22c55e',
    }).setOrigin(0.5)

    // Eve (middle, shows if active)
    const eveEmoji = this.add.text(width / 2, 80, '🕵️', { fontSize: '48px' }).setOrigin(0.5)
    const eveName = this.add.text(width / 2, 120, 'Eve?', {
      fontSize: '14px',
      color: '#ef4444',
    }).setOrigin(0.5)

    if (!this.eveActive) {
      eveEmoji.setAlpha(0.3)
      eveName.setAlpha(0.3)
    }

    // Bob (right)
    this.add.text(width - 80, 80, '👤', { fontSize: '48px' }).setOrigin(0.5)
    this.add.text(width - 80, 120, 'Bob', {
      fontSize: '14px',
      color: '#3b82f6',
    }).setOrigin(0.5)

    // Channel line
    const graphics = this.add.graphics()
    graphics.lineStyle(2, 0x374151)
    graphics.lineBetween(130, 80, width - 130, 80)
  }

  drawPhotonRow() {
    const { width, height } = this.cameras.main
    const startX = 100
    const spacing = (width - 200) / (this.numPhotons - 1)
    const y = height / 2

    this.photonSprites = []

    this.photons.forEach((photon, i) => {
      const x = startX + i * spacing
      const container = this.add.container(x, y)

      // Photon circle
      const circle = this.add.circle(0, 0, 25, 0x1e293b)
      circle.setStrokeStyle(2, 0x374151)

      // Index label
      const index = this.add.text(0, 45, `#${i + 1}`, {
        fontSize: '10px',
        color: '#64748b',
      }).setOrigin(0.5)

      container.add([circle, index])
      this.photonSprites.push(container)
    })
  }

  createUI() {
    const { width, height } = this.cameras.main

    // Phase indicator
    this.phaseText = this.add.text(width / 2, 160, '', {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#22c55e',
    }).setOrigin(0.5)

    // Instructions
    this.instructionText = this.add.text(width / 2, 190, '', {
      fontSize: '14px',
      color: '#94a3b8',
      align: 'center',
    }).setOrigin(0.5)

    // Score
    this.add.text(20, 20, 'Score:', {
      fontSize: '14px',
      color: '#64748b',
    })
    this.add.text(75, 20, '0', {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#22c55e',
    })

    // Basis legend
    const legendY = height - 60
    this.add.text(width / 2, legendY, '+ Basis: ↑=0, →=1    × Basis: ↗=0, ↘=1', {
      fontSize: '12px',
      color: '#64748b',
    }).setOrigin(0.5)

    // Basis selection buttons (for Bob's phase)
    this.createBasisButtons()
  }

  createBasisButtons() {
    const { width, height } = this.cameras.main
    const y = height - 120

    // + basis button
    const plusBtn = this.add.rectangle(width / 2 - 60, y, 80, 50, 0x1e293b)
    plusBtn.setStrokeStyle(2, 0x3b82f6)
    const plusText = this.add.text(width / 2 - 60, y, '+', {
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#3b82f6',
    }).setOrigin(0.5)

    plusBtn.setInteractive({ useHandCursor: true })
    plusBtn.on('pointerdown', () => this.selectBasis('+'))
    plusBtn.setVisible(false)
    plusText.setVisible(false);
    (plusBtn as any).buttonGroup = true;
    (plusText as any).buttonGroup = true

    // × basis button
    const crossBtn = this.add.rectangle(width / 2 + 60, y, 80, 50, 0x1e293b)
    crossBtn.setStrokeStyle(2, 0xf59e0b)
    const crossText = this.add.text(width / 2 + 60, y, '×', {
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#f59e0b',
    }).setOrigin(0.5)

    crossBtn.setInteractive({ useHandCursor: true })
    crossBtn.on('pointerdown', () => this.selectBasis('×'))
    crossBtn.setVisible(false)
    crossText.setVisible(false);
    (crossBtn as any).buttonGroup = true;
    (crossText as any).buttonGroup = true
  }

  startPhase(phase: 'alice' | 'eve' | 'bob' | 'sift' | 'verify') {
    this.currentPhase = phase
    this.currentIndex = 0

    switch (phase) {
      case 'alice':
        this.phaseText.setText('Phase 1: Alice Sends')
        this.instructionText.setText('Watch as Alice encodes and sends photons...')
        this.time.delayedCall(1000, () => this.animateAliceSend())
        break

      case 'eve':
        if (this.eveActive) {
          this.phaseText.setText('⚠️ Eve Intercepts!')
          this.instructionText.setText('Eve is measuring some photons...')
          this.time.delayedCall(1000, () => this.animateEveIntercept())
        } else {
          this.startPhase('bob')
        }
        break

      case 'bob':
        this.phaseText.setText('Phase 2: Bob Measures')
        this.instructionText.setText('Choose a basis (+ or ×) to measure each photon')
        this.showBasisButtons(true)
        this.highlightCurrentPhoton()
        break

      case 'sift':
        this.phaseText.setText('Phase 3: Sifting')
        this.instructionText.setText('Comparing bases to create shared key...')
        this.showBasisButtons(false)
        this.time.delayedCall(1000, () => this.performSifting())
        break

      case 'verify':
        this.phaseText.setText('Phase 4: Verification')
        this.instructionText.setText('Is there an eavesdropper?')
        this.time.delayedCall(1000, () => this.verifyKey())
        break
    }
  }

  animateAliceSend() {
    const photon = this.photons[this.currentIndex]
    const sprite = this.photonSprites[this.currentIndex]

    // Show Alice's encoding
    const stateSymbol = this.getStateSymbol(photon.bit, photon.aliceBasis)
    
    const circle = sprite.getAt(0) as Phaser.GameObjects.Arc
    circle.setStrokeStyle(2, 0x22c55e)

    const stateText = this.add.text(sprite.x, sprite.y, stateSymbol, {
      fontSize: '24px',
      color: '#22c55e',
    }).setOrigin(0.5)
    sprite.add(stateText)

    const basisLabel = this.add.text(sprite.x, sprite.y + 25, photon.aliceBasis, {
      fontSize: '12px',
      color: photon.aliceBasis === '+' ? '#3b82f6' : '#f59e0b',
    }).setOrigin(0.5)
    sprite.add(basisLabel)

    this.currentIndex++

    if (this.currentIndex < this.numPhotons) {
      this.time.delayedCall(300, () => this.animateAliceSend())
    } else {
      this.time.delayedCall(500, () => this.startPhase('eve'))
    }
  }

  animateEveIntercept() {
    // Eve intercepts ~half the photons
    this.photons.forEach((photon, i) => {
      if (Math.random() > 0.5) {
        photon.eveIntercepted = true
        
        const sprite = this.photonSprites[i]
        const circle = sprite.getAt(0) as Phaser.GameObjects.Arc
        
        // Flash red
        this.tweens.add({
          targets: circle,
          fillColor: { from: 0xef4444, to: 0x1e293b },
          duration: 500,
          delay: i * 100,
        })

        // Eve measures in random basis, potentially changing the state
        const eveBasis = Math.random() > 0.5 ? '+' : '×'
        if (eveBasis !== photon.aliceBasis) {
          // Wrong basis = 50% chance of flipping the bit
          if (Math.random() > 0.5) {
            photon.bit = photon.bit === 0 ? 1 : 0
          }
        }
      }
    })

    this.time.delayedCall(this.numPhotons * 100 + 1000, () => {
      this.startPhase('bob')
    })
  }

  selectBasis(basis: '+' | '×') {
    if (this.currentPhase !== 'bob') return

    const photon = this.photons[this.currentIndex]
    photon.bobBasis = basis
    photon.measured = true

    const sprite = this.photonSprites[this.currentIndex]
    const circle = sprite.getAt(0) as Phaser.GameObjects.Arc

    // Show measurement result
    const measureColor = basis === photon.aliceBasis ? 0x22c55e : 0x64748b
    circle.setStrokeStyle(2, measureColor)

    // Add Bob's basis indicator
    const bobBasis = this.add.text(sprite.x, sprite.y - 30, `B:${basis}`, {
      fontSize: '12px',
      color: basis === '+' ? '#3b82f6' : '#f59e0b',
    }).setOrigin(0.5)
    sprite.add(bobBasis)

    this.currentIndex++

    if (this.currentIndex < this.numPhotons) {
      this.highlightCurrentPhoton()
    } else {
      this.startPhase('sift')
    }
  }

  highlightCurrentPhoton() {
    this.photonSprites.forEach((sprite, i) => {
      const circle = sprite.getAt(0) as Phaser.GameObjects.Arc
      if (i === this.currentIndex) {
        circle.setStrokeStyle(3, 0xfbbf24)
      }
    })
  }

  showBasisButtons(show: boolean) {
    this.children.list
      .filter(child => (child as any).buttonGroup)
      .forEach(child => (child as any).setVisible(show))
  }

  performSifting() {
    this.sharedKey = []

    this.photons.forEach((photon, i) => {
      const sprite = this.photonSprites[i]
      const match = photon.aliceBasis === photon.bobBasis

      if (match) {
        this.sharedKey.push(photon.bit)
        
        // Highlight matching bases
        this.tweens.add({
          targets: sprite,
          scale: 1.2,
          duration: 300,
          delay: i * 200,
          yoyo: true,
        })

        // Add checkmark
        const check = this.add.text(sprite.x, sprite.y - 50, '✓', {
          fontSize: '20px',
          color: '#22c55e',
        }).setOrigin(0.5)
        check.setAlpha(0)
        this.tweens.add({
          targets: check,
          alpha: 1,
          delay: i * 200,
          duration: 200,
        })
      } else {
        // Gray out non-matching
        this.tweens.add({
          targets: sprite,
          alpha: 0.3,
          delay: i * 200,
          duration: 300,
        })
      }
    })

    this.time.delayedCall(this.numPhotons * 200 + 1000, () => {
      this.startPhase('verify')
    })
  }

  verifyKey() {
    // Calculate error rate (errors introduced by Eve)
    let errors = 0
    let checked = 0

    this.photons.forEach(photon => {
      if (photon.aliceBasis === photon.bobBasis && photon.eveIntercepted) {
        checked++
        // Eve's interference may have changed the bit
        if (Math.random() < 0.25) {
          errors++
        }
      }
    })

    this.errorRate = checked > 0 ? errors / checked : 0

    const { width, height } = this.cameras.main

    // Show key
    this.add.text(width / 2, height / 2 + 100, `Shared Key: ${this.sharedKey.join('')}`, {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#22c55e',
      fontFamily: 'monospace',
    }).setOrigin(0.5)

    // Show verdict
    const eveDetected = this.eveActive && this.errorRate > 0.1
    const verdictText = eveDetected ? 
      '⚠️ Eavesdropper detected! High error rate!' : 
      '✓ Channel secure! Key established.'

    this.add.text(width / 2, height / 2 + 140, verdictText, {
      fontSize: '16px',
      color: eveDetected ? '#ef4444' : '#22c55e',
    }).setOrigin(0.5)

    // Score calculation
    this.score = this.sharedKey.length * 10
    if (!eveDetected && !this.eveActive) this.score += 50
    if (eveDetected && this.eveActive) this.score += 30

    const stars = this.score >= 100 ? 3 : this.score >= 60 ? 2 : 1

    // Continue button
    this.time.delayedCall(2000, () => {
      this.scene.start('ResultScene', {
        score: this.score,
        stars,
        keyLength: this.sharedKey.length,
        evePresent: this.eveActive,
        eveDetected,
      })

      this.game.events.emit('level_complete', { score: this.score, stars })
    })
  }

  getStateSymbol(bit: number, basis: '+' | '×'): string {
    if (basis === '+') {
      return bit === 0 ? '↑' : '→'
    } else {
      return bit === 0 ? '↗' : '↘'
    }
  }
}
