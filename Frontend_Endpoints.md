# Frontend Endpoints Documentation

## Overview
Next.js frontend pages and routes for sorting quiz game.

## Base URL
```
http://localhost:3000
```

## Frontend Pages (Routes)

### 1. Home Page - Captcha Verification
**URL**: `/`

**Purpose**: Entry point with captcha verification

**Features**:
- Captcha image display
- Refresh captcha button
- Answer input field
- Sound effects (click, correct, wrong)
- Session token generation
- Auto-redirect to game on success

**File**: `frontend/app/page.tsx`

**UI Components**:
- Circular captcha design
- Animated rings
- Input field with 5-character limit
- Submit button with loading state

### 2. Game Page - Sorting Quiz
**URL**: `/game`

**Purpose**: Main sorting quiz gameplay

**Query Parameters**:
- `mode` - Category code (numbers_asc, letters, days, etc.)
- **Example**: `/game?mode=numbers_asc`

**Features**:
- Category selection
- Drag-and-drop sorting interface
- Score tracking and display
- Timer system (30 seconds per question)
- Sound toggle (emoji button)
- Previous/Next navigation
- Submit answer functionality
- Game over screen with stats

**File**: `frontend/app/game/page.tsx`

**UI Components**:
- Question display box
- Sortable cards with animations
- Score, level, lives display
- Navigation buttons (Previous, Submit, Next)
- Sound toggle button (emoji)
- Game over modal

## Frontend Flow

```
/ (Home) 
  - User solves captcha
  - Gets session token
  - Redirects to /game

/game (Game Page)
  - Selects category
  - Plays sorting game
  - Tracks score
  - Handles game over
```

## Frontend Components

### Home Page Components
- **Captcha Ring**: Displays captcha image
- **Input Field**: 5-character captcha answer
- **Refresh Button**: Generate new captcha
- **Submit Button**: Verify captcha answer

### Game Page Components
- **Category Selector**: Choose sorting type
- **Question Box**: Display current question
- **Sort Cards**: Draggable items to sort
- **Score Display**: Current score and stats
- **Navigation Buttons**: Previous/Submit/Next
- **Sound Toggle**: Enable/disable sounds
- **Timer**: 30-second countdown

## State Management

### Home Page State
```javascript
captchaToken: string
captchaImage: string  
answer: string
error: string
loading: boolean
soundEnabled: boolean
```

### Game Page State
```javascript
sessionToken: string
mode: string (category)
currentQuestion: object
items: array
score: number
lives: number
timeLeft: number
soundEnabled: boolean
feedback: string
```

## API Integration

### Home Page API Calls
- `GET /api/captcha/generate` - Load captcha
- `POST /api/captcha/verify` - Verify answer

### Game Page API Calls
- `GET /api/game/questions` - Get questions
- `POST /api/game/submit` - Submit answer

## Local Storage

### Session Storage
- `session_token` - User session identifier
- `highScore` - Best score achieved
- `streak` - Current winning streak

### Local Storage
- `soundEnabled` - Sound preference

## Responsive Design
- Mobile-friendly layout
- Touch-enabled drag and drop
- Adaptive card sizing
- Responsive typography

## Browser Support
- Modern browsers with ES6+ support
- Touch devices
- Desktop and mobile optimized
