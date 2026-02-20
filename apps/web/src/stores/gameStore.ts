import { create } from 'zustand'

interface GameState {
  currentGameSlug: string | null
  currentLevel: number
  score: number
  timeElapsed: number
  isPaused: boolean
  isComplete: boolean
  setCurrentGame: (slug: string | null) => void
  setCurrentLevel: (level: number) => void
  setScore: (score: number) => void
  addScore: (points: number) => void
  setTimeElapsed: (time: number) => void
  incrementTime: () => void
  setPaused: (paused: boolean) => void
  setComplete: (complete: boolean) => void
  resetGame: () => void
}

export const useGameStore = create<GameState>((set) => ({
  currentGameSlug: null,
  currentLevel: 1,
  score: 0,
  timeElapsed: 0,
  isPaused: false,
  isComplete: false,
  setCurrentGame: (slug) => set({ currentGameSlug: slug }),
  setCurrentLevel: (level) => set({ currentLevel: level }),
  setScore: (score) => set({ score }),
  addScore: (points) => set((state) => ({ score: state.score + points })),
  setTimeElapsed: (time) => set({ timeElapsed: time }),
  incrementTime: () => set((state) => ({ timeElapsed: state.timeElapsed + 1 })),
  setPaused: (paused) => set({ isPaused: paused }),
  setComplete: (complete) => set({ isComplete: complete }),
  resetGame: () =>
    set({
      score: 0,
      timeElapsed: 0,
      isPaused: false,
      isComplete: false,
    }),
}))
