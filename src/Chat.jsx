import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { uploadToCloudinary } from "./upload";

const NAME_KEY = "ajstory-chat-name";

export default function Chat() {
  const [myName, setMyName] = useState(() => localStorage.getItem(NAME_KEY) || null);
  const [nameInput, setNameInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();
  const bottomRef = useRef();

  // Load messages from Firebase
  useEffect(() => {
    const ref = doc(db, "shared", "chat");
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists() && snap.data().messages) {
        setMessages(snap.data().messages);
      }
    });
    return unsub;
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function saveMessages(list) {
    await setDoc(doc(db, "shared", "chat"), { messages: list });
  }

  function chooseName(name) {
    localStorage.setItem(NAME_KEY, name);
    setMyName(name);
  }

  async function sendMessage() {
    if (!text.trim() || sending) return;
    setSending(true);
    const msg = { id: Date.now(), from: myName, text: text.trim(), type: "text", sentAt: new Date().toISOString() };
    const updated = [...messages, msg];
    await saveMessages(updated);
    setText("");
    setSending(false);
  }

  async function sendPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, () => {});
      const msg = { id: Date.now(), from: myName, url, isVideo: file.type.startsWith("video/"), type: "media", sentAt: new Date().toISOString() };
      await saveMessages([...messages, msg]);
    } catch { alert("Upload failed."); }
    finally { setUploading(false); e.target.value = ""; }
  }

  async function deleteMessage(id) {
    await saveMessages(messages.filter(m => m.id !== id));
  }

  function formatTime(isoStr) {
    const d = new Date(isoStr);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  }

  function formatDate(isoStr) {
    const d = new Date(isoStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  }

  // Group messages by date
  const grouped = messages.reduce((acc, msg) => {
    const date = formatDate(msg.sentAt);
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  // Name picker screen
  if (!myName) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0a0a1a 0%, #050510 60%, #000 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300;1,400&family=DM+Mono:wght@300;400&family=DM+Sans:wght@300;400&display=swap'); *{box-sizing:border-box} input{outline:none}`}</style>
        <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>💬</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 300, fontSize: 32, color: "#fff", marginBottom: 8 }}>Who are you?</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 40 }}>pick once, saved to your device</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {["Alex", "Justine"].map(name => (
              <button key={name} onClick={() => chooseName(name)} style={{ padding: "18px", borderRadius: 16, background: name === "Alex" ? "linear-gradient(135deg, #4facde, #00d2b5)" : "linear-gradient(135deg, #f472b6, #c084fc)", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 300, letterSpacing: 1 }}>
                {name}
              </button>
            ))}
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: 24 }}>you can change this in settings</div>
        </div>
      </div>
    );
  }

  const isAlex = myName === "Alex";

  return (
    <div style={{ minHeight: "100vh", height: "-webkit-fill-available", display: "flex", flexDirection: "column", background: "linear-gradient(160deg, #0a0a1a 0%, #050510 60%, #000 100%)", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300;1,400&family=DM+Mono:wght@300;400&family=DM+Sans:wght@300;400&display=swap');
        * { box-sizing: border-box; }
        input, textarea { outline: none; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
      `}</style>

      {/* Header */}
      <div style={{ padding: "52px 20px 16px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 300, fontSize: 26, background: "linear-gradient(90deg, #7dd3fc, #c084fc, #f472b6)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 4s linear infinite" }}>
          Alex &amp; Justine
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 6 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>you are</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: isAlex ? "#4facde" : "#f472b6", background: isAlex ? "rgba(79,172,222,0.1)" : "rgba(244,114,182,0.1)", borderRadius: 20, padding: "2px 10px" }}>{myName}</div>
          <button onClick={() => { localStorage.removeItem(NAME_KEY); setMyName(null); }} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1 }}>change</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
        {Object.keys(grouped).length === 0 && (
          <div style={{ textAlign: "center", margin: "auto", color: "rgba(255,255,255,0.15)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💌</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 18 }}>No messages yet</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, marginTop: 6 }}>Say something sweet</div>
          </div>
        )}

        {Object.entries(grouped).map(([date, msgs]) => (
          <div key={date}>
            <div style={{ textAlign: "center", margin: "16px 0 12px", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.2)" }}>{date}</div>
            {msgs.map(msg => {
              const isMe = msg.from === myName;
              return (
                <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 8, animation: "fadeIn 0.3s ease" }}>
                  <div style={{ maxWidth: "75%" }}>
                    {!isMe && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 2, marginBottom: 4, paddingLeft: 4 }}>{msg.from}</div>}
                    {msg.type === "media" ? (
                      <div style={{ borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px", overflow: "hidden", maxWidth: 220 }}>
                        {msg.isVideo
                          ? <video src={msg.url} controls style={{ width: "100%", display: "block" }} />
                          : <img src={msg.url} style={{ width: "100%", display: "block" }} onClick={() => window.open(msg.url)} />}
                      </div>
                    ) : (
                      <div style={{ background: isMe ? (isAlex ? "linear-gradient(135deg, #4facde, #0090c5)" : "linear-gradient(135deg, #f472b6, #c084fc)") : "rgba(255,255,255,0.08)", borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "10px 14px", color: "#fff", fontSize: 15, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, wordBreak: "break-word" }}>
                        {msg.text}
                      </div>
                    )}
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "rgba(255,255,255,0.2)", marginTop: 3, textAlign: isMe ? "right" : "left", paddingRight: isMe ? 4 : 0, paddingLeft: isMe ? 0 : 4 }}>
                      {formatTime(msg.sentAt)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding: "12px 16px 80px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(20px)", flexShrink: 0 }}>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={sendPhoto} style={{ display: "none" }} />
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <button onClick={() => fileInputRef.current.click()} disabled={uploading} style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 50, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: uploading ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.6)", cursor: uploading ? "not-allowed" : "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {uploading ? "⏳" : "📷"}
          </button>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 22, padding: "10px 16px", display: "flex", alignItems: "center" }}>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Say something sweet..."
              style={{ flex: 1, background: "transparent", border: "none", color: "#fff", fontSize: 15, fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
          <button onClick={sendMessage} disabled={!text.trim() || sending} style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 50, background: !text.trim() ? "rgba(255,255,255,0.06)" : isAlex ? "linear-gradient(135deg, #4facde, #0090c5)" : "linear-gradient(135deg, #f472b6, #c084fc)", border: "none", color: !text.trim() ? "rgba(255,255,255,0.2)" : "#fff", cursor: !text.trim() ? "not-allowed" : "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
