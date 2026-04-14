# 🎮 Sorting Quiz Game

A modern, secure, and interactive sorting quiz game built with Next.js and Flask, featuring cyberpunk aesthetics, real-time gameplay, and enterprise-grade security.

## 🌟 Features

### 🎯 Gameplay
- **5 Sorting Categories**: Numbers (ascending/descending), Letters (alphabetical/reverse), Days of week
- **Real-time Challenges**: 30-second timer per question
- **Lives System**: 3 lives with visual feedback
- **Score Tracking**: Points, streaks, and high scores
- **Sound Effects**: Audio feedback for all game actions
- **Responsive Design**: Works seamlessly on desktop and mobile

### 🛡️ Security
- **CAPTCHA Authentication**: Bot protection without user accounts
- **Defense in Depth**: Multiple security layers
- **Input Sanitization**: XSS and injection prevention
- **Rate Limiting**: DDoS protection per endpoint
- **Security Headers**: XSS, CSRF, clickjacking protection
- **Audit Logging**: Complete security event tracking

### 🎨 User Experience
- **Cyberpunk Theme**: Neon colors and CRT monitor effects
- **Smooth Animations**: Framer Motion and CSS animations
- **Particle Effects**: Dynamic background animations
- **Sound Toggle**: Customizable audio experience
- **Session Persistence**: Score tracking across sessions

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- Next.js 14 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Framer Motion for animations
- Canvas API for particle effects

**Backend:**
- Flask web framework
- SQLite for audit logging
- PIL/Pillow for CAPTCHA generation
- Bleach for input sanitization
- Flask-Limiter for rate limiting

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+ and pip
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd sorting-quiz-v2
```

2. **Install Frontend Dependencies**
```bash
cd frontend
npm install
```

3. **Install Backend Dependencies**
```bash
cd ../backend
pip install -r requirements.txt
```

4. **Start Development Servers**

**Terminal 1 - Backend:**
```bash
cd backend
python app.py
```
Server runs on `http://localhost:5001`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
App runs on `http://localhost:3000`

5. **Open the Game**
Visit `http://localhost:3000` in your browser

## 🎮 How to Play

1. **CAPTCHA Verification**: Solve the CAPTCHA to access the game
2. **Choose Category**: Select from available sorting challenges
3. **Sort Items**: Click to select and swap items to reorder them
4. **Submit Answer**: Click submit before the timer expires
5. **Earn Points**: +10 points for correct answers
6. **Survive**: Don't lose all 3 lives!

### Game Controls
- **Click**: Select an item
- **Click Another**: Swap selected item with clicked item
- **Submit**: Submit your sorted answer
- **Sound Toggle**: Enable/disable sound effects

### Game Categories

**Numbers Ascending**: Sort from smallest to largest
```
Example: [42, 17, 89, 3] → [3, 17, 42, 89]
```

**Numbers Descending**: Sort from largest to smallest
```
Example: [42, 17, 89, 3] → [89, 42, 17, 3]
```

**Letters Ascending**: Sort alphabetically
```
Example: [Z, A, M, C] → [A, C, M, Z]
```

**Letters Descending**: Sort in reverse alphabetical order
```
Example: [Z, A, M, C] → [Z, M, C, A]
```

**Days of Week**: Sort chronologically
```
Example: [Friday, Monday, Wednesday] → [Monday, Wednesday, Friday]
```

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```bash
FRONTEND_ORIGIN=http://localhost:3000
DB_PATH=quiz.db
```

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:5001
```

## 🛡️ Security Features

### Authentication
- **CAPTCHA-based**: No user accounts required
- **Session Tokens**: In-memory token management
- **Automatic Expiration**: Sessions expire after inactivity

### Input Protection
- **Bleach Sanitization**: Removes malicious HTML/JavaScript
- **Length Validation**: Prevents buffer overflow attacks
- **Type Checking**: Ensures data type consistency

### Web Security
- **CORS Configuration**: Whitelisted origins only
- **Security Headers**: Comprehensive protection suite
- **Rate Limiting**: Endpoint-specific throttling

### Monitoring
- **Security Logging**: Complete audit trail
- **Event Tracking**: Suspicious activity detection
- **IP Monitoring**: Attack source identification

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
cd frontend
npm run build
# Deploy the .next/ folder to your hosting platform
```

### Backend (Render/Heroku)
```bash
cd backend
# Deploy using platform's Python deployment
# Ensure environment variables are set
```

### Production Considerations
- Set `FRONTEND_ORIGIN` to your production domain
- Use HTTPS for all communications
- Configure proper CORS origins
- Monitor security logs regularly

## 📊 API Endpoints

### Authentication
- `GET /api/captcha/generate` - Generate new CAPTCHA
- `POST /api/captcha/verify` - Verify CAPTCHA answer

### Game
- `GET /api/game/questions` - Get game questions
- `POST /api/game/submit` - Submit game answer
- `GET /api/health` - Health check

## 🧪 Testing

### Manual Testing
1. Test CAPTCHA generation and verification
2. Verify game mechanics work correctly
3. Test rate limiting on all endpoints
4. Verify security headers are present
5. Test input sanitization

## Setup

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python app.py                # runs on port 5001
```

### Frontend
```bash
cd frontend
npm install
npm run dev                  # runs on port 3000
```

Open http://localhost:3000
