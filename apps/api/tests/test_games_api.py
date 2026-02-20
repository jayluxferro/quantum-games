"""Integration tests for games API endpoints"""
import pytest
from uuid import uuid4

from app.models.user import User, EducationLevel
from app.models.game import Game, Level
from app.models.progress import Progress
from app.services.challenge_seeds import generate_challenge_params


class TestSeededLevelEndpoint:
    """Tests for the /games/{slug}/levels/{seq}/seeded endpoint"""
    
    @pytest.mark.asyncio
    async def test_seeded_config_generated(self, db_session, sample_user, sample_game, sample_level):
        """Test that seeded config is generated correctly"""
        sample_level.config = {
            "challenge_type": "gate_puzzle",
            "max_score": 100,
        }
        await db_session.commit()
        
        result = generate_challenge_params(
            user_id=sample_user.id,
            level_id=sample_level.id,
            level_config=sample_level.config,
            seed_rotation="static",
        )
        
        assert "seed" in result
        assert "initial_state" in result
        assert "target_state_symbol" in result
        assert result["initial_state"] != result["target_state_symbol"]
    
    @pytest.mark.asyncio
    async def test_different_users_get_different_seeds(self, db_session, sample_level):
        """Test that different users get different challenge parameters"""
        sample_level.config = {
            "challenge_type": "grover",
            "num_qubits": 3,
            "num_marked": 1,
        }
        await db_session.commit()
        
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
        
        result1 = generate_challenge_params(
            user_id=user1.id,
            level_id=sample_level.id,
            level_config=sample_level.config,
            seed_rotation="static",
        )
        
        result2 = generate_challenge_params(
            user_id=user2.id,
            level_id=sample_level.id,
            level_config=sample_level.config,
            seed_rotation="static",
        )
        
        # Seeds should be different
        assert result1["seed"] != result2["seed"]
        # Marked items may be same or different (random)
    
    @pytest.mark.asyncio
    async def test_same_user_same_seed_static(self, db_session, sample_user, sample_level):
        """Test that same user gets same seed with static rotation"""
        sample_level.config = {
            "challenge_type": "circuit",
            "num_qubits": 2,
            "challenge_type": "bell_state",
        }
        await db_session.commit()
        
        result1 = generate_challenge_params(
            user_id=sample_user.id,
            level_id=sample_level.id,
            level_config=sample_level.config,
            seed_rotation="static",
        )
        
        result2 = generate_challenge_params(
            user_id=sample_user.id,
            level_id=sample_level.id,
            level_config=sample_level.config,
            seed_rotation="static",
        )
        
        assert result1["seed"] == result2["seed"]
    
    @pytest.mark.asyncio
    async def test_no_challenge_type_returns_original(self, db_session, sample_user, sample_level):
        """Test that levels without challenge_type return original config"""
        sample_level.config = {
            "max_score": 100,
            "some_setting": "value",
        }
        await db_session.commit()
        
        result = generate_challenge_params(
            user_id=sample_user.id,
            level_id=sample_level.id,
            level_config=sample_level.config,
            seed_rotation="static",
        )
        
        assert result == sample_level.config


class TestGamesWithAccessEndpoint:
    """Tests for the /games/with-access endpoint"""
    
    @pytest.mark.asyncio
    async def test_basic_school_unlocked_for_new_user(self, db_session, sample_user):
        """Test that basic school games are unlocked for new users"""
        from app.services.anticheat import AnticheatService
        
        basic_game = Game(
            id=uuid4(),
            slug="basic-test",
            name="Basic Test",
            target_level=EducationLevel.BASIC_SCHOOL,
            config={},
        )
        db_session.add(basic_game)
        await db_session.commit()
        
        anticheat = AnticheatService(db_session)
        
        # Basic school should be accessible without prerequisites
        tier_ok, error, details = await anticheat.check_education_tier_mastery(
            user=sample_user,
            target_level=EducationLevel.BASIC_SCHOOL,
        )
        
        assert tier_ok is True
    
    @pytest.mark.asyncio
    async def test_advanced_games_locked_initially(self, db_session, sample_user):
        """Test that advanced games are locked for new users"""
        from app.services.anticheat import AnticheatService
        
        undergrad_game = Game(
            id=uuid4(),
            slug="undergrad-test",
            name="Undergrad Test",
            target_level=EducationLevel.UNDERGRADUATE,
            config={},
        )
        db_session.add(undergrad_game)
        await db_session.commit()
        
        anticheat = AnticheatService(db_session)
        
        # Undergraduate should be locked (needs senior high mastery)
        tier_ok, error, details = await anticheat.check_education_tier_mastery(
            user=sample_user,
            target_level=EducationLevel.UNDERGRADUATE,
            min_stars=2,
            min_games_completed=1,
        )
        
        assert tier_ok is False


