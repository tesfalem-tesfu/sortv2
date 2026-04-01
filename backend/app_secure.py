from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from io import BytesIO
import os, random, string, re, logging, bleach, base64, uuid
import hashlib
from datetime import datetime, timedelta

# Import security modules
from .security import generate_jwt, verify_jwt, log_security_event
from .auth import register_user, authenticate_user, logout_user, validate_session_token
from .database import db_manager
from .middleware import (
    require_auth, require_csrf, security_headers, 
    validate_content_type, validate_input_length, sanitize_input
)

load_dotenv()

# ── Logging ───────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler("app.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

CORS(app, resources={r"/api/*": {"origins": [
    "http://localhost:3000", "http://localhost:3001", "http://localhost:3002",
    "http://127.0.0.1:3000", FRONTEND_ORIGIN,
    "https://*.onrender.com",
]}, supports_credentials=True)

# Enhanced rate limiting with Redis
try:
    import redis
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    limiter = Limiter(
        app,
        key_func=lambda: f"rate_limit:{get_remote_address(request)}",
        storage_uri="redis://localhost:6379",
        default_limits=[
            "100 per minute",
            "1000 per hour",
            "5000 per day"
        ],
        on_breach=lambda: log_security_event("rate_limit_breach", "high")
    )
except:
    # Fallback to memory storage
    limiter = Limiter(
        app,
        key_func=lambda: f"rate_limit:{get_remote_address(request)}",
        storage_uri="memory://",
        default_limits=[
            "50 per minute",
            "500 per hour",
            "2000 per day"
        ]
    )

# ── In-memory captcha store {token: answer} ───────────────────────────────────
captcha_store: dict[str, str] = {}

@app.after_request
def enhanced_security_headers(response):
    """Enhanced security headers with CSRF protection."""
    response = security_headers(response)
    
    # Add CSRF protection headers
    response.headers['X-CSRF-Token'] = 'required'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    
    return response

# ────────────────────────────────────────────────
# AUTHENTICATION ROUTES
# ────────────────────────────────────────────────

@app.route("/api/auth/register", methods=["POST"])
@limiter.limit("5 per minute")
def register():
    """Secure user registration."""
    content_check = validate_content_type()
    if content_check:
        return content_check
    
    data = request.get_json(silent=True) or {}
    
    # Validate input length
    if not validate_input_length(data, max_length=200):
        return jsonify({"error": "Input data too long"}), 400
    
    # Sanitize inputs
    username = sanitize_input(str(data.get("username", "")))
    email = sanitize_input(str(data.get("email", "")))
    password = str(data.get("password", ""))
    
    # Validate required fields
    if not all([username, email, password]):
        return jsonify({"error": "All fields required"}), 400
    
    success, message = register_user(username, email, password)
    if success:
        return jsonify({"success": True, "message": message}), 201
    else:
        return jsonify({"error": message}), 400

@app.route("/api/auth/login", methods=["POST"])
@limiter.limit("10 per minute")
def login():
    """Secure user login with rate limiting."""
    content_check = validate_content_type()
    if content_check:
        return content_check
    
    data = request.get_json(silent=True) or {}
    
    # Validate input length
    if not validate_input_length(data, max_length=200):
        return jsonify({"error": "Input data too long"}), 400
    
    # Sanitize inputs
    username = sanitize_input(str(data.get("username", "")))
    password = str(data.get("password", ""))
    
    # Validate required fields
    if not all([username, password]):
        return jsonify({"error": "Username and password required"}), 400
    
    success, result = authenticate_user(username, password)
    if success:
        return jsonify(result), 200
    else:
        return jsonify({"error": result}), 401

@app.route("/api/auth/logout", methods=["POST"])
@require_auth
@require_csrf
def logout():
    """Secure user logout."""
    data = request.get_json(silent=True) or {}
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    if logout_user(token):
        return jsonify({"success": True, "message": "Logged out successfully"}), 200
    else:
        return jsonify({"error": "Logout failed"}), 400

@app.route("/api/auth/refresh", methods=["POST"])
@require_auth
@require_csrf
def refresh_token():
    """Refresh JWT token."""
    from .auth import generate_jwt
    payload = request.user
    
    new_token = generate_jwt(payload['user_id'])
    return jsonify({"token": new_token}), 200

# ────────────────────────────────────────────────
# CAPTCHA SYSTEM (Enhanced)
# ────────────────────────────────────────────────

def _generate_captcha_image(text: str) -> str:
    """Generate a secure captcha image."""
    width, height = 200, 70
    img = Image.new("RGB", (width, height), color=(245, 245, 255))
    draw = ImageDraw.Draw(img)

    # Background noise lines
    for _ in range(8):
        x1, y1 = random.randint(0, width), random.randint(0, height)
        x2, y2 = random.randint(0, width), random.randint(0, height)
        draw.line([(x1, y1), (x2, y2)], fill=(
            random.randint(150, 220),
            random.randint(150, 220),
            random.randint(150, 220),
        ), width=1)

    # Background dots
    for _ in range(80):
        x, y = random.randint(0, width), random.randint(0, height)
        draw.ellipse([x, y, x+2, y+2], fill=(
            random.randint(100, 200),
            random.randint(100, 200),
            random.randint(100, 200),
        ))

    # Draw each character with random offset and color
    x_offset = 20
    for char in text:
        color = (
            random.randint(20, 100),
            random.randint(20, 100),
            random.randint(20, 100),
        )
        y_offset = random.randint(10, 25)
        font_size = random.randint(28, 36)
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except Exception:
            font = ImageFont.load_default()
        draw.text((x_offset, y_offset), char, font=font, fill=color)
        x_offset += random.randint(28, 38)

    # Slight blur for distortion
    img = img.filter(ImageFilter.GaussianBlur(radius=0.8))

    buf = BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")

@app.route("/api/captcha/generate", methods=["GET"])
@limiter.limit("30 per minute")
def generate_captcha():
    """Generate secure captcha."""
    # 5-character alphanumeric (no ambiguous chars)
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    text = "".join(random.choices(chars, k=5))
    token = str(uuid.uuid4())

    captcha_store[token] = text.upper()

    # Clean old tokens if store gets too large
    if len(captcha_store) > 1000:
        keys = list(captcha_store.keys())
        for k in keys[:500]:
            del captcha_store[k]

    image_b64 = _generate_captcha_image(text)

    return jsonify({
        "token": token,
        "image": f"data:image/png;base64,{image_b64}",
    })

@app.route("/api/captcha/verify", methods=["POST"])
@limiter.limit("10 per minute")
def verify_captcha():
    """Verify captcha with enhanced security."""
    content_check = validate_content_type()
    if content_check:
        return content_check
    
    data = request.get_json(silent=True) or {}
    
    # Validate input length
    if not validate_input_length(data, max_length=100):
        return jsonify({"error": "Input too long"}), 400
    
    # Sanitize inputs
    token = sanitize_input(str(data.get("token", "")))
    answer = sanitize_input(str(data.get("answer", ""))).upper().strip()

    expected = captcha_store.get(token)

    if not expected:
        log_security_event("captcha_expired", "medium", f"Token: {token[:20]}")
        return jsonify({"error": "Captcha expired. Please refresh."}), 400

    # Remove used token
    del captcha_store[token]

    if answer != expected:
        log_security_event("captcha_failed", "medium", f"Expected: {expected}, Got: {answer}")
        return jsonify({"error": "Incorrect captcha. Try again."}), 400

    # Issue session token
    session_token = str(uuid.uuid4())
    captcha_store[f"session_{session_token}"] = "valid"

    logger.info(f"Captcha passed from {get_remote_address(request)}")
    return jsonify({"success": True, "session_token": session_token})

# ────────────────────────────────────────────────
# SECURE GAME ROUTES
# ────────────────────────────────────────────────

@app.route("/api/game/questions", methods=["GET"])
@require_auth
def get_questions():
    """Get questions with authentication and random category selection."""
    limit = request.args.get("limit", 1, type=int)
    requested_category = sanitize_input(request.args.get("category", "numbers_asc"))
    limit = min(max(limit, 1), 50)
    
    # Randomly select category for variety
    import random
    all_categories = [
        'numbers_asc', 'numbers_desc', 'letters_asc', 'letters_desc', 
        'days', 'bubble_sort', 'selection_sort', 
        'insertion_sort', 'merge_sort', 'quick_sort'
    ]
    
    # 70% chance to use requested category, 30% chance for random different category
    if random.random() < 0.7:
        category = requested_category
        was_randomized = False
    else:
        # Select a random different category
        available_categories = [c for c in all_categories if c != requested_category]
        if available_categories:
            category = random.choice(available_categories)
            was_randomized = True
        else:
            category = requested_category
            was_randomized = False
    
    # Validate category
    allowed_categories = all_categories
    
    if category not in allowed_categories:
        log_security_event("invalid_category", "medium", f"Category: {category}")
        return jsonify({"error": "Invalid category"}), 400
    
    # Get questions from database
    query = """
        SELECT id, question, items, answer, category 
        FROM questions 
        WHERE user_id = ? AND category = ? 
        ORDER BY RANDOM() 
        LIMIT ?
    """
    
    questions = db_manager.execute_prepared(query, (request.user['user_id'], category))
    questions = [dict(q) for q in questions if q]
    
    return jsonify({
        "questions": questions, 
        "count": len(questions),
        "selected_category": category,
        "was_randomized": was_randomized
    })

@app.route("/api/game/submit", methods=["POST"])
@require_auth
@require_csrf
@limiter.limit("120 per minute")
def submit():
    """Submit game answer with comprehensive security."""
    content_check = validate_content_type()
    if content_check:
        return content_check
    
    data = request.get_json(silent=True) or {}
    
    # Validate input length
    if not validate_input_length(data, max_length=1000):
        return jsonify({"error": "Input data too long"}), 400
    
    # Sanitize all inputs
    category = sanitize_input(data.get("category", "numbers_asc"))
    original_items = [sanitize_input(str(x)) for x in data.get("original_items", [])]
    user_answer_list = [sanitize_input(str(x)) for x in data.get("answer", [])]

    if not original_items:
        log_security_event("missing_items", "medium")
        return jsonify({"error": "original_items required"}), 400

    # Validate items count
    if len(original_items) > 20 or len(original_items) < 2:
        log_security_event("invalid_items_count", "medium", f"Count: {len(original_items)}")
        return jsonify({"error": "Invalid number of items"}), 400

    # Get correct answer from database
    query = """
        SELECT answer FROM questions 
        WHERE category = ? AND items = ?
        LIMIT 1
    """
    
    result = db_manager.execute_prepared_single(query, (category, ','.join(original_items)))
    if not result:
        log_security_event("question_not_found", "medium", f"Category: {category}")
        return jsonify({"error": "Question not found"}), 400

    correct_answer = result['answer']

    # Check for answer tampering
    if set(user_answer_list) != set(original_items):
        log_security_event("answer_tampering", "high", 
                       f"Original: {original_items}, Submitted: {user_answer_list}")
        return jsonify({"error": "Invalid answer: items do not match question"}), 400

    user_answer = ",".join(user_answer_list)
    correct = user_answer == correct_answer

    if correct:
        log_security_event("correct_answer", "low", f"Category: {category}")
    else:
        log_security_event("wrong_answer", "low", f"Category: {category}")

    return jsonify({
        "correct": correct,
        "correct_order": correct_answer.split(","),
        "user_submitted": user_answer,
    })

# ────────────────────────────────────────────────
# HEALTH AND SECURITY MONITORING
# ────────────────────────────────────────────────

@app.route("/api/health")
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy", 
        "version": "3.0",
        "security": "enhanced",
        "features": ["jwt_auth", "csrf_protection", "rate_limiting", "input_validation"]
    })

@app.route("/api/security/events", methods=["GET"])
@require_auth
def get_security_events():
    """Get security events for monitoring."""
    limit = request.args.get("limit", 50, type=int)
    user_id = request.user['user_id']
    
    query = """
        SELECT event_type, ip_address, details, severity, created_at 
        FROM security_events 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
    """
    
    events = db_manager.execute_prepared(query, (user_id, limit))
    return jsonify({"events": events, "count": len(events)})

# Question generators (same as original but with database integration)
def _generate_question(category: str) -> dict:
    """Generate question for database storage."""
    import random
    
    if category == "numbers_asc":
        size = random.randint(4, 8)
        nums = random.sample(range(1, 201), size)
        shuffled = nums[:]; random.shuffle(shuffled)
        return {
            "question": "Sort these numbers in ascending order",
            "items": [str(n) for n in shuffled], 
            "answer": ",".join(str(n) for n in sorted(nums)), 
            "category": category
        }

    # Add other categories as needed...
    # (Similar secure implementation for all categories)

if __name__ == "__main__":
    # Initialize database
    db_manager.init_database()
    app.run(debug=True, host="0.0.0.0", port=5001)
