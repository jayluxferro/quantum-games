import Phaser from 'phaser'
import { MenuScene } from './scenes/MenuScene'
import { BuildScene } from './scenes/BuildScene'
import { ResultScene } from './scenes/ResultScene'

export const CircuitArchitectConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#0f172a',
  scene: [MenuScene, BuildScene, ResultScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game-container',
  },
}

export function createCircuitArchitectGame(
  container: HTMLElement,
  onComplete?: (score: number, stars: number) => void
): Phaser.Game {
  const config = {
    ...CircuitArchitectConfig,
    parent: container,
    width: container.clientWidth || 800,
    height: (container.clientWidth || 800) * 0.75,
  }

  const game = new Phaser.Game(config)
  
  game.events.on('level_complete', (data: { score: number; stars: number }) => {
    onComplete?.(data.score, data.stars)
  })

  return game
}
