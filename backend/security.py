import jwt
import sqlite3
import os
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
import logging
import redis
from flask_limiter.util import get_remote_address

# Security Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "your-256-bit-secret-key-change-in-production")
JWT_EXPIRY = timedelta(hours=24)
DB_PATH = "quiz.db"

# Redis for rate limiting
try:
    import redis
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
except:
    redis_client = None

def generate_jwt(user_id: str) -> str:
    """Generate JWT token for user authentication."""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + JWT_EXPIRY,
        'iat': datetime.utcnow(),
        'jti': f"token_{user_id}_{datetime.utcnow().timestamp()}"
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def verify_jwt(token: str) -> dict:
    """Verify JWT token and return payload."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        logging.warning(f"Expired JWT token: {token[:20]}...")
        return None
    except jwt.InvalidTokenError:
        logging.warning(f"Invalid JWT token: {token[:20]}...")
        return None

def init_database():
    """Initialize secure database with proper schema."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
    """)
    
    # Create questions table with user association
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            question TEXT NOT NULL,
            items TEXT NOT NULL,
            answer TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    # Create user_sessions table for JWT tracking
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_sessions (
            jti TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    # Create security_events table for monitoring
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS security_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            ip_address TEXT NOT NULL,
            user_agent TEXT,
            details TEXT,
            severity TEXT DEFAULT 'medium',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()

def log_security_event(event_type: str, severity: str = "medium", details: str = None):
    """Log security events for monitoring."""
    ip_address = get_remote_address(request)
    user_agent = request.headers.get('User-Agent', 'Unknown')
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO security_events (event_type, ip_address, user_agent, details, severity)
        VALUES (?, ?, ?, ?, ?)
    """, (event_type, ip_address, user_agent, details))
    conn.commit()
    conn.close()
    
    logging.warning(f"Security event: {event_type} from {ip_address} - {details}")

def get_db_connection():
    """Get database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def validate_csrf_token(token: str) -> bool:
    """Validate CSRF token using Redis."""
    if not redis_client:
        return False
    
    stored_token = redis_client.get(f"csrf:{token}")
    if not stored_token:
        return False
    
    redis_client.delete(f"csrf:{token}")
    return True

def generate_csrf_token(user_id: str) -> str:
    """Generate CSRF token for user."""
    import secrets
    token = secrets.token_urlsafe(32)
    
    if redis_client:
        redis_client.setex(f"csrf:{token}", 3600, user_id)  # 1 hour expiry
    
    return token

def rate_limit_exceeded_handler(limit):
    """Custom rate limit handler with security logging."""
    ip_address = get_remote_address(request)
    log_security_event("rate_limit_exceeded", "high", f"Limit: {limit}")
    return jsonify({
        "error": "Rate limit exceeded",
        "message": "Too many requests. Please try again later."
    }), 429
