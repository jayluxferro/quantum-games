"""Anti-cheat and validation services for game integrity"""
from typing import Dict, Any, Optional, List, Tuple
from uuid import UUID
from datetime import datetime, timedelta
import hashlib
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.game import Game, Level
from app.models.progress import Progress
from app.models.user import User, EducationLevel
from app.quantum.simulator import QuantumSimulator


# Minimum time thresholds as fraction of estimated_minutes
# e.g., 0.1 means at least 10% of estimated time must pass
MIN_TIME_FRACTION = 0.1
ABSOLUTE_MIN_SECONDS = 5  # Absolute minimum regardless of estimated time

# Solution verification tolerance
VERIFICATION_TOLERANCE = 0.15
VERIFICATION_SHOTS = 4096


class AnticheatService:
    """Service for anti-cheat validations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def validate_completion_time(
        self,
        level: Level,
        time_seconds: Optional[int],
        session_started_at: Optional[datetime] = None,
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate that completion time is not suspiciously fast.
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        if time_seconds is None and session_started_at is None:
            return True, None
        
        # Calculate minimum acceptable time
        estimated_seconds = level.estimated_minutes * 60
        min_time = max(
            ABSOLUTE_MIN_SECONDS,
            int(estimated_seconds * MIN_TIME_FRACTION)
        )
        
        # Adjust for difficulty - harder levels need more time
        difficulty_multiplier = 1.0 + (level.difficulty - 1) * 0.05
        min_time = int(min_time * difficulty_multiplier)
        
        if time_seconds is not None and time_seconds < min_time:
            return False, (
                f"Completion time ({time_seconds}s) is below minimum threshold "
                f"({min_time}s) for this level. Please attempt the level legitimately."
            )
        
        return True, None
    
    async def check_prerequisites(
        self,
        user: User,
        game: Game,
        level: Level,
    ) -> Tuple[bool, Optional[str], List[Dict[str, Any]]]:
        """
        Check if user has completed prerequisite games/levels.
        
        Returns:
            Tuple of (has_prerequisites, error_message, missing_prerequisites)
        """
        missing = []
        
        # Check game-level prerequisites from config
        prereq_games = game.config.get("prerequisite_games", [])
        for prereq_slug in prereq_games:
            prereq_result = await self.db.execute(
                select(Game).where(Game.slug == prereq_slug)
            )
            prereq_game = prereq_result.scalar_one_or_none()
            
            if prereq_game:
                # Check if user has completed at least one level with 1+ stars
                completion_result = await self.db.execute(
                    select(Progress)
                    .join(Level)
                    .where(Progress.user_id == user.id)
                    .where(Level.game_id == prereq_game.id)
                    .where(Progress.completed == True)
                )
                completed_any = completion_result.scalar_one_or_none()
                
                if not completed_any:
                    missing.append({
                        "type": "game",
                        "slug": prereq_slug,
                        "name": prereq_game.name,
                    })
        
        # Check level sequence - must complete previous levels in same game
        if level.sequence > 1:
            prev_level_result = await self.db.execute(
                select(Level)
                .where(Level.game_id == game.id)
                .where(Level.sequence == level.sequence - 1)
            )
            prev_level = prev_level_result.scalar_one_or_none()
            
            if prev_level:
                progress_result = await self.db.execute(
                    select(Progress)
                    .where(Progress.user_id == user.id)
                    .where(Progress.level_id == prev_level.id)
                    .where(Progress.completed == True)
                )
                prev_completed = progress_result.scalar_one_or_none()
                
                if not prev_completed:
                    missing.append({
                        "type": "level",
                        "game_slug": game.slug,
                        "sequence": level.sequence - 1,
                        "title": prev_level.title,
                    })
        
        if missing:
            return False, "Prerequisites not met", missing
        
        return True, None, []
    
    async def check_education_tier_mastery(
        self,
        user: User,
        target_level: EducationLevel,
        min_stars: int = 2,
        min_games_completed: int = 1,
    ) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Check if user has mastered the previous education tier.
        
        Returns:
            Tuple of (has_mastery, error_message, details)
        """
        # Define tier progression
        tier_order = [
            EducationLevel.BASIC_SCHOOL,
            EducationLevel.JUNIOR_HIGH,
            EducationLevel.SENIOR_HIGH,
            EducationLevel.UNDERGRADUATE,
            EducationLevel.POSTGRADUATE,
            EducationLevel.RESEARCHER,
        ]
        
        try:
            target_idx = tier_order.index(target_level)
        except ValueError:
            return True, None, {}
        
        # First tier has no prerequisites
        if target_idx == 0:
            return True, None, {}
        
        # Get previous tier
        prev_tier = tier_order[target_idx - 1]
        
        # Count games in previous tier with sufficient stars
        games_with_mastery = await self.db.execute(
            select(func.count(func.distinct(Level.game_id)))
            .select_from(Progress)
            .join(Level)
            .join(Game)
            .where(Progress.user_id == user.id)
            .where(Progress.stars >= min_stars)
            .where(Game.target_level == prev_tier)
        )
        mastery_count = games_with_mastery.scalar() or 0
        
        # Get total games in previous tier
        total_games_result = await self.db.execute(
            select(func.count())
            .select_from(Game)
            .where(Game.target_level == prev_tier)
            .where(Game.is_active == True)
        )
        total_games = total_games_result.scalar() or 0
        
        details = {
            "previous_tier": prev_tier.value,
            "games_with_mastery": mastery_count,
            "required_games": min_games_completed,
            "total_games_in_tier": total_games,
        }
        
        if mastery_count < min_games_completed:
            return False, (
                f"You need to achieve {min_stars}+ stars in at least "
                f"{min_games_completed} game(s) from {prev_tier.value.replace('_', ' ').title()} "
                f"before accessing {target_level.value.replace('_', ' ').title()} content. "
                f"Current progress: {mastery_count}/{min_games_completed}"
            ), details
        
        return True, None, details
    
    async def validate_score_bounds(
        self,
        score: int,
        max_score: Optional[int],
        level: Level,
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate that submitted score is within acceptable bounds.
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        if score < 0:
            return False, "Score cannot be negative"
        
        effective_max = max_score or level.config.get("max_score", 100)
        
        # Allow some tolerance for bonus points (10% over max)
        if score > effective_max * 1.1:
            return False, f"Score ({score}) exceeds maximum possible ({effective_max})"
        
        return True, None
    
    async def verify_circuit_solution(
        self,
        solution: Dict[str, Any],
        level: Level,
    ) -> Tuple[bool, Optional[str], Optional[float]]:
        """
        Verify a submitted circuit solution by replaying it.
        
        Args:
            solution: The submitted solution containing circuit operations
            level: The level being completed
            
        Returns:
            Tuple of (is_valid, error_message, verified_score)
        """
        # Get target state from level config
        level_config = level.config or {}
        target_state = level_config.get("target_state")
        requires_verification = level_config.get("requires_circuit_verification", False)
        
        if not requires_verification:
            return True, None, None
        
        if not target_state:
            return True, None, None
        
        # Extract circuit from solution
        circuit_data = solution.get("circuit")
        if not circuit_data:
            return False, "Solution must contain circuit data for verification", None
        
        num_qubits = circuit_data.get("num_qubits")
        operations = circuit_data.get("operations", [])
        
        if not num_qubits or num_qubits > 20:
            return False, "Invalid circuit configuration", None
        
        try:
            simulator = QuantumSimulator()
            result = simulator.verify_circuit(
                num_qubits=num_qubits,
                operations=operations,
                target_state=target_state,
                tolerance=VERIFICATION_TOLERANCE,
            )
            
            if not result.get("matches"):
                return False, (
                    "Circuit verification failed: your solution does not produce "
                    "the expected quantum state. Please review your circuit design."
                ), result.get("score", 0)
            
            return True, None, result.get("score", 100)
            
        except Exception as e:
            return False, f"Circuit verification error: {str(e)}", None
    
    async def verify_gate_puzzle_solution(
        self,
        solution: Dict[str, Any],
        level: Level,
    ) -> Tuple[bool, Optional[str], Optional[float]]:
        """
        Verify a gate puzzle solution by checking state transformations.
        
        Returns:
            Tuple of (is_valid, error_message, verified_score)
        """
        level_config = level.config or {}
        if not level_config.get("requires_gate_verification", False):
            return True, None, None
        
        initial_state = level_config.get("initial_state", "|0⟩")
        target_state = level_config.get("target_state_symbol")
        optimal_gates = level_config.get("optimal_gate_count", 1)
        
        if not target_state:
            return True, None, None
        
        gates_applied = solution.get("gates", [])
        final_state = solution.get("final_state")
        
        # Verify state transitions
        transitions = {
            "|0⟩": {"X": "|1⟩", "Y": "|1⟩", "Z": "|0⟩", "H": "|+⟩"},
            "|1⟩": {"X": "|0⟩", "Y": "|0⟩", "Z": "|1⟩", "H": "|-⟩"},
            "|+⟩": {"X": "|+⟩", "Y": "|-⟩", "Z": "|-⟩", "H": "|0⟩"},
            "|-⟩": {"X": "|-⟩", "Y": "|+⟩", "Z": "|+⟩", "H": "|1⟩"},
        }
        
        current_state = initial_state
        for gate in gates_applied:
            gate_name = gate.get("gate", gate) if isinstance(gate, dict) else gate
            if current_state in transitions and gate_name in transitions[current_state]:
                current_state = transitions[current_state][gate_name]
        
        if current_state != target_state:
            return False, (
                f"Gate sequence verification failed: expected {target_state}, "
                f"got {current_state}"
            ), 0
        
        # Calculate score based on gate count efficiency
        gate_count = len(gates_applied)
        if gate_count <= optimal_gates:
            score = 100.0
        else:
            penalty = (gate_count - optimal_gates) * 10
            score = max(50.0, 100.0 - penalty)
        
        return True, None, score
    
    def compute_solution_hash(self, solution: Dict[str, Any]) -> str:
        """
        Compute a hash of the solution for duplicate detection.
        Normalizes the solution to catch trivially reordered duplicates.
        """
        normalized = json.dumps(solution, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(normalized.encode()).hexdigest()
    
    async def check_solution_diversity(
        self,
        user: User,
        level: Level,
        solution: Dict[str, Any],
        similarity_threshold: float = 0.95,
    ) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Check if the submitted solution is too similar to other students' solutions.
        
        Returns:
            Tuple of (is_unique, warning_message, details)
        """
        solution_hash = self.compute_solution_hash(solution)
        
        # Get all other students' solutions for this level
        other_solutions = await self.db.execute(
            select(Progress)
            .where(Progress.level_id == level.id)
            .where(Progress.user_id != user.id)
            .where(Progress.best_solution.isnot(None))
        )
        other_progress = other_solutions.scalars().all()
        
        exact_matches = 0
        similar_count = 0
        total_compared = len(other_progress)
        
        for other in other_progress:
            if not other.best_solution:
                continue
            
            other_hash = self.compute_solution_hash(other.best_solution)
            
            # Check for exact match
            if solution_hash == other_hash:
                exact_matches += 1
                continue
            
            # Check for structural similarity
            similarity = self._compute_solution_similarity(solution, other.best_solution)
            if similarity >= similarity_threshold:
                similar_count += 1
        
        details = {
            "solution_hash": solution_hash[:16] + "...",
            "exact_duplicates": exact_matches,
            "similar_solutions": similar_count,
            "total_compared": total_compared,
        }
        
        if exact_matches > 0:
            return False, (
                f"This exact solution has been submitted by {exact_matches} other student(s). "
                "Please develop your own unique approach."
            ), details
        
        if similar_count > 2:
            return False, (
                f"This solution is very similar to {similar_count} other submissions. "
                "Consider a different approach to demonstrate your understanding."
            ), details
        
        return True, None, details
    
    def _compute_solution_similarity(
        self,
        solution1: Dict[str, Any],
        solution2: Dict[str, Any],
    ) -> float:
        """
        Compute similarity between two solutions.
        Returns a value between 0 (completely different) and 1 (identical).
        """
        # For circuit solutions, compare operations
        circuit1 = solution1.get("circuit", {})
        circuit2 = solution2.get("circuit", {})
        
        if circuit1 and circuit2:
            ops1 = circuit1.get("operations", [])
            ops2 = circuit2.get("operations", [])
            
            if not ops1 or not ops2:
                return 0.0
            
            # Compare gate sequences
            ops1_str = [f"{op.get('gate')}:{op.get('qubits')}" for op in ops1]
            ops2_str = [f"{op.get('gate')}:{op.get('qubits')}" for op in ops2]
            
            # LCS-based similarity
            common = len(set(ops1_str) & set(ops2_str))
            total = max(len(ops1_str), len(ops2_str))
            
            return common / total if total > 0 else 0.0
        
        # For gate puzzle solutions, compare gate sequences
        gates1 = solution1.get("gates", [])
        gates2 = solution2.get("gates", [])
        
        if gates1 and gates2:
            g1 = [g.get("gate", g) if isinstance(g, dict) else g for g in gates1]
            g2 = [g.get("gate", g) if isinstance(g, dict) else g for g in gates2]
            
            if g1 == g2:
                return 1.0
            
            common = len(set(g1) & set(g2))
            total = max(len(g1), len(g2))
            
            return common / total if total > 0 else 0.0
        
        # For algorithm solutions, compare key parameters
        for key in ["found_item", "answer", "final_key"]:
            v1 = solution1.get(key)
            v2 = solution2.get(key)
            if v1 is not None and v2 is not None:
                return 1.0 if v1 == v2 else 0.5
        
        # Default: compute based on JSON structure overlap
        keys1 = set(solution1.keys())
        keys2 = set(solution2.keys())
        
        common_keys = keys1 & keys2
        if not common_keys:
            return 0.0
        
        matching_values = sum(
            1 for k in common_keys
            if solution1.get(k) == solution2.get(k)
        )
        
        return matching_values / len(common_keys)


class SolutionVerifier:
    """Verifies different types of game solutions"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.anticheat = AnticheatService(db)
    
    async def verify_solution(
        self,
        game: Game,
        level: Level,
        solution: Dict[str, Any],
        claimed_score: int,
    ) -> Tuple[bool, Optional[str], int]:
        """
        Verify a submitted solution based on game type.
        
        Returns:
            Tuple of (is_valid, error_message, verified_score)
        """
        game_type = game.config.get("verification_type", "none")
        
        if game_type == "circuit":
            valid, error, score = await self.anticheat.verify_circuit_solution(
                solution=solution,
                level=level,
            )
            if not valid:
                return False, error, 0
            return True, None, int(score) if score else claimed_score
        
        elif game_type == "gate_puzzle":
            valid, error, score = await self.anticheat.verify_gate_puzzle_solution(
                solution=solution,
                level=level,
            )
            if not valid:
                return False, error, 0
            return True, None, int(score) if score else claimed_score
        
        elif game_type == "algorithm":
            return await self._verify_algorithm_solution(game, level, solution, claimed_score)
        
        # Default: trust client score but log for review
        return True, None, claimed_score
    
    async def _verify_algorithm_solution(
        self,
        game: Game,
        level: Level,
        solution: Dict[str, Any],
        claimed_score: int,
    ) -> Tuple[bool, Optional[str], int]:
        """Verify algorithm-based solutions (Grover's, Deutsch-Jozsa, etc.)"""
        level_config = level.config or {}
        algorithm_type = level_config.get("algorithm")
        
        if algorithm_type == "grover":
            return await self._verify_grover_solution(level_config, solution, claimed_score)
        elif algorithm_type == "deutsch_jozsa":
            return await self._verify_deutsch_solution(level_config, solution, claimed_score)
        
        return True, None, claimed_score
    
    async def _verify_grover_solution(
        self,
        config: Dict[str, Any],
        solution: Dict[str, Any],
        claimed_score: int,
    ) -> Tuple[bool, Optional[str], int]:
        """Verify Grover's algorithm solution"""
        marked_items = set(config.get("marked_items", []))
        found_item = solution.get("found_item")
        iterations_used = solution.get("iterations", 0)
        optimal_iterations = config.get("optimal_iterations", 1)
        
        if found_item not in marked_items:
            return False, "Found item is not in the marked set", 0
        
        # Score based on iteration efficiency
        if iterations_used <= optimal_iterations:
            score = 100
        else:
            penalty = (iterations_used - optimal_iterations) * 15
            score = max(50, 100 - penalty)
        
        return True, None, score
    
    async def _verify_deutsch_solution(
        self,
        config: Dict[str, Any],
        solution: Dict[str, Any],
        claimed_score: int,
    ) -> Tuple[bool, Optional[str], int]:
        """Verify Deutsch-Jozsa algorithm solution"""
        oracle_type = config.get("oracle_type")  # "constant" or "balanced"
        answer = solution.get("answer")
        queries_used = solution.get("queries", 1)
        
        if answer != oracle_type:
            return False, f"Incorrect answer: expected {oracle_type}", 0
        
        # Perfect quantum solution uses exactly 1 query
        if queries_used == 1:
            score = 100
        else:
            # Classical approach penalty
            score = max(50, 100 - (queries_used - 1) * 20)
        
        return True, None, score


# Singleton-style helper for quick access
async def get_anticheat_service(db: AsyncSession) -> AnticheatService:
    return AnticheatService(db)


async def get_solution_verifier(db: AsyncSession) -> SolutionVerifier:
    return SolutionVerifier(db)
