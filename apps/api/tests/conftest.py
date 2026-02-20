"""Pytest configuration and fixtures for API tests"""
import pytest
import asyncio
from typing import AsyncGenerator, Generator
from uuid import uuid4
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User, EducationLevel
from app.models.game import Game, Level
from app.models.progress import Progress


# Use in-memory SQLite for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def async_engine():
    """Create async engine for each test"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest.fixture(scope="function")
async def db_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create database session for each test"""
    async_session = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    async with async_session() as session:
        yield session


@pytest.fixture
def override_get_db(db_session):
    """Override database dependency"""
    async def _override():
        yield db_session
    return _override


@pytest.fixture
def client(override_get_db) -> TestClient:
    """Create test client with overridden dependencies"""
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
async def async_client(override_get_db) -> AsyncGenerator[AsyncClient, None]:
    """Create async test client"""
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture
async def sample_user(db_session) -> User:
    """Create a sample user for tests"""
    user = User(
        id=uuid4(),
        keycloak_id=f"test-user-{uuid4()}",
        username="testuser",
        email="test@example.com",
        education_level=EducationLevel.JUNIOR_HIGH,
        total_xp=100,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def sample_game(db_session) -> Game:
    """Create a sample game for tests"""
    game = Game(
        id=uuid4(),
        slug="test-game",
        name="Test Game",
        description="A test game",
        target_level=EducationLevel.JUNIOR_HIGH,
        min_age=11,
        quantum_concepts=["superposition", "gates"],
        config={
            "server_side_scoring": True,
            "max_score": 100,
            "verification_type": "circuit",
        },
    )
    db_session.add(game)
    await db_session.commit()
    await db_session.refresh(game)
    return game


@pytest.fixture
async def sample_level(db_session, sample_game) -> Level:
    """Create a sample level for tests"""
    level = Level(
        id=uuid4(),
        game_id=sample_game.id,
        sequence=1,
        title="Test Level 1",
        description="First test level",
        difficulty=3,
        estimated_minutes=10,
        xp_reward=50,
        config={
            "max_score": 100,
            "target_state": {"00": 0.5, "11": 0.5},
            "requires_circuit_verification": True,
        },
    )
    db_session.add(level)
    await db_session.commit()
    await db_session.refresh(level)
    return level


@pytest.fixture
async def sample_progress(db_session, sample_user, sample_level) -> Progress:
    """Create sample progress for tests"""
    progress = Progress(
        id=uuid4(),
        user_id=sample_user.id,
        level_id=sample_level.id,
        score=75,
        max_score=100,
        stars=2,
        attempts=3,
        completed=True,
        completed_at=datetime.utcnow(),
    )
    db_session.add(progress)
    await db_session.commit()
    await db_session.refresh(progress)
    return progress


@pytest.fixture
def mock_token_user():
    """Mock authenticated user token data"""
    return {
        "sub": f"test-user-{uuid4()}",
        "preferred_username": "testuser",
        "email": "test@example.com",
        "realm_access": {"roles": ["student"]},
    }


@pytest.fixture
def auth_headers(mock_token_user):
    """Mock authorization headers"""
    return {"Authorization": "Bearer mock-token"}
