import { createQuantumPetGame } from './quantum-pet'
import { createProbabilityPlaygroundGame } from './probability-playground'
import { createCoinFlipGame } from './coin-flip-quest'
import { createQubitQuestGame } from './qubit-quest'
import { createEntanglementPairsGame } from './entanglement-pairs'
import { createGatePuzzleGame } from './gate-puzzle'
import { createCircuitArchitectGame } from './circuit-architect'
import { createQuantumSpyGame } from './quantum-spy'
import { createBlochExplorerGame } from './bloch-explorer'
import { createGroversMazeGame } from './grovers-maze'
import { createDeutschChallengeGame } from './deutsch-challenge'
import { createProtocolLabGame } from './protocol-lab'
import { createErrorCorrectionGame } from './error-correction-sandbox'
import { createResearchSimulatorGame } from './research-simulator'

export type GameFactory = (
  container: HTMLElement,
  onComplete?: (score: number, stars: number) => void
) => Phaser.Game

export const games: Record<string, GameFactory> = {
  // Basic School
  'quantum-pet': createQuantumPetGame,
  'probability-playground': createProbabilityPlaygroundGame,
  'coin-flip-quest': createCoinFlipGame,
  
  // Junior High
  'qubit-quest': createQubitQuestGame,
  'entanglement-pairs': createEntanglementPairsGame,
  'gate-puzzle': createGatePuzzleGame,
  
  // Senior High
  'circuit-architect': createCircuitArchitectGame,
  'quantum-spy': createQuantumSpyGame,
  'bloch-explorer': createBlochExplorerGame,
  'bloch-sphere-explorer': createBlochExplorerGame,
  
  // Undergraduate
  'grovers-maze': createGroversMazeGame,
  'deutsch-challenge': createDeutschChallengeGame,
  'qkd-protocol-lab': createProtocolLabGame,
  
  // Postgraduate
  'protocol-lab': createProtocolLabGame,
  'protocol-designer': createProtocolLabGame,
  'error-correction-sandbox': createErrorCorrectionGame,
  
  // Researcher
  'research-simulator': createResearchSimulatorGame,
}

export function createGame(
  slug: string,
  container: HTMLElement,
  onComplete?: (score: number, stars: number) => void
): Phaser.Game | null {
  const factory = games[slug]
  if (!factory) {
    console.warn(`Game "${slug}" not found`)
    return null
  }
  return factory(container, onComplete)
}

export { createQuantumPetGame } from './quantum-pet'
export { createProbabilityPlaygroundGame } from './probability-playground'
export { createCoinFlipGame } from './coin-flip-quest'
export { createQubitQuestGame } from './qubit-quest'
export { createEntanglementPairsGame } from './entanglement-pairs'
export { createGatePuzzleGame } from './gate-puzzle'
export { createCircuitArchitectGame } from './circuit-architect'
export { createQuantumSpyGame } from './quantum-spy'
export { createBlochExplorerGame } from './bloch-explorer'
export { createGroversMazeGame } from './grovers-maze'
export { createDeutschChallengeGame } from './deutsch-challenge'
export { createProtocolLabGame } from './protocol-lab'
export { createErrorCorrectionGame } from './error-correction-sandbox'
export { createResearchSimulatorGame } from './research-simulator'
