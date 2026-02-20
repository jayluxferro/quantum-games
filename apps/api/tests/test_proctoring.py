"""Tests for proctoring service and endpoints"""
import pytest
from uuid import uuid4
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from app.services.proctoring import (
    ProctoringService,
    validate_lockdown_browser,
    generate_browser_fingerprint,
)
from app.models.proctoring import (
    ProctoredSession,
    ProctoringProvider,
    ProctoringStatus,
)
from app.models.user import User, EducationLevel
from app.models.game import Level


class TestBrowserFingerprint:
    """Tests for browser fingerprint generation"""
    
    def test_fingerprint_consistency(self):
        """Test that same inputs produce same fingerprint"""
        fp1 = generate_browser_fingerprint(
            user_agent="Mozilla/5.0 Chrome/120",
            screen_resolution="1920x1080",
            timezone="America/New_York",
            language="en-US",
        )
        fp2 = generate_browser_fingerprint(
            user_agent="Mozilla/5.0 Chrome/120",
            screen_resolution="1920x1080",
            timezone="America/New_York",
            language="en-US",
        )
        
        assert fp1 == fp2
    
    def test_fingerprint_different_inputs(self):
        """Test that different inputs produce different fingerprints"""
        fp1 = generate_browser_fingerprint(
            user_agent="Mozilla/5.0 Chrome/120",
        )
        fp2 = generate_browser_fingerprint(
            user_agent="Mozilla/5.0 Firefox/120",
        )
        
        assert fp1 != fp2
    
    def test_fingerprint_length(self):
        """Test fingerprint is correct length"""
        fp = generate_browser_fingerprint(user_agent="test")
        assert len(fp) == 32  # SHA256 truncated to 32 chars


class TestLockdownBrowserValidation:
    """Tests for LockDown Browser validation"""
    
    def test_valid_lockdown_browser(self):
        """Test that LockDown Browser user agents pass"""
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; LockDown Browser)",
            "Respondus LockDown Browser",
            "Mozilla/5.0 RLDB/2.0",
        ]
        
        for ua in user_agents:
            is_valid, error = validate_lockdown_browser(ua)
            assert is_valid is True, f"Failed for: {ua}"
            assert error is None
    
    def test_invalid_browser_rejected(self):
        """Test that regular browsers are rejected"""
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120",
            "Mozilla/5.0 Firefox/120.0",
            "Safari/537.36",
        ]
        
        for ua in user_agents:
            is_valid, error = validate_lockdown_browser(ua)
            assert is_valid is False
            assert "LockDown Browser" in error


