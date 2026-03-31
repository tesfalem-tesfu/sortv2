"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

async function apiCall(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("token");
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    window.location.href = "/login";
  }
  return res;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState({
    username: "",
    email: "",
    high_score: 0,
    total_games: 0,
    email_verified: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.replace("/login");
      return;
    }

    fetchProfile();
  }, [router]);

  const fetchProfile = async () => {
    try {
      const res = await apiCall(`${API}/api/profile`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setUsername(data.username || "");
      }
    } catch (error) {
      setMessage("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await apiCall(`${API}/api/profile`, {
        method: "PUT",
        body: JSON.stringify({ username }),
      });

      if (res.ok) {
        setProfile({ ...profile, username });
        setMessage("Profile updated successfully!");
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to update profile");
      }
    } catch (error) {
      setMessage("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const sendVerification = async () => {
    try {
      const res = await apiCall(`${API}/api/send-verification`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setMessage(data.msg);
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to send verification");
      }
    } catch (error) {
      setMessage("Failed to send verification");
    }
  };

  const logout = () => {
    fetch(`${API}/api/logout`, { method: "POST", credentials: "include" });
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-light" style={{ width: "3rem", height: "3rem" }} />
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-4" style={{ background: "#0a0a0a" }}>
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="card border-0 shadow-lg"
        style={{ background: "#1a1a1a", maxWidth: "500px", width: "100%" }}
      >
        <div className="card-body p-5">
          <h2 className="card-title text-center mb-4 fw-bold" style={{ color: "#fff" }}>
            Profile
          </h2>

          {message && (
            <div className={`alert ${message.includes("successfully") ? "alert-success" : "alert-danger"} mb-4`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="form-label text-white">Email</label>
              <div className="input-group">
                <input
                  type="email"
                  className="form-control"
                  value={profile.email}
                  disabled
                  style={{ background: "#2a2a2a", border: "1px solid #444", color: "#fff" }}
                />
                <span className={`input-group-text ${profile.email_verified ? "text-success" : "text-warning"}`}>
                  {profile.email_verified ? "✓ Verified" : "✗ Not Verified"}
                </span>
              </div>
              {!profile.email_verified && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-warning mt-2"
                  onClick={sendVerification}
                >
                  Send Verification Email
                </button>
              )}
            </div>

            <div className="mb-4">
              <label className="form-label text-white">Username</label>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                minLength={3}
                style={{ background: "#2a2a2a", border: "1px solid #444", color: "#fff" }}
              />
              <div className="form-text text-muted">
                Must be at least 3 characters long
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-6">
                <div className="text-center p-3 rounded" style={{ background: "#2a2a2a" }}>
                  <div className="text-white-50 small">High Score</div>
                  <div className="h4 mb-0 text-success">{profile.high_score}</div>
                </div>
              </div>
              <div className="col-6">
                <div className="text-center p-3 rounded" style={{ background: "#2a2a2a" }}>
                  <div className="text-white-50 small">Total Games</div>
                  <div className="h4 mb-0 text-info">{profile.total_games}</div>
                </div>
              </div>
            </div>

            <div className="d-grid gap-2">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{ background: "#3b82f6", border: "none" }}
              >
                {saving ? "Saving..." : "Update Profile"}
              </button>
            </div>
          </form>

          <hr className="my-4" style={{ borderColor: "#444" }} />

          <div className="d-grid gap-2">
            <button
              className="btn btn-outline-info"
              onClick={() => router.push("/leaderboard")}
            >
              View Leaderboard
            </button>
            <button
              className="btn btn-outline-secondary"
              onClick={() => router.push("/select")}
            >
              Back to Game
            </button>
            <button
              className="btn btn-outline-danger"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
