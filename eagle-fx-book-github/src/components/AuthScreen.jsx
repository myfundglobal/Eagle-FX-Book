import { useState } from "react";
import { motion } from "framer-motion";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from "firebase/auth";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User
} from "lucide-react";
import {
  auth,
  googleProvider,
  isFirebaseConfigured,
  mapFirebaseError
} from "../firebase.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen() {
  const [mode, setMode] = useState("login"); // "login" | "signup" | "forgot"
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setErrorMsg("");
    setInfoMsg("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    const trimmedEmail = email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    if (!auth) {
      setErrorMsg("Firebase Web config is missing. Check .env / GitHub Secrets.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, password);
    } catch (err) {
      setErrorMsg(mapFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    const cleanName = fullName.trim();
    const trimmedEmail = email.trim();

    if (cleanName.length < 2) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (!acceptedTerms) {
      setErrorMsg("Please accept the Terms & Privacy Policy to continue.");
      return;
    }
    if (!auth) {
      setErrorMsg("Firebase Web config is missing. Check .env / GitHub Secrets.");
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );
      await updateProfile(cred.user, { displayName: cleanName });
      await sendEmailVerification(cred.user);
      setInfoMsg("Verification email sent. Please check your inbox.");
    } catch (err) {
      setErrorMsg(mapFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    const trimmedEmail = email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setErrorMsg("Enter the email address for your account.");
      return;
    }
    if (!auth) {
      setErrorMsg("Firebase Web config is missing.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setInfoMsg("Password reset link sent to your email inbox.");
    } catch (err) {
      setErrorMsg(mapFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg("");
    setInfoMsg("");
    if (!auth || !googleProvider) {
      setErrorMsg("Firebase Web config is missing. Check .env / GitHub Secrets.");
      return;
    }
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setErrorMsg(mapFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px"
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ width: "100%", maxWidth: "410px", display: "flex", flexDirection: "column", gap: "18px" }}
      >
        {/* Brand Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              overflow: "hidden",
              border: "1px solid rgba(225, 29, 46, 0.45)",
              boxShadow: "0 0 36px rgba(225, 29, 46, 0.25)",
              marginBottom: "14px"
            }}
          >
            <img
              src="logo.png"
              alt="Eagle FX Book"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <h1
            style={{
              margin: "0 0 4px 0",
              fontSize: "20px",
              fontWeight: 800,
              letterSpacing: "1.6px",
              color: "var(--text)"
            }}
          >
            EAGLE FX BOOK
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
            “Master your mind, master the market.”
          </p>
        </div>

        {!isFirebaseConfigured && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "14px",
              backgroundColor: "rgba(245, 179, 1, 0.1)",
              border: "1px solid rgba(245, 179, 1, 0.4)",
              fontSize: "12px",
              color: "var(--warning)",
              lineHeight: 1.5
            }}
          >
            Firebase Web keys (`VITE_FIREBASE_API_KEY` & `VITE_FIREBASE_APP_ID`) are not configured yet in `.env` / GitHub Secrets.
          </div>
        )}

        <div className="pro-card">
          {/* Segmented Tabs */}
          {mode !== "forgot" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "6px",
                padding: "4px",
                backgroundColor: "var(--surface-2)",
                borderRadius: "14px",
                border: "1px solid var(--border)",
                marginBottom: "18px"
              }}
            >
              {[
                { id: "login", label: "Login" },
                { id: "signup", label: "Sign Up" }
              ].map((tab) => {
                const active = mode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => switchMode(tab.id)}
                    style={{
                      minHeight: "42px",
                      border: "none",
                      borderRadius: "10px",
                      backgroundColor: active ? "var(--primary)" : "transparent",
                      color: active ? "#FFFFFF" : "var(--muted)",
                      fontWeight: 700,
                      fontSize: "14px",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "10px 12px",
                borderRadius: "12px",
                backgroundColor: "rgba(255, 92, 92, 0.12)",
                border: "1px solid rgba(255, 92, 92, 0.35)",
                color: "var(--loss)",
                fontSize: "13px",
                marginBottom: "14px"
              }}
            >
              <AlertCircle size={16} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: "2px" }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "10px 12px",
                borderRadius: "12px",
                backgroundColor: "rgba(34, 197, 94, 0.12)",
                border: "1px solid rgba(34, 197, 94, 0.35)",
                color: "var(--profit)",
                fontSize: "13px",
                marginBottom: "14px"
              }}
            >
              <CheckCircle2 size={16} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: "2px" }} />
              <span>{infoMsg}</span>
            </div>
          )}

          {mode === "login" && (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={labelStyle}>EMAIL</label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} strokeWidth={1.75} color="var(--muted)" style={iconLeftStyle} />
                  <input
                    type="email"
                    className="pro-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="trader@domain.com"
                    style={{ paddingLeft: "40px" }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>PASSWORD</label>
                <div style={{ position: "relative" }}>
                  <Lock size={16} strokeWidth={1.75} color="var(--muted)" style={iconLeftStyle} />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="pro-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    style={{ paddingLeft: "40px", paddingRight: "44px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    style={eyeButtonStyle}
                  >
                    {showPassword ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--primary)",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "4px 0"
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={loading} className="btn-red">
                {loading ? "Signing in..." : "Login to Terminal"}
              </button>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={labelStyle}>FULL NAME</label>
                <div style={{ position: "relative" }}>
                  <User size={16} strokeWidth={1.75} color="var(--muted)" style={iconLeftStyle} />
                  <input
                    type="text"
                    className="pro-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Aarav Sharma"
                    style={{ paddingLeft: "40px" }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>EMAIL</label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} strokeWidth={1.75} color="var(--muted)" style={iconLeftStyle} />
                  <input
                    type="email"
                    className="pro-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="trader@domain.com"
                    style={{ paddingLeft: "40px" }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>PASSWORD</label>
                <div style={{ position: "relative" }}>
                  <Lock size={16} strokeWidth={1.75} color="var(--muted)" style={iconLeftStyle} />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="pro-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    style={{ paddingLeft: "40px", paddingRight: "44px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    style={eyeButtonStyle}
                  >
                    {showPassword ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={labelStyle}>CONFIRM PASSWORD</label>
                <div style={{ position: "relative" }}>
                  <Lock size={16} strokeWidth={1.75} color="var(--muted)" style={iconLeftStyle} />
                  <input
                    type={showConfirm ? "text" : "password"}
                    className="pro-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    style={{ paddingLeft: "40px", paddingRight: "44px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                    style={eyeButtonStyle}
                  >
                    {showConfirm ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
                  </button>
                </div>
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "12px",
                  color: "var(--muted)",
                  cursor: "pointer",
                  padding: "4px 0"
                }}
              >
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  style={{ accentColor: "var(--primary)", width: "16px", height: "16px" }}
                />
                <span>I agree to the Eagle FX Book Terms &amp; Privacy Policy.</span>
              </label>

              <button type="submit" disabled={loading} className="btn-red">
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text)" }}>
                Reset Password
              </h3>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", lineHeight: 1.5 }}>
                Enter your registered email address and we will send a reset link.
              </p>
              <div style={{ position: "relative" }}>
                <Mail size={16} strokeWidth={1.75} color="var(--muted)" style={iconLeftStyle} />
                <input
                  type="email"
                  className="pro-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trader@domain.com"
                  style={{ paddingLeft: "40px" }}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-red">
                {loading ? "Sending..." : "Send Reset Email"}
              </button>
              <button
                type="button"
                className="btn-surface"
                onClick={() => switchMode("login")}
              >
                Back to Login
              </button>
            </form>
          )}

          {mode !== "forgot" && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  margin: "16px 0"
                }}
              >
                <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border)" }} />
                <span style={{ fontSize: "11px", color: "var(--muted)", letterSpacing: "1px" }}>OR</span>
                <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border)" }} />
              </div>

              <button
                type="button"
                className="btn-surface"
                disabled={loading}
                onClick={handleGoogleSignIn}
                style={{ width: "100%" }}
              >
                <ShieldCheck size={17} strokeWidth={1.75} color="var(--primary)" />
                Continue with Google
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.8px",
  color: "var(--muted)",
  marginBottom: "6px"
};

const iconLeftStyle = {
  position: "absolute",
  left: "13px",
  top: "50%",
  transform: "translateY(-50%)"
};

const eyeButtonStyle = {
  position: "absolute",
  right: "6px",
  top: "50%",
  transform: "translateY(-50%)",
  background: "transparent",
  border: "none",
  color: "var(--muted)",
  cursor: "pointer",
  width: "36px",
  height: "36px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};
