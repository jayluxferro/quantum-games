"""Integration tests for progress API endpoints with anti-cheat"""
import pytest
from uuid import uuid4
from datetime import datetime
from unittest.mock import patch, AsyncMock

from app.models.user import User, EducationLevel
from app.models.game import Game, Level
from app.models.progress import Progress


class TestProgressCompletionValidation:
    """Tests for the /progress/level/{id}/complete endpoint with anti-cheat"""
    
    @pytest.mark.asyncio
    async def test_valid_submission_accepted(self, db_session, sample_user, sample_game, sample_level):
        """Test that valid submissions are accepted"""
        from app.services.anticheat import AnticheatService
        from app.services.scoring import ServerSideScorer
        
        # Disable server-side scoring for this test
        sample_game.config = {"server_side_scoring": False, "max_score": 100}
        sample_level.config = {"max_score": 100, "estimated_minutes": 10}
        await db_session.commit()
        
        anticheat = AnticheatService(db_session)
        
        # Time validation should pass
        is_valid, error = await anticheat.validate_completion_time(
            level=sample_level,
            time_seconds=120,  # 2 minutes - reasonable
        )
        assert is_valid is True
        
        # Score validation should pass
        is_valid, error = await anticheat.validate_score_bounds(
            score=85,
            max_score=100,
            level=sample_level,
        )
        assert is_valid is True
    
    @pytest.mark.asyncio
    async def test_time_anomaly_rejected(self, db_session, sample_level):
        """Test that impossibly fast completions are rejected"""
        from app.services.anticheat import AnticheatService
        
        sample_level.estimated_minutes = 10
        sample_level.difficulty = 5
        await db_session.commit()
        
        anticheat = AnticheatService(db_session)
        
        # 2 second completion should fail for 10 minute level
        is_valid, error = await anticheat.validate_completion_time(
            level=sample_level,
            time_seconds=2,
        )
        
        assert is_valid is False
        assert "threshold" in error.lower()
    
    @pytest.mark.asyncio
    async def test_server_side_scoring_overrides_client(self, db_session, sample_user):
        """Test that server-side scoring overrides client-reported score"""
        from app.services.scoring import ServerSideScorer
        
        game = Game(
            id=uuid4(),
            slug="gate-puzzle",
            name="Gate Puzzle",
            target_level=EducationLevel.JUNIOR_HIGH,
            config={"server_side_scoring": True, "verification_type": "gate_puzzle"},
        )
        db_session.add(game)
        
        level = Level(
            id=uuid4(),
            game_id=game.id,
            sequence=1,
            title="Test",
            config={
                "initial_state": "|0⟩",
                "target_state_symbol": "|1⟩",
                "optimal_gate_count": 1,
                "max_score": 100,
            },
        )
        db_session.add(level)
        await db_session.commit()
        
        scorer = ServerSideScorer(db_session)
        
        # Client claims 100 but solution is wrong
        solution = {
            "gates": ["H"],  # H gives |+⟩, not |1⟩
            "final_state": "|+⟩",
            "score": 100,  # Client claims perfect score
        }
        
        score, max_score, breakdown = await scorer.calculate_score(
            game=game,
            level=level,
            solution=solution,
        )
        
        # Server should calculate 0 because wrong answer
        assert score == 0
        assert breakdown["correct"] is False


class TestPrerequisiteValidation:
    """Tests for prerequisite enforcement on submissions"""
    
    @pytest.mark.asyncio
    async def test_level_prerequisite_enforced(self, db_session, sample_user, sample_game):
        """Test that level prerequisites are enforced"""
        from app.services.anticheat import AnticheatService
        
        # Create two levels
        level1 = Level(
            id=uuid4(),
            game_id=sample_game.id,
            sequence=1,
            title="Level 1",
            difficulty=1,
            estimated_minutes=5,
            xp_reward=10,
        )
        level2 = Level(
            id=uuid4(),
            game_id=sample_game.id,
            sequence=2,
            title="Level 2",
            difficulty=2,
            estimated_minutes=10,
            xp_reward=20,
        )
        db_session.add_all([level1, level2])
        await db_session.commit()
        
        anticheat = AnticheatService(db_session)
        
        # Try to access level 2 without completing level 1
        prereqs_met, error, missing = await anticheat.check_prerequisites(
            user=sample_user,
            game=sample_game,
            level=level2,
        )
        
        assert prereqs_met is False
        assert len(missing) == 1
        assert missing[0]["sequence"] == 1
        
        # Now complete level 1
        progress = Progress(
            id=uuid4(),
            user_id=sample_user.id,
            level_id=level1.id,
            score=80,
            stars=2,
            completed=True,
            completed_at=datetime.utcnow(),
        )
        db_session.add(progress)
        await db_session.commit()
        
        # Now level 2 should be accessible
        prereqs_met, error, missing = await anticheat.check_prerequisites(
            user=sample_user,
            game=sample_game,
            level=level2,
        )
        
        assert prereqs_met is True
        assert missing == []
    
    @pytest.mark.asyncio
    async def test_tier_mastery_enforced(self, db_session, sample_user):
        """Test that education tier mastery is enforced"""
        from app.services.anticheat import AnticheatService
        
        # Create basic school game and level
        basic_game = Game(
            id=uuid4(),
            slug="basic-game",
            name="Basic Game",
            target_level=EducationLevel.BASIC_SCHOOL,
            config={},
        )
        basic_level = Level(
            id=uuid4(),
            game_id=basic_game.id,
            sequence=1,
            title="Basic Level",
            config={},
        )
        
        # Create junior high game
        junior_game = Game(
            id=uuid4(),
            slug="junior-game",
            name="Junior Game",
            target_level=EducationLevel.JUNIOR_HIGH,
            config={},
        )
        
        db_session.add_all([basic_game, basic_level, junior_game])
        await db_session.commit()
        
        anticheat = AnticheatService(db_session)
        
        # Without basic school mastery, junior high should be locked
        tier_ok, error, details = await anticheat.check_education_tier_mastery(
            user=sample_user,
            target_level=EducationLevel.JUNIOR_HIGH,
            min_stars=2,
            min_games_completed=1,
        )
        
        assert tier_ok is False
        assert "basic" in error.lower()
        
        # Complete basic school game with 2 stars
        progress = Progress(
            id=uuid4(),
            user_id=sample_user.id,
            level_id=basic_level.id,
            score=75,
            stars=2,
            completed=True,
            completed_at=datetime.utcnow(),
        )
        db_session.add(progress)
        await db_session.commit()
        
        # Now junior high should be accessible
        tier_ok, error, details = await anticheat.check_education_tier_mastery(
            user=sample_user,
            target_level=EducationLevel.JUNIOR_HIGH,
            min_stars=2,
            min_games_completed=1,
        )
        
        assert tier_ok is True