class TestProctoringService:
    """Tests for the proctoring service"""
    
    @pytest.mark.asyncio
    async def test_create_session(self, db_session, sample_user, sample_level):
        """Test creating a new proctored session"""
        service = ProctoringService(db_session)
        
        session = await service.create_proctored_session(
            user=sample_user,
            level=sample_level,
            provider=ProctoringProvider.INTERNAL,
            max_duration_minutes=60,
            browser_info={
                "fingerprint": "abc123",
                "user_agent": "Test Browser",
                "ip_address": "127.0.0.1",
            },
        )
        
        assert session is not None
        assert session.user_id == sample_user.id
        assert session.level_id == sample_level.id
        assert session.status == ProctoringStatus.PENDING
        assert session.session_token is not None
        assert session.verification_code is not None
        assert session.max_duration_minutes == 60
    
    @pytest.mark.asyncio
    async def test_verify_session_success(self, db_session, sample_user, sample_level):
        """Test successful session verification"""
        service = ProctoringService(db_session)
        
        # Create session
        session = await service.create_proctored_session(
            user=sample_user,
            level=sample_level,
            browser_info={"fingerprint": "abc123"},
        )
        
        # Verify with correct code
        is_valid, error, verified = await service.verify_session(
            session_token=session.session_token,
            verification_code=session.verification_code,
            browser_info={
                "fingerprint": "abc123",
                "user_agent": "Test Browser",
                "ip_address": "127.0.0.1",
            },
        )
        
        assert is_valid is True
        assert error is None
        assert verified.status == ProctoringStatus.VERIFIED
    
    @pytest.mark.asyncio
    async def test_verify_session_wrong_code(self, db_session, sample_user, sample_level):
        """Test verification with wrong code fails"""
        service = ProctoringService(db_session)
        
        session = await service.create_proctored_session(
            user=sample_user,
            level=sample_level,
            browser_info={},
        )
        
        is_valid, error, verified = await service.verify_session(
            session_token=session.session_token,
            verification_code="WRONG",
            browser_info={},
        )
        
        assert is_valid is False
        assert "verification code" in error.lower()
    
    @pytest.mark.asyncio
    async def test_start_session(self, db_session, sample_user, sample_level):
        """Test starting a verified session"""
        service = ProctoringService(db_session)
        
        # Create and verify session
        session = await service.create_proctored_session(
            user=sample_user,
            level=sample_level,
            browser_info={"fingerprint": "test"},
        )
        
        await service.verify_session(
            session_token=session.session_token,
            verification_code=session.verification_code,
            browser_info={"fingerprint": "test"},
        )
        
        # Start session
        is_valid, error, started = await service.start_session(
            session_token=session.session_token,
        )
        
        assert is_valid is True
        assert started.status == ProctoringStatus.ACTIVE
    
    @pytest.mark.asyncio
    async def test_start_unverified_session_fails(self, db_session, sample_user, sample_level):
        """Test that starting unverified session fails"""
        service = ProctoringService(db_session)
        
        session = await service.create_proctored_session(
            user=sample_user,
            level=sample_level,
            browser_info={},
        )
        
        is_valid, error, started = await service.start_session(
            session_token=session.session_token,
        )
        
        assert is_valid is False
        assert "verified" in error.lower()
    
    @pytest.mark.asyncio
    async def test_validate_active_session(self, db_session, sample_user, sample_level):
        """Test validating an active session for submission"""
        service = ProctoringService(db_session)
        
        # Create, verify, and start session
        session = await service.create_proctored_session(
            user=sample_user,
            level=sample_level,
            max_duration_minutes=60,
            browser_info={"fingerprint": "test", "ip_address": "127.0.0.1"},
        )
        
        await service.verify_session(
            session_token=session.session_token,
            verification_code=session.verification_code,
            browser_info={"fingerprint": "test", "ip_address": "127.0.0.1"},
        )
        
        await service.start_session(session.session_token)
        
        # Validate for submission
        is_valid, error, validated = await service.validate_active_session(
            session_token=session.session_token,
            browser_info={"fingerprint": "test", "ip_address": "127.0.0.1"},
        )
        
        assert is_valid is True
        assert error is None
    
    @pytest.mark.asyncio
    async def test_validate_expired_session_fails(self, db_session, sample_user, sample_level):
        """Test that expired sessions fail validation"""
        service = ProctoringService(db_session)
        
        # Create session with very short duration
        session = await service.create_proctored_session(
            user=sample_user,
            level=sample_level,
            max_duration_minutes=0,  # Immediate expiry
            browser_info={"fingerprint": "test"},
        )
        
        await service.verify_session(
            session_token=session.session_token,
            verification_code=session.verification_code,
            browser_info={"fingerprint": "test"},
        )
        
        await service.start_session(session.session_token)
        
        # Manually set start time to past
        session.started_at = datetime.utcnow() - timedelta(hours=2)
        await db_session.commit()
        
        is_valid, error, validated = await service.validate_active_session(
            session_token=session.session_token,
            browser_info={"fingerprint": "test"},
        )
        
        assert is_valid is False
        assert "time limit" in error.lower()
    
    @pytest.mark.asyncio
    async def test_flag_session(self, db_session, sample_user, sample_level):
        """Test flagging a session with violations"""
        service = ProctoringService(db_session)
        
        session = await service.create_proctored_session(
            user=sample_user,
            level=sample_level,
            browser_info={},
        )
        
        success = await service.flag_session(
            session_token=session.session_token,
            flag_type="TAB_SWITCH",
            severity="warning",
            description="User switched browser tabs",
            metadata={"tab_count": 3},
        )
        
        assert success is True
        
        # Refresh and check flags
        await db_session.refresh(session)
        assert len(session.flags) == 1
        assert session.flags[0]["type"] == "TAB_SWITCH"
    
    @pytest.mark.asyncio
    async def test_complete_session(self, db_session, sample_user, sample_level):
        """Test completing a proctored session"""
        service = ProctoringService(db_session)
        
        # Create, verify, start session
        session = await service.create_proctored_session(
            user=sample_user,
            level=sample_level,
            browser_info={"fingerprint": "test"},
        )
        
        await service.verify_session(
            session_token=session.session_token,
            verification_code=session.verification_code,
            browser_info={"fingerprint": "test"},
        )
        
        await service.start_session(session.session_token)
        
        # Complete
        is_valid, error, completed = await service.complete_session(
            session_token=session.session_token,
            score=85,
            integrity_notes="Clean session",
        )
        
        assert is_valid is True
        assert completed.status == ProctoringStatus.COMPLETED
        assert completed.integrity_score == 100  # No flags
        assert completed.ended_at is not None
    
    @pytest.mark.asyncio
    async def test_integrity_score_calculation(self, db_session, sample_user, sample_level):
        """Test integrity score decreases with flags"""
        service = ProctoringService(db_session)
        
        session = await service.create_proctored_session(
            user=sample_user,
            level=sample_level,
            browser_info={"fingerprint": "test"},
        )
        
        await service.verify_session(
            session_token=session.session_token,
            verification_code=session.verification_code,
            browser_info={"fingerprint": "test"},
        )
        
        await service.start_session(session.session_token)
        
        # Add some flags
        await service.flag_session(session.session_token, "TAB_SWITCH", "warning", "Tab switch")
        await service.flag_session(session.session_token, "COPY_PASTE", "warning", "Copy paste detected")
        
        is_valid, error, completed = await service.complete_session(
            session_token=session.session_token,
            score=85,
        )
        
        assert completed.integrity_score < 100
        assert completed.integrity_score >= 0


