import Phaser from 'phaser'
import { MenuScene } from './scenes/MenuScene'
import { ExploreScene } from './scenes/ExploreScene'
import { ChallengeScene } from './scenes/ChallengeScene'
import { ResultScene } from './scenes/ResultScene'

export const BlochExplorerConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#0f0f1a',
  scene: [MenuScene, ExploreScene, ChallengeScene, ResultScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game-container',
  },
}

export function createBlochExplorerGame(
  container: HTMLElement,
  onComplete?: (score: number, stars: number) => void
): Phaser.Game {
  const config = {
    ...BlochExplorerConfig,
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
