"""Tests for server-side scoring service"""
import pytest
from uuid import uuid4

from app.services.scoring import ServerSideScorer
from app.models.user import EducationLevel
from app.models.game import Game, Level


class TestCircuitArchitectScoring:
    """Tests for Circuit Architect game scoring"""
    
    @pytest.mark.asyncio
    async def test_correct_bell_state_full_score(self, db_session):
        """Test that correct Bell state circuit gets high score"""
        scorer = ServerSideScorer(db_session)
        
        game = Game(
            id=uuid4(),
            slug="circuit-architect",
            name="Circuit Architect",
            target_level=EducationLevel.SENIOR_HIGH,
            config={"verification_type": "circuit"},
        )
        
        level = Level(
            id=uuid4(),
            game_id=game.id,
            sequence=1,
            title="Bell State",
            config={
                "target_state": {"00": 0.5, "11": 0.5},
                "optimal_gate_count": 2,
            },
        )
        
        solution = {
            "circuit": {
                "num_qubits": 2,
                "operations": [
                    {"gate": "H", "qubits": [0]},
                    {"gate": "CNOT", "qubits": [0, 1]},
                ]
            }
        }
        
        score, max_score, breakdown = await scorer.calculate_score(
            game=game,
            level=level,
            solution=solution,
        )
        
        assert score >= 90
        assert max_score == 100
        assert breakdown["matches"] is True
        assert breakdown["efficiency_bonus"] > 0
    
    @pytest.mark.asyncio
    async def test_inefficient_circuit_reduced_score(self, db_session):
        """Test that inefficient circuits get reduced efficiency bonus"""
        scorer = ServerSideScorer(db_session)
        
        game = Game(
            id=uuid4(),
            slug="circuit-architect",
            name="Circuit Architect",
            target_level=EducationLevel.SENIOR_HIGH,
            config={"verification_type": "circuit"},
        )
        
        level = Level(
            id=uuid4(),
            game_id=game.id,
            sequence=1,
            title="Bell State",
            config={
                "target_state": {"00": 0.5, "11": 0.5},
                "optimal_gate_count": 2,
            },
        )
        
        # Correct but inefficient - extra identity gates
        solution = {
            "circuit": {
                "num_qubits": 2,
                "operations": [
                    {"gate": "H", "qubits": [0]},
                    {"gate": "I", "qubits": [0]},
                    {"gate": "I", "qubits": [1]},
                    {"gate": "I", "qubits": [0]},
                    {"gate": "CNOT", "qubits": [0, 1]},
                ]
            }
        }
        
        score, max_score, breakdown = await scorer.calculate_score(
            game=game,
            level=level,
            solution=solution,
        )
        
        assert score < 100
        assert breakdown["gate_count"] == 5
        assert breakdown["efficiency_bonus"] < 30