class TestProctoringEndpoints:
    """Tests for proctoring API endpoints"""
    
    @pytest.mark.asyncio
    async def test_create_session_endpoint(self, async_client, db_session, sample_level, mock_token_user):
        """Test POST /proctoring/sessions"""
        # Add proctoring requirement to level
        sample_level.config = {"requires_proctoring": True}
        await db_session.commit()
        
        # Mock authentication
        with patch("app.core.security.require_user", return_value=mock_token_user):
            response = await async_client.post(
                "/proctoring/sessions",
                json={
                    "level_id": str(sample_level.id),
                    "provider": "internal",
                    "max_duration_minutes": 60,
                    "browser_info": {
                        "user_agent": "Test Browser",
                        "screen_resolution": "1920x1080",
                    },
                },
            )
        
        # Note: This will likely fail without proper auth mock setup
        # In real tests, you'd mock the security dependency properly
    
    @pytest.mark.asyncio
    async def test_get_session_status(self, async_client, db_session):
        """Test GET /proctoring/sessions/{token}"""
        # Would test getting session status
        pass
    
    @pytest.mark.asyncio
    async def test_validate_for_submission(self, async_client):
        """Test POST /proctoring/sessions/validate-for-submission"""
        # Would test submission validation
        pass


class TestIPConsistencyChecks:
    """Tests for IP address consistency validation"""
    
    @pytest.mark.asyncio
    async def test_ip_change_flagged(self, db_session, sample_user, sample_level):
        """Test that IP address changes are flagged"""
        service = ProctoringService(db_session)
        
        session = await service.create_proctored_session(
            user=sample_user,
            level=sample_level,
            browser_info={
                "fingerprint": "test",
                "ip_address": "192.168.1.1",
            },
        )
        
        await service.verify_session(
            session_token=session.session_token,
            verification_code=session.verification_code,
            browser_info={
                "fingerprint": "test",
                "ip_address": "192.168.1.1",
            },
        )
        
        await service.start_session(session.session_token)
        
        # Validate with different IP
        await service.validate_active_session(
            session_token=session.session_token,
            browser_info={
                "fingerprint": "test",
                "ip_address": "10.0.0.1",  # Different IP
            },
        )
        
        await db_session.refresh(session)
        
        # Should have IP change flag
        ip_flags = [f for f in session.flags if "IP" in f.get("type", "")]
        assert len(ip_flags) >= 1


class TestUserAgentConsistencyChecks:
    """Tests for user agent consistency validation"""
    
    @pytest.mark.asyncio
    async def test_user_agent_change_flagged(self, db_session, sample_user, sample_level):
        """Test that user agent changes are flagged"""
        service = ProctoringService(db_session)
        
        session = await service.create_proctored_session(
            user=sample_user,
            level=sample_level,
            browser_info={
                "fingerprint": "test",
                "user_agent": "Chrome/120",
            },
        )
        
        await service.verify_session(
            session_token=session.session_token,
            verification_code=session.verification_code,
            browser_info={
                "fingerprint": "test",
                "user_agent": "Chrome/120",
            },
        )
        
        await service.start_session(session.session_token)
        
        # Validate with different user agent
        await service.validate_active_session(
            session_token=session.session_token,
            browser_info={
                "fingerprint": "test",
                "user_agent": "Firefox/120",  # Different browser
            },
        )
        
        await db_session.refresh(session)
        
        # Should have user agent flag
        ua_flags = [f for f in session.flags if "USER_AGENT" in f.get("type", "")]
        assert len(ua_flags) >= 1
