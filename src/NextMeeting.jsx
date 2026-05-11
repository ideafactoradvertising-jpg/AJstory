import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { uploadToCloudinary } from "./upload";

const TOGETHER_SINCE = new Date("2026-05-01T00:00:00");
const KNOW_SINCE = new Date("2026-03-10T00:00:00");
const SLIDE_DURATION = 5000;

const BG_PHOTOS = [
  "https://res.cloudinary.com/deg8gb0mt/image/upload/v1778408174/IMG_7529_bwke4h.jpg",
  "https://res.cloudinary.com/deg8gb0mt/image/upload/v1778408171/a9b4d0da-ac86-45c5-9bc5-ea30be145480_nnqlgz.jpg",
  "https://res.cloudinary.com/deg8gb0mt/image/upload/v1778408171/IMG_7163_tf6irg.jpg",
  "https://res.cloudinary.com/deg8gb0mt/image/upload/v1778408130/IMG_7164_kvpkdd.jpg",
  "https://res.cloudinary.com/deg8gb0mt/image/upload/v1778408188/IMG_3805_fqrvhq.jpg",
  "https://res.cloudinary.com/deg8gb0mt/image/upload/v1778408184/IMG_3759_djpsod.jpg",
  "https://res.cloudinary.com/deg8gb0mt/image/upload/v1778408182/IMG_3693_gtxowz.jpg",
  "https://res.cloudinary.com/deg8gb0mt/image/upload/v1778408179/IMG_7537_sxcrn7.jpg",
  "https://res.cloudinary.com/deg8gb0mt/image/upload/v1778481436/zayqnif4p9lgxckderti.jpg",
  "https://res.cloudinary.com/deg8gb0mt/image/upload/v1778515669/IMG_7161_cfmltk.jpg",
];

const DEFAULT_REUNIONS = [
  { id: 1, label: "KL Reunion", date: "2026-05-28T17:48", note: "Can't wait to see you ♥" }
];

function getDaysTogether() {
  return Math.floor((Date.now() - TOGETHER_SINCE.getTime()) / 86400000);
}
function getDaysKnown() {
  return Math.floor((Date.now() - KNOW_SINCE.getTime()) / 86400000);
}
function getTimeLeft(dateStr) {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins: Math.floor((diff % 3600000) / 60000),
    secs: Math.floor((diff % 60000) / 1000),
  };
}

function Hearts() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 2 }}>
      {["♥","♡","❤","♥","♡","♥","♡"].map((h, i) => (
        <div key={i} style={{
          position: "absolute", bottom: -40, left: `${5 + i * 14}%`,
          fontSize: `${6 + (i % 3) * 6}px`,
          color: `rgba(255,${130 + i * 15},${120 + i * 10},0.15)`,
          animation: `floatUp ${8 + i * 2}s ${i * 1.2}s infinite linear`,
        }}>{h}</div>
      ))}
    </div>
  );
}

const COLOR_SCHEMES = [
  { primary: "#ffb3a0", secondary: "#ff7c7c", overlay: "rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.0) 60%, rgba(0,0,0,0.65) 100%" },
  { primary: "#c084fc", secondary: "#818cf8", overlay: "rgba(10,0,30,0.6) 0%, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.0) 60%, rgba(10,0,30,0.7) 100%" },
  { primary: "#7dd3fc", secondary: "#38bdf8", overlay: "rgba(0,10,30,0.55) 0%, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.0) 60%, rgba(0,10,30,0.65) 100%" },
  { primary: "#f9a8d4", secondary: "#f472b6", overlay: "rgba(30,0,20,0.55) 0%, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.0) 60%, rgba(30,0,20,0.65) 100%" },
];

