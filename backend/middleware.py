from flask import request, jsonify, g
import logging
from functools import wraps
from .security import validate_csrf_token, generate_csrf_token, log_security_event

def require_auth(f):
    """Decorator to require JWT authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Check Authorization header first
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        # Fall back to session token
        if not token:
            token = request.headers.get('X-Session-Token')
        
        if not token:
            log_security_event("missing_token", "medium")
            return jsonify({"error": "Authentication required"}), 401
        
        from .auth import validate_session_token
        payload = validate_session_token(token)
        if not payload:
            log_security_event("invalid_token", "medium")
            return jsonify({"error": "Invalid or expired token"}), 401
        
        # Store user info in flask g
        g.user = payload
        g.auth_token = token
        
        return f(*args, **kwargs)
    
    return decorated_function

def require_csrf(f):
    """Decorator to require CSRF protection."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method in ['POST', 'PUT', 'DELETE', 'PATCH']:
            csrf_token = request.headers.get('X-CSRF-Token')
            if not csrf_token:
                log_security_event("missing_csrf", "high")
                return jsonify({"error": "CSRF token required"}), 403
            
            if not validate_csrf_token(csrf_token):
                log_security_event("invalid_csrf", "high")
                return jsonify({"error": "Invalid CSRF token"}), 403
        
        return f(*args, **kwargs)
    
    return decorated_function

def validate_content_type():
    """Validate request content type."""
    if request.method in ['POST', 'PUT', 'PATCH']:
        content_type = request.headers.get('Content-Type', '')
        if not content_type.startswith('application/json'):
            log_security_event("invalid_content_type", "medium", f"Content-Type: {content_type}")
            return jsonify({"error": "Content-Type must be application/json"}), 415
    return None

def rate_limit_check():
    """Check if user is rate limited."""
    from flask import g
    if hasattr(g, 'rate_limited'):
        log_security_event("rate_limit_exceeded", "high", "User exceeded rate limit")
        return jsonify({
            "error": "Rate limit exceeded",
            "message": "Too many requests. Please try again later."
        }), 429
    return None

def security_headers(response):
    """Add comprehensive security headers."""
    response.headers['X-Frame-Options'] = "DENY"
    response.headers['X-Content-Type-Options'] = "nosniff"
    response.headers['X-XSS-Protection'] = "1; mode=block"
    response.headers['Referrer-Policy'] = "strict-origin-when-cross-origin"
    response.headers['Strict-Transport-Security'] = "max-age=31536000; includeSubDomains"
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' 'nonce-{{nonce}}'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https://cdn.example.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "connect-src 'self' https://api.example.com; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'"
    )
    response.headers['X-Content-Type'] = 'nosniff'
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

def validate_input_length(data: dict, max_length: int = 1000) -> bool:
    """Validate input data length."""
    for key, value in data.items():
        if isinstance(value, str) and len(value) > max_length:
            log_security_event("input_too_long", "medium", f"Field: {key}, Length: {len(value)}")
            return False
    return True

def sanitize_input(data: str) -> str:
    """Enhanced input sanitization."""
    import bleach
    # Allow only specific characters for different input types
    allowed_tags = []
    allowed_attributes = {}
    
    # Remove potential XSS patterns
    xss_patterns = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'on\w+\s*=',
        r'expression\s*\(',
    ]
    
    for pattern in xss_patterns:
        data = re.sub(pattern, '', data, flags=re.IGNORECASE)
    
    return bleach.clean(
        data, 
        tags=allowed_tags, 
        attributes=allowed_attributes,
        strip=True
    )
