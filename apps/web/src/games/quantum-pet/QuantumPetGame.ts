import Phaser from 'phaser'
import { MenuScene } from './scenes/MenuScene'
import { PlayScene } from './scenes/PlayScene'
import { ResultScene } from './scenes/ResultScene'

export const QuantumPetConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1a1a2e',
  scene: [MenuScene, PlayScene, ResultScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
}

export function createQuantumPetGame(
  container: HTMLElement,
  onComplete?: (score: number, stars: number) => void
): Phaser.Game {
  const game = new Phaser.Game({
    ...QuantumPetConfig,
    parent: container,
  })

  if (onComplete) {
    game.events.on('level_complete', (data: { score: number; stars: number }) => {
      onComplete(data.score, data.stars)
    })
  }

  return game
}

export default QuantumPetConfig