class TestGroversMazeScoring:
    """Tests for Grover's Maze game scoring"""
    
    @pytest.mark.asyncio
    async def test_correct_item_found(self, db_session):
        """Test scoring when correct marked item is found"""
        scorer = ServerSideScorer(db_session)
        
        game = Game(
            id=uuid4(),
            slug="grovers-maze",
            name="Grover's Maze",
            target_level=EducationLevel.UNDERGRADUATE,
            config={"verification_type": "algorithm"},
        )
        
        level = Level(
            id=uuid4(),
            game_id=game.id,
            sequence=1,
            title="Find the Exit",
            config={
                "marked_items": [5, 7],
                "optimal_iterations": 2,
                "algorithm": "grover",
            },
        )
        
        solution = {
            "found_item": 5,
            "iterations": 2,
        }
        
        score, max_score, breakdown = await scorer.calculate_score(
            game=game,
            level=level,
            solution=solution,
        )
        
        assert score == 100
        assert breakdown["found_correct"] is True
        assert breakdown["iteration_bonus"] == 40
    
    @pytest.mark.asyncio
    async def test_wrong_item_zero_score(self, db_session):
        """Test that finding wrong item gives zero score"""
        scorer = ServerSideScorer(db_session)
        
        game = Game(
            id=uuid4(),
            slug="grovers-maze",
            name="Grover's Maze",
            target_level=EducationLevel.UNDERGRADUATE,
            config={"verification_type": "algorithm"},
        )
        
        level = Level(
            id=uuid4(),
            game_id=game.id,
            sequence=1,
            title="Find the Exit",
            config={
                "marked_items": [5, 7],
                "optimal_iterations": 2,
                "algorithm": "grover",
            },
        )
        
        solution = {
            "found_item": 3,  # Wrong item
            "iterations": 2,
        }
        
        score, max_score, breakdown = await scorer.calculate_score(
            game=game,
            level=level,
            solution=solution,
        )
        
        assert score == 0
        assert breakdown["found_correct"] is False
    
    @pytest.mark.asyncio
    async def test_extra_iterations_penalty(self, db_session):
        """Test that extra iterations reduce score"""
        scorer = ServerSideScorer(db_session)
        
        game = Game(
            id=uuid4(),
            slug="grovers-maze",
            name="Grover's Maze",
            target_level=EducationLevel.UNDERGRADUATE,
            config={"verification_type": "algorithm"},
        )
        
        level = Level(
            id=uuid4(),
            game_id=game.id,
            sequence=1,
            title="Find the Exit",
            config={
                "marked_items": [5],
                "optimal_iterations": 2,
                "algorithm": "grover",
            },
        )
        
        solution = {
            "found_item": 5,
            "iterations": 5,  # 3 extra iterations
        }
        
        score, max_score, breakdown = await scorer.calculate_score(
            game=game,
            level=level,
            solution=solution,
        )
        
        assert score < 100
        assert breakdown["iteration_bonus"] < 40


class TestDeutschChallengeScoring:
    """Tests for Deutsch-Jozsa challenge scoring"""
    
    @pytest.mark.asyncio
    async def test_quantum_solution_full_score(self, db_session):
        """Test that quantum solution (1 query) gets full score"""
        scorer = ServerSideScorer(db_session)
        
        game = Game(
            id=uuid4(),
            slug="deutsch-challenge",
            name="Deutsch Challenge",
            target_level=EducationLevel.UNDERGRADUATE,
            config={"verification_type": "algorithm"},
        )
        
        level = Level(
            id=uuid4(),
            game_id=game.id,
            sequence=1,
            title="Identify Oracle",
            config={
                "oracle_type": "balanced",
                "algorithm": "deutsch_jozsa",
            },
        )
        
        solution = {
            "answer": "balanced",
            "queries": 1,
        }
        
        score, max_score, breakdown = await scorer.calculate_score(
            game=game,
            level=level,
            solution=solution,
        )
        
        assert score == 100
        assert breakdown["approach"] == "quantum"
    
    @pytest.mark.asyncio
    async def test_classical_solution_reduced_score(self, db_session):
        """Test that classical solution (multiple queries) gets reduced score"""
        scorer = ServerSideScorer(db_session)
        
        game = Game(
            id=uuid4(),
            slug="deutsch-challenge",
            name="Deutsch Challenge",
            target_level=EducationLevel.UNDERGRADUATE,
            config={"verification_type": "algorithm"},
        )
        
        level = Level(
            id=uuid4(),
            game_id=game.id,
            sequence=1,
            title="Identify Oracle",
            config={
                "oracle_type": "constant",
                "algorithm": "deutsch_jozsa",
            },
        )
        
        solution = {
            "answer": "constant",
            "queries": 3,  # Classical approach
        }
        
        score, max_score, breakdown = await scorer.calculate_score(
            game=game,
            level=level,
            solution=solution,
        )
        
        assert score < 100
        assert breakdown["approach"] == "classical"
    
    @pytest.mark.asyncio
    async def test_wrong_answer_zero_score(self, db_session):
        """Test that wrong answer gives zero score"""
        scorer = ServerSideScorer(db_session)
        
        game = Game(
            id=uuid4(),
            slug="deutsch-challenge",
            name="Deutsch Challenge",
            target_level=EducationLevel.UNDERGRADUATE,
            config={"verification_type": "algorithm"},
        )
        
        level = Level(
            id=uuid4(),
            game_id=game.id,
            sequence=1,
            title="Identify Oracle",
            config={
                "oracle_type": "balanced",
                "algorithm": "deutsch_jozsa",
            },
        )
        
        solution = {
            "answer": "constant",  # Wrong!
            "queries": 1,
        }
        
        score, max_score, breakdown = await scorer.calculate_score(
            game=game,
            level=level,
            solution=solution,
        )
        
        assert score == 0
        assert breakdown["correct"] is False


