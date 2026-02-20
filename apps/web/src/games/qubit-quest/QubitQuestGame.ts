import Phaser from 'phaser'
import { MenuScene } from './scenes/MenuScene'
import { PlayScene } from './scenes/PlayScene'
import { ResultScene } from './scenes/ResultScene'

export const QubitQuestConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#0a0a1a',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [MenuScene, PlayScene, ResultScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game-container',
  },
}

export function createQubitQuestGame(
  container: HTMLElement,
  onComplete?: (score: number, stars: number) => void
): Phaser.Game {
  const config = {
    ...QubitQuestConfig,
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
