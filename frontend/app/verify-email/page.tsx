"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (token) {
      verifyEmail();
    }
  }, [token]);

  const verifyEmail = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API}/api/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Email verified successfully! You can now login.");
        setVerified(true);
      } else {
        setMessage(data.error || "Failed to verify email");
      }
    } catch (error) {
      setMessage("Failed to verify email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-4" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%" }}>
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="card border-0 shadow-lg"
        style={{ background: "rgba(255, 255, 255, 0.95)", maxWidth: "500px", width: "100%" }}
      >
        <div className="card-body p-5 text-center">
          <div className="mb-4">
            {verified ? (
              <div className="text-success" style={{ fontSize: "4rem" }}>✓</div>
            ) : (
              <div className="text-info" style={{ fontSize: "4rem" }}>📧</div>
            )}
          </div>

          <h2 className="card-title mb-3 fw-bold">
            {verified ? "Email Verified!" : "Verify Email"}
          </h2>

          {loading && (
            <div className="mb-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}

          {message && (
            <div className={`alert ${verified ? "alert-success" : "alert-danger"} mb-4`}>
              {message}
            </div>
          )}

          {!token && !loading && (
            <div className="mb-4">
              <p className="text-muted">
                Please check your email for a verification link and click on it to verify your account.
              </p>
            </div>
          )}

          <div className="d-grid gap-2">
            {verified && (
              <button
                className="btn btn-primary btn-lg"
                onClick={() => router.push("/login")}
                style={{ background: "#3b82f6", border: "none" }}
              >
                Go to Login
              </button>
            )}
            
            <button
              className="btn btn-outline-secondary"
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-light" style={{ width: "3rem", height: "3rem" }} />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
