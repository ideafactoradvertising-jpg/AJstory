import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { uploadToCloudinary } from "./upload";

const DEFAULT_NOTES = [
  {
    id: 1,
    from: "Justine",
    date: "May 2026",
    text: "Our first international trip together will always have a special space in my heart. Thank you for taking care of me, loving me, and making me feel so safe and happy the whole time.\n\nThis is just a simple gift, but I hope when we go back to KL, light this candle whenever you miss me & I hope it reminds you of us, our little memories, and how much I love being with you.\n\nI'm so excited for all the memories we still haven't made yet. And one day the time we'll build together. Thank you for being someone I can be genuinely, 100% myself :)\n\nLove, Justine ♥",
    imageUrl: "https://res.cloudinary.com/deg8gb0mt/image/upload/v1778413280/IMG_3812_bxzt8g.jpg",
  }
];

export default function LoveNotes() {
  const [notes, setNotes] = useState(DEFAULT_NOTES);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ from: "", text: "", imageUrl: "", date: "" });
  const [expanded, setExpanded] = useState(1);

  // Firebase sync
  useEffect(() => {
    const ref = doc(db, "shared", "notes");
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.list) setNotes(data.list);
      } else {
        setDoc(ref, { list: DEFAULT_NOTES });
      }
    });
    return unsub;
  }, []);

  async function saveNotes(list) {
    setNotes(list);
    await setDoc(doc(db, "shared", "notes"), { list });
  }

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef();

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const url = await uploadToCloudinary(file, setUploadProgress);
      setForm(f => ({ ...f, imageUrl: url }));
    } catch {
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editing, setEditing] = useState(null);

  function addNote() {
    if (!form.from.trim() || !form.text.trim()) return;
    const displayDate = form.date
      ? new Date(form.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const note = {
      id: Date.now(),
      from: form.from.trim(),
      date: displayDate,
      text: form.text.trim(),
      imageUrl: form.imageUrl.trim(),
    };
    saveNotes([note, ...notes]);
    setForm({ from: "", text: "", imageUrl: "", date: "" });
    setAdding(false);
    setExpanded(note.id);
  }

  function startEdit(note) {
    setEditing(note.id);
    setForm({ from: note.from, text: note.text, imageUrl: note.imageUrl || "", date: note.date || "" });
    setAdding(false);
  }

  function saveEdit() {
    if (!form.from.trim() || !form.text.trim()) return;
    saveNotes(notes.map(n => n.id === editing ? { ...n, from: form.from.trim(), date: form.date, text: form.text.trim(), imageUrl: form.imageUrl.trim() } : n));
    setEditing(null);
    setForm({ from: "", text: "", imageUrl: "", date: "" });
  }

  function deleteNote(id) {
    saveNotes(notes.filter(n => n.id !== id));
    setConfirmDelete(null);
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 20% 10%, #1a0a10 0%, #0a0508 60%, #000 100%)", fontFamily: "'DM Sans', sans-serif", padding: "0 0 100px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400&family=DM+Mono:wght@300&display=swap');
        * { box-sizing: border-box; }
        input, textarea { outline: none; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }
      `}</style>

      <div style={{ textAlign: "center", padding: "52px 24px 32px", background: "linear-gradient(to bottom, rgba(180,80,100,0.1), transparent)" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 5, textTransform: "uppercase", color: "rgba(255,150,130,0.5)", marginBottom: 10 }}>with love</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 300, fontSize: 38, background: "linear-gradient(90deg, #ffb3a0, #ff7c7c, #ffb3a0)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 4s linear infinite" }}>Love Notes</h1>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 13, color: "rgba(255,150,130,0.3)", marginTop: 6, animation: "pulse 4s infinite" }}>words that stay with you</div>
      </div>

      <div style={{ maxWidth: 500, margin: "0 auto", padding: "0 20px" }}>
        {notes.map(note => (
          <div key={note.id} style={{ marginBottom: 16, animation: "fadeIn 0.5s ease both" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,120,100,0.15)", borderRadius: 20, overflow: "hidden" }}>
              <div onClick={() => setExpanded(expanded === note.id ? null : note.id)} style={{ padding: "18px 20px 14px", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 20, color: "#ffb3a0" }}>from {note.from}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(255,150,130,0.4)", letterSpacing: 2, marginTop: 3 }}>{note.date}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ color: "rgba(255,150,130,0.4)", fontSize: 16, transition: "transform 0.3s", transform: expanded === note.id ? "rotate(180deg)" : "rotate(0deg)" }}>↓</div>
                  </div>
                </div>
                {expanded === note.id && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,120,100,0.1)", animation: "fadeIn 0.3s ease" }}>
                    {note.imageUrl && (
                      <img src={note.imageUrl} alt="" style={{ width: "100%", borderRadius: 12, marginBottom: 14, objectFit: "cover", maxHeight: 320 }} />
                    )}
                    {note.text.split("\n\n").map((para, i) => (
                      <p key={i} style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 16, color: "rgba(255,220,210,0.85)", lineHeight: 1.8, marginBottom: i < note.text.split("\n\n").length - 1 ? 14 : 0 }}>{para}</p>
                    ))}
                    <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                      <button onClick={e => { e.stopPropagation(); startEdit(note); }} style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,180,160,0.2)", borderRadius: 10, color: "rgba(255,180,160,0.6)", cursor: "pointer", padding: "8px 12px", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: 2, textTransform: "uppercase" }}>
                        Edit
                      </button>
                      <button onClick={e => { e.stopPropagation(); setConfirmDelete(note.id); }} style={{ flex: 1, background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: 10, color: "rgba(255,120,120,0.5)", cursor: "pointer", padding: "8px 12px", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: 2, textTransform: "uppercase" }}>
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {adding && (
          <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,120,100,0.2)", borderRadius: 20, padding: "24px", marginBottom: 16, animation: "fadeIn 0.3s ease" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 20, color: "#ffb3a0", marginBottom: 18 }}>New note</div>
            <input value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} placeholder="From (e.g. Justine)"
              style={{ width: "100%", padding: "12px 16px", marginBottom: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,120,100,0.2)", borderRadius: 12, color: "#fff", fontSize: 15, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}
            />
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,150,130,0.4)", marginBottom: 6 }}>Date</div>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,120,100,0.2)", borderRadius: 12, color: form.date ? "#fff" : "rgba(255,255,255,0.3)", fontSize: 14, fontFamily: "'DM Mono', monospace", colorScheme: "dark", outline: "none" }}
              />
            </div>
            <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} placeholder="Write your note here..." rows={6}
              style={{ width: "100%", padding: "12px 16px", marginBottom: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,120,100,0.2)", borderRadius: 12, color: "#fff", fontSize: 15, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", resize: "none" }}
            />
            <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleImageUpload} style={{ display: "none" }} />
            <button onClick={() => fileInputRef.current.click()} disabled={uploading} style={{ width: "100%", padding: "12px 16px", marginBottom: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,120,100,0.2)", borderRadius: 12, color: uploading ? "rgba(255,180,160,0.9)" : "rgba(255,180,160,0.5)", cursor: uploading ? "not-allowed" : "pointer", fontSize: 13, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", textAlign: "left" }}>
              {uploading ? `Uploading... ${uploadProgress}%` : form.imageUrl ? "📷 Photo attached ✓" : "📷 Attach a photo (optional)"}
            </button>
            {uploading && (
              <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 4, marginBottom: 12 }}>
                <div style={{ height: "100%", width: `${uploadProgress}%`, background: "linear-gradient(90deg, #ffb3a0, #ff7c7c)", borderRadius: 4, transition: "width 0.3s" }} />
              </div>
            )}
            {!uploading && <div style={{ marginBottom: 16 }} />}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={addNote} style={{ flex: 1, padding: "13px", background: "linear-gradient(135deg, #c0392b, #e74c8a)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, cursor: "pointer", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>Save note</button>
              <button onClick={() => setAdding(false)} style={{ padding: "13px 16px", borderRadius: 12, background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 15 }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Edit note overlay */}
        {editing && (
          <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto" }}>
            <div style={{ width: "100%", maxWidth: 500, background: "rgba(20,5,10,0.95)", border: "1px solid rgba(255,120,100,0.2)", borderRadius: 20, padding: "28px 24px", animation: "fadeIn 0.3s ease" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 22, color: "#ffb3a0", marginBottom: 20, textAlign: "center" }}>Edit note</div>
              <input value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} placeholder="From"
                style={{ width: "100%", padding: "12px 16px", marginBottom: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,120,100,0.2)", borderRadius: 12, color: "#fff", fontSize: 15, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", outline: "none" }}
              />
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,150,130,0.4)", marginBottom: 6 }}>Date</div>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,120,100,0.2)", borderRadius: 12, color: form.date ? "#fff" : "rgba(255,255,255,0.3)", fontSize: 14, fontFamily: "'DM Mono', monospace", colorScheme: "dark", outline: "none" }}
                />
              </div>
              <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} rows={6}
                style={{ width: "100%", padding: "12px 16px", marginBottom: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,120,100,0.2)", borderRadius: 12, color: "#fff", fontSize: 15, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", resize: "none", outline: "none" }}
              />
              <button onClick={() => fileInputRef.current.click()} disabled={uploading} style={{ width: "100%", padding: "12px 16px", marginBottom: 16, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,120,100,0.2)", borderRadius: 12, color: uploading ? "rgba(255,180,160,0.9)" : "rgba(255,180,160,0.5)", cursor: uploading ? "not-allowed" : "pointer", fontSize: 13, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", textAlign: "left" }}>
                {uploading ? `Uploading... ${uploadProgress}%` : form.imageUrl ? "📷 Photo attached ✓" : "📷 Attach a photo (optional)"}
              </button>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={saveEdit} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #c0392b, #e74c8a)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, cursor: "pointer", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>Save</button>
                <button onClick={() => { setEditing(null); setForm({ from: "", text: "", imageUrl: "", date: "" }); }} style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 15 }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm delete overlay */}
        {confirmDelete && (
          <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ width: "100%", maxWidth: 360, background: "rgba(20,5,10,0.95)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: 20, padding: "28px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 22, color: "#ffb3a0", marginBottom: 8 }}>Delete this note?</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>This can't be undone</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 12, color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 14 }}>Keep it</button>
                <button onClick={() => deleteNote(confirmDelete)} style={{ flex: 1, padding: "12px", background: "rgba(255,80,80,0.2)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 12, color: "rgba(255,120,120,0.9)", cursor: "pointer", fontSize: 14, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {!adding && (
          <button onClick={() => setAdding(true)} style={{ width: "100%", padding: "14px", borderRadius: 16, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)", border: "1.5px dashed rgba(255,120,100,0.25)", color: "rgba(255,180,160,0.5)", cursor: "pointer", fontSize: 14, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}
            onMouseEnter={e => e.currentTarget.style.borderColor="rgba(255,120,100,0.6)"}
            onMouseLeave={e => e.currentTarget.style.borderColor="rgba(255,120,100,0.25)"}>
            + Write a note
          </button>
        )}
      </div>
    </div>
  );
}
