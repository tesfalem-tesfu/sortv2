"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001";

export default function Home() {
  const router = useRouter();

  const [captchaToken, setCaptchaToken]   = useState("");
  const [captchaImage, setCaptchaImage]   = useState("");
  const [answer, setAnswer]               = useState("");
  const [error, setError]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [imageLoading, setImageLoading]   = useState(true);

  const fetchCaptcha = useCallback(async () => {
    setImageLoading(true);
    setAnswer("");
    setError("");
    try {
      const res  = await fetch(`${API}/api/captcha/generate`);
      const data = await res.json();
      setCaptchaToken(data.token);
      setCaptchaImage(data.image);
    } catch {
      setError("Cannot connect to server.");
    } finally {
      setImageLoading(false);
    }
  }, []);

  useEffect(() => { fetchCaptcha(); }, [fetchCaptcha]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res  = await fetch(`${API}/api/captcha/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken, answer: answer.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        // Store session token — used instead of JWT
        sessionStorage.setItem("session_token", data.session_token);
        router.push("/select");
      } else {
        setError(data.msg || "Incorrect. Try again.");
        fetchCaptcha();
      }
    } catch {
      setError("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="page-content"
      style={{
        minHeight: "100vh",
        backgroundImage: "url('/images/home.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "rgba(10, 10, 30, 0.82)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "24px",
          padding: "48px 40px",
          maxWidth: "480px",
          width: "90%",
          textAlign: "center",
          color: "white",
          boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
        }}
      >
        <h1
          style={{
            fontWeight: 800,
            fontSize: "2rem",
            marginBottom: "8px",
            background: "linear-gradient(90deg, #a78bfa, #ec4899, #22d3ee)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Sorting Quest
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "32px" }}>
          Prove you&apos;re human to play
        </p>

        {/* Captcha image */}
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "2px solid rgba(255,255,255,0.15)",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "20px",
          }}
        >
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.82rem", marginBottom: "12px" }}>
            Type the characters you see below
          </p>

          {imageLoading ? (
            <div style={{ height: "70px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div className="spinner-border text-light" style={{ width: "2rem", height: "2rem" }} />
            </div>
          ) : (
            <img
              src={captchaImage}
              alt="captcha"
              style={{
                borderRadius: "10px",
                border: "2px solid rgba(255,255,255,0.2)",
                display: "block",
                margin: "0 auto",
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          )}

          <button
            type="button"
            onClick={fetchCaptcha}
            style={{
              background: "none",
              border: "none",
              color: "#a78bfa",
              cursor: "pointer",
              fontSize: "0.82rem",
              marginTop: "10px",
              textDecoration: "underline",
            }}
          >
            🔄 Refresh captcha
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            maxLength={5}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={answer}
            onChange={(e) => setAnswer(e.target.value.toUpperCase())}
            placeholder="Enter 5 characters"
            style={{
              width: "100%",
              padding: "14px 20px",
              borderRadius: "12px",
              border: "2px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.08)",
              color: "white",
              fontSize: "1.3rem",
              textAlign: "center",
              letterSpacing: "0.4em",
              fontWeight: 700,
              outline: "none",
              marginBottom: "16px",
            }}
            required
            autoFocus
          />

          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.2)",
                border: "1px solid #ef4444",
                borderRadius: "10px",
                padding: "10px",
                marginBottom: "16px",
                color: "#fca5a5",
                fontSize: "0.9rem",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || answer.length < 5}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "50px",
              border: "none",
              background: answer.length === 5
                ? "linear-gradient(135deg, #6366f1, #ec4899)"
                : "rgba(255,255,255,0.1)",
              color: "white",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: answer.length === 5 ? "pointer" : "default",
              transition: "all 0.3s",
              boxShadow: answer.length === 5 ? "0 8px 24px rgba(99,102,241,0.4)" : "none",
            }}
          >
            {loading ? "Verifying..." : "I'm Human — Play Now →"}
          </button>
        </form>
      </div>
    </div>
  );
}
