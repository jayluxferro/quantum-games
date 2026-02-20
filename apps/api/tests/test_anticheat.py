"""Tests for anti-cheat service"""
import pytest
from uuid import uuid4
from datetime import datetime
from unittest.mock import MagicMock, AsyncMock

from app.services.anticheat import AnticheatService, SolutionVerifier
from app.models.user import User, EducationLevel
from app.models.game import Game, Level
from app.models.progress import Progress


class TestTimeAnomalyDetection:
    """Tests for completion time validation"""
    
    @pytest.mark.asyncio
    async def test_valid_completion_time(self, db_session, sample_level):
        """Test that valid completion times pass validation"""
        anticheat = AnticheatService(db_session)
        
        # 10 minute level, 120 seconds is valid (20% of estimated)
        is_valid, error = await anticheat.validate_completion_time(
            level=sample_level,
            time_seconds=120,
        )
        
        assert is_valid is True
        assert error is None
    
    @pytest.mark.asyncio
    async def test_too_fast_completion_rejected(self, db_session, sample_level):
        """Test that impossibly fast completions are rejected"""
        anticheat = AnticheatService(db_session)
        
        # 10 minute level, 3 seconds is way too fast
        is_valid, error = await anticheat.validate_completion_time(
            level=sample_level,
            time_seconds=3,
        )
        
        assert is_valid is False
        assert "below minimum threshold" in error
    
    @pytest.mark.asyncio
    async def test_none_time_passes(self, db_session, sample_level):
        """Test that None time values pass (for games without timing)"""
        anticheat = AnticheatService(db_session)
        
        is_valid, error = await anticheat.validate_completion_time(
            level=sample_level,
            time_seconds=None,
        )
        
        assert is_valid is True
        assert error is None


class TestScoreBoundsValidation:
    """Tests for score bounds validation"""
    
    @pytest.mark.asyncio
    async def test_valid_score(self, db_session, sample_level):
        """Test that valid scores pass"""
        anticheat = AnticheatService(db_session)
        
        is_valid, error = await anticheat.validate_score_bounds(
            score=85,
            max_score=100,
            level=sample_level,
        )
        
        assert is_valid is True
        assert error is None
    
    @pytest.mark.asyncio
    async def test_negative_score_rejected(self, db_session, sample_level):
        """Test that negative scores are rejected"""
        anticheat = AnticheatService(db_session)
        
        is_valid, error = await anticheat.validate_score_bounds(
            score=-10,
            max_score=100,
            level=sample_level,
        )
        
        assert is_valid is False
        assert "cannot be negative" in error
    
    @pytest.mark.asyncio
    async def test_excessive_score_rejected(self, db_session, sample_level):
        """Test that scores exceeding max+10% are rejected"""
        anticheat = AnticheatService(db_session)
        
        is_valid, error = await anticheat.validate_score_bounds(
            score=150,
            max_score=100,
            level=sample_level,
        )
        
        assert is_valid is False
        assert "exceeds maximum" in error
    
    @pytest.mark.asyncio
    async def test_bonus_score_within_tolerance(self, db_session, sample_level):
        """Test that small bonus scores within 10% tolerance pass"""
        anticheat = AnticheatService(db_session)
        
        is_valid, error = await anticheat.validate_score_bounds(
            score=105,
            max_score=100,
            level=sample_level,
        )
        
        assert is_valid is True


class TestPrerequisiteEnforcement:
    """Tests for prerequisite checking"""
    
    @pytest.mark.asyncio
    async def test_first_level_no_prerequisites(self, db_session, sample_user, sample_game, sample_level):
        """Test that first level has no level prerequisites"""
        anticheat = AnticheatService(db_session)
        
        prereqs_met, error, missing = await anticheat.check_prerequisites(
            user=sample_user,
            game=sample_game,
            level=sample_level,
        )
        
        assert prereqs_met is True
        assert error is None
        assert missing == []
    
    @pytest.mark.asyncio
    async def test_second_level_requires_first(self, db_session, sample_user, sample_game):
        """Test that second level requires completing first"""
        anticheat = AnticheatService(db_session)
        
        # Create level 1
        level1 = Level(
            id=uuid4(),
            game_id=sample_game.id,
            sequence=1,
            title="Level 1",
            difficulty=1,
            estimated_minutes=5,
            xp_reward=10,
        )
        db_session.add(level1)
        
        # Create level 2
        level2 = Level(
            id=uuid4(),
            game_id=sample_game.id,
            sequence=2,
            title="Level 2",
            difficulty=2,
            estimated_minutes=10,
            xp_reward=20,
        )
        db_session.add(level2)
        await db_session.commit()
        
        # Try to access level 2 without completing level 1
        prereqs_met, error, missing = await anticheat.check_prerequisites(
            user=sample_user,
            game=sample_game,
            level=level2,
        )
        
        assert prereqs_met is False
        assert error == "Prerequisites not met"
        assert len(missing) == 1
        assert missing[0]["type"] == "level"
        assert missing[0]["sequence"] == 1