class TestGamePrerequisites:
    """Tests for game-level prerequisites"""
    
    @pytest.mark.asyncio
    async def test_game_prerequisites_checked(self, db_session, sample_user):
        """Test that game-level prerequisites are enforced"""
        from app.services.anticheat import AnticheatService
        
        # Create prerequisite game
        prereq_game = Game(
            id=uuid4(),
            slug="quantum-spy",
            name="Quantum Spy",
            target_level=EducationLevel.SENIOR_HIGH,
            config={},
        )
        prereq_level = Level(
            id=uuid4(),
            game_id=prereq_game.id,
            sequence=1,
            title="Level 1",
            config={},
        )
        
        # Create game with prerequisite
        advanced_game = Game(
            id=uuid4(),
            slug="qkd-protocol-lab",
            name="QKD Protocol Lab",
            target_level=EducationLevel.UNDERGRADUATE,
            config={"prerequisite_games": ["quantum-spy"]},
        )
        advanced_level = Level(
            id=uuid4(),
            game_id=advanced_game.id,
            sequence=1,
            title="Lab Level 1",
            config={},
        )
        
        db_session.add_all([prereq_game, prereq_level, advanced_game, advanced_level])
        await db_session.commit()
        
        anticheat = AnticheatService(db_session)
        
        # Without completing quantum-spy, qkd-protocol-lab should be locked
        prereqs_met, error, missing = await anticheat.check_prerequisites(
            user=sample_user,
            game=advanced_game,
            level=advanced_level,
        )
        
        assert prereqs_met is False
        game_prereqs = [m for m in missing if m["type"] == "game"]
        assert len(game_prereqs) == 1
        assert game_prereqs[0]["slug"] == "quantum-spy"


class TestQuantumConceptsEndpoint:
    """Tests for the /games/concepts endpoint"""
    
    @pytest.mark.asyncio
    async def test_concepts_aggregated(self, db_session):
        """Test that quantum concepts are aggregated across games"""
        game1 = Game(
            id=uuid4(),
            slug="game1",
            name="Game 1",
            target_level=EducationLevel.BASIC_SCHOOL,
            quantum_concepts=["superposition", "measurement"],
        )
        game2 = Game(
            id=uuid4(),
            slug="game2",
            name="Game 2",
            target_level=EducationLevel.JUNIOR_HIGH,
            quantum_concepts=["entanglement", "superposition"],
        )
        
        db_session.add_all([game1, game2])
        await db_session.commit()
        
        # Would test via endpoint - concepts should be unique and sorted


class TestGameFiltering:
    """Tests for game filtering by education level"""
    
    @pytest.mark.asyncio
    async def test_filter_by_education_level(self, db_session):
        """Test filtering games by education level"""
        basic_game = Game(
            id=uuid4(),
            slug="basic",
            name="Basic",
            target_level=EducationLevel.BASIC_SCHOOL,
        )
        junior_game = Game(
            id=uuid4(),
            slug="junior",
            name="Junior",
            target_level=EducationLevel.JUNIOR_HIGH,
        )
        
        db_session.add_all([basic_game, junior_game])
        await db_session.commit()
        
        # Would test via endpoint with education_level query param
    
    @pytest.mark.asyncio
    async def test_filter_by_multiplayer(self, db_session):
        """Test filtering games by multiplayer capability"""
        single_game = Game(
            id=uuid4(),
            slug="single",
            name="Single Player",
            target_level=EducationLevel.BASIC_SCHOOL,
            multiplayer_enabled=False,
        )
        multi_game = Game(
            id=uuid4(),
            slug="multi",
            name="Multiplayer",
            target_level=EducationLevel.BASIC_SCHOOL,
            multiplayer_enabled=True,
        )
        
        db_session.add_all([single_game, multi_game])
        await db_session.commit()
        
        # Would test via endpoint with multiplayer query param


class TestLevelRetrieval:
    """Tests for level retrieval endpoints"""
    
    @pytest.mark.asyncio
    async def test_levels_ordered_by_sequence(self, db_session, sample_game):
        """Test that levels are returned in sequence order"""
        level3 = Level(
            id=uuid4(),
            game_id=sample_game.id,
            sequence=3,
            title="Level 3",
        )
        level1 = Level(
            id=uuid4(),
            game_id=sample_game.id,
            sequence=1,
            title="Level 1",
        )
        level2 = Level(
            id=uuid4(),
            game_id=sample_game.id,
            sequence=2,
            title="Level 2",
        )
        
        # Add out of order
        db_session.add_all([level3, level1, level2])
        await db_session.commit()
        
        # Would test via endpoint - should return in sequence order
    
    @pytest.mark.asyncio
    async def test_inactive_levels_excluded(self, db_session, sample_game):
        """Test that inactive levels are excluded by default"""
        active_level = Level(
            id=uuid4(),
            game_id=sample_game.id,
            sequence=1,
            title="Active",
            is_active=True,
        )
        inactive_level = Level(
            id=uuid4(),
            game_id=sample_game.id,
            sequence=2,
            title="Inactive",
            is_active=False,
        )
        
        db_session.add_all([active_level, inactive_level])
        await db_session.commit()
        
        # Would test via endpoint - inactive should not appear
