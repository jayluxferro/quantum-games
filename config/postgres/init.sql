-- Quantum Games Platform - Database Initialization
-- This script runs on first PostgreSQL container startup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create enum types
CREATE TYPE education_level AS ENUM (
    'basic_school',
    'junior_high',
    'senior_high',
    'undergraduate',
    'postgraduate',
    'researcher'
);

CREATE TYPE game_mode AS ENUM (
    'single_player',
    'turn_based',
    'real_time',
    'cooperative'
);

CREATE TYPE achievement_type AS ENUM (
    'progress',
    'skill',
    'challenge',
    'social'
);

-- Users table (synced with Keycloak)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keycloak_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    education_level education_level DEFAULT 'basic_school',
    preferences JSONB DEFAULT '{}',
    total_xp INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_level education_level NOT NULL,
    min_age INTEGER DEFAULT 6,
    max_age INTEGER,
    thumbnail_url VARCHAR(500),
    config JSONB DEFAULT '{}',
    quantum_concepts TEXT[] DEFAULT '{}',
    multiplayer_enabled BOOLEAN DEFAULT false,
    supported_modes game_mode[] DEFAULT '{single_player}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Levels table
CREATE TABLE IF NOT EXISTS levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    objectives JSONB DEFAULT '[]',
    quantum_concepts JSONB DEFAULT '[]',
    difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 10),
    estimated_minutes INTEGER DEFAULT 5,
    xp_reward INTEGER DEFAULT 10,
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, sequence)
);

-- User progress table
CREATE TABLE IF NOT EXISTS progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level_id UUID NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    max_score INTEGER,
    stars INTEGER DEFAULT 0 CHECK (stars BETWEEN 0 AND 3),
    attempts INTEGER DEFAULT 0,
    best_time_seconds INTEGER,
    best_solution JSONB,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, level_id)
);

-- Game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    room_id VARCHAR(255),
    mode game_mode NOT NULL DEFAULT 'single_player',
    state JSONB DEFAULT '{}',
    session_metadata JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER
);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    achievement_type achievement_type NOT NULL,
    xp_reward INTEGER DEFAULT 0,
    criteria JSONB NOT NULL DEFAULT '{}',
    is_hidden BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User achievements junction table
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    achievement_metadata JSONB DEFAULT '{}',
    UNIQUE(user_id, achievement_id)
);

-- Courses table (for LMS integration)
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255),
    lms_type VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    education_level education_level,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Course enrollments
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'student',
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, user_id)
);

-- Course assignments (linking games/levels to courses)
CREATE TABLE IF NOT EXISTS course_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    level_id UUID REFERENCES levels(id) ON DELETE CASCADE,
    title VARCHAR(255),
    due_date TIMESTAMP WITH TIME ZONE,
    max_attempts INTEGER,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (game_id IS NOT NULL OR level_id IS NOT NULL)
);

-- LTI platforms table
CREATE TABLE IF NOT EXISTS lti_platforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    issuer VARCHAR(500) NOT NULL UNIQUE,
    client_id VARCHAR(255) NOT NULL,
    deployment_id VARCHAR(255),
    auth_endpoint VARCHAR(500) NOT NULL,
    token_endpoint VARCHAR(500) NOT NULL,
    jwks_endpoint VARCHAR(500) NOT NULL,
    public_key TEXT,
    private_key TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_keycloak_id ON users(keycloak_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_education_level ON users(education_level);

CREATE INDEX idx_games_slug ON games(slug);
CREATE INDEX idx_games_target_level ON games(target_level);
CREATE INDEX idx_games_active ON games(is_active) WHERE is_active = true;

CREATE INDEX idx_levels_game_id ON levels(game_id);
CREATE INDEX idx_levels_sequence ON levels(game_id, sequence);

CREATE INDEX idx_progress_user_id ON progress(user_id);
CREATE INDEX idx_progress_level_id ON progress(level_id);
CREATE INDEX idx_progress_completed ON progress(user_id, completed) WHERE completed = true;

CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX idx_game_sessions_game_id ON game_sessions(game_id);
CREATE INDEX idx_game_sessions_room_id ON game_sessions(room_id);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);

CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX idx_enrollments_user_id ON enrollments(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progress_updated_at
    BEFORE UPDATE ON progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default games data
INSERT INTO games (slug, name, description, target_level, min_age, quantum_concepts, multiplayer_enabled, supported_modes) VALUES
    ('quantum-pet', 'Quantum Pet', 'Help a quantum pet that exists in multiple states until observed! Learn about superposition through caring for your special friend.', 'basic_school', 6, ARRAY['superposition', 'measurement', 'probability'], false, ARRAY['single_player']::game_mode[]),
    ('probability-playground', 'Probability Playground', 'Explore quantum probability with colorful balls and fun experiments!', 'basic_school', 6, ARRAY['probability', 'measurement', 'randomness'], false, ARRAY['single_player']::game_mode[]),
    ('coin-flip-quest', 'Coin Flip Quest', 'Compare classical coins to quantum coins and discover the difference!', 'basic_school', 7, ARRAY['superposition', 'classical_vs_quantum'], false, ARRAY['single_player']::game_mode[]),
    ('qubit-quest', 'Qubit Quest', 'A platformer adventure where quantum gates transform your character!', 'junior_high', 11, ARRAY['qubits', 'gates', 'X_gate', 'H_gate'], false, ARRAY['single_player']::game_mode[]),
    ('entanglement-pairs', 'Entanglement Pairs', 'Match-3 puzzle game with entangled quantum pairs!', 'junior_high', 11, ARRAY['entanglement', 'bell_states', 'correlation'], true, ARRAY['single_player', 'turn_based']::game_mode[]),
    ('gate-puzzle', 'Gate Puzzle', 'Solve tile puzzles using quantum gate operations!', 'junior_high', 12, ARRAY['gates', 'X_gate', 'Y_gate', 'Z_gate', 'H_gate'], false, ARRAY['single_player']::game_mode[]),
    ('circuit-architect', 'Circuit Architect', 'Build quantum circuits to achieve target quantum states!', 'senior_high', 15, ARRAY['circuits', 'gates', 'CNOT', 'measurement'], true, ARRAY['single_player', 'turn_based', 'real_time']::game_mode[]),
    ('bloch-sphere-explorer', 'Bloch Sphere Explorer', 'Interactive 3D visualization of qubit states on the Bloch sphere.', 'senior_high', 15, ARRAY['bloch_sphere', 'qubit_states', 'rotations'], false, ARRAY['single_player']::game_mode[]),
    ('quantum-spy', 'Quantum Spy', 'Play as Alice and Bob to exchange secret keys while Eve tries to intercept! Learn BB84 quantum key distribution.', 'senior_high', 16, ARRAY['QKD', 'BB84', 'eavesdropping', 'security'], true, ARRAY['single_player', 'real_time', 'cooperative']::game_mode[]),
    ('grovers-maze', 'Grover''s Maze', 'Navigate mazes using Grover''s quantum search algorithm!', 'undergraduate', 18, ARRAY['grover_algorithm', 'amplitude_amplification', 'oracle'], false, ARRAY['single_player']::game_mode[]),
    ('deutsch-challenge', 'Deutsch Challenge', 'Competitive oracle identification using the Deutsch-Jozsa algorithm!', 'undergraduate', 18, ARRAY['deutsch_jozsa', 'oracle', 'quantum_parallelism'], true, ARRAY['single_player', 'real_time']::game_mode[]),
    ('qkd-protocol-lab', 'QKD Protocol Lab', 'Design and test quantum key distribution protocols: BB84, E91, B92.', 'undergraduate', 19, ARRAY['QKD', 'BB84', 'E91', 'B92', 'security_analysis'], false, ARRAY['single_player']::game_mode[]),
    ('protocol-designer', 'Protocol Designer', 'Create and analyze novel quantum cryptography protocols.', 'postgraduate', 22, ARRAY['QKD', 'protocol_design', 'security_proofs'], false, ARRAY['single_player']::game_mode[]),
    ('error-correction-sandbox', 'Error Correction Sandbox', 'Build and test quantum error correcting codes.', 'postgraduate', 22, ARRAY['error_correction', 'stabilizer_codes', 'fault_tolerance'], false, ARRAY['single_player']::game_mode[]),
    ('research-simulator', 'Research Simulator', 'Open-ended quantum simulation with optional real hardware connection.', 'researcher', 22, ARRAY['simulation', 'hardware', 'research'], false, ARRAY['single_player']::game_mode[])
ON CONFLICT (slug) DO NOTHING;

-- Insert default achievements
INSERT INTO achievements (slug, name, description, achievement_type, xp_reward, criteria) VALUES
    ('first-observation', 'First Observation', 'Make your first quantum measurement!', 'progress', 10, '{"type": "measurement_count", "count": 1}'),
    ('quantum-curious', 'Quantum Curious', 'Complete your first game level', 'progress', 25, '{"type": "levels_completed", "count": 1}'),
    ('superposition-master', 'Superposition Master', 'Complete all Quantum Pet levels', 'skill', 100, '{"type": "game_completed", "game_slug": "quantum-pet"}'),
    ('gate-keeper', 'Gate Keeper', 'Use 100 quantum gates across all games', 'skill', 50, '{"type": "gates_used", "count": 100}'),
    ('entanglement-expert', 'Entanglement Expert', 'Create 50 entangled pairs', 'skill', 75, '{"type": "entangled_pairs", "count": 50}'),
    ('circuit-builder', 'Circuit Builder', 'Build 25 quantum circuits', 'skill', 100, '{"type": "circuits_built", "count": 25}'),
    ('crypto-defender', 'Crypto Defender', 'Successfully complete 10 QKD key exchanges', 'skill', 150, '{"type": "qkd_exchanges", "count": 10}'),
    ('speed-demon', 'Speed Demon', 'Complete any level in under 30 seconds', 'challenge', 50, '{"type": "time_challenge", "seconds": 30}'),
    ('perfectionist', 'Perfectionist', 'Get 3 stars on 10 levels', 'challenge', 100, '{"type": "stars_earned", "stars": 3, "count": 10}'),
    ('social-butterfly', 'Social Butterfly', 'Play 5 multiplayer games', 'social', 50, '{"type": "multiplayer_games", "count": 5}'),
    ('teacher-helper', 'Teacher Helper', 'Help another player complete a level', 'social', 75, '{"type": "cooperative_completions", "count": 1}')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Proctoring Tables for Exam Integrity
-- ============================================

-- Create proctoring enum types
DO $$ BEGIN
    CREATE TYPE proctoring_provider AS ENUM (
        'lockdown_browser',
        'proctorio',
        'honorlock',
        'examity',
        'internal'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE proctoring_status AS ENUM (
        'pending',
        'verified',
        'active',
        'completed',
        'flagged',
        'invalidated'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Proctored sessions table
CREATE TABLE IF NOT EXISTS proctored_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level_id UUID NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    provider proctoring_provider DEFAULT 'internal',
    status proctoring_status DEFAULT 'pending',
    browser_fingerprint VARCHAR(512),
    user_agent VARCHAR(500),
    ip_address VARCHAR(45),
    provider_session_id VARCHAR(255),
    provider_data JSONB DEFAULT '{}',
    session_token VARCHAR(255) UNIQUE NOT NULL,
    verification_code VARCHAR(50),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    max_duration_minutes INTEGER DEFAULT 60,
    flags JSONB DEFAULT '[]',
    proctor_notes TEXT,
    integrity_score INTEGER CHECK (integrity_score >= 0 AND integrity_score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Proctoring flags table
CREATE TABLE IF NOT EXISTS proctoring_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES proctored_sessions(id) ON DELETE CASCADE,
    flag_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'warning',
    description TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    flag_metadata JSONB DEFAULT '{}',
    reviewed BOOLEAN DEFAULT false,
    reviewer_notes TEXT
);

-- Proctoring indexes
CREATE INDEX IF NOT EXISTS idx_proctored_sessions_user_id ON proctored_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_proctored_sessions_level_id ON proctored_sessions(level_id);
CREATE INDEX IF NOT EXISTS idx_proctored_sessions_token ON proctored_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_proctored_sessions_status ON proctored_sessions(status);
CREATE INDEX IF NOT EXISTS idx_proctoring_flags_session ON proctoring_flags(session_id);

-- Add proctoring columns to existing tables
ALTER TABLE levels ADD COLUMN IF NOT EXISTS requires_proctoring BOOLEAN DEFAULT false;
ALTER TABLE levels ADD COLUMN IF NOT EXISTS proctoring_settings JSONB DEFAULT '{}';
ALTER TABLE progress ADD COLUMN IF NOT EXISTS proctored_session_id UUID REFERENCES proctored_sessions(id);
ALTER TABLE progress ADD COLUMN IF NOT EXISTS integrity_verified BOOLEAN DEFAULT false;

-- ============================================
-- Update game configs with anti-cheat settings
-- Uses COALESCE and || to MERGE with existing config, not replace
-- ============================================

-- Circuit Architect - Server-side scoring, circuit verification
UPDATE games SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object(
    'server_side_scoring', true,
    'requires_circuit_verification', true,
    'verification_type', 'circuit',
    'check_solution_diversity', true
) WHERE slug = 'circuit-architect';

-- Grover's Maze - Server-side scoring, algorithm verification
UPDATE games SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object(
    'server_side_scoring', true,
    'verification_type', 'algorithm',
    'check_solution_diversity', true
) WHERE slug = 'grovers-maze';

-- Deutsch Challenge - Server-side scoring, algorithm verification
UPDATE games SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object(
    'server_side_scoring', true,
    'verification_type', 'algorithm',
    'check_solution_diversity', true
) WHERE slug = 'deutsch-challenge';

-- Gate Puzzle - Server-side scoring, gate verification
UPDATE games SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object(
    'server_side_scoring', true,
    'requires_gate_verification', true,
    'verification_type', 'gate_puzzle',
    'check_solution_diversity', true
) WHERE slug = 'gate-puzzle';

-- Quantum Spy (BB84) - Server-side scoring
UPDATE games SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object(
    'server_side_scoring', true
) WHERE slug = 'quantum-spy';

-- Bloch Sphere Explorer - Server-side scoring
UPDATE games SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object(
    'server_side_scoring', true
) WHERE slug = 'bloch-sphere-explorer';

-- Error Correction Sandbox - Server-side scoring
UPDATE games SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object(
    'server_side_scoring', true,
    'check_solution_diversity', true
) WHERE slug = 'error-correction-sandbox';

-- Entanglement Pairs - Server-side scoring
UPDATE games SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object(
    'server_side_scoring', true
) WHERE slug = 'entanglement-pairs';

-- QKD Protocol Lab - Prerequisites
UPDATE games SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object(
    'server_side_scoring', true,
    'prerequisite_games', '["quantum-spy"]'::jsonb
) WHERE slug = 'qkd-protocol-lab';

-- Protocol Designer - Prerequisites (postgraduate)
UPDATE games SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object(
    'server_side_scoring', true,
    'prerequisite_games', '["qkd-protocol-lab"]'::jsonb
) WHERE slug = 'protocol-designer';

-- Grant permissions (adjust as needed for your setup)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO quantum;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO quantum;
