"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001";

// Add sound effects to CAPTCHA page
function playTone(type, volume = 0.3) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    switch(type) {
      case "correct":
        osc.frequency.setValueAtTime(523, ctx.currentTime);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
        break;
      case "wrong":
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.setValueAtTime(200, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(150, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        break;
      case "click":
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(volume * 0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
        break;
      default:
        osc.type = "triangle";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.setValueAtTime(100, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
        osc.start();
        osc.stop(ctx.currentTime + 0.7);
    }
  } catch (error) {
    console.log("Audio error:", error);
  }
}

export default function Home() {
  const router = useRouter();

  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaImage, setCaptchaImage] = useState("");
  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("soundEnabled");
    if(saved !== null) setSoundEnabled(saved === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("soundEnabled", String(soundEnabled));
  }, [soundEnabled]);

  const fetchCaptcha = useCallback(async () => {
    setImageLoading(true);
    setAnswer("");
    setError("");
    try {
      const res = await fetch(`${API}/api/captcha/generate`);
      const data = await res.json();
      setCaptchaToken(data.token);
      if (data.type === "math") {
        setCaptchaQuestion(data.question);
      } else {
        setCaptchaImage(data.image);
      }
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
        if(soundEnabled)playTone("correct"); // Success sound
        router.push("/game?mode=numbers_asc");
      } else {
        setError(data.msg || "Incorrect. Try again.");
        if(soundEnabled)playTone("wrong"); // Error sound
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

            <button className="c-refresh" type="button" onClick={()=>{if(soundEnabled)playTone("click");fetchCaptcha();}}>
              ↺ new code
            </button>

            
            <form onSubmit={handleSubmit} style={{ width: "100%" }}>
              <input
                className="c-input"
                type="text"
                maxLength={5}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
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
