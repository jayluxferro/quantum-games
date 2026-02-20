export type EducationLevel =
  | 'basic_school'
  | 'junior_high'
  | 'senior_high'
  | 'undergraduate'
  | 'postgraduate'
  | 'researcher'

export type GameMode = 'single_player' | 'turn_based' | 'real_time' | 'cooperative'

export type AchievementType = 'progress' | 'skill' | 'challenge' | 'social'

export interface User {
  id: string
  keycloak_id: string
  username: string
  email: string
  display_name?: string
  education_level: EducationLevel
  preferences: Record<string, unknown>
  total_xp: number
  created_at: string
  updated_at: string
  last_login_at?: string
}

export interface Game {
  id: string
  slug: string
  name: string
  description?: string
  target_level: EducationLevel
  min_age: number
  max_age?: number
  thumbnail_url?: string
  config: Record<string, unknown>
  quantum_concepts: string[]
  multiplayer_enabled: boolean
  supported_modes: GameMode[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Level {
  id: string
  game_id: string
  sequence: number
  title: string
  description?: string
  objectives: string[]
  quantum_concepts: string[]
  difficulty: number
  estimated_minutes: number
  xp_reward: number
  config: Record<string, unknown>
  is_active: boolean
  created_at: string
}

export interface Progress {
  id: string
  user_id: string
  level_id: string
  score: number
  max_score?: number
  stars: number
  attempts: number
  best_time_seconds?: number
  best_solution?: Record<string, unknown>
  completed: boolean
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface GameSession {
  id: string
  game_id: string
  user_id?: string
  room_id?: string
  mode: GameMode
  state: Record<string, unknown>
  metadata: Record<string, unknown>
  started_at: string
  ended_at?: string
  duration_seconds?: number
}

export interface Achievement {
  id: string
  slug: string
  name: string
  description?: string
  icon_url?: string
  achievement_type: AchievementType
  xp_reward: number
  criteria: Record<string, unknown>
  is_hidden: boolean
  created_at: string
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  earned_at: string
  metadata: Record<string, unknown>
}

export interface Course {
  id: string
  external_id?: string
  lms_type?: string
  name: string
  description?: string
  teacher_id?: string
  education_level?: EducationLevel
  settings: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Enrollment {
  id: string
  course_id: string
  user_id: string
  role: string
  enrolled_at: string
}

export interface LTIPlatform {
  id: string
  name: string
  issuer: string
  client_id: string
  deployment_id?: string
  auth_endpoint: string
  token_endpoint: string
  jwks_endpoint: string
  is_active: boolean
  created_at: string
}

export interface ApiError {
  detail: string
  status_code?: number
}