class TestGatePuzzleScoring:
    """Tests for Gate Puzzle game scoring"""
    
    @pytest.mark.asyncio
    async def test_optimal_gate_sequence(self, db_session):
        """Test optimal gate sequence gets full score"""
        scorer = ServerSideScorer(db_session)
        
        game = Game(
            id=uuid4(),
            slug="gate-puzzle",
            name="Gate Puzzle",
            target_level=EducationLevel.JUNIOR_HIGH,
            config={"verification_type": "gate_puzzle"},
        )
        
        level = Level(
            id=uuid4(),
            game_id=game.id,
            sequence=1,
            title="Transform State",
            config={
                "initial_state": "|0⟩",
                "target_state_symbol": "|+⟩",
                "optimal_gate_count": 1,
            },
        )
        
        solution = {
            "gates": ["H"],
            "final_state": "|+⟩",
        }
        
        score, max_score, breakdown = await scorer.calculate_score(
            game=game,
            level=level,
            solution=solution,
        )
        
        assert score == 100
        assert breakdown["correct"] is True
        assert breakdown["efficiency_bonus"] == 40
    
    @pytest.mark.asyncio
    async def test_wrong_final_state_zero_score(self, db_session):
        """Test wrong final state gives zero score"""
        scorer = ServerSideScorer(db_session)
        
        game = Game(
            id=uuid4(),
            slug="gate-puzzle",
            name="Gate Puzzle",
            target_level=EducationLevel.JUNIOR_HIGH,
            config={"verification_type": "gate_puzzle"},
        )
        
        level = Level(
            id=uuid4(),
            game_id=game.id,
            sequence=1,
            title="Transform State",
            config={
                "initial_state": "|0⟩",
                "target_state_symbol": "|+⟩",
                "optimal_gate_count": 1,
            },
        )
        
        solution = {
            "gates": ["X"],  # X gives |1⟩, not |+⟩
            "final_state": "|1⟩",
        }
        
        score, max_score, breakdown = await scorer.calculate_score(
            game=game,
            level=level,
            solution=solution,
        )
        
        assert score == 0
        assert breakdown["correct"] is False


class TestDefaultScoring:
    """Tests for default scoring behavior"""
    
    @pytest.mark.asyncio
    async def test_unknown_game_uses_client_score(self, db_session):
        """Test that unknown games use validated client score"""
        scorer = ServerSideScorer(db_session)
        
        game = Game(
            id=uuid4(),
            slug="unknown-game",
            name="Unknown Game",
            target_level=EducationLevel.BASIC_SCHOOL,
            config={},
        )
        
        level = Level(
            id=uuid4(),
            game_id=game.id,
            sequence=1,
            title="Level 1",
            config={"max_score": 100},
        )
        
        solution = {
            "score": 75,
        }
        
        score, max_score, breakdown = await scorer.calculate_score(
            game=game,
            level=level,
            solution=solution,
        )
        
        assert score == 75
        assert breakdown["method"] == "client_reported"
    
    @pytest.mark.asyncio
    async def test_client_score_bounded_to_max(self, db_session):
        """Test that client scores are bounded to max_score"""
        scorer = ServerSideScorer(db_session)
        
        game = Game(
            id=uuid4(),
            slug="unknown-game",
            name="Unknown Game",
            target_level=EducationLevel.BASIC_SCHOOL,
            config={},
        )
        
        level = Level(
            id=uuid4(),
            game_id=game.id,
            sequence=1,
            title="Level 1",
            config={"max_score": 100},
        )
        
        solution = {
            "score": 999,  # Way over max
        }
        
        score, max_score, breakdown = await scorer.calculate_score(
            game=game,
            level=level,
            solution=solution,
        )
        
        assert score <= 100
