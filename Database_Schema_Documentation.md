# Database Schema Documentation

## Overview
SQLite database schema for sorting quiz game with minimal table structure.

## Core Tables

### 1. categories
Defines sorting categories and their visual themes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| name | VARCHAR(100) | NOT NULL | Display name (e.g., "Numbers Ascending") |
| code | VARCHAR(50) | UNIQUE NOT NULL | Category code for API (e.g., "numbers_asc") |
| color | VARCHAR(7) | | Hex color for UI (e.g., "#3b82f6") |
| glow_color | VARCHAR(7) | | Glow effect color (e.g., "rgba(59, 130, 246, 0.4)") |
| is_active | BOOLEAN | DEFAULT 1 | Enable/disable category |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Sample Data:**
```sql
INSERT INTO categories (name, code, color, glow_color) VALUES
('Numbers Ascending', 'numbers_asc', '#3b82f6', 'rgba(59, 130, 246, 0.4)'),
('Letters A-Z', 'letters', '#a855f7', 'rgba(168, 85, 247, 0.4)');
```

### 2. sorting_questions
Stores individual sorting questions for each category.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| category_id | INTEGER | NOT NULL, FOREIGN KEY | References categories(id) |
| items | JSON | NOT NULL | Array of items to sort (e.g., [3,1,4,2]) |
| correct_answer | TEXT | NOT NULL | Comma-separated correct order (e.g., "1,2,3,4") |
| difficulty_level | INTEGER | DEFAULT 1, CHECK 1-5 | Difficulty rating |
| is_active | BOOLEAN | DEFAULT 1 | Enable/disable question |
| usage_count | INTEGER | DEFAULT 0 | Times question used |
| success_count | INTEGER | DEFAULT 0 | Times answered correctly |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Sample Data:**
```sql
INSERT INTO sorting_questions (category_id, items, correct_answer, difficulty_level) VALUES
(1, '[3,1,4,2]', '1,2,3,4', 1),
(3, '["c","a","d","b"]', 'a,b,c,d', 1);
```

### 3. game_sessions
Tracks anonymous player sessions via captcha.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| session_token | VARCHAR(255) | UNIQUE NOT NULL | Session identifier from captcha |
| ip_address | VARCHAR(45) | | Player IP address |
| started_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Session start time |
| ended_at | TIMESTAMP | | Session end time |
| is_active | BOOLEAN | DEFAULT 1 | Active session flag |

**Sample Data:**
```sql
INSERT INTO game_sessions (session_token, ip_address) VALUES
('uuid-session-token-123', '192.168.1.100');
```

### 4. game_attempts
Records each game attempt and score.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| session_id | INTEGER | NOT NULL, FOREIGN KEY | References game_sessions(id) |
| category_id | INTEGER | NOT NULL, FOREIGN KEY | References categories(id) |
| question_id | INTEGER | FOREIGN KEY | References sorting_questions(id) |
| score | INTEGER | DEFAULT 0 | Points earned |
| time_taken | INTEGER | | Seconds taken to answer |
| is_correct | BOOLEAN | DEFAULT 0 | Correct/incorrect flag |
| completed_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Attempt timestamp |

**Sample Data:**
```sql
INSERT INTO game_attempts (session_id, category_id, score, is_correct) VALUES
(1, 1, 10, 1);
```

### 5. player_profiles
Stores anonymous player statistics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| session_id | INTEGER | UNIQUE, FOREIGN KEY | References game_sessions(id) |
| total_score | INTEGER | DEFAULT 0 | Cumulative score |
| games_played | INTEGER | DEFAULT 0 | Total games completed |
| best_scores | JSON | | Per-category best scores |
| last_active | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last activity time |

**Sample Data:**
```sql
INSERT INTO player_profiles (session_id, total_score, best_scores) VALUES
(1, 50, '{"numbers_asc": 30, "letters": 20}');
```

## Relationships

```
categories (1) -----> (many) sorting_questions
game_sessions (1) -> (many) game_attempts
game_sessions (1) -> (1) player_profiles
```

## Indexes

```sql
CREATE INDEX idx_categories_code ON categories(code);
CREATE INDEX idx_questions_category ON sorting_questions(category_id);
CREATE INDEX idx_sessions_token ON game_sessions(session_token);
CREATE INDEX idx_attempts_session ON game_attempts(session_id);
```

## Data Flow

1. **Player starts**: Captcha verification creates `game_sessions`
2. **Select category**: Query `categories` for available options
3. **Load question**: Query `sorting_questions` by category
4. **Submit answer**: Create `game_attempts` record
5. **Update stats**: Modify `player_profiles` with new scores

## Query Examples

### Get active categories
```sql
SELECT id, name, code, color, glow_color 
FROM categories 
WHERE is_active = 1;
```

### Get random question by category
```sql
SELECT id, items, correct_answer, difficulty_level
FROM sorting_questions 
WHERE category_id = 1 AND is_active = 1
ORDER BY RANDOM() 
LIMIT 1;
```

### Get player stats
```sql
SELECT p.total_score, p.games_played, p.best_scores
FROM player_profiles p
JOIN game_sessions s ON p.session_id = s.id
WHERE s.session_token = 'uuid-token';
```

## Schema Notes

- **Anonymous Play**: No user accounts, uses captcha-based sessions
- **JSON Storage**: Items and scores stored as JSON for flexibility
- **Performance Tracking**: Usage statistics for questions and players
- **Simple Design**: Minimal tables for easy maintenance
- **Scalable**: Easy to add new categories and questions
