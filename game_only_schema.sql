-- ========================================
-- SORTING QUIZ GAME ONLY - DATABASE SCHEMA
-- ========================================

-- Categories for sorting (numbers, letters, days, etc.)
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL, -- 'numbers_asc', 'letters', 'days'
    color VARCHAR(7), -- hex color for UI
    glow_color VARCHAR(7), -- glow effect color
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual sorting questions
CREATE TABLE sorting_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    items JSON NOT NULL, -- array of items to sort [3,1,4,2]
    correct_answer TEXT NOT NULL, -- comma-separated "1,2,3,4"
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    is_active BOOLEAN DEFAULT 1,
    usage_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Player sessions (anonymous via captcha)
CREATE TABLE game_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
);

-- Game attempts and scores
CREATE TABLE game_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    question_id INTEGER,
    score INTEGER DEFAULT 0,
    time_taken INTEGER, -- seconds
    is_correct BOOLEAN DEFAULT 0,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (question_id) REFERENCES sorting_questions(id)
);

-- Player statistics (anonymous)
CREATE TABLE player_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER UNIQUE NOT NULL,
    total_score INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    best_scores JSON, -- per-category best scores
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_categories_code ON categories(code);
CREATE INDEX idx_questions_category ON sorting_questions(category_id);
CREATE INDEX idx_sessions_token ON game_sessions(session_token);
CREATE INDEX idx_attempts_session ON game_attempts(session_id);

-- Initial data
INSERT INTO categories (name, code, color, glow_color) VALUES
('Numbers Ascending', 'numbers_asc', '#3b82f6', 'rgba(59, 130, 246, 0.4)'),
('Numbers Descending', 'numbers_desc', '#3b82f6', 'rgba(59, 130, 246, 0.4)'),
('Letters A-Z', 'letters', '#a855f7', 'rgba(168, 85, 247, 0.4)'),
('Days of Week', 'days', '#f97316', 'rgba(249, 115, 22, 0.4)');

INSERT INTO sorting_questions (category_id, items, correct_answer, difficulty_level) VALUES
(1, '[3,1,4,2]', '1,2,3,4', 1),
(1, '[7,2,9,1,5]', '1,2,5,7,9', 2),
(3, '["c","a","d","b"]', 'a,b,c,d', 1),
(4, '["Wednesday","Monday","Friday","Tuesday"]', 'Monday,Tuesday,Wednesday,Friday', 2);