class TestEducationTierMastery:
    """Tests for education tier mastery gates"""
    
    @pytest.mark.asyncio
    async def test_basic_school_no_prerequisites(self, db_session, sample_user):
        """Test that basic school level has no tier prerequisites"""
        anticheat = AnticheatService(db_session)
        
        tier_ok, error, details = await anticheat.check_education_tier_mastery(
            user=sample_user,
            target_level=EducationLevel.BASIC_SCHOOL,
        )
        
        assert tier_ok is True
        assert error is None
    
    @pytest.mark.asyncio
    async def test_junior_high_requires_basic_mastery(self, db_session, sample_user):
        """Test that junior high requires basic school mastery"""
        anticheat = AnticheatService(db_session)
        
        # User has no progress in basic school
        tier_ok, error, details = await anticheat.check_education_tier_mastery(
            user=sample_user,
            target_level=EducationLevel.JUNIOR_HIGH,
            min_stars=2,
            min_games_completed=1,
        )
        
        # Should fail - no basic school games completed with 2+ stars
        assert tier_ok is False
        assert "basic_school" in error.lower() or "Basic School" in error


class TestSolutionDiversity:
    """Tests for solution diversity checking"""
    
    @pytest.mark.asyncio
    async def test_unique_solution_passes(self, db_session, sample_user, sample_level):
        """Test that unique solutions pass diversity check"""
        anticheat = AnticheatService(db_session)
        
        solution = {
            "circuit": {
                "num_qubits": 2,
                "operations": [
                    {"gate": "H", "qubits": [0]},
                    {"gate": "CNOT", "qubits": [0, 1]},
                ]
            }
        }
        
        is_unique, warning, details = await anticheat.check_solution_diversity(
            user=sample_user,
            level=sample_level,
            solution=solution,
        )
        
        assert is_unique is True
        assert warning is None
    
    @pytest.mark.asyncio
    async def test_duplicate_solution_detected(self, db_session, sample_level):
        """Test that duplicate solutions are detected"""
        anticheat = AnticheatService(db_session)
        
        # Create two users
        user1 = User(
            id=uuid4(),
            keycloak_id=f"user1-{uuid4()}",
            username="user1",
            email="user1@test.com",
        )
        user2 = User(
            id=uuid4(),
            keycloak_id=f"user2-{uuid4()}",
            username="user2",
            email="user2@test.com",
        )
        db_session.add_all([user1, user2])
        await db_session.commit()
        
        solution = {
            "circuit": {
                "num_qubits": 2,
                "operations": [
                    {"gate": "H", "qubits": [0]},
                    {"gate": "CNOT", "qubits": [0, 1]},
                ]
            }
        }
        
        # User1 submits solution
        progress1 = Progress(
            id=uuid4(),
            user_id=user1.id,
            level_id=sample_level.id,
            score=100,
            best_solution=solution,
        )
        db_session.add(progress1)
        await db_session.commit()
        
        # User2 submits same solution
        is_unique, warning, details = await anticheat.check_solution_diversity(
            user=user2,
            level=sample_level,
            solution=solution,
        )
        
        assert is_unique is False
        assert "exact solution" in warning.lower() or "submitted by" in warning.lower()
        assert details["exact_duplicates"] >= 1
    
    def test_solution_hash_consistency(self, db_session):
        """Test that solution hashing is consistent"""
        anticheat = AnticheatService(db_session)
        
        solution = {"a": 1, "b": 2, "c": [1, 2, 3]}
        
        hash1 = anticheat.compute_solution_hash(solution)
        hash2 = anticheat.compute_solution_hash(solution)
        
        assert hash1 == hash2
        
        # Different order should produce same hash (sorted keys)
        solution_reordered = {"c": [1, 2, 3], "a": 1, "b": 2}
        hash3 = anticheat.compute_solution_hash(solution_reordered)
        
        assert hash1 == hash3


class TestCircuitVerification:
    """Tests for circuit solution verification"""
    
    @pytest.mark.asyncio
    async def test_correct_circuit_passes(self, db_session, sample_level):
        """Test that correct circuit solution passes verification"""
        anticheat = AnticheatService(db_session)
        
        # Level expects Bell state
        sample_level.config = {
            "requires_circuit_verification": True,
            "target_state": {"00": 0.5, "11": 0.5},
        }
        
        solution = {
            "circuit": {
                "num_qubits": 2,
                "operations": [
                    {"gate": "H", "qubits": [0]},
                    {"gate": "CNOT", "qubits": [0, 1]},
                ]
            }
        }
        
        is_valid, error, score = await anticheat.verify_circuit_solution(
            solution=solution,
            level=sample_level,
        )
        
        assert is_valid is True
        assert error is None
        assert score is not None and score > 80
    
    @pytest.mark.asyncio
    async def test_wrong_circuit_fails(self, db_session, sample_level):
        """Test that incorrect circuit solution fails verification"""
        anticheat = AnticheatService(db_session)
        
        sample_level.config = {
            "requires_circuit_verification": True,
            "target_state": {"00": 0.5, "11": 0.5},
        }
        
        # Wrong circuit - just X gate doesn't create Bell state
        solution = {
            "circuit": {
                "num_qubits": 2,
                "operations": [
                    {"gate": "X", "qubits": [0]},
                ]
            }
        }
        
        is_valid, error, score = await anticheat.verify_circuit_solution(
            solution=solution,
            level=sample_level,
        )
        
        assert is_valid is False
        assert "verification failed" in error.lower()
    
    @pytest.mark.asyncio
    async def test_no_verification_required_passes(self, db_session, sample_level):
        """Test that levels without verification pass automatically"""
        anticheat = AnticheatService(db_session)
        
        sample_level.config = {
            "requires_circuit_verification": False,
        }
        
        solution = {"any": "data"}
        
        is_valid, error, score = await anticheat.verify_circuit_solution(
            solution=solution,
            level=sample_level,
        )
        
        assert is_valid is True
        assert error is None
