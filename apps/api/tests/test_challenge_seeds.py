"""Tests for challenge seed generation service"""
import pytest
from uuid import uuid4, UUID
from datetime import date

from app.services.challenge_seeds import (
    ChallengeSeedGenerator,
    generate_challenge_params,
    generate_circuit_challenge,
    generate_gate_puzzle_challenge,
    generate_grover_challenge,
    generate_deutsch_challenge,
    generate_bb84_challenge,
)


class TestChallengeSeedGenerator:
    """Tests for the seed generator"""
    
    def test_same_user_level_same_seed(self):
        """Test that same user+level produces same seed"""
        user_id = uuid4()
        level_id = uuid4()
        
        gen1 = ChallengeSeedGenerator(user_id, level_id, "static")
        gen2 = ChallengeSeedGenerator(user_id, level_id, "static")
        
        assert gen1.seed == gen2.seed
    
    def test_different_users_different_seeds(self):
        """Test that different users get different seeds"""
        level_id = uuid4()
        
        gen1 = ChallengeSeedGenerator(uuid4(), level_id, "static")
        gen2 = ChallengeSeedGenerator(uuid4(), level_id, "static")
        
        assert gen1.seed != gen2.seed
    
    def test_different_levels_different_seeds(self):
        """Test that different levels get different seeds"""
        user_id = uuid4()
        
        gen1 = ChallengeSeedGenerator(user_id, uuid4(), "static")
        gen2 = ChallengeSeedGenerator(user_id, uuid4(), "static")
        
        assert gen1.seed != gen2.seed
    
    def test_deterministic_random_values(self):
        """Test that random values are deterministic"""
        user_id = uuid4()
        level_id = uuid4()
        
        gen1 = ChallengeSeedGenerator(user_id, level_id, "static")
        gen2 = ChallengeSeedGenerator(user_id, level_id, "static")
        
        # Generate sequences
        seq1 = [gen1.random_int(0, 100) for _ in range(10)]
        seq2 = [gen2.random_int(0, 100) for _ in range(10)]
        
        assert seq1 == seq2
    
    def test_random_int_in_range(self):
        """Test random_int returns values in correct range"""
        gen = ChallengeSeedGenerator(uuid4(), uuid4(), "static")
        
        for _ in range(100):
            val = gen.random_int(5, 10)
            assert 5 <= val <= 10
    
    def test_random_float_in_range(self):
        """Test random_float returns values in correct range"""
        gen = ChallengeSeedGenerator(uuid4(), uuid4(), "static")
        
        for _ in range(100):
            val = gen.random_float(0.0, 1.0)
            assert 0.0 <= val <= 1.0
    
    def test_random_choice_from_options(self):
        """Test random_choice returns value from options"""
        gen = ChallengeSeedGenerator(uuid4(), uuid4(), "static")
        options = ["a", "b", "c", "d"]
        
        for _ in range(100):
            val = gen.random_choice(options)
            assert val in options
    
    def test_random_sample_correct_size(self):
        """Test random_sample returns correct number of items"""
        gen = ChallengeSeedGenerator(uuid4(), uuid4(), "static")
        options = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        
        sample = gen.random_sample(options, 3)
        assert len(sample) == 3
        assert len(set(sample)) == 3  # No duplicates
        assert all(s in options for s in sample)
    
    def test_shuffle_preserves_elements(self):
        """Test shuffle preserves all elements"""
        gen = ChallengeSeedGenerator(uuid4(), uuid4(), "static")
        original = [1, 2, 3, 4, 5]
        
        shuffled = gen.shuffle(original)
        
        assert sorted(shuffled) == sorted(original)
        assert original == [1, 2, 3, 4, 5]  # Original unchanged


class TestCircuitChallengeGeneration:
    """Tests for circuit challenge generation"""
    
    def test_bell_state_challenge(self):
        """Test Bell state challenge generation"""
        gen = ChallengeSeedGenerator(uuid4(), uuid4(), "static")
        
        config = {
            "num_qubits": 2,
            "challenge_type": "bell_state",
        }
        
        result = generate_circuit_challenge(gen, config)
        
        assert "target_state" in result
        assert "target_name" in result
        assert "seed" in result
        assert result["target_name"] in ["Phi+", "Psi+", "Phi-", "Psi-"]
    
    def test_ghz_state_challenge(self):
        """Test GHZ state challenge generation"""
        gen = ChallengeSeedGenerator(uuid4(), uuid4(), "static")
        
        config = {
            "num_qubits": 5,
            "challenge_type": "ghz_state",
        }
        
        result = generate_circuit_challenge(gen, config)
        
        assert "target_state" in result
        assert result["num_qubits"] >= 3
        assert result["num_qubits"] <= 5
        assert "seed" in result


