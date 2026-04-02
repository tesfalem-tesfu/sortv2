"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001";

export default function Home() {
  const router = useRouter();

  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaImage, setCaptchaImage] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [dots, setDots] = useState("");

  const fetchCaptcha = useCallback(async () => {
    setImageLoading(true);
    setAnswer("");
    setError("");
    try {
      const res = await fetch(`${API}/api/captcha/generate`);
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

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? "" : d + ".");
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/captcha/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken, answer: answer.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem("session_token", data.session_token);
        router.push("/game?mode=numbers_asc");
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
    <div className="c-root">
        <div style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "clamp(2rem, 5vw, 3.2rem)",
          fontWeight: 900,
          color: "#38bdf8",
          letterSpacing: "0.12em",
          textShadow: "0 0 30px rgba(56,189,248,0.5)",
          whiteSpace: "nowrap",
          textAlign: "center",
        }}>
          SORTING QUIZ
        </div>

        {/* circle + rings wrapper */}
        <div className="c-circle-wrap">
          <div className="c-ring-outer" />
          <div className="c-ring-mid" />

          <div className="c-card">
            <div className="c-pulse" />
            <div className="c-subtitle">verify humanity{dots}</div>

            <div className="c-captcha-ring">
              {imageLoading ? (
                <div className="c-spinner" style={{ width: 24, height: 24 }} />
              ) : (
                <img src={captchaImage} alt="captcha" />
              )}
            </div>

            <button className="c-refresh" type="button" onClick={fetchCaptcha}>
              ↺ new code
            </button>

            <form onSubmit={handleSubmit} style={{ width: "100%" }}>
              <input
                className="c-input"
                type="text"
                maxLength={5}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={answer}
                onChange={(e) => setAnswer(e.target.value.toUpperCase())}
                placeholder="· · · · ·"
                required
                autoFocus
              />
              {error && <div className="c-error">⚠ {error}</div>}
              <button className="c-btn" type="submit" disabled={loading || answer.length < 5}>
                {loading ? <><span className="c-spinner" />verifying</> : "enter the quest →"}
              </button>
            </form>
          </div>
        </div>
      </div>
  );
}
