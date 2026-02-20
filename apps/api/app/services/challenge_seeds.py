"""Challenge seed generation for unique student parameters"""
from typing import Dict, Any, Optional, List
from uuid import UUID
import hashlib
import random
from datetime import datetime, date


class ChallengeSeedGenerator:
    """
    Generates deterministic but unique challenge parameters per student.
    Uses user_id + level_id + date to create reproducible seeds that change daily.
    """
    
    def __init__(self, user_id: UUID, level_id: UUID, seed_rotation: str = "daily"):
        self.user_id = user_id
        self.level_id = level_id
        self.seed_rotation = seed_rotation
        self._seed = self._compute_seed()
        self._rng = random.Random(self._seed)
    
    def _compute_seed(self) -> int:
        """Compute deterministic seed from user, level, and time components"""
        components = [str(self.user_id), str(self.level_id)]
        
        if self.seed_rotation == "daily":
            components.append(date.today().isoformat())
        elif self.seed_rotation == "weekly":
            today = date.today()
            week_start = today.isocalendar()[:2]  # (year, week_number)
            components.append(f"{week_start[0]}-W{week_start[1]}")
        elif self.seed_rotation == "attempt":
            components.append(datetime.utcnow().isoformat())
        # "static" rotation uses just user_id + level_id
        
        seed_string = ":".join(components)
        hash_bytes = hashlib.sha256(seed_string.encode()).digest()
        return int.from_bytes(hash_bytes[:8], byteorder="big")
    
    @property
    def seed(self) -> int:
        return self._seed
    
    def random_int(self, min_val: int, max_val: int) -> int:
        """Generate random integer in range [min_val, max_val]"""
        return self._rng.randint(min_val, max_val)
    
    def random_float(self, min_val: float, max_val: float) -> float:
        """Generate random float in range [min_val, max_val]"""
        return self._rng.uniform(min_val, max_val)
    
    def random_choice(self, options: List[Any]) -> Any:
        """Choose random element from list"""
        return self._rng.choice(options)
    
    def random_sample(self, options: List[Any], k: int) -> List[Any]:
        """Choose k random elements from list without replacement"""
        return self._rng.sample(options, min(k, len(options)))
    
    def shuffle(self, items: List[Any]) -> List[Any]:
        """Return shuffled copy of list"""
        result = items.copy()
        self._rng.shuffle(result)
        return result


