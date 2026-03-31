"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const algorithms = [
  { id: "numbers_asc",   label: "🎮 Free Play",    desc: "No algorithm rules — just sort the items into the correct order however you like. Perfect for beginners!" },
  { id: "bubble_sort",    label: "Bubble Sort",    desc: "Swap each set of two adjacent numbers in the correct order (smallest to largest) until you reach the end of the list. Pass on numbers that are in the correct order. Start again from the beginning of the list and repeat until all numbers are in the correct order." },
  { id: "quick_sort",     label: "Quicksort",      desc: "Pick a pivot element, place all smaller elements to its left and larger elements to its right, then recursively sort each partition." },
  { id: "selection_sort", label: "Selection Sort", desc: "Find the minimum element from the unsorted portion and move it to the front. Repeat until the entire list is sorted." },
  { id: "insertion_sort", label: "Insertion Sort", desc: "Build the sorted list one item at a time by inserting each element into its correct position among the already-sorted elements." },
  { id: "merge_sort",     label: "Merge Sort",     desc: "Divide the list in half, sort each half recursively, then merge the two sorted halves back together." },
];

const gameModes   = ["Practice", "Stopwatch", "Countdown"];
const listTypes   = ["Numerical", "Alphabetical"];
const scenarios   = ["Average Case", "Best Case", "Worst Case"];

// Map list type + scenario to backend category
function getCategory(algo: string, listType: string): string {
  if (algo === "numbers_asc" || algo === "numbers_desc") return algo;
  if (listType === "Alphabetical") {
    if (algo === "bubble_sort")    return "letters_asc";
    if (algo === "selection_sort") return "letters_asc";
    if (algo === "insertion_sort") return "letters_asc";
    if (algo === "merge_sort")     return "letters_asc";
    if (algo === "quick_sort")     return "letters_asc";
  }
  return algo;
}

export default function SelectPage() {
  const router = useRouter();

  const [algo,     setAlgo]     = useState("bubble_sort");
  const [gameMode, setGameMode] = useState("Practice");
  const [listType, setListType] = useState("Numerical");
  const [scenario, setScenario] = useState("Average Case");

  useEffect(() => {
    if (!sessionStorage.getItem("session_token")) router.replace("/");
  }, [router]);

  const currentAlgo = algorithms.find(a => a.id === algo)!;

  const handleStart = () => {
    const category = getCategory(algo, listType);
    const params = new URLSearchParams({
      mode:     category,
      gameMode: gameMode.toLowerCase(),
      scenario: scenario.toLowerCase().replace(" ", "_"),
    });
    router.push(`/game?${params.toString()}`);
  };

  return (
    <div className="page-content" style={{ minHeight: "100vh", background: "#fff", color: "#111", padding: "40px 0" }}>
      <div className="container" style={{ maxWidth: "780px" }}>

        {/* Free Play prominent button */}
        <div style={{
          background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
          borderRadius: "12px",
          padding: "16px 24px",
          marginBottom: "28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          boxShadow: "0 4px 20px rgba(6,182,212,0.35)",
        }}>
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: "1.2rem" }}>🎮 Free Play</div>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.88rem", marginTop: "2px" }}>
              No rules — just sort! Perfect for beginners.
            </div>
          </div>
          <button
            onClick={() => router.push("/game?mode=numbers_asc&gameMode=practice&scenario=average_case")}
            style={{
              background: "white",
              color: "#06b6d4",
              border: "none",
              borderRadius: "50px",
              padding: "10px 28px",
              fontWeight: 800,
              fontSize: "1rem",
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
            }}
          >
            Play Now →
          </button>
        </div>

        {/* Title */}
        <h1 style={{ fontWeight: 800, fontSize: "2rem", marginBottom: "4px" }}>
          Algorithm Sorting Game
        </h1>

        {/* Instructions */}
        <h5 style={{ fontWeight: 700, marginTop: "24px", marginBottom: "6px" }}>Instructions</h5>
        <p style={{ color: "#333", lineHeight: 1.6, marginBottom: "24px" }}>
          Follow the algorithm-specific instructions below to sort a list in the correct order.
          Learn how a different sorting algorithm works on each level. Use your newly-learned
          knowledge in the final level to choose the best sorting algorithm to sort the list.
        </p>

        <hr style={{ borderColor: "#ddd", marginBottom: "24px" }} />

        {/* Algorithm heading + description */}
        <h4 style={{ fontWeight: 700, marginBottom: "12px" }}>{currentAlgo.label}</h4>

        {/* Algorithm radio group */}
        <div className="d-flex flex-wrap gap-4 mb-3">
          {algorithms.map(a => (
            <label key={a.id} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontWeight: algo === a.id ? 600 : 400, color: "#111" }}>
              <input
                type="radio"
                name="algorithm"
                value={a.id}
                checked={algo === a.id}
                onChange={() => setAlgo(a.id)}
                style={{ accentColor: "#1a73e8", width: 16, height: 16 }}
              />
              {a.label}
            </label>
          ))}
        </div>

        {/* Algorithm description */}
        <p style={{ color: "#444", lineHeight: 1.65, marginBottom: "28px", fontSize: "0.95rem" }}>
          {currentAlgo.desc}
        </p>

        <hr style={{ borderColor: "#ddd", marginBottom: "24px" }} />

        {/* Game Mode */}
        <h6 style={{ fontWeight: 700, marginBottom: "10px" }}>Game Mode</h6>
        <div className="d-flex flex-wrap gap-4 mb-4">
          {gameModes.map(m => (
            <label key={m} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "#111" }}>
              <input
                type="radio"
                name="gameMode"
                value={m}
                checked={gameMode === m}
                onChange={() => setGameMode(m)}
                style={{ accentColor: "#1a73e8", width: 16, height: 16 }}
              />
              {m}
            </label>
          ))}
        </div>

        {/* Type of List */}
        <h6 style={{ fontWeight: 700, marginBottom: "10px" }}>Type of List</h6>
        <div className="d-flex flex-wrap gap-4 mb-4">
          {listTypes.map(t => (
            <label key={t} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "#111" }}>
              <input
                type="radio"
                name="listType"
                value={t}
                checked={listType === t}
                onChange={() => setListType(t)}
                style={{ accentColor: "#1a73e8", width: 16, height: 16 }}
              />
              {t}
            </label>
          ))}
        </div>

        {/* Scenario */}
        <h6 style={{ fontWeight: 700, marginBottom: "10px" }}>Scenario</h6>
        <div className="d-flex flex-wrap gap-4 mb-5">
          {scenarios.map(s => (
            <label key={s} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "#111" }}>
              <input
                type="radio"
                name="scenario"
                value={s}
                checked={scenario === s}
                onChange={() => setScenario(s)}
                style={{ accentColor: "#1a73e8", width: 16, height: 16 }}
              />
              {s}
            </label>
          ))}
        </div>

        {/* Start Game button — bottom right like the screenshot */}
        <div className="d-flex justify-content-end">
          <button
            onClick={handleStart}
            style={{
              background: "#555",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "12px 32px",
              fontSize: "1.05rem",
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.3px",
            }}
          >
            Start Game
          </button>
        </div>

      </div>
    </div>
  );
}
