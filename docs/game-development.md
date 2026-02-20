# Game Development Guide

## Overview

Quantum Games uses **Phaser.js 3** for game development. Games are organized as scenes within the React application.

## Directory Structure

```
apps/web/src/games/
├── shared/              # Shared game components
│   ├── QuantumSprite.ts
│   ├── CircuitRenderer.ts
│   └── BlochVisualizer.ts
├── quantum-pet/         # Basic School game
│   ├── QuantumPetGame.ts
│   ├── scenes/
│   │   ├── MainScene.ts
│   │   ├── PlayScene.ts
│   │   └── ResultScene.ts
│   └── assets/
└── circuit-architect/   # Senior High game
    └── ...
```

## Creating a New Game

### 1. Create Game Directory

```bash
mkdir -p apps/web/src/games/my-game/scenes
```

### 2. Create Main Game File

```typescript
// apps/web/src/games/my-game/MyGame.ts
import Phaser from 'phaser'
import { MainScene } from './scenes/MainScene'
import { PlayScene } from './scenes/PlayScene'

export const MyGameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 800,
  height: 600,
  backgroundColor: '#1a1a2e',
  scene: [MainScene, PlayScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
}

export function createMyGame(container: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    ...MyGameConfig,
    parent: container,
  })
}
```

### 3. Create Scenes

```typescript
// apps/web/src/games/my-game/scenes/MainScene.ts
import Phaser from 'phaser'

export class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' })
  }

  preload() {
    // Load assets
    this.load.image('qubit', '/assets/qubit.png')
  }

  create() {
    // Initialize game objects
    this.add.text(400, 300, 'My Quantum Game', {
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5)

    // Start button
    const startBtn = this.add.text(400, 400, 'Start', {
      fontSize: '24px',
      color: '#00ff00',
    }).setOrigin(0.5).setInteractive()

    startBtn.on('pointerdown', () => {
      this.scene.start('PlayScene')
    })
  }
}
```

### 4. Integrate with React

```tsx
// apps/web/src/components/GameWrapper.tsx
import { useEffect, useRef } from 'react'
import { createMyGame } from '@/games/my-game/MyGame'
import { useGameStore } from '@/stores/gameStore'

export function GameWrapper({ gameSlug }: { gameSlug: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const { setScore, setComplete } = useGameStore()

  useEffect(() => {
    if (!containerRef.current) return

    // Create game instance
    gameRef.current = createMyGame(containerRef.current)

    // Listen for game events
    gameRef.current.events.on('score', (score: number) => {
      setScore(score)
    })

    gameRef.current.events.on('complete', () => {
      setComplete(true)
    })

    return () => {
      gameRef.current?.destroy(true)
    }
  }, [gameSlug])

  return <div ref={containerRef} className="game-container" />
}
```

## Using Quantum Simulation

### Browser-Side (quantum-sim package)

```typescript
import { QuantumCircuit, BlochSphere, gates } from '@quantum-games/quantum-sim'

// Create a circuit
const circuit = new QuantumCircuit(2)
circuit.h(0)        // Hadamard on qubit 0
circuit.cnot(0, 1)  // CNOT creating entanglement

// Simulate
const result = circuit.simulate()
console.log(result.probabilities)
// { "00": 0.5, "11": 0.5 }

// Measure
const counts = circuit.measure(1000)
// { "00": 498, "11": 502 }
```

### Bloch Sphere Visualization

```typescript
import { BlochSphere } from '@quantum-games/quantum-sim'

// Get coordinates for visualization
const state = { 
  alpha: { real: 0.707, imag: 0 }, 
  beta: { real: 0.707, imag: 0 } 
}
const coords = BlochSphere.stateToCoordinates(state)
// { x: 1, y: 0, z: 0, theta: π/2, phi: 0 }

// Apply gate
const newState = BlochSphere.applyGate(state, 'H')
```

## Game Design Guidelines

### For Basic School (Ages 6-10)

- Large, colorful graphics
- Simple tap/click interactions
- Immediate visual feedback
- No text-heavy instructions
- Celebration animations

### For Junior High (Ages 11-14)

- Puzzle-based challenges
- Clear objectives
- Progressive difficulty
- Tutorial system
- Optional hints

### For Senior High+ (Ages 15+)

- Circuit building mechanics
- Mathematical accuracy
- Real quantum concepts
- Performance scoring
- Sandbox mode

## Quantum Concepts by Level

| Level | Concepts to Include |
|-------|---------------------|
| Basic | Superposition (visual), Measurement (observation) |
| Junior | Qubits, X gate, H gate, Basic entanglement |
| Senior | All gates, Circuits, Bloch sphere, BB84 |
| Undergrad | Algorithms, Full circuits, Error analysis |
| Postgrad | Custom protocols, Research tools |

## Testing Games

```bash
# Run development server with hot reload
cd apps/web
pnpm dev

# Open game in browser
# http://localhost:5173/play/my-game
```

## Submitting Scores

Games should emit events for score tracking:

```typescript
// In your Phaser scene
this.events.emit('level_complete', {
  score: 85,
  stars: 2,
  timeSeconds: 45,
  solution: circuit.toJSON(),
})
```

The React wrapper handles API submission.
