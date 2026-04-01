import os
from typing import List

class SecurityConfig:
    """Security configuration settings."""
    
    # JWT Configuration
    JWT_SECRET_KEY = os.getenv("JWT_SECRET", "your-256-bit-secret-key-change-in-production")
    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "24"))
    JWT_ALGORITHM = "HS256"
    
    # Rate Limiting
    RATE_LIMITS = {
        "captcha_generate": "30 per minute",
        "captcha_verify": "10 per minute",
        "auth_login": "10 per minute",
        "auth_register": "5 per minute",
        "game_submit": "120 per minute",
        "questions_get": "100 per minute",
        "default": "1000 per hour"
    }
    
    # Input Validation
    MAX_INPUT_LENGTHS = {
        "username": 50,
        "email": 100,
        "password": 128,
        "category": 50,
        "answer": 1000
    }
    
    # Database
    DB_PATH = os.getenv("DB_PATH", "quiz.db")
    DB_TIMEOUT = 30000
    
    # CORS
    ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "https://*.onrender.com"
    ]
    
    # Content Security Policy
    CSP_DIRECTIVES = {
        "default-src": "'self'",
        "script-src": "'self' 'nonce-{{nonce}}'",
        "style-src": "'self' 'unsafe-inline'",
        "img-src": "'self' data: https://cdn.example.com",
        "font-src": "'self' https://fonts.gstatic.com",
        "connect-src": "'self' https://api.example.com",
        "frame-ancestors": "'none'",
        "base-uri": "'self'",
        "form-action": "'self'"
    }
    
    # Security Headers
    SECURITY_HEADERS = {
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
    }

class DatabaseConfig:
    """Database configuration."""
    
    # Connection settings
    MAX_CONNECTIONS = 100
    CONNECTION_TIMEOUT = 30
    BUSY_TIMEOUT = 30000
    
    # Query limits
    MAX_QUERY_RESULTS = 1000
    BATCH_SIZE = 100
    
    # Table constraints
    MAX_QUESTION_ITEMS = 20
    MIN_QUESTION_ITEMS = 2
    ALLOWED_CATEGORIES = [
        'numbers_asc', 'numbers_desc', 'letters_asc', 'letters_desc', 
        'days', 'bubble_sort', 'selection_sort', 
        'insertion_sort', 'merge_sort', 'quick_sort'
    ]

class RedisConfig:
    """Redis configuration for rate limiting."""
    
    HOST = os.getenv("REDIS_HOST", "localhost")
    PORT = int(os.getenv("REDIS_PORT", "6379"))
    DB = int(os.getenv("REDIS_DB", "0"))
    PASSWORD = os.getenv("REDIS_PASSWORD", "")
    SSL_ENABLED = os.getenv("REDIS_SSL", "false").lower() == "true"
    
    # Rate limiting settings
    TOKEN_EXPIRY_SECONDS = 3600
    MAX_STORED_TOKENS = 10000