function Slideshow({ photos, onColorChange }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (photos.length < 2) return;
    const id = setInterval(() => {
      setActive(a => {
        const next = (a + 1) % photos.length;
        onColorChange(next % COLOR_SCHEMES.length);
        return next;
      });
    }, SLIDE_DURATION);
    return () => clearInterval(id);
  }, [photos.length]);
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
      {photos.map((url, i) => (
        <div key={url} style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${url})`,
          backgroundSize: "cover", backgroundPosition: "center top",
          opacity: i === active ? 1 : 0,
          transition: "opacity 1.8s ease",
        }} />
      ))}
    </div>
  );
}

export default function NextMeeting() {
  const [reunions, setReunions] = useState(DEFAULT_REUNIONS);
  const [photos, setPhotos] = useState(BG_PHOTOS);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ label: "", date: "", note: "" });
  const [daysTogether, setDaysTogether] = useState(getDaysTogether());
  const [daysKnown, setDaysKnown] = useState(getDaysKnown());
  const [, setTick] = useState(0);
  const [colorScheme, setColorScheme] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showManage, setShowManage] = useState(false);
  const photoInputRef = useRef();

  // Firebase sync - reunions
  useEffect(() => {
    const ref = doc(db, "shared", "reunions");
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.list) setReunions(data.list);
      } else {
        setDoc(ref, { list: DEFAULT_REUNIONS });
      }
      setLoaded(true);
    });
    return unsub;
  }, []);

  // Firebase sync - slideshow photos
  useEffect(() => {
    const ref = doc(db, "shared", "bgphotos");
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists() && snap.data().list?.length) {
        setPhotos(snap.data().list);
      } else {
        setPhotos(BG_PHOTOS);
      }
    });
    return unsub;
  }, []);

  async function savePhotos(list) {
    setPhotos(list);
    await setDoc(doc(db, "shared", "bgphotos"), { list });
  }

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingPhoto(true);
    setUploadProgress(0);
    try {
      const urls = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadToCloudinary(files[i], p => setUploadProgress(Math.round((i / files.length) * 100 + p / files.length)));
        urls.push(url);
      }
      await savePhotos([...photos, ...urls]);
    } catch {
      alert("Upload failed. Please try again.");
    } finally {
      setUploadingPhoto(false);
      setUploadProgress(0);
      e.target.value = "";
    }
  }

  async function removePhoto(url) {
    await savePhotos(photos.filter(p => p !== url));
  }

  async function saveReunions(list) {
    setReunions(list);
    await setDoc(doc(db, "shared", "reunions"), { list });
  }

  useEffect(() => {
    const id = setInterval(() => {
      setDaysTogether(getDaysTogether());
      setDaysKnown(getDaysKnown());
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  function addReunion() {
    if (!form.label.trim() || !form.date) return;
    const r = { id: Date.now(), label: form.label.trim(), date: form.date, note: form.note };
    const updated = [...reunions, r].sort((a, b) => new Date(a.date) - new Date(b.date));
    saveReunions(updated);
    setForm({ label: "", date: "", note: "" });
    setAdding(false);
  }

  function saveEdit() {
    if (!form.label.trim() || !form.date) return;
    const updated = reunions.map(r => r.id === editing ? { ...r, label: form.label, date: form.date, note: form.note } : r);
    saveReunions(updated);
    setEditing(null);
    setForm({ label: "", date: "", note: "" });
  }

  function deleteReunion(id) {
    const updated = reunions.filter(r => r.id !== id);
    saveReunions(updated);
  }

  function startEdit(r) {
    setEditing(r.id);
    setForm({ label: r.label, date: r.date, note: r.note || "" });
    setAdding(false);
  }

  const nextReunion = reunions.find(r => getTimeLeft(r.date));
  const nextTime = nextReunion ? getTimeLeft(nextReunion.date) : null;

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Mono:wght@300;400&family=DM+Sans:wght@300;400&display=swap');
        * { box-sizing: border-box; }
        input, textarea { outline: none; }
        input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(0.5) sepia(1) saturate(2) hue-rotate(300deg); }
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes floatUp { 0%{transform:translateY(0) rotate(0deg);opacity:0} 10%{opacity:1} 90%{opacity:0.3} 100%{transform:translateY(-100vh) rotate(20deg);opacity:0} }
      `}</style>

      <Slideshow photos={photos} onColorChange={setColorScheme} />
      <div style={{ position: "absolute", inset: 0, zIndex: 1, background: `linear-gradient(to bottom, ${COLOR_SCHEMES[colorScheme].overlay})`, transition: "background 2s ease" }} />
      <Hearts />

      <div style={{ position: "relative", zIndex: 3, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "52px 24px 100px" }}>

        {/* TOP */}
        <div style={{ animation: "fadeIn 0.6s ease both" }}>
          <div style={{ display: "inline-block", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(10px)", borderRadius: 16, padding: "12px 16px" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 5, textTransform: "uppercase", color: "rgba(255,200,180,0.8)", marginBottom: 6 }}>Alex &amp; Justine</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 300, fontSize: "clamp(42px, 11vw, 64px)", lineHeight: 1, background: `linear-gradient(90deg, ${COLOR_SCHEMES[colorScheme].primary}, ${COLOR_SCHEMES[colorScheme].secondary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 2px 12px rgba(0,0,0,1))", transition: "background 2s ease" }}>{daysTogether}</span>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: "clamp(16px, 4vw, 22px)", color: "rgba(255,200,180,0.9)" }}>days together</span>
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 11, color: "rgba(255,180,160,0.5)", animation: "pulse 4s infinite" }}>since May 1, 2026</div>
            <div style={{ borderTop: "1px solid rgba(255,180,160,0.15)", margin: "10px 0" }} />
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 300, fontSize: "clamp(22px, 6vw, 36px)", lineHeight: 1, color: "rgba(255,200,180,0.7)", textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}>{daysKnown}</span>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: "clamp(12px, 3vw, 16px)", color: "rgba(255,200,180,0.6)" }}>days we've known each other</span>
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 11, color: "rgba(255,180,160,0.35)", animation: "pulse 4s infinite" }}>since March 10, 2026</div>
          </div>
        </div>

        {/* BOTTOM */}
        <div style={{ animation: "fadeIn 0.6s ease both 0.2s" }}>
          {nextReunion && nextTime && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "inline-block", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(10px)", borderRadius: 16, padding: "14px 18px" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,180,160,0.7)", marginBottom: 8 }}>{nextReunion.label}</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "clamp(6px, 2vw, 14px)" }}>
                  {[{ v: nextTime.days, l: "days" }, { v: nextTime.hours, l: "hrs" }, { v: nextTime.mins, l: "mins" }, { v: nextTime.secs, l: "secs" }].map(({ v, l }, i) => (
                    <div key={l} style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 300, fontSize: "clamp(38px, 10vw, 62px)", color: "#fff", lineHeight: 1, textShadow: "0 2px 20px rgba(0,0,0,1)", letterSpacing: -1 }}>
                        {String(v).padStart(2, "0")}{i < 3 && <span style={{ color: "rgba(255,180,160,0.5)", fontSize: "0.6em" }}>:</span>}
                      </div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,200,180,0.6)", marginTop: 2 }}>{l}</div>
                    </div>
                  ))}
                </div>
                {nextReunion.note && <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 13, color: "rgba(255,180,160,0.6)", marginTop: 8 }}>{nextReunion.note}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={() => startEdit(nextReunion)} style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,180,160,0.2)", borderRadius: 10, color: "rgba(255,180,160,0.6)", cursor: "pointer", padding: "8px 12px", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: 2, textTransform: "uppercase" }}>Edit</button>
                </div>
              </div>
            </div>
          )}

          {reunions.filter(r => !getTimeLeft(r.date)).map(r => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 11, color: "rgba(255,180,160,0.4)", textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>💫 {r.label}</div>
              <button onClick={() => deleteReunion(r.id)} style={{ background: "transparent", border: "none", color: "rgba(255,120,120,0.4)", cursor: "pointer", fontSize: 11, padding: 0 }}>✕</button>
            </div>
          ))}

          {!adding && !editing && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
              <button onClick={() => setAdding(true)} style={{ background: "transparent", border: "none", color: "rgba(255,180,160,0.4)", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", textShadow: "0 1px 6px rgba(0,0,0,0.9)", padding: 0 }}>
                + add reunion
              </button>
              <span style={{ color: "rgba(255,180,160,0.2)", fontSize: 10 }}>·</span>
              <button onClick={() => setShowManage(true)} style={{ background: "transparent", border: "none", color: "rgba(255,180,160,0.4)", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", textShadow: "0 1px 6px rgba(0,0,0,0.9)", padding: 0 }}>
                📷 photos
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Manage photos overlay */}
      {showManage && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(20px)", overflow: "auto" }}>
          <div style={{ maxWidth: 500, margin: "0 auto", padding: "40px 20px 120px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 24, color: "#ffb3a0" }}>Slideshow Photos</div>
              <button onClick={() => setShowManage(false)} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 50, color: "#fff", cursor: "pointer", padding: "8px 16px", fontSize: 12, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>✕ Close</button>
            </div>

            {/* Upload button */}
            <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: "none" }} />
            <button onClick={() => photoInputRef.current.click()} disabled={uploadingPhoto} style={{ width: "100%", padding: "14px", borderRadius: 14, background: "rgba(255,179,160,0.05)", border: "1.5px dashed rgba(255,150,120,0.4)", color: uploadingPhoto ? "rgba(255,180,160,0.9)" : "rgba(255,180,160,0.7)", cursor: uploadingPhoto ? "not-allowed" : "pointer", fontSize: 14, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", marginBottom: uploadingPhoto ? 8 : 20 }}>
              {uploadingPhoto ? `Uploading... ${uploadProgress}%` : "📷 Add photos from camera roll"}
            </button>
            {uploadingPhoto && (
              <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 4, marginBottom: 20 }}>
                <div style={{ height: "100%", width: `${uploadProgress}%`, background: "linear-gradient(90deg, #ffb3a0, #ff7c7c)", borderRadius: 4, transition: "width 0.3s" }} />
              </div>
            )}

            {/* Photo grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {photos.map((url, i) => (
                <div key={url} style={{ position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", background: "#111" }}>
                  <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={() => removePhoto(url)} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%", color: "#fff", cursor: "pointer", width: 24, height: 24, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                  {i === 0 && <div style={{ position: "absolute", bottom: 4, left: 4, background: "rgba(0,0,0,0.6)", borderRadius: 6, padding: "2px 6px", fontFamily: "'DM Mono', monospace", fontSize: 8, color: "rgba(255,180,160,0.8)", letterSpacing: 1 }}>DEFAULT</div>}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 12, color: "rgba(255,180,160,0.3)", textAlign: "center" }}>
              {photos.length} photos in slideshow · tap ✕ to remove
            </div>
          </div>
        </div>
      )}
      {(adding || editing) && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 400, background: "rgba(20,5,10,0.9)", border: "1px solid rgba(255,120,100,0.2)", borderRadius: 20, padding: "28px 24px", animation: "fadeIn 0.3s ease" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 22, color: "#ffb3a0", marginBottom: 20, textAlign: "center" }}>{editing ? "Edit reunion" : "New reunion"}</div>
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Label (e.g. PH Reunion)"
              style={{ width: "100%", padding: "12px 16px", marginBottom: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,120,100,0.2)", borderRadius: 12, color: "#fff", fontSize: 15, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}
            />
            <input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              style={{ width: "100%", padding: "12px 16px", marginBottom: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,120,100,0.2)", borderRadius: 12, color: form.date ? "#fff" : "rgba(255,255,255,0.2)", fontSize: 14, fontFamily: "'DM Mono', monospace", colorScheme: "dark" }}
            />
            <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="A little note (optional)"
              style={{ width: "100%", padding: "12px 16px", marginBottom: 16, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,120,100,0.2)", borderRadius: 12, color: "#fff", fontSize: 14, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={editing ? saveEdit : addReunion} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #c0392b, #e74c8a)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, cursor: "pointer", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>{editing ? "Save" : "Add"}</button>
              <button onClick={() => { setAdding(false); setEditing(null); setForm({ label: "", date: "", note: "" }); }} style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 15 }}>Cancel</button>
            </div>
            {editing && (
              <button onClick={() => { deleteReunion(editing); setEditing(null); setForm({ label: "", date: "", note: "" }); }} style={{ width: "100%", marginTop: 10, padding: "11px", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: 12, color: "rgba(255,120,120,0.5)", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>
                Delete this reunion
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
