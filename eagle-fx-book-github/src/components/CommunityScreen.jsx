import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, ImagePlus, MessageSquarePlus, Send, Trash2 } from "lucide-react";
import { compressImageToBase64 } from "../utils/formatters.js";

export default function CommunityScreen({
  posts,
  likedPostIds,
  loading,
  isAdmin,
  onToggleLike,
  onCreatePost,
  onDeletePost
}) {
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState("");
  const [pairTag, setPairTag] = useState("XAU/USD");
  const [bias, setBias] = useState("Bullish");
  const [message, setMessage] = useState("");
  const [chartBase64, setChartBase64] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await compressImageToBase64(file, 900, 0.72);
      setChartBase64(b64);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    setError("");
    if (title.trim().length < 3 || message.trim().length < 3) {
      setError("Enter both a title and setup breakdown.");
      return;
    }
    setPosting(true);
    try {
      await onCreatePost({
        title: title.trim(),
        pairTag: pairTag.trim().toUpperCase() || "MACRO",
        bias,
        adminMessage: message.trim(),
        chartImageKey: chartBase64
      });
      setTitle("");
      setMessage("");
      setChartBase64("");
      setShowComposer(false);
    } catch (err) {
      setError(err.message || "Failed to publish post.");
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div className="skeleton" style={{ height: "160px" }} />
        <div className="skeleton" style={{ height: "160px" }} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ display: "flex", flexDirection: "column", gap: "14px" }}
    >
      <div className="pro-card-flat" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#F5F5F7" }}>
            Desk Community
          </h2>
          <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#8B8B95" }}>
            Verified desk setups &amp; market commentary
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            className="btn-red"
            onClick={() => setShowComposer((v) => !v)}
            style={{ minHeight: "40px", padding: "8px 12px", fontSize: "12px" }}
          >
            <MessageSquarePlus size={15} strokeWidth={1.75} />
            Broadcast
          </button>
        )}
      </div>

      {isAdmin && showComposer && (
        <form onSubmit={handlePublish} className="pro-card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#F5F5F7" }}>
            New Admin Broadcast
          </div>
          <input
            type="text"
            className="pro-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Setup title (e.g. XAU/USD NY Sweep)"
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <input
              type="text"
              className="pro-input font-mono-num"
              value={pairTag}
              onChange={(e) => setPairTag(e.target.value)}
              placeholder="Pair"
            />
            <select
              className="pro-input"
              value={bias}
              onChange={(e) => setBias(e.target.value)}
            >
              <option value="Bullish">BULLISH</option>
              <option value="Bearish">BEARISH</option>
              <option value="Neutral">NEUTRAL</option>
            </select>
          </div>
          <textarea
            rows={3}
            className="pro-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share market levels, invalidation, and targets..."
          />
          <label className="btn-surface" style={{ cursor: "pointer" }}>
            <ImagePlus size={15} strokeWidth={1.75} color="#E11D2E" />
            <span>{chartBase64 ? "Chart Attached" : "Attach Chart Image"}</span>
            <input type="file" accept="image/*" onChange={handleImagePick} style={{ display: "none" }} />
          </label>
          {error && <div style={{ fontSize: "12px", color: "#FF5C5C" }}>{error}</div>}
          <button type="submit" disabled={posting} className="btn-red">
            <Send size={15} strokeWidth={1.75} />
            {posting ? "Publishing..." : "Publish Setup"}
          </button>
        </form>
      )}

      {posts.length === 0 ? (
        <div className="pro-card-flat" style={{ textAlign: "center", padding: "28px 16px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#8B8B95" }}>
            No desk setups posted yet. Check back before London or New York open.
          </p>
        </div>
      ) : (
        posts.map((post) => {
          const liked = likedPostIds.has(post.id);
          const isBull = post.bias === "Bullish";
          const isBear = post.bias === "Bearish";
          return (
            <div key={post.id} className="pro-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    className="font-mono-num"
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: "6px",
                      backgroundColor: "#141418",
                      border: "1px solid #23232A",
                      color: "#F5F5F7"
                    }}
                  >
                    {post.pairTag || "FX"}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      padding: "3px 8px",
                      borderRadius: "6px",
                      backgroundColor: isBull
                        ? "rgba(34,197,94,0.14)"
                        : isBear
                          ? "rgba(255,92,92,0.14)"
                          : "rgba(139,139,149,0.14)",
                      color: isBull ? "#22C55E" : isBear ? "#FF5C5C" : "#8B8B95"
                    }}
                  >
                    {(post.bias || "Neutral").toUpperCase()}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "11px", color: "#8B8B95" }}>
                    {post.dateLabel || "Desk"}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => onDeletePost(post.id)}
                      aria-label="Delete post"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#FF5C5C",
                        cursor: "pointer"
                      }}
                    >
                      <Trash2 size={15} strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              </div>

              <h3 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: 700, color: "#F5F5F7" }}>
                {post.title}
              </h3>
              <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#8B8B95", lineHeight: 1.55 }}>
                {post.adminMessage}
              </p>

              {post.chartImageKey && (
                <img
                  src={post.chartImageKey}
                  alt={post.title}
                  style={{
                    width: "100%",
                    maxHeight: "200px",
                    objectFit: "cover",
                    borderRadius: "14px",
                    marginBottom: "10px",
                    border: "1px solid #23232A"
                  }}
                />
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#8B8B95" }}>
                  By {post.authorName || "Eagle FX Desk"}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleLike(post)}
                  className="btn-surface"
                  style={{
                    minHeight: "36px",
                    padding: "6px 12px",
                    borderColor: liked ? "rgba(225, 29, 46, 0.5)" : "#23232A",
                    color: liked ? "#E11D2E" : "#8B8B95"
                  }}
                >
                  <Heart
                    size={15}
                    strokeWidth={1.75}
                    fill={liked ? "#E11D2E" : "none"}
                  />
                  <span className="font-mono-num" style={{ fontSize: "12px" }}>
                    {post.likesCount || 0}
                  </span>
                </button>
              </div>
            </div>
          );
        })
      )}
    </motion.div>
  );
}
