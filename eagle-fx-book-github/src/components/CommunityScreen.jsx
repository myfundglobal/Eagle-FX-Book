import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Flag,
  Heart,
  ImagePlus,
  MessageSquarePlus,
  Pin,
  PinOff,
  Send,
  ShieldAlert,
  Trash2,
  User,
  VolumeX
} from "lucide-react";
import { compressImageToBase64 } from "../utils/formatters.js";

function formatChatTime(ts) {
  if (!ts) return "";
  const ms =
    typeof ts === "number"
      ? ts
      : typeof ts.toMillis === "function"
        ? ts.toMillis()
        : typeof ts.seconds === "number"
          ? ts.seconds * 1000
          : Date.now();
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function countLinks(text) {
  const matches = String(text || "").match(/(https?:\/\/|www\.)\S+/gi);
  return matches ? matches.length : 0;
}

export default function CommunityScreen({
  subTab,
  onChangeSubTab,
  posts,
  likedPostIds,
  loading,
  isAdmin,
  currentUserId,
  isChatMuted,
  chatMessages,
  hasMoreChat,
  pinnedMessage,
  unreadChatCount,
  onToggleLike,
  onCreatePost,
  onDeletePost,
  onSendChatMessage,
  onDeleteChatMessage,
  onLoadOlderChat,
  onPinChatMessage,
  onUnpinChatMessage,
  onMuteChatUser,
  onReportChatMessage,
  onMarkChatRead
}) {
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState("");
  const [pairTag, setPairTag] = useState("XAU/USD");
  const [bias, setBias] = useState("Bullish");
  const [message, setMessage] = useState("");
  const [chartBase64, setChartBase64] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  // Live Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatNotice, setChatNotice] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  const chatEndRef = useRef(null);
  const prevMsgCountRef = useRef(0);

  useEffect(() => {
    if (subTab === "chat") {
      onMarkChatRead?.();
    }
  }, [subTab, chatMessages.length, onMarkChatRead]);

  useEffect(() => {
    if (subTab === "chat" && chatMessages.length >= prevMsgCountRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMsgCountRef.current = chatMessages.length;
  }, [chatMessages.length, subTab]);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) {
      setCooldownLeft(0);
      return;
    }
    const id = window.setInterval(() => {
      const rem = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownLeft(rem);
      if (rem === 0) window.clearInterval(id);
    }, 250);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

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

  const handleSendChat = async (e) => {
    e?.preventDefault();
    setChatError("");
    setChatNotice("");
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    if (isChatMuted && !isAdmin) {
      setChatError("You are muted from Live Chat by the Admin.");
      return;
    }
    if (trimmed.length > 500) {
      setChatError("Message cannot exceed 500 characters.");
      return;
    }
    if (countLinks(trimmed) > 2) {
      setChatError("Spam protection: maximum 2 links allowed per message.");
      return;
    }
    if (Date.now() < cooldownUntil) {
      setChatError("Please wait 2 seconds between messages.");
      return;
    }

    setChatSending(true);
    try {
      await onSendChatMessage(trimmed);
      setChatInput("");
      setCooldownUntil(Date.now() + 2000);
      setCooldownLeft(2);
    } catch (err) {
      setChatError(err.message || "Could not send message.");
    } finally {
      setChatSending(false);
    }
  };

  const handleReport = async (msg) => {
    try {
      await onReportChatMessage(msg);
      setChatNotice("Message reported to Admin desk.");
      window.setTimeout(() => setChatNotice(""), 2500);
    } catch (err) {
      setChatError(err.message || "Failed to submit report.");
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
      style={{ display: "flex", flexDirection: "column", gap: "12px" }}
    >
      {/* Segmented Switch: Posts | Live Chat */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px",
          padding: "4px",
          borderRadius: "14px",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)"
        }}
      >
        {[
          { id: "posts", label: "Posts" },
          { id: "chat", label: "Live Chat", badge: unreadChatCount }
        ].map((item) => {
          const active = subTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeSubTab(item.id)}
              style={{
                minHeight: "42px",
                border: "none",
                borderRadius: "10px",
                backgroundColor: active ? "var(--primary)" : "transparent",
                color: active ? "#FFFFFF" : "var(--muted)",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px"
              }}
            >
              <span>{item.label}</span>
              {item.badge > 0 && !active && (
                <span
                  className="font-mono-num"
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: "999px",
                    backgroundColor: "var(--primary)",
                    color: "#FFFFFF"
                  }}
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {subTab === "posts" ? (
        <>
          <div className="pro-card-flat" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "var(--text)" }}>
                Desk Community
              </h2>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--muted)" }}>
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
              <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>
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
                <ImagePlus size={15} strokeWidth={1.75} color="var(--primary)" />
                <span>{chartBase64 ? "Chart Attached" : "Attach Chart Image"}</span>
                <input type="file" accept="image/*" onChange={handleImagePick} style={{ display: "none" }} />
              </label>
              {error && <div style={{ fontSize: "12px", color: "var(--loss)" }}>{error}</div>}
              <button type="submit" disabled={posting} className="btn-red">
                <Send size={15} strokeWidth={1.75} />
                {posting ? "Publishing..." : "Publish Setup"}
              </button>
            </form>
          )}

          {posts.length === 0 ? (
            <div className="pro-card-flat" style={{ textAlign: "center", padding: "28px 16px" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
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
                          backgroundColor: "var(--surface-2)",
                          border: "1px solid var(--border)",
                          color: "var(--text)"
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
                          color: isBull ? "var(--profit)" : isBear ? "var(--loss)" : "var(--muted)"
                        }}
                      >
                        {(post.bias || "Neutral").toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>
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
                            color: "var(--loss)",
                            cursor: "pointer"
                          }}
                        >
                          <Trash2 size={15} strokeWidth={1.75} />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
                    {post.title}
                  </h3>
                  <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: "var(--muted)", lineHeight: 1.55 }}>
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
                        border: "1px solid var(--border)"
                      }}
                    />
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                      By {post.authorName || "Eagle FX Desk"}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleLike(post)}
                      className="btn-surface"
                      style={{
                        minHeight: "36px",
                        padding: "6px 12px",
                        borderColor: liked ? "rgba(225, 29, 46, 0.5)" : "var(--border)",
                        color: liked ? "var(--primary)" : "var(--muted)"
                      }}
                    >
                      <Heart
                        size={15}
                        strokeWidth={1.75}
                        fill={liked ? "var(--primary)" : "none"}
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
        </>
      ) : (
        /* LIVE CHAT: Eagle FX Book Traders */
        <div className="pro-card-flat" style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "var(--text)" }}>
                Eagle FX Book Traders
              </h2>
              <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                Live subscribers room &bull; Privacy protected
              </div>
            </div>
            {hasMoreChat && (
              <button
                type="button"
                onClick={onLoadOlderChat}
                className="btn-surface"
                style={{ minHeight: "32px", padding: "4px 10px", fontSize: "11px" }}
              >
                Load older
              </button>
            )}
          </div>

          {/* Pinned Message Banner */}
          {pinnedMessage && pinnedMessage.text && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "8px",
                padding: "8px 10px",
                borderRadius: "12px",
                backgroundColor: "rgba(225, 29, 46, 0.1)",
                border: "1px solid rgba(225, 29, 46, 0.35)",
                fontSize: "12px"
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "7px", minWidth: 0 }}>
                <Pin size={14} color="var(--primary)" style={{ marginTop: "2px", flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--primary)" }}>
                    PINNED BY {pinnedMessage.senderName || "ADMIN"}
                  </div>
                  <div style={{ color: "var(--text)", wordBreak: "break-word" }}>
                    {pinnedMessage.text}
                  </div>
                </div>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={onUnpinChatMessage}
                  aria-label="Unpin message"
                  style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: "2px" }}
                >
                  <PinOff size={14} />
                </button>
              )}
            </div>
          )}

          {chatNotice && (
            <div style={{ fontSize: "11px", color: "var(--profit)", padding: "6px 10px", borderRadius: "10px", backgroundColor: "rgba(34,197,94,0.12)" }}>
              {chatNotice}
            </div>
          )}

          {/* Message Stream */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              maxHeight: "52dvh",
              minHeight: "240px",
              overflowY: "auto",
              paddingRight: "2px"
            }}
          >
            {chatMessages.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 12px", fontSize: "13px", color: "var(--muted)" }}>
                No messages yet. Say hello to the trading desk!
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMine = msg.senderUid === currentUserId;
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      flexDirection: isMine ? "row-reverse" : "row",
                      alignItems: "flex-end",
                      gap: "8px"
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "50%",
                        overflow: "hidden",
                        border: msg.senderIsAdmin ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                        backgroundColor: "var(--surface-2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                    >
                      {msg.senderPhoto ? (
                        <img
                          src={msg.senderPhoto}
                          alt={msg.senderName}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <User size={14} color="var(--muted)" />
                      )}
                    </div>

                    {/* Bubble */}
                    <div
                      style={{
                        maxWidth: "78%",
                        padding: "9px 11px",
                        borderRadius: isMine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        backgroundColor: isMine ? "rgba(225, 29, 46, 0.16)" : "var(--surface-2)",
                        border: isMine ? "1px solid rgba(225, 29, 46, 0.35)" : "1px solid var(--border)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "3px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 700, color: "var(--text)" }}>
                          {msg.senderName || "Trader"}
                          {msg.senderIsAdmin && (
                            <BadgeCheck size={13} color="var(--primary)" fill="rgba(225,29,46,0.18)" />
                          )}
                        </span>
                        <span className="font-mono-num" style={{ fontSize: "10px", color: "var(--muted)" }}>
                          {formatChatTime(msg.createdAt)}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: "13px",
                          color: "var(--text)",
                          lineHeight: 1.45,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word"
                        }}
                      >
                        {msg.text}
                      </div>

                      {/* Message Actions */}
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "5px" }}>
                        {!isMine && (
                          <button
                            type="button"
                            onClick={() => handleReport(msg)}
                            aria-label="Report message"
                            title="Report"
                            style={chatActionBtnStyle}
                          >
                            <Flag size={11} />
                          </button>
                        )}
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => onPinChatMessage(msg)}
                              aria-label="Pin message"
                              title="Pin message"
                              style={chatActionBtnStyle}
                            >
                              <Pin size={11} />
                            </button>
                            {!msg.senderIsAdmin && msg.senderUid !== currentUserId && (
                              <button
                                type="button"
                                onClick={() => onMuteChatUser(msg.senderUid, msg.senderName)}
                                aria-label="Mute user"
                                title="Mute user"
                                style={{ ...chatActionBtnStyle, color: "var(--warning)" }}
                              >
                                <VolumeX size={11} />
                              </button>
                            )}
                          </>
                        )}
                        {(isMine || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => onDeleteChatMessage(msg.id)}
                            aria-label="Delete message"
                            title="Delete"
                            style={{ ...chatActionBtnStyle, color: "var(--loss)" }}
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {isChatMuted && !isAdmin ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 12px",
                borderRadius: "12px",
                backgroundColor: "rgba(255, 92, 92, 0.12)",
                border: "1px solid rgba(255, 92, 92, 0.35)",
                color: "var(--loss)",
                fontSize: "12px"
              }}
            >
              <ShieldAlert size={16} />
              <span>You have been muted from posting in Live Chat.</span>
            </div>
          ) : (
            <form onSubmit={handleSendChat} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {chatError && (
                <div style={{ fontSize: "11px", color: "var(--loss)" }}>{chatError}</div>
              )}
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="text"
                  className="pro-input"
                  value={chatInput}
                  maxLength={500}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                  placeholder={
                    cooldownLeft > 0
                      ? `Wait ${cooldownLeft}s...`
                      : "Message Eagle FX Book Traders..."
                  }
                  style={{ minHeight: "42px", fontSize: "13px" }}
                />
                <button
                  type="submit"
                  disabled={chatSending || !chatInput.trim() || cooldownLeft > 0}
                  className="btn-red"
                  aria-label="Send message"
                  style={{ minHeight: "42px", padding: "0 14px", flexShrink: 0 }}
                >
                  <Send size={15} />
                </button>
              </div>
              <div className="font-mono-num" style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--muted)" }}>
                <span>Max 2 links &bull; 2s cooldown</span>
                <span>{chatInput.length}/500</span>
              </div>
            </form>
          )}
        </div>
      )}
    </motion.div>
  );
}

const chatActionBtnStyle = {
  background: "transparent",
  border: "none",
  color: "var(--muted)",
  cursor: "pointer",
  padding: "2px 4px",
  display: "inline-flex",
  alignItems: "center"
};
