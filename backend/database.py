import sqlite3
import logging
from contextlib import contextmanager
from typing import List, Dict, Optional
from .security import log_security_event

class DatabaseManager:
    """Secure database manager with prepared statements."""
    
    def __init__(self, db_path: str = "quiz.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize database with secure schema."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Enable foreign key constraints
        cursor.execute("PRAGMA foreign_keys = ON")
        
        # Create tables if they don't exist
        self._create_users_table(cursor)
        self._create_questions_table(cursor)
        self._create_sessions_table(cursor)
        self._create_security_events_table(cursor)
        
        conn.commit()
        conn.close()
        logging.info("Database initialized successfully")
    
    def _create_users_table(self, cursor):
        """Create users table with security constraints."""
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL COLLATE NOCASE,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                login_attempts INTEGER DEFAULT 0,
                locked_until TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                CONSTRAINT valid_email CHECK (email LIKE '%@%.%')
            )
        """)
    
    def _create_questions_table(self, cursor):
        """Create questions table with user association."""
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                category TEXT NOT NULL CHECK (category IN (
                    'numbers_asc', 'numbers_desc', 'letters_asc', 'letters_desc', 
                    'days', 'bubble_sort', 'selection_sort', 
                    'insertion_sort', 'merge_sort', 'quick_sort'
                )),
                question TEXT NOT NULL,
                items TEXT NOT NULL,
                answer TEXT NOT NULL,
                difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        
        # Create indexes for performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_questions_user_category ON questions(user_id, category)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at)")
    
    def _create_sessions_table(self, cursor):
        """Create user sessions table for JWT tracking."""
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                jti TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ip_address TEXT,
                user_agent TEXT,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at)")
    
    def _create_security_events_table(self, cursor):
        """Create security events table for monitoring."""
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS security_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL CHECK (event_type IN (
                    'login_attempt', 'failed_login', 'successful_login', 'logout',
                    'rate_limit_exceeded', 'invalid_session', 'missing_token',
                    'invalid_csrf', 'invalid_content_type', 'input_too_long',
                    'sql_injection_attempt', 'xss_attempt', 'brute_force_attempt'
                )),
                ip_address TEXT NOT NULL,
                user_agent TEXT,
                user_id INTEGER,
                details TEXT,
                severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
            )
        """)
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at)")
    
    @contextmanager
    def get_connection(self):
        """Get database connection with proper error handling."""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            # Enable WAL mode for better concurrency
            conn.execute("PRAGMA journal_mode = WAL")
            # Set timeout
            conn.execute("PRAGMA busy_timeout = 30000")
            yield conn
        except sqlite3.Error as e:
            log_security_event("database_error", "high", f"Database connection failed: {str(e)}")
            raise
        finally:
            if conn:
                conn.close()
    
    def execute_prepared(self, query: str, params: tuple = ()) -> List[sqlite3.Row]:
        """Execute prepared statement safely."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute(query, params)
                return cursor.fetchall()
            except sqlite3.Error as e:
                log_security_event("database_error", "medium", f"Query failed: {str(e)}")
                return []
    
    def execute_prepared_single(self, query: str, params: tuple = ()) -> Optional[sqlite3.Row]:
        """Execute prepared statement and return single result."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute(query, params)
                return cursor.fetchone()
            except sqlite3.Error as e:
                log_security_event("database_error", "medium", f"Query failed: {str(e)}")
                return None
    
    def execute_prepared_update(self, query: str, params: tuple = ()) -> bool:
        """Execute prepared update statement."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute(query, params)
                conn.commit()
                return True
            except sqlite3.Error as e:
                log_security_event("database_error", "medium", f"Update failed: {str(e)}")
                conn.rollback()
                return False

# Singleton instance
db_manager = DatabaseManager()
