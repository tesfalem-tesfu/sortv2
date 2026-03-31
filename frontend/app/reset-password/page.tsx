"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState(token ? "reset" : "request");

  useEffect(() => {
    if (token) {
      setStep("reset");
    }
  }, [token]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API}/api/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.msg);
        if (data.reset_token) {
          // For testing - in production, user would receive email
          setStep("reset");
          router.push(`/reset-password?token=${data.reset_token}`);
        }
      } else {
        setMessage(data.error || "Failed to request password reset");
      }
    } catch (error) {
      setMessage("Failed to request password reset");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token || "", password }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Password reset successfully! Redirecting to login...");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setMessage(data.error || "Failed to reset password");
      }
    } catch (error) {
      setMessage("Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-4" style={{ background: "#0a0a0a" }}>
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="card border-0 shadow-lg"
        style={{ background: "#1a1a1a", maxWidth: "450px", width: "100%" }}
      >
        <div className="card-body p-5">
          <h2 className="card-title text-center mb-4 fw-bold" style={{ color: "#fff" }}>
            {step === "request" ? "Reset Password" : "New Password"}
          </h2>

          {message && (
            <div className={`alert ${message.includes("successfully") || message.includes("sent") ? "alert-success" : "alert-danger"} mb-4`}>
              {message}
            </div>
          )}

          {step === "request" ? (
            <form onSubmit={handleRequestReset}>
              <div className="mb-4">
                <label className="form-label text-white">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  style={{ background: "#2a2a2a", border: "1px solid #444", color: "#fff" }}
                />
                <div className="form-text text-muted">
                  We'll send you a password reset link
                </div>
              </div>

              <div className="d-grid">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ background: "#3b82f6", border: "none" }}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              <div className="mb-3">
                <label className="form-label text-white">New Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={8}
                  style={{ background: "#2a2a2a", border: "1px solid #444", color: "#fff" }}
                />
                <div className="form-text text-muted">
                  Must be at least 8 characters long
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label text-white">Confirm Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                  style={{ background: "#2a2a2a", border: "1px solid #444", color: "#fff" }}
                />
              </div>

              <div className="d-grid">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ background: "#3b82f6", border: "none" }}
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          )}

          <hr className="my-4" style={{ borderColor: "#444" }} />

          <div className="text-center">
            <button
              className="btn btn-outline-light btn-sm"
              onClick={() => router.push("/login")}
            >
              Back to Login
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-light" style={{ width: "3rem", height: "3rem" }} />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
