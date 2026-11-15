import { useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import {
  Camera,
  CheckCircle2,
  LogOut,
  MailCheck,
  Shield,
  User,
  X
} from "lucide-react";
import {
  COUNTRY_CODES,
  compressImageToBase64,
  validatePhone
} from "../utils/formatters.js";

export default function ProfileModal({
  user,
  profile,
  isOnboarding,
  onSave,
  onSignOut,
  onClose
}) {
  const nameParts = (profile?.name || user?.displayName || "").trim().split(/\s+/);
  const [firstName, setFirstName] = useState(profile?.firstName || nameParts[0] || "");
  const [surname, setSurname] = useState(
    profile?.surname || nameParts.slice(1).join(" ") || ""
  );
  const [countryCode, setCountryCode] = useState(profile?.countryCode || "+91");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || "");
  const [dpBase64, setDpBase64] = useState(profile?.profilePictureBase64 || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [verifyMsg, setVerifyMsg] = useState("");

  const activeRule =
    COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];

  const handleDpUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await compressImageToBase64(file, 420, 0.72);
      setDpBase64(b64);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setErrorCode("");
    if (firstName.trim().length < 2 || surname.trim().length < 1) {
      setError("Please enter both First Name and Surname.");
      return;
    }
    const phoneErr = validatePhone(countryCode, phoneNumber);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        firstName: firstName.trim(),
        surname: surname.trim(),
        countryCode,
        phoneNumber: phoneNumber.replace(/\D/g, ""),
        profilePictureBase64: dpBase64
      });
    } catch (err) {
      console.error("[TraderProfileSaveError]", err);
      const code = err?.code || "";
      setErrorCode(code || "unknown");
      if (code === "permission-denied") {
        setError("Could not save Trader Profile due to database permission rules.");
      } else {
        setError(err?.message || "Failed to update profile.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user) return;
    try {
      await sendEmailVerification(user);
      setVerifyMsg("Verification email sent.");
    } catch (err) {
      setError(err.message || "Could not send verification email.");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        backgroundColor: "rgba(5, 5, 5, 0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "12px"
      }}
    >
      <div
        className="pro-card"
        style={{
          width: "100%",
          maxWidth: "430px",
          maxHeight: "90dvh",
          overflowY: "auto"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px"
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "17px", color: "#F5F5F7" }}>
              {isOnboarding ? "Complete Trader Profile" : "Trader Profile"}
            </h2>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#8B8B95" }}>
              {user?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target"
            aria-label="Close profile"
            style={{
              background: "transparent",
              border: "none",
              color: "#8B8B95",
              cursor: "pointer"
            }}
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        {/* Email verification status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            borderRadius: "12px",
            backgroundColor: "#141418",
            border: "1px solid #23232A",
            marginBottom: "14px",
            fontSize: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <MailCheck
              size={16}
              strokeWidth={1.75}
              color={user?.emailVerified ? "#22C55E" : "#F5B301"}
            />
            <span style={{ color: user?.emailVerified ? "#22C55E" : "#F5B301", fontWeight: 600 }}>
              {user?.emailVerified ? "Email Verified" : "Email Pending Verification"}
            </span>
          </div>
          {!user?.emailVerified && (
            <button
              type="button"
              onClick={handleResendVerification}
              style={{
                background: "transparent",
                border: "none",
                color: "#E11D2E",
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer"
              }}
            >
              Resend
            </button>
          )}
        </div>

        {verifyMsg && (
          <div style={{ fontSize: "12px", color: "#22C55E", marginBottom: "10px" }}>
            {verifyMsg}
          </div>
        )}

        {/* Avatar DP */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "50%",
              overflow: "hidden",
              border: "2px solid #E11D2E",
              backgroundColor: "#141418",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            {dpBase64 ? (
              <img
                src={dpBase64}
                alt="Profile DP"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <User size={28} strokeWidth={1.75} color="#8B8B95" />
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              className="btn-surface"
              style={{ cursor: "pointer", padding: "8px 12px", minHeight: "40px" }}
            >
              <Camera size={15} strokeWidth={1.75} color="#E11D2E" />
              <span>{dpBase64 ? "Change DP" : "Upload DP"}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleDpUpload}
                style={{ display: "none" }}
              />
            </label>
            {profile?.subscriptionStatus && profile.subscriptionStatus !== "None" && (
              <span
                style={{
                  fontSize: "11px",
                  color: "#22C55E",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <Shield size={12} strokeWidth={1.75} />
                {profile.activePlanName}
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={lbl}>FIRST NAME</label>
              <input
                type="text"
                className="pro-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div>
              <label style={lbl}>SURNAME</label>
              <input
                type="text"
                className="pro-input"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="Surname"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "10px" }}>
            <div>
              <label style={lbl}>CODE</label>
              <select
                className="pro-input"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={`${c.name}-${c.code}`} value={c.code}>
                    {c.code} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>MOBILE NUMBER</label>
              <input
                type="tel"
                className="pro-input font-mono-num"
                value={phoneNumber}
                onChange={(e) =>
                  setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, activeRule.max))
                }
                placeholder={activeRule.hint}
              />
            </div>
          </div>

          {error && (
            <div style={{ fontSize: "12px", color: "#FF5C5C", lineHeight: 1.45 }}>
              <div>{error}</div>
              {errorCode && (
                <div
                  className="font-mono-num"
                  style={{ fontSize: "11px", color: "#8B8B95", marginTop: "3px" }}
                >
                  Firebase error code: {errorCode}
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-red">
            <CheckCircle2 size={16} strokeWidth={1.75} />
            {saving ? "Saving..." : "Save Trader Profile"}
          </button>
        </form>

        <button
          type="button"
          className="btn-surface"
          onClick={onSignOut}
          style={{
            width: "100%",
            marginTop: "12px",
            color: "#FF5C5C",
            borderColor: "rgba(255, 92, 92, 0.25)"
          }}
        >
          <LogOut size={16} strokeWidth={1.75} />
          Logout
        </button>
      </div>
    </div>
  );
}

const lbl = {
  display: "block",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.8px",
  color: "#8B8B95",
  marginBottom: "6px"
};
