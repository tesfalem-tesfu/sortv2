# Sorting Quiz Game - Tables and Attributes

## 1. categories Table
| Attribute | Type | Purpose | Example |
|-----------|------|---------|---------|
| id | INTEGER PRIMARY KEY | Unique identifier | 1 |
| name | VARCHAR(100) | Display name | "Numbers Ascending" |
| code | VARCHAR(50) UNIQUE | API identifier | "numbers_asc" |
| color | VARCHAR(7) | UI hex color | "#3b82f6" |
| glow_color | VARCHAR(7) | Glow effect color | "rgba(59,130,246,0.4)" |
| is_active | BOOLEAN | Enable/disable | 1 |
| created_at | TIMESTAMP | Creation time | 2024-04-14 11:48:00 |

## 2. sorting_questions Table
| Attribute | Type | Purpose | Example |
|-----------|------|---------|---------|
| id | INTEGER PRIMARY KEY | Unique identifier | 1 |
| category_id | INTEGER FOREIGN KEY | Link to categories | 1 |
| items | JSON | Items to sort | [3,1,4,2] |
| correct_answer | TEXT | Correct order | "1,2,3,4" |
| difficulty_level | INTEGER | 1-5 rating | 1 |
| is_active | BOOLEAN | Enable/disable | 1 |
| usage_count | INTEGER | Times used | 15 |
| success_count | INTEGER | Times correct | 12 |
| created_at | TIMESTAMP | Creation time | 2024-04-14 11:48:00 |

## 3. game_sessions Table
| Attribute | Type | Purpose | Example |
|-----------|------|---------|---------|
| id | INTEGER PRIMARY KEY | Unique identifier | 1 |
| session_token | VARCHAR(255) UNIQUE | Captcha session | "uuid-token-123" |
| ip_address | VARCHAR(45) | Player IP | "192.168.1.100" |
| started_at | TIMESTAMP | Session start | 2024-04-14 11:48:00 |
| ended_at | TIMESTAMP | Session end | 2024-04-14 12:15:00 |
| is_active | BOOLEAN | Active status | 1 |

## 4. game_attempts Table
| Attribute | Type | Purpose | Example |
|-----------|------|---------|---------|
| id | INTEGER PRIMARY KEY | Unique identifier | 1 |
| session_id | INTEGER FOREIGN KEY | Link to session | 1 |
| category_id | INTEGER FOREIGN KEY | Link to category | 1 |
| question_id | INTEGER FOREIGN KEY | Link to question | 1 |
| score | INTEGER | Points earned | 10 |
| time_taken | INTEGER | Seconds taken | 15 |
| is_correct | BOOLEAN | Correct/incorrect | 1 |
| completed_at | TIMESTAMP | Attempt time | 2024-04-14 11:48:00 |

## 5. player_profiles Table
| Attribute | Type | Purpose | Example |
|-----------|------|---------|---------|
| id | INTEGER PRIMARY KEY | Unique identifier | 1 |
| session_id | INTEGER UNIQUE FOREIGN KEY | Link to session | 1 |
| total_score | INTEGER | Cumulative points | 50 |
| games_played | INTEGER | Total games | 5 |
| best_scores | JSON | Best per category | {"numbers_asc": 30} |
| last_active | TIMESTAMP | Last activity | 2024-04-14 11:48:00 |

## Relationships
```
categories (1) -----> (many) sorting_questions
game_sessions (1) -> (many) game_attempts
game_sessions (1) -> (1) player_profiles
```

## Key Features
- **JSON Storage**: Flexible items and scores
- **Anonymous Play**: Captcha-based sessions
- **Performance Tracking**: Usage statistics
- **Foreign Keys**: Data integrity
- **Timestamps**: Analytics ready
