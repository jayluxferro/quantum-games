"""Server-side scoring service for game assessment integrity"""
from typing import Dict, Any, Optional, List, Tuple
from uuid import UUID
from datetime import datetime
import math
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.game import Game, Level
from app.models.progress import Progress
from app.models.user import User
from app.quantum.simulator import QuantumSimulator


class ServerSideScorer:
    """
    Calculates scores server-side based on submitted solutions.
    
    This ensures score integrity by not trusting client-reported scores
    for critical assessment games.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.simulator = QuantumSimulator()
    
    async def calculate_score(
        self,
        game: Game,
        level: Level,
        solution: Dict[str, Any],
        time_seconds: Optional[int] = None,
    ) -> Tuple[int, int, Dict[str, Any]]:
        """
        Calculate score server-side based on solution and game type.
        
        Returns:
            Tuple of (score, max_score, score_breakdown)
        """
        game_slug = game.slug
        level_config = level.config or {}
        max_score = level_config.get("max_score", 100)
        
        # Route to appropriate scoring function
        if game_slug == "circuit-architect":
            return await self._score_circuit_architect(level_config, solution, max_score)
        
        elif game_slug == "grovers-maze":
            return await self._score_grovers_maze(level_config, solution, max_score)
        
        elif game_slug == "deutsch-challenge":
            return await self._score_deutsch_challenge(level_config, solution, max_score)
        
        elif game_slug == "gate-puzzle":
            return await self._score_gate_puzzle(level_config, solution, max_score)
        
        elif game_slug == "quantum-spy":
            return await self._score_quantum_spy(level_config, solution, max_score)
        
        elif game_slug == "bloch-sphere-explorer":
            return await self._score_bloch_explorer(level_config, solution, max_score)
        
        elif game_slug == "error-correction-sandbox":
            return await self._score_error_correction(level_config, solution, max_score)
        
        elif game_slug == "entanglement-pairs":
            return await self._score_entanglement_pairs(level_config, solution, max_score)
        
        # Default: use solution-reported score with validation bounds
        reported_score = solution.get("score", 0)
        validated_score = min(max(0, reported_score), max_score)
        return validated_score, max_score, {"method": "client_reported", "validated": True}
    
    async def _score_circuit_architect(
        self,
        config: Dict[str, Any],
        solution: Dict[str, Any],
        max_score: int,
    ) -> Tuple[int, int, Dict[str, Any]]:
        """Score Circuit Architect game based on circuit correctness and efficiency"""
        target_state = config.get("target_state", {})
        circuit = solution.get("circuit", {})
        
        if not circuit or not target_state:
            return 0, max_score, {"error": "Missing circuit or target state"}
        
        num_qubits = circuit.get("num_qubits", 2)
        operations = circuit.get("operations", [])
        
        try:
            result = self.simulator.verify_circuit(
                num_qubits=num_qubits,
                operations=operations,
                target_state=target_state,
                tolerance=0.15,
            )
        except Exception as e:
            return 0, max_score, {"error": str(e)}
        
        if not result.get("matches"):
            return 0, max_score, {
                "method": "circuit_verification",
                "matches": False,
                "actual": result.get("actual_probabilities"),
            }
        
        # Base score for correct solution
        base_score = 70
        
        # Efficiency bonus (fewer gates = better)
        optimal_gates = config.get("optimal_gate_count", len(operations))
        gate_count = len(operations)
        
        if gate_count <= optimal_gates:
            efficiency_bonus = 30
        else:
            efficiency_penalty = (gate_count - optimal_gates) * 5
            efficiency_bonus = max(0, 30 - efficiency_penalty)
        
        total_score = min(base_score + efficiency_bonus, max_score)
        
        return total_score, max_score, {
            "method": "circuit_verification",
            "matches": True,
            "base_score": base_score,
            "efficiency_bonus": efficiency_bonus,
            "gate_count": gate_count,
            "optimal_gates": optimal_gates,
        }
    
    async def _score_grovers_maze(
        self,
        config: Dict[str, Any],
        solution: Dict[str, Any],
        max_score: int,
    ) -> Tuple[int, int, Dict[str, Any]]:
        """Score Grover's Maze based on correct search and iteration efficiency"""
        marked_items = set(config.get("marked_items", []))
        found_item = solution.get("found_item")
        iterations_used = solution.get("iterations", 0)
        optimal_iterations = config.get("optimal_iterations", 1)
        
        if found_item is None or found_item not in marked_items:
            return 0, max_score, {
                "method": "grover_verification",
                "found_correct": False,
                "found": found_item,
                "expected_in": list(marked_items),
            }
        
        # Base score for finding correct item
        base_score = 60
        
        # Iteration efficiency bonus
        if iterations_used <= optimal_iterations:
            iteration_bonus = 40
        else:
            penalty = (iterations_used - optimal_iterations) * 10
            iteration_bonus = max(0, 40 - penalty)
        
        total_score = min(base_score + iteration_bonus, max_score)
        
        return total_score, max_score, {
            "method": "grover_verification",
            "found_correct": True,
            "base_score": base_score,
            "iteration_bonus": iteration_bonus,
            "iterations_used": iterations_used,
            "optimal_iterations": optimal_iterations,
        }
    
    async def _score_deutsch_challenge(
        self,
        config: Dict[str, Any],
        solution: Dict[str, Any],
        max_score: int,
    ) -> Tuple[int, int, Dict[str, Any]]:
        """Score Deutsch-Jozsa based on correct answer and query efficiency"""
        oracle_type = config.get("oracle_type")
        answer = solution.get("answer")
        queries_used = solution.get("queries", 1)
        
        if answer != oracle_type:
            return 0, max_score, {
                "method": "deutsch_verification",
                "correct": False,
                "answer": answer,
                "expected": oracle_type,
            }
        
        # Perfect quantum solution (1 query) gets full score
        if queries_used == 1:
            score = max_score
            method_used = "quantum"
        else:
            # Classical approach with multiple queries
            base_score = 60
            query_penalty = (queries_used - 1) * 15
            score = max(base_score - query_penalty, 40)
            method_used = "classical"
        
        return score, max_score, {
            "method": "deutsch_verification",
            "correct": True,
            "queries_used": queries_used,
            "approach": method_used,
        }
    
    async def _score_gate_puzzle(
        self,
        config: Dict[str, Any],
        solution: Dict[str, Any],
        max_score: int,
    ) -> Tuple[int, int, Dict[str, Any]]:
        """Score Gate Puzzle based on correct transformation and gate efficiency"""
        initial_state = config.get("initial_state", "|0⟩")
        target_state = config.get("target_state_symbol")
        optimal_gates = config.get("optimal_gate_count", 1)
        
        gates_applied = solution.get("gates", [])
        final_state = solution.get("final_state")
        
        # Verify transformation
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
            return 0, max_score, {
                "method": "gate_verification",
                "correct": False,
                "computed_final": current_state,
                "expected": target_state,
            }
        
        # Base score for correct solution
        base_score = 60
        
        # Gate efficiency bonus
        gate_count = len(gates_applied)
        if gate_count <= optimal_gates:
            efficiency_bonus = 40
        else:
            penalty = (gate_count - optimal_gates) * 10
            efficiency_bonus = max(0, 40 - penalty)
        
        total_score = min(base_score + efficiency_bonus, max_score)
        
        return total_score, max_score, {
            "method": "gate_verification",
            "correct": True,
            "base_score": base_score,
            "efficiency_bonus": efficiency_bonus,
            "gate_count": gate_count,
            "optimal_gates": optimal_gates,
        }
    
    async def _score_quantum_spy(
        self,
        config: Dict[str, Any],
        solution: Dict[str, Any],
        max_score: int,
    ) -> Tuple[int, int, Dict[str, Any]]:
        """Score Quantum Spy (BB84) based on key agreement and Eve detection"""
        alice_bits = config.get("alice_bits", [])
        alice_bases = config.get("alice_bases", [])
        eve_active = config.get("eve_active", False)
        
        bob_bases = solution.get("bob_bases", [])
        bob_measurements = solution.get("bob_measurements", [])
        detected_eve = solution.get("detected_eve", False)
        final_key = solution.get("final_key", [])
        
        # Calculate expected matching bits (where bases match)
        matching_indices = [
            i for i, (a, b) in enumerate(zip(alice_bases, bob_bases))
            if a == b
        ]
        
        # Without Eve, matching bits should agree
        correct_bits = 0
        for i in matching_indices:
            if i < len(bob_measurements) and i < len(alice_bits):
                if bob_measurements[i] == alice_bits[i]:
                    correct_bits += 1
        
        if matching_indices:
            error_rate = 1 - (correct_bits / len(matching_indices))
        else:
            error_rate = 0
        
        # Score components
        base_score = 0
        breakdown = {"method": "bb84_verification"}
        
        # Key extraction score (40 points max)
        if len(final_key) > 0:
            key_score = min(40, len(final_key) * 5)
            base_score += key_score
            breakdown["key_score"] = key_score
        
        # Eve detection score (40 points)
        if eve_active and detected_eve:
            eve_score = 40
            breakdown["eve_detection"] = "correct_positive"
        elif not eve_active and not detected_eve:
            eve_score = 40
            breakdown["eve_detection"] = "correct_negative"
        elif eve_active and not detected_eve:
            eve_score = 0
            breakdown["eve_detection"] = "false_negative"
        else:
            eve_score = 10  # False positive is less severe
            breakdown["eve_detection"] = "false_positive"
        
        base_score += eve_score
        breakdown["eve_score"] = eve_score
        
        # Protocol execution score (20 points) - based on error rate
        if not eve_active:
            expected_error = 0
        else:
            expected_error = 0.25
        
        error_diff = abs(error_rate - expected_error)
        protocol_score = max(0, 20 - int(error_diff * 40))
        base_score += protocol_score
        breakdown["protocol_score"] = protocol_score
        breakdown["measured_error_rate"] = error_rate
        
        total_score = min(base_score, max_score)
        
        return total_score, max_score, breakdown
    
    async def _score_bloch_explorer(
        self,
        config: Dict[str, Any],
        solution: Dict[str, Any],
        max_score: int,
    ) -> Tuple[int, int, Dict[str, Any]]:
        """Score Bloch Explorer based on state accuracy"""
        target_theta = config.get("target_theta", 0)
        target_phi = config.get("target_phi", 0)
        tolerance = config.get("tolerance", 0.15)
        
        achieved_theta = solution.get("theta", 0)
        achieved_phi = solution.get("phi", 0)
        
        theta_diff = abs(target_theta - achieved_theta)
        phi_diff = abs(target_phi - achieved_phi)
        
        # Normalize phi difference for wraparound
        phi_diff = min(phi_diff, 2 * math.pi - phi_diff)
        
        # Combined angular error
        total_error = math.sqrt(theta_diff**2 + phi_diff**2)
        
        if total_error <= tolerance:
            score = max_score
            accuracy = "perfect"
        elif total_error <= tolerance * 2:
            score = int(max_score * 0.8)
            accuracy = "good"
        elif total_error <= tolerance * 4:
            score = int(max_score * 0.6)
            accuracy = "fair"
        else:
            score = max(0, int(max_score * (1 - total_error / math.pi)))
            accuracy = "poor"
        
        return score, max_score, {
            "method": "bloch_verification",
            "target": {"theta": target_theta, "phi": target_phi},
            "achieved": {"theta": achieved_theta, "phi": achieved_phi},
            "total_error": total_error,
            "accuracy": accuracy,
        }
    
    async def _score_error_correction(
        self,
        config: Dict[str, Any],
        solution: Dict[str, Any],
        max_score: int,
    ) -> Tuple[int, int, Dict[str, Any]]:
        """Score Error Correction Sandbox based on correction accuracy"""
        total_errors = config.get("total_errors", 0)
        
        errors_detected = solution.get("errors_detected", 0)
        errors_corrected = solution.get("errors_corrected", 0)
        false_positives = solution.get("false_positives", 0)
        
        # Detection accuracy (40 points max)
        if total_errors > 0:
            detection_rate = errors_detected / total_errors
            detection_score = int(40 * detection_rate)
        else:
            detection_score = 40 if errors_detected == 0 else 0
        
        # Correction accuracy (40 points max)
        if errors_detected > 0:
            correction_rate = errors_corrected / errors_detected
            correction_score = int(40 * correction_rate)
        else:
            correction_score = 40
        
        # False positive penalty (20 points max, deducted)
        fp_penalty = min(20, false_positives * 5)
        fp_score = 20 - fp_penalty
        
        total_score = min(detection_score + correction_score + fp_score, max_score)
        
        return total_score, max_score, {
            "method": "error_correction_verification",
            "detection_score": detection_score,
            "correction_score": correction_score,
            "false_positive_penalty": fp_penalty,
            "stats": {
                "total_errors": total_errors,
                "detected": errors_detected,
                "corrected": errors_corrected,
                "false_positives": false_positives,
            },
        }
    
    async def _score_entanglement_pairs(
        self,
        config: Dict[str, Any],
        solution: Dict[str, Any],
        max_score: int,
    ) -> Tuple[int, int, Dict[str, Any]]:
        """Score Entanglement Pairs matching game"""
        matches_required = config.get("matches_required", 5)
        time_limit = config.get("time_limit_seconds", 60)
        
        matches_made = solution.get("matches_made", 0)
        correct_matches = solution.get("correct_matches", 0)
        time_taken = solution.get("time_seconds", time_limit)
        
        # Accuracy score (60 points max)
        if matches_made > 0:
            accuracy = correct_matches / matches_made
            accuracy_score = int(60 * accuracy)
        else:
            accuracy_score = 0
        
        # Completion score (25 points max)
        completion_rate = min(1.0, correct_matches / matches_required)
        completion_score = int(25 * completion_rate)
        
        # Speed bonus (15 points max)
        if time_taken < time_limit * 0.5:
            speed_bonus = 15
        elif time_taken < time_limit * 0.75:
            speed_bonus = 10
        elif time_taken < time_limit:
            speed_bonus = 5
        else:
            speed_bonus = 0
        
        total_score = min(accuracy_score + completion_score + speed_bonus, max_score)
        
        return total_score, max_score, {
            "method": "entanglement_pairs_verification",
            "accuracy_score": accuracy_score,
            "completion_score": completion_score,
            "speed_bonus": speed_bonus,
            "stats": {
                "matches_made": matches_made,
                "correct_matches": correct_matches,
                "time_taken": time_taken,
            },
        }


async def get_server_scorer(db: AsyncSession) -> ServerSideScorer:
    return ServerSideScorer(db)
