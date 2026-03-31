"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

type LeaderboardEntry = {
  username: string;
  high_score: number;
  total_games: number;
};

export default function LeaderboardPage() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API}/api/leaderboard?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return "🥇";
      case 2: return "🥈";
      case 3: return "🥉";
      default: return `#${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return "#ffd700";
      case 2: return "#c0c0c0";
      case 3: return "#cd7f32";
      default: return "#fff";
    }
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-light" style={{ width: "3rem", height: "3rem" }} />
      </div>
    );
  }

  return (
    <div className="min-vh-100" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%" }}>
      <div className="container py-5">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-5"
        >
          <h1 className="display-4 fw-bold text-white mb-3">🏆 Leaderboard</h1>
          <p className="lead text-white-50">Top players by high score</p>
        </motion.div>

        <div className="row justify-content-center">
          <div className="col-lg-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="card border-0 shadow-lg"
              style={{ background: "rgba(255, 255, 255, 0.1)", backdropFilter: "blur(10px)" }}
            >
              <div className="card-body p-0">
                {leaderboard.length === 0 ? (
                  <div className="text-center py-5">
                    <p className="text-white-50">No scores yet. Be the first to play!</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-dark table-hover mb-0">
                      <thead>
                        <tr>
                          <th scope="col" className="border-0">Rank</th>
                          <th scope="col" className="border-0">Player</th>
                          <th scope="col" className="border-0 text-center">High Score</th>
                          <th scope="col" className="border-0 text-center">Games</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((entry, index) => (
                          <motion.tr
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * index }}
                            className="border-0"
                            style={{
                              background: index < 3 ? "rgba(255, 215, 0, 0.1)" : "transparent",
                            }}
                          >
                            <td className="align-middle">
                              <span
                                className="fw-bold fs-5"
                                style={{ color: getRankColor(index + 1) }}
                              >
                                {getRankIcon(index + 1)}
                              </span>
                            </td>
                            <td className="align-middle">
                              <div className="d-flex align-items-center">
                                <div>
                                  <div className="fw-semibold text-white">
                                    {entry.username}
                                  </div>
                                  <div className="small text-white-50">
                                    Player {index + 1}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="align-middle text-center">
                              <span className="badge bg-success fs-6">
                                {entry.high_score}
                              </span>
                            </td>
                            <td className="align-middle text-center">
                              <span className="text-white-50">
                                {entry.total_games}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        <div className="text-center mt-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="d-inline-flex gap-3"
          >
            <button
              className="btn btn-light btn-lg px-4"
              onClick={() => router.push("/select")}
            >
              🎮 Play Game
            </button>
            <button
              className="btn btn-outline-light btn-lg px-4"
              onClick={() => router.push("/profile")}
            >
              👤 My Profile
            </button>
            {localStorage.getItem("token") && (
              <button
                className="btn btn-outline-danger btn-lg px-4"
                onClick={() => {
                  fetch(`${API}/api/logout`, { method: "POST", credentials: "include" });
                  localStorage.removeItem("token");
                  localStorage.removeItem("userEmail");
                  router.replace("/login");
                }}
              >
                Logout
              </button>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