def generate_circuit_challenge(
    generator: ChallengeSeedGenerator,
    base_config: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Generate unique circuit challenge parameters.
    
    Varies target states while maintaining similar difficulty.
    """
    num_qubits = base_config.get("num_qubits", 2)
    challenge_type = base_config.get("challenge_type", "bell_state")
    
    if challenge_type == "bell_state":
        # Four Bell states with different target probabilities
        bell_states = [
            {"00": 0.5, "11": 0.5},  # |Φ+⟩
            {"01": 0.5, "10": 0.5},  # |Ψ+⟩
            {"00": 0.5, "11": 0.5},  # |Φ-⟩ (same probs, different phase)
            {"01": 0.5, "10": 0.5},  # |Ψ-⟩ (same probs, different phase)
        ]
        target_idx = generator.random_int(0, len(bell_states) - 1)
        return {
            **base_config,
            "target_state": bell_states[target_idx],
            "target_name": ["Phi+", "Psi+", "Phi-", "Psi-"][target_idx],
            "seed": generator.seed,
        }
    
    elif challenge_type == "ghz_state":
        # GHZ states for different qubit counts
        n = generator.random_int(3, min(5, num_qubits))
        all_zeros = "0" * n
        all_ones = "1" * n
        return {
            **base_config,
            "num_qubits": n,
            "target_state": {all_zeros: 0.5, all_ones: 0.5},
            "target_name": f"GHZ_{n}",
            "seed": generator.seed,
        }
    
    elif challenge_type == "superposition":
        # Random qubit to put in superposition
        target_qubit = generator.random_int(0, num_qubits - 1)
        return {
            **base_config,
            "target_qubit": target_qubit,
            "seed": generator.seed,
        }
    
    return {**base_config, "seed": generator.seed}


def generate_gate_puzzle_challenge(
    generator: ChallengeSeedGenerator,
    base_config: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Generate unique gate puzzle parameters.
    
    Varies initial and target states.
    """
    states = ["|0⟩", "|1⟩", "|+⟩", "|-⟩"]
    
    # Ensure we get a solvable puzzle
    initial_state = generator.random_choice(states)
    
    # Pick a different target state
    other_states = [s for s in states if s != initial_state]
    target_state = generator.random_choice(other_states)
    
    # Calculate optimal solution
    transitions = {
        ("|0⟩", "|1⟩"): 1,  # X
        ("|0⟩", "|+⟩"): 1,  # H
        ("|0⟩", "|-⟩"): 2,  # H, Z or X, H
        ("|1⟩", "|0⟩"): 1,  # X
        ("|1⟩", "|+⟩"): 2,  # X, H
        ("|1⟩", "|-⟩"): 1,  # H
        ("|+⟩", "|0⟩"): 1,  # H
        ("|+⟩", "|1⟩"): 2,  # H, X
        ("|+⟩", "|-⟩"): 1,  # Z
        ("|-⟩", "|0⟩"): 2,  # H, X or Z, H
        ("|-⟩", "|1⟩"): 1,  # H
        ("|-⟩", "|+⟩"): 1,  # Z
    }
    
    optimal_gates = transitions.get((initial_state, target_state), 2)
    
    return {
        **base_config,
        "initial_state": initial_state,
        "target_state_symbol": target_state,
        "optimal_gate_count": optimal_gates,
        "seed": generator.seed,
    }


def generate_grover_challenge(
    generator: ChallengeSeedGenerator,
    base_config: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Generate unique Grover's search challenge.
    
    Varies the marked items in the search space.
    """
    num_qubits = base_config.get("num_qubits", 3)
    search_space_size = 2 ** num_qubits
    num_marked = base_config.get("num_marked", 1)
    
    # Generate random marked items
    all_items = list(range(search_space_size))
    marked_items = generator.random_sample(all_items, num_marked)
    
    # Calculate optimal iterations
    import math
    optimal_iterations = max(1, int(round(math.pi / 4 * math.sqrt(search_space_size / num_marked))))
    
    return {
        **base_config,
        "marked_items": marked_items,
        "marked_items_binary": [format(i, f"0{num_qubits}b") for i in marked_items],
        "optimal_iterations": optimal_iterations,
        "search_space_size": search_space_size,
        "seed": generator.seed,
    }


def generate_deutsch_challenge(
    generator: ChallengeSeedGenerator,
    base_config: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Generate unique Deutsch-Jozsa challenge.
    
    Randomly assigns constant or balanced oracle.
    """
    oracle_type = generator.random_choice(["constant", "balanced"])
    
    if oracle_type == "constant":
        # Constant function: either always 0 or always 1
        constant_value = generator.random_int(0, 1)
        return {
            **base_config,
            "oracle_type": "constant",
            "oracle_value": constant_value,
            "hint": "The output is the same for all inputs",
            "seed": generator.seed,
        }
    else:
        # Balanced function: exactly half 0, half 1
        num_qubits = base_config.get("num_qubits", 2)
        return {
            **base_config,
            "oracle_type": "balanced",
            "hint": "The output is 0 for half the inputs and 1 for the other half",
            "seed": generator.seed,
        }


def generate_bb84_challenge(
    generator: ChallengeSeedGenerator,
    base_config: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Generate unique BB84 QKD challenge.
    
    Varies the key bits and basis choices.
    """
    key_length = base_config.get("key_length", 8)
    
    # Generate Alice's random bits and bases
    alice_bits = [generator.random_int(0, 1) for _ in range(key_length)]
    alice_bases = [generator.random_choice(["Z", "X"]) for _ in range(key_length)]
    
    # If Eve is intercepting, generate her bases too
    eve_active = base_config.get("eve_active", generator.random_float(0, 1) < 0.5)
    
    return {
        **base_config,
        "alice_bits": alice_bits,
        "alice_bases": alice_bases,
        "eve_active": eve_active,
        "expected_error_rate": 0.25 if eve_active else 0.0,
        "seed": generator.seed,
    }


# Map of challenge types to generators
CHALLENGE_GENERATORS = {
    "circuit": generate_circuit_challenge,
    "gate_puzzle": generate_gate_puzzle_challenge,
    "grover": generate_grover_challenge,
    "deutsch_jozsa": generate_deutsch_challenge,
    "bb84": generate_bb84_challenge,
}


def generate_challenge_params(
    user_id: UUID,
    level_id: UUID,
    level_config: Dict[str, Any],
    seed_rotation: str = "daily",
) -> Dict[str, Any]:
    """
    Generate unique challenge parameters for a user and level.
    
    Args:
        user_id: The user's UUID
        level_id: The level's UUID
        level_config: Base level configuration
        seed_rotation: How often to rotate seeds ("daily", "weekly", "attempt", "static")
        
    Returns:
        Modified level config with unique parameters
    """
    challenge_type = level_config.get("challenge_type")
    
    if not challenge_type or challenge_type not in CHALLENGE_GENERATORS:
        # No seeding for this challenge type
        return level_config
    
    generator = ChallengeSeedGenerator(user_id, level_id, seed_rotation)
    generate_fn = CHALLENGE_GENERATORS[challenge_type]
    
    return generate_fn(generator, level_config)
