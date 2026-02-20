import Phaser from 'phaser'
import { MenuScene } from './scenes/MenuScene'
import { PlayScene } from './scenes/PlayScene'
import { ResultScene } from './scenes/ResultScene'

export const EntanglementPairsConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#0f172a',
  scene: [MenuScene, PlayScene, ResultScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
}

export function createEntanglementPairsGame(
  container: HTMLElement,
  onComplete?: (score: number, stars: number) => void
): Phaser.Game {
  const game = new Phaser.Game({
    ...EntanglementPairsConfig,
    parent: container,
  })

  if (onComplete) {
    game.events.on('level_complete', (data: { score: number; stars: number }) => {
      onComplete(data.score, data.stars)
    })
  }

  return game
}

export default EntanglementPairsConfig
