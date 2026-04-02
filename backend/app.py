from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from io import BytesIO
import os, random, string, re, logging, bleach, base64, uuid

load_dotenv()

# ── Logging ───────────────────────────────────────────────────────────────────
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
]}}, supports_credentials=True)

limiter = Limiter(
    get_remote_address, app=app,
    default_limits=["2000 per day", "500 per hour"],
    storage_uri="memory://",
)

# ── In-memory captcha store {token: answer} ───────────────────────────────────
captcha_store: dict[str, str] = {}

# ────────────────────────────────────────────────
# SECURITY HEADERS
# ────────────────────────────────────────────────

@app.after_request
def security_headers(response):
    response.headers["X-Frame-Options"]        = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"]       = "1; mode=block"
    response.headers["Referrer-Policy"]        = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
        "font-src 'self' https://fonts.gstatic.com; "
        "connect-src 'self' http://localhost:* https://*.onrender.com;"
    )
    return response

# ────────────────────────────────────────────────
# CAPTCHA
# ────────────────────────────────────────────────

def _generate_captcha_image(text: str) -> str:
    """Generate a distorted image captcha and return as base64 PNG."""
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
    """Generate a new image captcha. Returns token + base64 image."""
    # 5-character alphanumeric (no ambiguous chars like 0/O, 1/l)
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    text  = "".join(random.choices(chars, k=5))
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
    """Verify captcha answer. Returns session_token on success."""
    data  = request.get_json(silent=True) or {}
    token = bleach.clean(str(data.get("token", "")))
    answer = bleach.clean(str(data.get("answer", ""))).upper().strip()

    expected = captcha_store.get(token)

    if not expected:
        return jsonify({"success": False, "msg": "Captcha expired. Please refresh."}), 400

    # Remove used token
    del captcha_store[token]

    if answer != expected:
        return jsonify({"success": False, "msg": "Incorrect captcha. Try again."}), 400

    # Issue a simple session token (no JWT needed — no user accounts)
    session_token = str(uuid.uuid4())
    # Store session token briefly (reuse captcha_store for simplicity)
    captcha_store[f"session_{session_token}"] = "valid"

    logger.info(f"Captcha passed from {request.remote_addr}")
    return jsonify({"success": True, "session_token": session_token})

# ────────────────────────────────────────────────
# GAME ROUTES (no auth required — captcha is the gate)
# ────────────────────────────────────────────────

def _check_session(req) -> bool:
    """Check if request has a valid session token."""
    token = req.headers.get("X-Session-Token") or (req.get_json(silent=True) or {}).get("session_token")
    if not token:
        return False
    return captcha_store.get(f"session_{token}") == "valid"


@app.route("/api/health")
def health():
    return jsonify({"status": "healthy", "version": "2.0"})


@app.route("/api/game/questions", methods=["GET"])
def get_questions():
    if not _check_session(request):
        return jsonify({"msg": "Invalid session. Please complete captcha."}), 401

    limit    = request.args.get("limit", 1, type=int)
    category = bleach.clean(request.args.get("category", "numbers_asc"))
    limit    = min(max(limit, 1), 50)
    questions = [_generate_question(category) for _ in range(limit)]
    questions = [q for q in questions if q]
    return jsonify({"questions": questions, "count": len(questions)})


@app.route("/api/game/submit", methods=["POST"])
@limiter.limit("120 per minute")
def submit():
    data = request.get_json(silent=True) or {}

    if not _check_session(request):
        return jsonify({"msg": "Invalid session. Please complete captcha."}), 401

    category         = bleach.clean(data.get("category", "numbers_asc"))
    original_items   = [bleach.clean(str(x)) for x in data.get("original_items", [])]
    user_answer_list = [bleach.clean(str(x)) for x in data.get("answer", [])]

    if not original_items:
        return jsonify({"msg": "original_items required"}), 400

    q = _generate_answer(category, original_items)
    if not q:
        return jsonify({"msg": "Unknown category"}), 400

    if set(user_answer_list) != set(original_items):
        logger.warning(f"Tampered answer from {request.remote_addr}")
        return jsonify({"msg": "Invalid answer: items do not match question"}), 400

    user_answer = ",".join(user_answer_list)
    correct     = user_answer == q["answer"]

    return jsonify({
        "correct":       correct,
        "correct_order": q["answer"].split(","),
        "user_submitted": user_answer,
    })

