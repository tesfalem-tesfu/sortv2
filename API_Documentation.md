# Sorting Quiz Game API Documentation

## Overview
RESTful API for sorting quiz game with captcha-based authentication.

## Base URL
```
http://localhost:5000/api
```

## Authentication
- **Method**: Captcha-based session token
- **Header**: `X-Session-Token: <session_token>`
- **Flow**: Generate captcha -> Verify captcha -> Get session token -> Use token for game endpoints

---

## Endpoints

### 1. Health Check
**GET** `/health`

Check if API is running.

**Response:**
```json
{
  "status": "healthy",
  "version": "2.0"
}
```

### 2. Generate Captcha
**GET** `/captcha/generate`

Generate a new captcha challenge.

**Rate Limit**: 30 per minute

**Response:**
```json
{
  "token": "uuid-token",
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### 3. Verify Captcha
**POST** `/captcha/verify`

Verify captcha answer and get session token.

**Rate Limit**: 10 per minute

**Request Body:**
```json
{
  "token": "uuid-token-from-generate",
  "answer": "user-captcha-answer"
}
```

**Response (Success):**
```json
{
  "success": true,
  "session_token": "uuid-session-token"
}
```

**Response (Error):**
```json
{
  "success": false,
  "msg": "Incorrect captcha. Try again."
}
```

### 4. Get Questions
**GET** `/game/questions`

Get sorting questions for a category.

**Headers**: `X-Session-Token: <session_token>`

**Query Parameters:**
- `limit` (optional): Number of questions (default: 1, max: 50)
- `category` (optional): Category code (default: "numbers_asc")

**Example:** `/game/questions?limit=3&category=letters`

**Response:**
```json
{
  "questions": [
    {
      "category": "letters",
      "items": ["c", "a", "d", "b"],
      "correct_order": "a,b,c,d"
    }
  ],
  "count": 1
}
```

### 5. Submit Answer
**POST** `/game/submit`

Submit sorted answer for validation.

**Headers**: 
- `X-Session-Token: <session_token>`
- `Content-Type: application/json`

**Rate Limit**: 120 per minute

**Request Body:**
```json
{
  "category": "numbers_asc",
  "original_items": [3, 1, 4, 2],
  "answer": [1, 2, 3, 4]
}
```

**Response (Correct):**
```json
{
  "correct": true,
  "score": 10,
  "correct_order": "1,2,3,4"
}
```

**Response (Incorrect):**
```json
{
  "correct": false,
  "score": 0,
  "correct_order": "1,2,3,4"
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "msg": "Invalid session. Please complete captcha."
}
```

### 400 Bad Request
```json
{
  "msg": "original_items required"
}
```

### 429 Rate Limited
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later."
}
```

---

## Rate Limits
- **Captcha Generate**: 30 per minute
- **Captcha Verify**: 10 per minute  
- **Submit Answer**: 120 per minute

---

## Session Flow
1. `GET /captcha/generate` - Get captcha image
2. `POST /captcha/verify` - Submit answer, get session token
3. `GET /game/questions` - Get questions (with session token)
4. `POST /game/submit` - Submit answers (with session token)

Session tokens expire after inactivity and are stored in memory.
