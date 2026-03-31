"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useTheme } from "next-themes";
import { useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001";
const QUESTION_TIME = 30;

// V2: uses session token instead of JWT
async function apiCall(url: string, options: RequestInit = {}): Promise<Response> {
  const token = sessionStorage.getItem("session_token");
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Session-Token": token } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    sessionStorage.removeItem("session_token");
    window.location.href = "/";
  }
  return res;
}

function playTone(type: "correct" | "wrong" | "gameover") {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === "correct") {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    } else if (type === "wrong") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.setValueAtTime(150, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.setValueAtTime(100, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc.start(); osc.stop(ctx.currentTime + 0.7);
    }
  } catch { /* ignore */ }
}

const ALGO_LABELS: Record<string, { name: string; icon: string; color: string }> = {
  bubble_sort:    { name: "Bubble Sort",    icon: "🫧", color: "#3b82f6" },
  selection_sort: { name: "Selection Sort", icon: "🎯", color: "#a855f7" },
  insertion_sort: { name: "Insertion Sort", icon: "🃏", color: "#f97316" },
  merge_sort:     { name: "Merge Sort",     icon: "🔀", color: "#22c55e" },
  quick_sort:     { name: "Quick Sort",     icon: "⚡", color: "#eab308" },
  numbers_asc:    { name: "🎮 Free Play",   icon: "🎮", color: "#06b6d4" },
  numbers_desc:   { name: "Free Sort ↓",   icon: "🔢", color: "#06b6d4" },
  letters_asc:    { name: "Letters A→Z",   icon: "🔤", color: "#a78bfa" },
  letters_desc:   { name: "Letters Z→A",   icon: "🔤", color: "#a78bfa" },
  days:           { name: "Days of Week",  icon: "📅", color: "#f97316" },
};

const ALGO_ACTIONS: Record<string, { hint: string; actionBtn: string }> = {
  bubble_sort:    { hint: "Select a card, then Swap or Pass with its neighbour", actionBtn: "🔄 Swap" },
  selection_sort: { hint: "Click the smallest card, then Place Minimum", actionBtn: "⬅ Place Minimum" },
  insertion_sort: { hint: "Select a card, then Insert Here to shift it left", actionBtn: "📌 Insert Here" },
  merge_sort:     { hint: "Arrange the merged result in sorted order", actionBtn: "🔀 Merge & Sort" },
  quick_sort:     { hint: "Click a card as pivot, then Partition", actionBtn: "⚡ Partition" },
  numbers_asc:    { hint: "Click a card to select, click another to swap", actionBtn: "🔄 Swap" },
  numbers_desc:   { hint: "Click a card to select, click another to swap", actionBtn: "🔄 Swap" },
  letters_asc:    { hint: "Click a card to select, click another to swap", actionBtn: "🔄 Swap" },
  letters_desc:   { hint: "Click a card to select, click another to swap", actionBtn: "🔄 Swap" },
  days:           { hint: "Click a card to select, click another to swap", actionBtn: "🔄 Swap" },
};

type Question = { id: number; question: string; items: string[]; category: string };

function FloatScore({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 1000); return () => clearTimeout(t); }, [onDone]);
  return <div className="float-score" style={{ left: x, top: y }}>+10</div>;
}

export default function GamePage() {
  return (
    <Suspense fallback={<div className="min-vh-100 d-flex align-items-center justify-content-center"><div className="spinner-border text-light" /></div>}>
      <Game />
    </Suspense>
  );
}