class TestGatePuzzleChallengeGeneration:
    """Tests for gate puzzle challenge generation"""
    
    def test_gate_puzzle_different_states(self):
        """Test gate puzzle generates different initial and target states"""
        gen = ChallengeSeedGenerator(uuid4(), uuid4(), "static")
        
        config = {}
        
        result = generate_gate_puzzle_challenge(gen, config)
        
        assert "initial_state" in result
        assert "target_state_symbol" in result
        assert "optimal_gate_count" in result
        assert result["initial_state"] != result["target_state_symbol"]
    
    def test_gate_puzzle_valid_states(self):
        """Test gate puzzle uses valid qubit states"""
        gen = ChallengeSeedGenerator(uuid4(), uuid4(), "static")
        
        valid_states = ["|0⟩", "|1⟩", "|+⟩", "|-⟩"]
        
        for _ in range(20):
            result = generate_gate_puzzle_challenge(gen, {})
            assert result["initial_state"] in valid_states
            assert result["target_state_symbol"] in valid_states


class TestGroverChallengeGeneration:
    """Tests for Grover's search challenge generation"""
    
    def test_grover_marked_items(self):
        """Test Grover challenge generates valid marked items"""
        gen = ChallengeSeedGenerator(uuid4(), uuid4(), "static")
        
        config = {
            "num_qubits": 3,
            "num_marked": 2,
        }
        
        result = generate_grover_challenge(gen, config)
        
        assert "marked_items" in result
        assert len(result["marked_items"]) == 2
        assert all(0 <= item < 8 for item in result["marked_items"])
        assert "optimal_iterations" in result
        assert result["optimal_iterations"] >= 1
    
    def test_grover_binary_representation(self):
        """Test Grover challenge includes binary marked items"""
        gen = ChallengeSeedGenerator(uuid4(), uuid4(), "static")
        
        config = {
            "num_qubits": 3,
            "num_marked": 1,
        }
        
        result = generate_grover_challenge(gen, config)
        
        assert "marked_items_binary" in result
        assert len(result["marked_items_binary"]) == 1
        assert len(result["marked_items_binary"][0]) == 3  # 3 bits


class TestDeutschChallengeGeneration:
    """Tests for Deutsch-Jozsa challenge generation"""
    
    def test_deutsch_oracle_types(self):
        """Test Deutsch challenge generates valid oracle types"""
        constant_count = 0
        balanced_count = 0
        
        for i in range(100):
            gen = ChallengeSeedGenerator(uuid4(), uuid4(), "static")
            result = generate_deutsch_challenge(gen, {})
            
            assert result["oracle_type"] in ["constant", "balanced"]
            
            if result["oracle_type"] == "constant":
                constant_count += 1
                assert "oracle_value" in result
            else:
                balanced_count += 1
        
        # Both types should appear
        assert constant_count > 0
        assert balanced_count > 0


class TestBB84ChallengeGeneration:
    """Tests for BB84 QKD challenge generation"""
    
    def test_bb84_key_generation(self):
        """Test BB84 generates valid key bits and bases"""
        gen = ChallengeSeedGenerator(uuid4(), uuid4(), "static")
        
        config = {"key_length": 8}
        
        result = generate_bb84_challenge(gen, config)
        
        assert "alice_bits" in result
        assert "alice_bases" in result
        assert len(result["alice_bits"]) == 8
        assert len(result["alice_bases"]) == 8
        assert all(b in [0, 1] for b in result["alice_bits"])
        assert all(b in ["Z", "X"] for b in result["alice_bases"])
    
    def test_bb84_eve_presence(self):
        """Test BB84 includes Eve presence flag"""
        gen = ChallengeSeedGenerator(uuid4(), uuid4(), "static")
        
        result = generate_bb84_challenge(gen, {"key_length": 8})
        
        assert "eve_active" in result
        assert isinstance(result["eve_active"], bool)
        assert "expected_error_rate" in result


class TestGenerateChallengeParams:
    """Tests for the main challenge params generator"""
    
    def test_unknown_challenge_type_unchanged(self):
        """Test that unknown challenge types return config unchanged"""
        config = {
            "challenge_type": "unknown",
            "some_setting": "value",
        }
        
        result = generate_challenge_params(
            user_id=uuid4(),
            level_id=uuid4(),
            level_config=config,
        )
        
        assert result == config
    
    def test_no_challenge_type_unchanged(self):
        """Test that missing challenge type returns config unchanged"""
        config = {
            "some_setting": "value",
        }
        
        result = generate_challenge_params(
            user_id=uuid4(),
            level_id=uuid4(),
            level_config=config,
        )
        
        assert result == config
    
    def test_different_users_different_params(self):
        """Test that different users get different challenge params"""
        level_id = uuid4()
        config = {
            "challenge_type": "gate_puzzle",
        }
        
        result1 = generate_challenge_params(uuid4(), level_id, config, "static")
        result2 = generate_challenge_params(uuid4(), level_id, config, "static")
        
        # Seeds should be different
        assert result1["seed"] != result2["seed"]
    
    def test_daily_rotation_same_day(self):
        """Test that daily rotation gives same params same day"""
        user_id = uuid4()
        level_id = uuid4()
        config = {
            "challenge_type": "grover",
            "num_qubits": 3,
            "num_marked": 1,
        }
        
        result1 = generate_challenge_params(user_id, level_id, config, "daily")
        result2 = generate_challenge_params(user_id, level_id, config, "daily")
        
        assert result1["seed"] == result2["seed"]
        assert result1["marked_items"] == result2["marked_items"]
