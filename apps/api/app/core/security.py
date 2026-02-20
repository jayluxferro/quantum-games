"""Security utilities for authentication and authorization"""
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import httpx
from jose import jwt, JWTError
from fastapi import HTTPException, Security, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import get_settings

settings = get_settings()
security = HTTPBearer(auto_error=False)

_jwks_cache: Dict[str, Any] = {}
_jwks_cache_time: Optional[datetime] = None
JWKS_CACHE_DURATION = timedelta(hours=1)


async def get_keycloak_public_keys() -> Dict[str, Any]:
    """Fetch and cache Keycloak public keys"""
    global _jwks_cache, _jwks_cache_time
    
    if _jwks_cache_time and datetime.utcnow() - _jwks_cache_time < JWKS_CACHE_DURATION:
        return _jwks_cache
    
    jwks_url = f"{settings.keycloak_url}/realms/{settings.keycloak_realm}/protocol/openid-connect/certs"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(jwks_url, timeout=10.0)
            response.raise_for_status()
            _jwks_cache = response.json()
            _jwks_cache_time = datetime.utcnow()
            return _jwks_cache
        except Exception as e:
            if _jwks_cache:
                return _jwks_cache
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Unable to fetch authentication keys: {str(e)}"
            )


async def verify_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> Optional[Dict[str, Any]]:
    """Verify JWT token from Keycloak"""
    if not credentials:
        return None
    
    token = credentials.credentials
    
    try:
        jwks = await get_keycloak_public_keys()
        
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        
        public_key = None
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                public_key = key
                break
        
        if not public_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token signature"
            )
        
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience="account",
            issuer=f"{settings.keycloak_url}/realms/{settings.keycloak_realm}",
        )
        
        return payload
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )


async def get_current_user(
    token_payload: Optional[Dict[str, Any]] = Depends(verify_token)
) -> Optional[Dict[str, Any]]:
    """Get current user from token payload"""
    return token_payload


async def require_user(
    user: Optional[Dict[str, Any]] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Require authenticated user"""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user


def require_role(required_roles: list[str]):
    """Dependency factory for role-based access control"""
    async def check_roles(user: Dict[str, Any] = Depends(require_user)) -> Dict[str, Any]:
        user_roles = user.get("realm_access", {}).get("roles", [])
        
        if not any(role in user_roles for role in required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required roles: {required_roles}"
            )
        
        return user
    
    return check_roles
