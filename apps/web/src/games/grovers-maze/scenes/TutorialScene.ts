import Phaser from 'phaser'

export class TutorialScene extends Phaser.Scene {
  private currentStep: number = 0

  private steps = [
    {
      title: "Grover's Search Algorithm",
      content: 
        "Imagine searching for one marked item among N items.\n\n" +
        "Classical: Check each item one by one → O(N) steps\n" +
        "Quantum: Use superposition and interference → O(√N) steps",
    },
    {
      title: 'Step 1: Superposition',
      content:
        "Start by putting all qubits in superposition using Hadamard gates.\n\n" +
        "This creates an equal probability of finding ANY path:\n" +
        "|ψ⟩ = (|0000⟩ + |0001⟩ + ... + |1111⟩) / √N",
    },
    {
      title: 'Step 2: Oracle',
      content:
        "The oracle 'marks' the correct answer by flipping its phase.\n\n" +
        "If |w⟩ is the marked state: |w⟩ → -|w⟩\n" +
        "Other states remain unchanged.\n\n" +
        "In the maze: The exit is our marked state!",
    },
    {
      title: 'Step 3: Diffusion',
      content:
        "The diffusion operator amplifies the marked state.\n\n" +
        "It reflects amplitudes about the average, making the\n" +
        "negative (marked) amplitude become positive and large.\n\n" +
        "This is the key to quantum speedup!",
    },
    {
      title: 'Step 4: Iterate',
      content:
        "Repeat oracle + diffusion approximately √N times.\n\n" +
        "Each iteration amplifies the correct answer.\n" +
        "Too few: not enough amplification\n" +
        "Too many: amplitude decreases again!\n\n" +
        "For N=16 paths: ~3-4 iterations are optimal",
    },
    {
      title: 'Your Mission',
      content:
        "In Grover\'s Maze, you will:\n\n" +
        "1. Set up superposition over all paths\n" +
        "2. Apply the oracle to mark the exit\n" +
        "3. Use diffusion to amplify the correct path\n" +
        "4. Measure to find the exit!\n\n" +
        "Can you find the exit faster than classical search?",
    },
  ]

  constructor() {
    super({ key: 'TutorialScene' })
  }

  create() {
    const { width, height } = this.cameras.main
    const centerX = width / 2

    // Background
    this.add.rectangle(centerX, height / 2, width, height, 0x0a0a1a)

    // Title area
    this.add.text(centerX, 30, 'How Grover\'s Algorithm Works', {
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#f59e0b',
    }).setOrigin(0.5)

    // Show initial step
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
      color: '#f59e0b',
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

    // Progress dots
    for (let i = 0; i < this.steps.length; i++) {
      this.add.circle(
        centerX - 50 + i * 20,
        height - 70,
        4,
        i === 0 ? 0xf59e0b : 0x374151
      )
    }
  }

  showStep(index: number) {
    const { width, height } = this.cameras.main
    const step = this.steps[index]

    // Clear previous content
    this.children.list
      .filter((child) => (child as any).stepContent)
      .forEach((child) => child.destroy())

    // Step title
    const title = this.add.text(width / 2, 80, step.title, {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    (title as any).stepContent = true

    // Step content
    const content = this.add.text(width / 2, height / 2, step.content, {
      fontSize: '14px',
      color: '#94a3b8',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);
    (content as any).stepContent = true

    // Visual for specific steps
    this.showVisual(index, width / 2, height / 2 + 150)
  }

  showVisual(step: number, x: number, y: number) {
    if (step === 1) {
      // Superposition visualization
      const states = ['|0⟩', '|1⟩', '|2⟩', '...', '|N⟩']
      states.forEach((state, i) => {
        const sx = x - 100 + i * 50
        const text = this.add.text(sx, y, state, {
          fontSize: '14px',
          color: '#f59e0b',
        }).setOrigin(0.5);
        (text as any).stepContent = true

        // Equal superposition waves
        this.tweens.add({
          targets: text,
          y: y - 5,
          duration: 500,
          yoyo: true,
          repeat: -1,
          delay: i * 100,
        })
      })
    } else if (step === 2) {
      // Oracle visualization
      const states = ['+', '+', '-', '+', '+']
      states.forEach((sign, i) => {
        const sx = x - 80 + i * 40
        const color = sign === '-' ? 0xef4444 : 0x22c55e
        const text = this.add.text(sx, y, sign, {
          fontSize: '24px',
          fontStyle: 'bold',
          color: `#${color.toString(16).padStart(6, '0')}`,
        }).setOrigin(0.5);
        (text as any).stepContent = true
      })

      const label = this.add.text(x, y + 30, 'Marked state gets negative phase', {
        fontSize: '12px',
        color: '#64748b',
      }).setOrigin(0.5);
      (label as any).stepContent = true
    } else if (step === 3) {
      // Diffusion visualization - bar chart
      const bars = [0.2, 0.2, 0.8, 0.2, 0.2]
      bars.forEach((h, i) => {
        const bx = x - 80 + i * 40
        const barHeight = h * 60
        const bar = this.add.rectangle(
          bx, y - barHeight / 2,
          20, barHeight,
          i === 2 ? 0xf59e0b : 0x374151
        );
        (bar as any).stepContent = true
      })

      const label = this.add.text(x, y + 40, 'Amplitude of marked state increases', {
        fontSize: '12px',
        color: '#64748b',
      }).setOrigin(0.5);
      (label as any).stepContent = true
    }
  }

  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++
      this.showStep(this.currentStep)
    } else {
      this.scene.start('PlayScene')
    }
  }

  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--
      this.showStep(this.currentStep)
    }
  }
}
