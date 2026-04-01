import sqlite3
import hashlib
import secrets
from flask import request, jsonify
import logging
from .security import generate_jwt, verify_jwt, log_security_event, get_db_connection

def hash_password(password: str) -> str:
    """Hash password with salt using PBKDF2."""
    salt = secrets.token_hex(32)
    pwdhash = hashlib.pbkdf2_hmac(
        'sha256', 
        password.encode('utf-8'), 
        salt.encode('utf-8'), 
        100000  # iterations
    ).hex()
    return f"{salt}:${pwdhash}"

def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored hash."""
    try:
        salt, pwdhash = stored_hash.split('$')
        computed_hash = hashlib.pbkdf2_hmac(
            'sha256', 
            password.encode('utf-8'), 
            salt.encode('utf-8'), 
            100000
        ).hex()
        return computed_hash == pwdhash
    except:
        return False

def register_user(username: str, email: str, password: str):
    """Register new user with validation."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if user exists
    cursor.execute("SELECT id FROM users WHERE username = ? OR email = ?", (username, email))
    if cursor.fetchone():
        conn.close()
        return False, "User already exists"
    
    # Validate inputs
    if len(username) < 3 or len(username) > 50:
        return False, "Invalid username length"
    if '@' not in email or '.' not in email:
        return False, "Invalid email format"
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    
    # Hash password and create user
    pwd_hash = hash_password(password)
    cursor.execute("""
        INSERT INTO users (username, email, password_hash, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    """, (username, email, pwd_hash))
    
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    log_security_event("user_registered", "low", f"Username: {username}")
    return True, f"User {user_id} registered successfully"

def authenticate_user(username: str, password: str) -> dict:
    """Authenticate user and return JWT token."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, username, password_hash, is_active 
        FROM users 
        WHERE username = ? AND is_active = 1
    """, (username,))
    
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        log_security_event("failed_login", "medium", f"Username: {username}")
        return False, "Invalid credentials"
    
    if not verify_password(password, user['password_hash']):
        log_security_event("failed_login", "medium", f"Username: {username}")
        return False, "Invalid credentials"
    
    # Generate JWT token
    token = generate_jwt(str(user['id']))
    
    # Store session in database
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO user_sessions (jti, user_id, expires_at)
        VALUES (?, ?, ?)
    """, (token.split('.')[1], user['id']))  # Use JTI from JWT
    conn.commit()
    conn.close()
    
    log_security_event("successful_login", "low", f"Username: {username}")
    return True, {"token": token, "user_id": user['id'], "username": user['username']}

def logout_user(jti: str) -> bool:
    """Logout user by invalidating JWT token."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE user_sessions 
        SET is_active = 0 
        WHERE jti = ?
    """, (jti,))
    
    conn.commit()
    conn.close()
    
    log_security_event("user_logout", "low", f"JTI: {jti}")
    return True

def validate_session_token(token: str) -> dict:
    """Validate session token and return user info."""
    if not token:
        return None
    
    payload = verify_jwt(token)
    if not payload:
        return None
    
    # Check if session is still active in database
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT is_active FROM user_sessions 
        WHERE jti = ? AND expires_at > CURRENT_TIMESTAMP AND is_active = 1
    """, (payload.get('jti'),))
    
    session = cursor.fetchone()
    conn.close()
    
    if not session or not session['is_active']:
        log_security_event("invalid_session", "medium", f"JTI: {payload.get('jti')}")
        return None
    
    return payload