function Game() {
  const router       = useRouter();
  const { theme, setTheme } = useTheme();
  const searchParams = useSearchParams();
  const mode         = searchParams.get("mode") || "numbers_asc";
  const algoInfo     = ALGO_LABELS[mode] || { name: "Sorting", icon: "🎯", color: "#6366f1" };
  const algoAction   = ALGO_ACTIONS[mode] || ALGO_ACTIONS["numbers_asc"];

  const [currentIndex, setCurrentIndex]       = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [items, setItems]                     = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex]     = useState<number | null>(null);
  const [pivotIndex, setPivotIndex]           = useState<number | null>(null);
  const [feedback, setFeedback]               = useState<"correct" | "wrong" | null>(null);
  const [correctOrder, setCorrectOrder]       = useState<string[]>([]);
  const [showReveal, setShowReveal]           = useState(false);
  const [score, setScore]                     = useState(0);
  const [lives, setLives]                     = useState(3);
  const [timeLeft, setTimeLeft]               = useState(QUESTION_TIME);
  const [streak, setStreak]                   = useState(0);
  const [highScore, setHighScore]             = useState(0);
  const [soundEnabled, setSoundEnabled]       = useState(true);
  const [loading, setLoading]                 = useState(true);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [gameOver, setGameOver]               = useState(false);
  const [floatScore, setFloatScore]           = useState<{ x: number; y: number } | null>(null);
  const [actionMsg, setActionMsg]             = useState("");
  const [totalAnswered, setTotalAnswered]     = useState(0);
  const [mounted, setMounted]                 = useState(false);

  const submitRef    = useRef<(() => void) | null>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    setHighScore(Number(sessionStorage.getItem("highScore") || "0"));
    setStreak(Number(sessionStorage.getItem("streak") || "0"));
    const saved = localStorage.getItem("soundEnabled");
    if (saved !== null) setSoundEnabled(saved === "true");
  }, []);

  useEffect(() => { localStorage.setItem("soundEnabled", String(soundEnabled)); }, [soundEnabled]);

  // Auth guard — redirect to home if no session
  useEffect(() => {
    if (!sessionStorage.getItem("session_token")) router.replace("/");
  }, [router]);

  const fetchQuestion = useCallback(async () => {
    setQuestionLoading(true);
    try {
      const res  = await apiCall(`${API}/api/game/questions?limit=1&category=${mode}`);
      const data = await res.json();
      const qs   = data.questions || [];
      if (!qs.length) { setError(`No questions for "${mode}".`); return; }
      const q = qs[0];
      setCurrentQuestion(q);
      setItems([...q.items]);
      setFeedback(null);
      setCorrectOrder([]);
      setShowReveal(false);
      setTimeLeft(QUESTION_TIME);
      setSelectedIndex(null);
      setPivotIndex(null);
      setActionMsg("");
    } catch { setError("Cannot connect to backend."); }
    finally { setQuestionLoading(false); setLoading(false); }
  }, [mode]);

  useEffect(() => {
    if (!mounted) return;
    if (!sessionStorage.getItem("session_token")) return;
    fetchQuestion();
  }, [mounted, mode, fetchQuestion]);

  const submit = useCallback(() => {
    if (!currentQuestion || feedback) return;
    apiCall(`${API}/api/game/submit`, {
      method: "POST",
      body: JSON.stringify({
        category: currentQuestion.category,
        original_items: currentQuestion.items,
        answer: items,
        session_token: sessionStorage.getItem("session_token"),
      }),
    })
      .then(r => r.json())
      .then(data => {
        const isCorrect = data.correct;
        setFeedback(isCorrect ? "correct" : "wrong");
        setCorrectOrder(data.correct_order || []);
        setTotalAnswered(p => p + 1);

        if (isCorrect) {
          setScore(s => {
            const ns = s + 10;
            if (ns > Number(sessionStorage.getItem("highScore") || "0")) {
              sessionStorage.setItem("highScore", String(ns));
              setHighScore(ns);
            }
            return ns;
          });
          setStreak(p => { const n = p + 1; sessionStorage.setItem("streak", String(n)); return n; });
          confetti({ particleCount: 180, spread: 100, origin: { y: 0.6 } });
          if (soundEnabled) playTone("correct");
          if (submitBtnRef.current) {
            const r = submitBtnRef.current.getBoundingClientRect();
            setFloatScore({ x: r.left + r.width / 2 - 20, y: r.top - 20 });
          }
        } else {
          setLives(p => p - 1);
          setStreak(0); sessionStorage.setItem("streak", "0");
          if (soundEnabled) playTone("wrong");
          setTimeout(() => setShowReveal(true), 700);
        }

        setTimeout(() => {
          setLives(currentLives => {
            if (currentLives <= 0) {
              setGameOver(true);
              if (soundEnabled) playTone("gameover");
            } else {
              setCurrentIndex(p => p + 1);
              fetchQuestion();
            }
            return currentLives;
          });
        }, 3000);
      })
      .catch(() => setFeedback(null));
  }, [currentQuestion, feedback, items, soundEnabled, fetchQuestion]);

  useEffect(() => { submitRef.current = submit; }, [submit]);

  useEffect(() => {
    if (feedback || gameOver) return;
    if (timeLeft <= 0) { submitRef.current?.(); return; }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, feedback, gameOver]);

  const handleItemClick = (index: number) => {
    if (feedback) return;
    const freeModes = ["numbers_asc","numbers_desc","letters_asc","letters_desc","days"];
    if (freeModes.includes(mode)) {
      if (selectedIndex === null) { setSelectedIndex(index); setActionMsg(`"${items[index]}" selected`); }
      else if (selectedIndex === index) { setSelectedIndex(null); setActionMsg(""); }
      else {
        const next = [...items];
        [next[selectedIndex], next[index]] = [next[index], next[selectedIndex]];
        setItems(next); setActionMsg(`Swapped!`); setSelectedIndex(null);
      }
    } else {
      if (selectedIndex === index) { setSelectedIndex(null); setActionMsg(""); }
      else { setSelectedIndex(index); setActionMsg(`"${items[index]}" selected`); }
    }
  };

  const handleAction = () => {
    if (feedback || selectedIndex === null) return;
    if (mode === "selection_sort") {
      const next = [...items]; const [picked] = next.splice(selectedIndex, 1); next.unshift(picked);
      setItems(next); setActionMsg(`"${picked}" moved to front`); setSelectedIndex(null);
    } else if (mode === "insertion_sort") {
      if (selectedIndex > 0) {
        const next = [...items];
        [next[selectedIndex-1], next[selectedIndex]] = [next[selectedIndex], next[selectedIndex-1]];
        setItems(next); setActionMsg(`Inserted left`); setSelectedIndex(selectedIndex - 1);
      } else { setActionMsg("Already at front!"); }
    } else if (mode === "merge_sort") {
      const next = [...items].sort((a,b) => Number(a)-Number(b) || a.localeCompare(b));
      setItems(next); setActionMsg("Merged & sorted!"); setSelectedIndex(null);
    } else if (mode === "quick_sort") {
      const pivot = items[selectedIndex];
      const less    = items.filter((_,i) => i !== selectedIndex && Number(items[i]) <= Number(pivot));
      const greater = items.filter((_,i) => i !== selectedIndex && Number(items[i]) > Number(pivot));
      setItems([...less, pivot, ...greater]); setPivotIndex(less.length);
      setActionMsg(`Partitioned around "${pivot}"`); setSelectedIndex(null);
    }
  };

  const exitGame = () => { sessionStorage.removeItem("session_token"); router.replace("/"); };
  const shareScore = () => { navigator.clipboard.writeText(`I scored ${score} on Sorting Quest v2! 🔥`); alert("Copied!"); };

  if (loading) return <div className="min-vh-100 d-flex align-items-center justify-content-center"><div className="spinner-border text-light" style={{ width: "3rem", height: "3rem" }} /></div>;
  if (error || !currentQuestion) return (
    <div className="text-center p-5 text-white">
      <p className="fs-4">{error || "No questions found"}</p>
      <button className="btn btn-outline-light mt-3" onClick={() => router.push("/select")}>Back</button>
    </div>
  );

  if (gameOver) return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center p-5 page-content">
      <motion.h2 initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="display-4 fw-bold mb-4" style={{ color: "#ef4444" }}>Game Over</motion.h2>
      <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
        className="text-center p-5 rounded-4" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", minWidth: "320px" }}>
        <h3>Final Score: <span style={{ color: "#22c55e" }}>{score}</span></h3>
        <h5 className="mt-3">High Score: <span style={{ color: "#eab308" }}>{highScore}</span></h5>
        <p className="text-white-50 mt-2">Questions answered: {totalAnswered}</p>
        <div className="d-flex gap-3 justify-content-center mt-4 flex-wrap">
          <button className="btn btn-primary px-5" onClick={() => window.location.reload()}>Play Again</button>
          <button className="btn btn-outline-info px-4" onClick={shareScore}>Share Score</button>
          <button className="btn btn-outline-light px-4" onClick={() => router.push("/select")}>Change Mode</button>
          <button className="btn btn-outline-danger px-4" onClick={exitGame}>Exit</button>
        </div>
      </motion.div>
    </div>
  );

  const isLocked   = !!feedback;
  const timerPct   = (timeLeft / QUESTION_TIME) * 100;
  const timerColor = timeLeft > 15 ? "#22c55e" : timeLeft > 7 ? "#eab308" : "#ef4444";

  return (
    <div className="min-vh-100 d-flex flex-column page-content">
      {floatScore && <FloatScore x={floatScore.x} y={floatScore.y} onDone={() => setFloatScore(null)} />}

      <header className="d-flex flex-wrap justify-content-between align-items-center p-3 gap-2"
        style={{ background: "rgba(5,5,20,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="d-flex align-items-center gap-3">
          <h3 className="mb-0 fw-bold text-white">Sorting Quest</h3>
          <span style={{ background: "rgba(255,255,255,0.1)", border: `1px solid ${algoInfo.color}`, color: algoInfo.color, borderRadius: "50px", padding: "3px 12px", fontSize: "0.82rem", fontWeight: 700 }}>
            {algoInfo.icon} {algoInfo.name}
          </span>
          <button className="btn btn-sm btn-outline-light" onClick={() => router.push("/select")} style={{ fontSize: "0.78rem" }}>⇄ Change</button>
        </div>
        <div className="d-flex flex-wrap gap-3 align-items-center">
          <span className="text-white">Score: <strong style={{ color: "#22c55e" }}>{score}</strong></span>
          <span className="text-white">Streak: <span style={{ color: "#eab308" }}>{streak} 🔥</span></span>
          <span>{Array.from({ length: 3 }).map((_,i) => <span key={i}>{i < lives ? "❤️" : "🖤"}</span>)}</span>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => setSoundEnabled(!soundEnabled)}>{soundEnabled ? "🔊" : "🔇"}</button>
          <button className="btn btn-sm btn-outline-light" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "☀️" : "🌙"}</button>
          <button className="btn btn-sm btn-outline-danger" onClick={exitGame}>Exit</button>
        </div>
      </header>

      <div className="px-4 pt-3">
        <div className="d-flex justify-content-between small mb-1">
          <span className="text-white">Question #{totalAnswered + 1}</span>
          <span style={{ color: timerColor, fontWeight: timeLeft <= 7 ? 800 : 400 }}>⏱ {timeLeft}s</span>
        </div>
        <div className="progress mb-1" style={{ height: "5px", background: "rgba(255,255,255,0.1)" }}>
          <div className="progress-bar" style={{ width: `${Math.min((totalAnswered % 10) * 10, 100)}%`, background: algoInfo.color }} />
        </div>
        <div className="progress" style={{ height: "4px", background: "rgba(255,255,255,0.1)" }}>
          <div className="progress-bar" style={{ width: `${timerPct}%`, background: timerColor, transition: "width 1s linear" }} />
        </div>
      </div>

      <motion.div key={currentQuestion.id} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center p-4">
        <div className="question-box">
          <span className="me-2">{algoInfo.icon}</span>
          {questionLoading ? "Loading..." : currentQuestion.question}
        </div>
        {!isLocked && (
          <div className="mt-3 d-inline-flex align-items-center gap-2 px-4 py-2 rounded-pill"
            style={{ background: "rgba(0,0,0,0.6)", border: `1px solid ${algoInfo.color}40`, fontSize: "0.88rem", color: "rgba(255,255,255,0.85)" }}>
            {actionMsg ? <span style={{ color: algoInfo.color, fontWeight: 600 }}>✓ {actionMsg}</span> : <span>{algoAction.hint}</span>}
            {selectedIndex !== null && (
              <button onClick={() => { setSelectedIndex(null); setActionMsg(""); }}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "1rem", padding: 0 }}>✕</button>
            )}
          </div>
        )}
      </motion.div>

      <div className="d-flex flex-wrap justify-content-center gap-3 px-3 pb-2">
        <AnimatePresence mode="popLayout">
          {items.map((item, index) => {
            const isSelected = selectedIndex === index;
            const isPivot    = mode === "quick_sort" && pivotIndex === index && !isSelected;
            const isReveal   = feedback === "wrong" && showReveal;
            const isCorrect  = feedback === "correct";
            const isWrong    = feedback === "wrong" && !showReveal;
            let cardClass = "sort-card";
            if (isSelected) cardClass += " selected";
            else if (isCorrect) cardClass += " correct locked";
            else if (isWrong) cardClass += " wrong locked";
            else if (isReveal) cardClass += " reveal locked";
            else if (isLocked) cardClass += " locked";
            const displayItem = isReveal ? (correctOrder[index] ?? item) : item;
            return (
              <motion.div key={isReveal ? `rev-${index}` : `item-${index}`} layout
                initial={{ opacity: 0, y: 30, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.3, delay: index * 0.05 }}
                className={cardClass} onClick={() => handleItemClick(index)}>
                <span className="badge-pos">{index + 1}</span>
                <span>{displayItem}</span>
                {isPivot && <span style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "#eab308", color: "#000", fontSize: "0.65rem", fontWeight: 800, padding: "1px 6px", borderRadius: "6px" }}>PIVOT</span>}
                {isCorrect && <span className="check-overlay">✓</span>}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {!isLocked && (
        <div className="d-flex justify-content-center gap-3 px-3 pb-2 flex-wrap">
          {mode === "bubble_sort" ? (
            <>
              <button className="btn btn-lg px-4 py-2 fw-bold rounded-pill"
                style={{ background: selectedIndex !== null ? algoInfo.color : "#333", border: `2px solid ${algoInfo.color}`, color: "white", opacity: selectedIndex !== null ? 1 : 0.5 }}
                disabled={selectedIndex === null}
                onClick={() => {
                  if (selectedIndex === null) return;
                  const next = [...items]; const sw = selectedIndex < items.length - 1 ? selectedIndex + 1 : selectedIndex - 1;
                  [next[selectedIndex], next[sw]] = [next[sw], next[selectedIndex]];
                  setItems(next); setActionMsg(`Swapped!`); setSelectedIndex(null);
                }}>🔄 Swap</button>
              <button className="btn btn-lg px-4 py-2 fw-bold rounded-pill"
                style={{ background: selectedIndex !== null ? "#6b7280" : "#333", border: "2px solid #9ca3af", color: "white", opacity: selectedIndex !== null ? 1 : 0.5 }}
                disabled={selectedIndex === null}
                onClick={() => { if (selectedIndex === null) return; setActionMsg("Passed!"); setSelectedIndex(null); }}>⏭ Pass</button>
            </>
          ) : (
            <button className="btn btn-lg px-4 py-2 fw-bold rounded-pill"
              style={{ background: selectedIndex !== null ? algoInfo.color : "#333", border: `2px solid ${selectedIndex !== null ? algoInfo.color : "#555"}`, color: "white", opacity: selectedIndex !== null ? 1 : 0.6 }}
              onClick={handleAction} disabled={selectedIndex === null}>{algoAction.actionBtn}</button>
          )}
        </div>
      )}

      <div className="d-flex justify-content-center align-items-center gap-3 mb-4 px-3 flex-wrap">
        <button className="btn btn-lg px-4 py-2 fw-semibold rounded-pill"
          style={{ background: currentIndex === 0 || isLocked ? "#555" : "#222", border: "2px solid #666", color: currentIndex === 0 || isLocked ? "rgba(255,255,255,0.4)" : "white" }}
          onClick={() => { if (currentIndex > 0 && !isLocked) setCurrentIndex(p => p - 1); }}
          disabled={currentIndex === 0 || isLocked}>← Previous</button>

        <button ref={submitBtnRef} className="btn btn-lg px-5 py-3 fw-bold rounded-pill"
          style={{ background: isLocked ? "#555" : `linear-gradient(135deg, ${algoInfo.color}, #ec4899)`, border: "none", fontSize: "1.1rem", color: "white", boxShadow: isLocked ? "none" : `0 8px 24px ${algoInfo.color}60` }}
          onClick={submit} disabled={isLocked}>
          {isLocked ? (feedback === "correct" ? "✓ Correct!" : "✗ Wrong") : "Submit Answer"}
        </button>

        <button className="btn btn-lg px-4 py-2 fw-semibold rounded-pill"
          style={{ background: isLocked ? "#555" : "#222", border: "2px solid #666", color: isLocked ? "rgba(255,255,255,0.4)" : "white" }}
          onClick={() => { if (!isLocked) { setCurrentIndex(p => p + 1); fetchQuestion(); } }}
          disabled={isLocked}>Next →</button>
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }}
            className="mx-4 mb-4 p-4 rounded-3 text-center fw-bold fs-5"
            style={{ background: feedback === "correct" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)", border: `2px solid ${feedback === "correct" ? "#22c55e" : "#ef4444"}`, color: "white" }}>
            {feedback === "correct" ? "🎉 Correct! +10 points" : "❌ Wrong — correct order shown above ↑"}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
