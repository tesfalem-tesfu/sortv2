# Sorting Quiz Game — Version 

No login or registration required. Complete an image captcha to play.

## What's Different from V1
- No user accounts — image captcha replaces login/register
- Session token instead of JWT
- Pillow-generated distorted image captcha
- Same game mechanics, algorithms, and UI

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