# ────────────────────────────────────────────────
# QUESTION GENERATORS (same as v1)
# ────────────────────────────────────────────────

def _fake_id(items: list) -> int:
    return abs(hash(tuple(items))) % (10 ** 9)


def _generate_question(category: str) -> dict:
    if category == "numbers_asc":
        size = random.randint(4, 8)
        nums = random.sample(range(1, 201), size)
        shuffled = nums[:]; random.shuffle(shuffled)
        return {"id": _fake_id(shuffled), "question": "Sort these numbers in ascending order",
                "items": [str(n) for n in shuffled], "answer": ",".join(str(n) for n in sorted(nums)), "category": category}

    if category == "numbers_desc":
        size = random.randint(4, 8)
        nums = random.sample(range(1, 201), size)
        shuffled = nums[:]; random.shuffle(shuffled)
        return {"id": _fake_id(shuffled), "question": "Sort these numbers in descending order",
                "items": [str(n) for n in shuffled], "answer": ",".join(str(n) for n in sorted(nums, reverse=True)), "category": category}

    if category == "letters_asc":
        size = random.randint(5, 10)
        letters = random.sample(string.ascii_lowercase, size)
        shuffled = letters[:]; random.shuffle(shuffled)
        return {"id": _fake_id(shuffled), "question": "Sort these letters alphabetically",
                "items": shuffled, "answer": ",".join(sorted(letters)), "category": category}

    if category == "letters_desc":
        size = random.randint(5, 10)
        letters = random.sample(string.ascii_lowercase, size)
        shuffled = letters[:]; random.shuffle(shuffled)
        return {"id": _fake_id(shuffled), "question": "Sort these letters in reverse alphabetical order",
                "items": shuffled, "answer": ",".join(sorted(letters, reverse=True)), "category": category}

    if category == "days":
        days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
        shuffled = days[:]; random.shuffle(shuffled)
        return {"id": _fake_id(shuffled), "question": "Sort the days of the week correctly (start Monday)",
                "items": shuffled, "answer": ",".join(days), "category": category}

    # Default to numbers_asc if category not found
    return _generate_question("numbers_asc")


def _generate_answer(category: str, items: list) -> dict | None:
    if category == "numbers_asc":
        return {"answer": ",".join(sorted(items, key=lambda x: int(x)))}
    if category == "numbers_desc":
        return {"answer": ",".join(sorted(items, key=lambda x: int(x), reverse=True))}
    if category == "letters_asc":
        return {"answer": ",".join(sorted(items))}
    if category == "letters_desc":
        return {"answer": ",".join(sorted(items, reverse=True))}
    if category == "days":
        order = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
        return {"answer": ",".join(sorted(items, key=lambda d: order.index(d) if d in order else 99))}
    if category == "bubble_sort":
        arr = [int(x) for x in items]
        for i in range(len(arr) - 1):
            if arr[i] > arr[i + 1]: arr[i], arr[i + 1] = arr[i + 1], arr[i]
        return {"answer": ",".join(str(n) for n in arr)}
    if category == "selection_sort":
        arr = [int(x) for x in items]; min_val = min(arr); rest = arr[:]; rest.remove(min_val)
        return {"answer": ",".join(str(n) for n in [min_val] + rest)}
    if category == "insertion_sort":
        arr = [int(x) for x in items]
        for i in range(1, len(arr)):
            key = arr[i]; j = i - 1
            while j >= 0 and arr[j] > key: arr[j + 1] = arr[j]; j -= 1
            arr[j + 1] = key
        return {"answer": ",".join(str(n) for n in arr)}
    if category == "merge_sort":
        return {"answer": ",".join(str(n) for n in sorted(int(x) for x in items))}
    if category == "quick_sort":
        arr = [int(x) for x in items]; pivot = arr[0]
        less = [x for x in arr[1:] if x <= pivot]; greater = [x for x in arr[1:] if x > pivot]
        return {"answer": ",".join(str(n) for n in less + [pivot] + greater)}
    return None


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)