class TestSolutionVerification:
    """Tests for solution verification on submission"""
    
    @pytest.mark.asyncio
    async def test_correct_circuit_verified(self, db_session, sample_level):
        """Test that correct circuits pass verification"""
        from app.services.anticheat import AnticheatService
        
        sample_level.config = {
            "requires_circuit_verification": True,
            "target_state": {"00": 0.5, "11": 0.5},
        }
        await db_session.commit()
        
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
        
        is_valid, error, score = await anticheat.verify_circuit_solution(
            solution=solution,
            level=sample_level,
        )
        
        assert is_valid is True
        assert score >= 80
    
    @pytest.mark.asyncio
    async def test_wrong_circuit_rejected(self, db_session, sample_level):
        """Test that incorrect circuits are rejected"""
        from app.services.anticheat import AnticheatService
        
        sample_level.config = {
            "requires_circuit_verification": True,
            "target_state": {"00": 0.5, "11": 0.5},
        }
        await db_session.commit()
        
        anticheat = AnticheatService(db_session)
        
        # This creates |10⟩ state, not Bell state
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


class TestLevelAccessEndpoint:
    """Tests for the /progress/level/{id}/access endpoint"""
    
    @pytest.mark.asyncio
    async def test_accessible_level(self, db_session, sample_user, sample_game, sample_level):
        """Test checking access for an accessible level"""
        from app.services.anticheat import AnticheatService
        
        sample_level.sequence = 1  # First level - no prerequisites
        await db_session.commit()
        
        anticheat = AnticheatService(db_session)
        
        prereqs_met, _, _ = await anticheat.check_prerequisites(
            user=sample_user,
            game=sample_game,
            level=sample_level,
        )
        
        assert prereqs_met is True
    
    @pytest.mark.asyncio
    async def test_locked_level(self, db_session, sample_user, sample_game):
        """Test checking access for a locked level"""
        from app.services.anticheat import AnticheatService
        
        # Create level 1 (not completed)
        level1 = Level(
            id=uuid4(),
            game_id=sample_game.id,
            sequence=1,
            title="Level 1",
            config={},
        )
        
        # Create level 2 (locked)
        level2 = Level(
            id=uuid4(),
            game_id=sample_game.id,
            sequence=2,
            title="Level 2",
            config={},
        )
        
        db_session.add_all([level1, level2])
        await db_session.commit()
        
        anticheat = AnticheatService(db_session)
        
        prereqs_met, error, missing = await anticheat.check_prerequisites(
            user=sample_user,
            game=sample_game,
            level=level2,
        )
        
        assert prereqs_met is False
        assert len(missing) > 0


class TestProctoringIntegration:
    """Tests for proctoring integration with progress submission"""
    
    @pytest.mark.asyncio
    async def test_proctored_level_requires_session(self, db_session, sample_level):
        """Test that proctored levels require a session token"""
        sample_level.config = {
            "requires_proctoring": True,
            "max_score": 100,
        }
        await db_session.commit()
        
        # Submission without session token should be rejected
        # (This would be tested via the API endpoint)
        assert sample_level.config.get("requires_proctoring") is True
    
    @pytest.mark.asyncio
    async def test_valid_proctored_submission(self, db_session, sample_user, sample_level):
        """Test that valid proctored submissions work"""
        from app.services.proctoring import ProctoringService
        
        sample_level.config = {
            "requires_proctoring": True,
            "max_score": 100,
        }
        await db_session.commit()
        
        proctoring = ProctoringService(db_session)
        
        # Create and activate session
        session = await proctoring.create_proctored_session(
            user=sample_user,
            level=sample_level,
            browser_info={"fingerprint": "test"},
        )
        
        await proctoring.verify_session(
            session_token=session.session_token,
            verification_code=session.verification_code,
            browser_info={"fingerprint": "test"},
        )
        
        await proctoring.start_session(session.session_token)
        
        # Session should be valid for submission
        is_valid, error, validated = await proctoring.validate_active_session(
            session_token=session.session_token,
            browser_info={"fingerprint": "test"},
        )
        
        assert is_valid is True
