# Sorting Quiz Game - Tables and Attributes

## Table Structure Overview

### 1. categories Table
**Purpose**: Define sorting categories and their visual themes

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| id | INTEGER PRIMARY KEY | Unique identifier | 1 |
| name | VARCHAR(100) | Display name | "Numbers Ascending" |
| code | VARCHAR(50) UNIQUE | Category code for API | "numbers_asc" |
| color | VARCHAR(7) | UI color hex code | "#3b82f6" |
| glow_color | VARCHAR(7) | Glow effect color | "rgba(59, 130, 246, 0.4)" |
| is_active | BOOLEAN | Enable/disable category | 1 |
| created_at | TIMESTAMP | Creation time | 2024-04-14 11:45:00 |

**Sample Data**:
```sql
INSERT INTO categories (name, code, color, glow_color) VALUES
('Numbers Ascending', 'numbers_asc', '#3b82f6', 'rgba(59, 130, 246, 0.4)'),
('Letters A-Z', 'letters', '#a855f7', 'rgba(168, 85, 247, 0.4)');
```

### 2. sorting_questions Table
**Purpose**: Store individual sorting questions for each category

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| id | INTEGER PRIMARY KEY | Unique identifier | 1 |
| category_id | INTEGER FOREIGN KEY | References categories(id) | 1 |
| items | JSON | Array of items to sort | [3,1,4,2] |
| correct_answer | TEXT | Comma-separated correct order | "1,2,3,4" |
| difficulty_level | INTEGER (1-5) | Difficulty rating | 1 |
| is_active | BOOLEAN | Enable/disable question | 1 |
| usage_count | INTEGER | Times question used | 15 |
| success_count | INTEGER | Times answered correctly | 12 |
| created_at | TIMESTAMP | Creation time | 2024-04-14 11:45:00 |

**Sample Data**:
```sql
INSERT INTO sorting_questions (category_id, items, correct_answer, difficulty_level) VALUES
(1, '[3,1,4,2]', '1,2,3,4', 1),
(3, '["c","a","d","b"]', 'a,b,c,d', 1);
```

### 3. game_sessions Table
**Purpose**: Track anonymous player sessions via captcha

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| id | INTEGER PRIMARY KEY | Unique identifier | 1 |
| session_token | VARCHAR(255) UNIQUE | Session identifier | "uuid-session-123" |
| ip_address | VARCHAR(45) | Player IP address | "192.168.1.100" |
| started_at | TIMESTAMP | Session start time | 2024-04-14 11:45:00 |
| ended_at | TIMESTAMP | Session end time | 2024-04-14 12:15:00 |
| is_active | BOOLEAN | Active session flag | 1 |

**Sample Data**:
```sql
INSERT INTO game_sessions (session_token, ip_address) VALUES
('uuid-session-token-123', '192.168.1.100');
```

### 4. game_attempts Table
**Purpose**: Records each game attempt and score

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| id | INTEGER PRIMARY KEY | Unique identifier | 1 |
| session_id | INTEGER FOREIGN KEY | References game_sessions(id) | 1 |
| category_id | INTEGER FOREIGN KEY | References categories(id) | 1 |
| question_id | INTEGER FOREIGN KEY | References sorting_questions(id) | 1 |
| score | INTEGER | Points earned | 10 |
| time_taken | INTEGER | Seconds taken to answer | 15 |
| is_correct | BOOLEAN | Correct/incorrect flag | 1 |
| completed_at | TIMESTAMP | Attempt timestamp | 2024-04-14 11:45:00 |

**Sample Data**:
```sql
INSERT INTO game_attempts (session_id, category_id, score, is_correct) VALUES
(1, 1, 10, 1);
```

### 5. player_profiles Table
**Purpose**: Stores anonymous player statistics

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| id | INTEGER PRIMARY KEY | Unique identifier | 1 |
| session_id | INTEGER UNIQUE FOREIGN KEY | References game_sessions(id) | 1 |
| total_score | INTEGER | Cumulative score | 50 |
| games_played | INTEGER | Total games completed | 5 |
| best_scores | JSON | Per-category best scores | '{"numbers_asc": 30, "letters": 20}' |
| last_active | TIMESTAMP | Last activity time | 2024-04-14 11:45:00 |

**Sample Data**:
```sql
INSERT INTO player_profiles (session_id, total_score, best_scores) VALUES
(1, 50, '{"numbers_asc": 30, "letters": 20}');
```

## Table Relationships

```
categories (1) -----> (many) sorting_questions
game_sessions (1) -> (many) game_attempts
game_sessions (1) -> (1) player_profiles
```

## Data Flow Example

1. **Player starts**: Captcha verification creates `game_sessions` record
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

### Update question statistics
```sql
UPDATE sorting_questions 
SET usage_count = usage_count + 1,
    success_count = success_count + 1
WHERE id = 1;
```
