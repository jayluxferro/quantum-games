const API_BASE = import.meta.env.VITE_API_URL || '/api'

interface ApiOptions extends RequestInit {
  token?: string
}

async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
}

export const api = {
  health: {
    check: () => apiRequest<{ status: string }>('/health'),
  },

  games: {
    list: (params?: { education_level?: string; multiplayer?: boolean }) => {
      const searchParams = new URLSearchParams()
      if (params?.education_level) searchParams.set('education_level', params.education_level)
      if (params?.multiplayer !== undefined) searchParams.set('multiplayer', String(params.multiplayer))
      const query = searchParams.toString()
      return apiRequest<Game[]>(`/games${query ? `?${query}` : ''}`)
    },
    get: (slug: string) => apiRequest<GameDetail>(`/games/${slug}`),
    getLevels: (slug: string) => apiRequest<Level[]>(`/games/${slug}/levels`),
    getConcepts: () => apiRequest<string[]>('/games/concepts'),
  },

  progress: {
    getForGame: (slug: string, token: string) =>
      apiRequest<Progress[]>(`/progress/game/${slug}`, { token }),
    getForLevel: (levelId: string, token: string) =>
      apiRequest<Progress | null>(`/progress/level/${levelId}`, { token }),
    complete: (levelId: string, data: ProgressUpdate, token: string) =>
      apiRequest<Progress>(`/progress/level/${levelId}/complete`, {
        method: 'POST',
        body: JSON.stringify(data),
        token,
      }),
    startSession: (gameSlug: string, mode: string, token: string) =>
      apiRequest<GameSession>('/progress/sessions', {
        method: 'POST',
        body: JSON.stringify({ game_slug: gameSlug, mode }),
        token,
      }),
  },

  users: {
    me: (token: string) => apiRequest<User>('/users/me', { token }),
    updateMe: (data: UserUpdate, token: string) =>
      apiRequest<User>('/users/me', {
        method: 'PUT',
        body: JSON.stringify(data),
        token,
      }),
    stats: (token: string) => apiRequest<UserStats>('/users/me/stats', { token }),
  },

  achievements: {
    list: () => apiRequest<Achievement[]>('/achievements'),
    mine: (token: string) => apiRequest<UserAchievement[]>('/achievements/me', { token }),
    check: (token: string) =>
      apiRequest<{ new_achievements: Achievement[] }>('/achievements/check', {
        method: 'POST',
        token,
      }),
  },

  quantum: {
    simulate: (circuit: CircuitRequest) =>
      apiRequest<CircuitResponse>('/quantum/simulate', {
        method: 'POST',
        body: JSON.stringify(circuit),
      }),
    verify: (data: VerifyRequest) =>
      apiRequest<VerifyResponse>('/quantum/verify', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    gates: () => apiRequest<GatesInfo>('/quantum/gates'),
    concept: (name: string) => apiRequest<ConceptInfo>(`/quantum/concepts/${name}`),
  },
}

export interface Game {
  id: string
  slug: string
  name: string
  description: string | null
  target_level: string
  min_age: number
  max_age: number | null
  thumbnail_url: string | null
  quantum_concepts: string[]
  multiplayer_enabled: boolean
  supported_modes: string[]
}

export interface GameDetail extends Game {
  levels: Level[]
  config: Record<string, unknown>
}

export interface Level {
  id: string
  sequence: number
  title: string
  description: string | null
  objectives: string[]
  quantum_concepts: string[]
  difficulty: number
  estimated_minutes: number
  xp_reward: number
}

export interface Progress {
  id: string
  level_id: string
  score: number
  max_score: number | null
  stars: number
  attempts: number
  best_time_seconds: number | null
  completed: boolean
  completed_at: string | null
}

export interface ProgressUpdate {
  score: number
  time_seconds?: number
  solution?: Record<string, unknown>
}

export interface GameSession {
  id: string
  game_id: string
  mode: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
}

export interface User {
  id: string
  username: string
  email: string
  display_name: string | null
  education_level: string
  total_xp: number
  created_at: string
}

export interface UserUpdate {
  display_name?: string
  education_level?: string
  preferences?: Record<string, unknown>
}

export interface UserStats {
  user_id: string
  total_xp: number
  total_attempts: number
  total_score: number
  completed_levels: number
  total_stars: number
  achievements_earned: number
}

export interface Achievement {
  id: string
  slug: string
  name: string
  description: string | null
  icon_url: string | null
  achievement_type: string
  xp_reward: number
  is_hidden: boolean
}

export interface UserAchievement {
  id: string
  achievement: Achievement
  earned_at: string
}

export interface CircuitRequest {
  num_qubits: number
  operations: GateOperation[]
  shots?: number
}

export interface GateOperation {
  gate: string
  qubits: number[]
  params?: number[]
}

export interface CircuitResponse {
  success: boolean
  counts: Record<string, number>
  probabilities: Record<string, number>
  statevector?: number[]
}

export interface VerifyRequest {
  num_qubits: number
  operations: GateOperation[]
  target_state: Record<string, number>
  tolerance?: number
}

export interface VerifyResponse {
  success: boolean
  matches: boolean
  actual_probabilities: Record<string, number>
  target_probabilities: Record<string, number>
  score: number
}

export interface GatesInfo {
  single_qubit: GateInfo[]
  two_qubit: GateInfo[]
  three_qubit: GateInfo[]
  measurement: GateInfo[]
}

export interface GateInfo {
  name: string
  description: string
  params?: string[]
}

export interface ConceptInfo {
  name: string
  description: string
  analogy: string
  gates: string[]
  examples: {
    description: string
    circuit: CircuitRequest
  }[]
}
