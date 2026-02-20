import Phaser from 'phaser'
import { MenuScene } from './scenes/MenuScene'
import { TutorialScene } from './scenes/TutorialScene'
import { PlayScene } from './scenes/PlayScene'
import { ResultScene } from './scenes/ResultScene'

export const GroversMazeConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#0a0a1a',
  scene: [MenuScene, TutorialScene, PlayScene, ResultScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game-container',
  },
}

export function createGroversMazeGame(
  container: HTMLElement,
  onComplete?: (score: number, stars: number) => void
): Phaser.Game {
  const config = {
    ...GroversMazeConfig,
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
