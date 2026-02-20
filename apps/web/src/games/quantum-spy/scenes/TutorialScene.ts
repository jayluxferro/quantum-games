import Phaser from 'phaser'

export class TutorialScene extends Phaser.Scene {
  private currentStep: number = 0
  private stepTexts: Phaser.GameObjects.Text[] = []

  private steps = [
    {
      title: 'Step 1: Encoding',
      content: 'Alice (sender) chooses random bits (0 or 1) and random bases (+ or ×).\n\n+ basis: 0 = ↑, 1 = →\n× basis: 0 = ↗, 1 = ↘',
      highlight: 'encoding',
    },
    {
      title: 'Step 2: Transmission',
      content: 'Alice sends photons through the quantum channel.\nEach photon is polarized according to her bit and basis choices.',
      highlight: 'channel',
    },
    {
      title: 'Step 3: Measurement',
      content: 'Bob (receiver) randomly chooses a basis to measure each photon.\nIf Bob\'s basis matches Alice\'s, he gets the correct bit!\nIf they don\'t match, his result is random.',
      highlight: 'measure',
    },
    {
      title: 'Step 4: Sifting',
      content: 'Alice and Bob publicly compare their basis choices (not the bits!).\nThey keep only the bits where they used the same basis.\nThis becomes their shared secret key.',
      highlight: 'sift',
    },
    {
      title: 'Detecting Eve!',
      content: 'If an eavesdropper (Eve) intercepts photons, she must measure them.\nThis disturbs the quantum states and introduces errors.\nAlice and Bob compare a sample of their key - errors reveal Eve!',
      highlight: 'eve',
    },
  ]

  constructor() {
    super({ key: 'TutorialScene' })
  }

  create() {
    const { width, height } = this.cameras.main
    const centerX = width / 2

    // Background
    this.add.rectangle(centerX, height / 2, width, height, 0x0a0f0a)

    // Title
    this.add.text(centerX, 30, 'BB84 Protocol Tutorial', {
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#22c55e',
    }).setOrigin(0.5)

    // Content area
    this.showStep(0)

    // Navigation
    const prevBtn = this.add.text(100, height - 40, '← Previous', {
      fontSize: '16px',
      color: '#64748b',
    }).setOrigin(0.5)
    prevBtn.setInteractive({ useHandCursor: true })
    prevBtn.on('pointerdown', () => this.prevStep())

    const nextBtn = this.add.text(width - 100, height - 40, 'Next →', {
      fontSize: '16px',
      color: '#22c55e',
    }).setOrigin(0.5)
    nextBtn.setInteractive({ useHandCursor: true })
    nextBtn.on('pointerdown', () => this.nextStep())

    // Skip button
    const skipBtn = this.add.text(centerX, height - 40, 'Skip to Game', {
      fontSize: '14px',
      color: '#64748b',
    }).setOrigin(0.5)
    skipBtn.setInteractive({ useHandCursor: true })
    skipBtn.on('pointerdown', () => this.scene.start('PlayScene'))

    // Step indicators
    for (let i = 0; i < this.steps.length; i++) {
      const dot = this.add.circle(
        centerX - 40 + i * 20,
        height - 70,
        5,
        i === 0 ? 0x22c55e : 0x374151
      )
      this.stepTexts.push(dot as any)
    }
  }

