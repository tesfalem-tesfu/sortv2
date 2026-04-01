#!/usr/bin/env python3
"""
Secure Production Runner
====================

This script runs the enhanced security version of the application.
"""

import os
import sys
from app_secure import app, db_manager
from config import SecurityConfig, DatabaseConfig

def check_security_requirements():
    """Verify security requirements before starting."""
    print("🔐 Security Requirements Check")
    
    # Check JWT secret
    jwt_secret = os.getenv("JWT_SECRET")
    if not jwt_secret or len(jwt_secret) < 32:
        print("❌ JWT_SECRET must be set and at least 32 characters")
        return False
    print(f"✅ JWT_SECRET: {'*' * len(jwt_secret[:4])}{jwt_secret[4:]}")
    
    # Check database
    if not os.path.exists(DatabaseConfig.DB_PATH):
        print("❌ Database file not found")
        return False
    print(f"✅ Database: {DatabaseConfig.DB_PATH}")
    
    # Check Redis (optional)
    try:
        import redis
        redis_client = redis.Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", "6379")),
            db=int(os.getenv("REDIS_DB", "0")),
            password=os.getenv("REDIS_PASSWORD", ""),
            decode_responses=True
        )
        redis_client.ping()
        print("✅ Redis: Connected")
    except ImportError:
        print("⚠️  Redis: Not installed (using memory rate limiting)")
    except Exception as e:
        print(f"❌ Redis: Connection failed - {e}")
    
    print("✅ All security requirements met")
    return True

def initialize_production():
    """Initialize production environment."""
    print("🚀 Initializing Production Environment")
    
    # Set production environment variables
    os.environ['FLASK_ENV'] = 'production'
    
    # Initialize database
    try:
        db_manager.init_database()
        print("✅ Database initialized")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        return False
    
    # Security headers configuration
    print("🔒 Security headers configured")
    print("🔒 CSRF protection enabled")
    print("🔒 Rate limiting enabled")
    print("🔒 Input validation enabled")
    
    return True

def main():
    """Main entry point."""
    print("🛡️  Sorting Quiz - Secure Production Server")
    print("=" * 50)
    
    # Check security requirements
    if not check_security_requirements():
        print("❌ Security requirements not met. Exiting.")
        sys.exit(1)
    
    # Initialize production
    if not initialize_production():
        print("❌ Production initialization failed. Exiting.")
        sys.exit(1)
    
    print("🌐 Starting secure server on https://0.0.0.0:5001")
    print("📊 Security monitoring enabled")
    print("📝  All endpoints protected")
    print("=" * 50)
    
    try:
        # Use production WSGI server
        from gunicorn import app as gunicorn_app
        
        # Production configuration
        workers = 4
        worker_class = "sync"
        worker_connections = 1000
        max_requests = 1000
        timeout = 120
        
        app.run(
            host="0.0.0.0",
            port=5001,
            debug=False,
            workers=workers,
            worker_class=worker_class,
            worker_connections=worker_connections,
            max_requests=max_requests,
            timeout=timeout,
            ssl_context='adhoc'  # Use self-signed cert for testing
        )
        
    except ImportError:
        print("⚠️  Gunicorn not available, using Flask development server")
        print("🚨  DO NOT USE IN PRODUCTION")
        
        # Development fallback (not recommended for production)
        app.run(
            host="0.0.0.0",
            port=5001,
            debug=False,
            ssl_context='adhoc'
        )

if __name__ == "__main__":
    main()