  showStep(index: number) {
    const { width, height } = this.cameras.main
    const centerX = width / 2
    const step = this.steps[index]

    // Clear previous
    this.children.list
      .filter(child => (child as any).stepContent)
      .forEach(child => child.destroy())

    // Title
    const title = this.add.text(centerX, 80, step.title, {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    (title as any).stepContent = true

    // Content
    const content = this.add.text(centerX, 150, step.content, {
      fontSize: '14px',
      color: '#94a3b8',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5, 0);
    (content as any).stepContent = true

    // Visual demonstration
    this.showVisual(step.highlight, centerX, 320)
  }

  showVisual(type: string, centerX: number, y: number) {
    const { width } = this.cameras.main

    switch (type) {
      case 'encoding':
        // Show bit-to-polarization mapping
        const encodingData = [
          { bit: '0', basis: '+', state: '↑' },
          { bit: '1', basis: '+', state: '→' },
          { bit: '0', basis: '×', state: '↗' },
          { bit: '1', basis: '×', state: '↘' },
        ]
        encodingData.forEach((d, i) => {
          const x = centerX - 150 + i * 100
          const box = this.add.rectangle(x, y, 70, 80, 0x1e293b)
          box.setStrokeStyle(1, 0x374151);
          (box as any).stepContent = true

          const bitText = this.add.text(x, y - 25, `Bit: ${d.bit}`, {
            fontSize: '12px',
            color: '#64748b',
          }).setOrigin(0.5);
          (bitText as any).stepContent = true

          const basisText = this.add.text(x, y, `${d.basis}`, {
            fontSize: '14px',
            color: d.basis === '+' ? '#3b82f6' : '#f59e0b',
          }).setOrigin(0.5);
          (basisText as any).stepContent = true

          const stateText = this.add.text(x, y + 25, d.state, {
            fontSize: '28px',
            color: '#22c55e',
          }).setOrigin(0.5);
          (stateText as any).stepContent = true
        })
        break

      case 'channel':
        // Show photon traveling
        const photon = this.add.circle(100, y, 10, 0x22c55e);
        (photon as any).stepContent = true
        
        const line = this.add.graphics();
        (line as any).stepContent = true
        line.lineStyle(2, 0x374151)
        line.lineBetween(100, y, width - 100, y)

        this.add.text(60, y, 'Alice', { fontSize: '12px', color: '#64748b' }).setOrigin(0.5);
        this.add.text(width - 60, y, 'Bob', { fontSize: '12px', color: '#64748b' }).setOrigin(0.5);

        this.tweens.add({
          targets: photon,
          x: width - 100,
          duration: 2000,
          repeat: -1,
        })
        break

      case 'measure':
        // Show measurement scenarios
        const scenarios = [
          { alice: '+', bob: '+', result: '✓ Same basis = Correct bit' },
          { alice: '+', bob: '×', result: '✗ Different = Random' },
        ]
        scenarios.forEach((s, i) => {
          const yPos = y - 30 + i * 60
          this.add.text(centerX - 150, yPos, `Alice: ${s.alice}`, {
            fontSize: '14px',
            color: '#3b82f6',
          });
          this.add.text(centerX, yPos, `Bob: ${s.bob}`, {
            fontSize: '14px',
            color: '#f59e0b',
          });
          this.add.text(centerX + 100, yPos, s.result, {
            fontSize: '12px',
            color: i === 0 ? '#22c55e' : '#ef4444',
          })
        })
        break

      case 'sift':
        // Show sifting process
        const bits = ['1', '0', '1', '1', '0', '0', '1', '0']
        const aliceBases = ['+', '×', '+', '×', '+', '×', '+', '×']
        const bobBases = ['+', '+', '×', '×', '+', '×', '×', '+']

        bits.forEach((bit, i) => {
          const x = centerX - 175 + i * 50
          const match = aliceBases[i] === bobBases[i]
          
          const col = this.add.rectangle(x, y, 40, 100, match ? 0x22c55e : 0x374151, 0.2);
          (col as any).stepContent = true

          this.add.text(x, y - 35, bit, {
            fontSize: '14px',
            color: match ? '#22c55e' : '#64748b',
          }).setOrigin(0.5)

          this.add.text(x, y, aliceBases[i], {
            fontSize: '12px',
            color: '#3b82f6',
          }).setOrigin(0.5)

          this.add.text(x, y + 20, bobBases[i], {
            fontSize: '12px',
            color: '#f59e0b',
          }).setOrigin(0.5)

          this.add.text(x, y + 40, match ? '✓' : '✗', {
            fontSize: '14px',
            color: match ? '#22c55e' : '#ef4444',
          }).setOrigin(0.5)
        })
        break

      case 'eve':
        // Show Eve interception
        const eveY = y
        this.add.text(centerX - 150, eveY - 20, '👤 Alice', { fontSize: '14px', color: '#22c55e' }).setOrigin(0.5)
        this.add.text(centerX, eveY - 20, '🕵️ Eve', { fontSize: '14px', color: '#ef4444' }).setOrigin(0.5)
        this.add.text(centerX + 150, eveY - 20, '👤 Bob', { fontSize: '14px', color: '#22c55e' }).setOrigin(0.5)

        const eveLine = this.add.graphics();
        (eveLine as any).stepContent = true
        eveLine.lineStyle(2, 0xef4444)
        eveLine.lineBetween(centerX - 100, eveY + 20, centerX + 100, eveY + 20)

        this.add.text(centerX, eveY + 50, 'Eve\'s measurement disturbs the photons\n→ Errors appear in the key!', {
          fontSize: '12px',
          color: '#ef4444',
          align: 'center',
        }).setOrigin(0.5)
        break
    }
  }

  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++
      this.showStep(this.currentStep)
      this.updateIndicators()
    } else {
      this.scene.start('PlayScene')
    }
  }

  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--
      this.showStep(this.currentStep)
      this.updateIndicators()
    }
  }

  updateIndicators() {
    // Would update step indicator dots
  }
}
