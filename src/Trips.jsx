import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { uploadToCloudinary } from "./upload";

const GRADIENT_PAIRS = [
  ["#f4845f", "#c94b8a"], ["#4facde", "#00d2b5"], ["#a78bfa", "#ec4899"],
  ["#f59e42", "#e94f6e"], ["#34d399", "#2563eb"], ["#f472b6", "#fbbf24"],
  ["#60a5fa", "#818cf8"], ["#e96c8a", "#8b3fa8"],
];
const DESTINATIONS = ["✈️", "🏖️", "🏔️", "🌴", "🗺️", "🏯", "🌅", "🚂", "🛳️", "🏕️"];

const DEFAULT_TRIPS = [
  { id: 1, name: "Taiwan", emoji: "🏯", startDate: "2026-05-05T08:00", endDate: "2026-05-08T20:00", color1: "#f4845f", color2: "#c94b8a", note: "Our first trip together 🧡", media: [] },
  { id: 2, name: "Phu Quoc", emoji: "🏖️", startDate: "2026-06-11T08:00", endDate: "2026-06-14T20:00", color1: "#4facde", color2: "#00d2b5", note: "Beach days ahead 🌊", media: [] },
];

function getTimeLeft(dateStr) {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return null;
  return { days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000), mins: Math.floor((diff % 3600000) / 60000), secs: Math.floor((diff % 60000) / 1000) };
}

function formatDateRange(start, end) {
  const s = new Date(start), e = new Date(end);
  const opts = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}

function CountdownBlock({ value, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 18px", minWidth: 64, border: "1px solid rgba(255,255,255,0.13)" }}>
      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: "#fff", lineHeight: 1, letterSpacing: -1 }}>{String(value).padStart(2, "0")}</span>
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 2, marginTop: 4 }}>{label}</span>
    </div>
  );
}

function TripGallery({ trip, onClose, onAddMedia, onDeleteMedia, onDelete }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lightbox, setLightbox] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef();

  async function handleFiles(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    setProgress(0);
    try {
      const urls = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadToCloudinary(files[i], p => setProgress(Math.round((i / files.length) * 100 + p / files.length)));
        urls.push(url);
      }
      onAddMedia(trip.id, urls);
    } catch (err) {
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setProgress(0);
      e.target.value = "";
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.96)", zIndex: 500, overflow: "auto" }}>
      {lightbox && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.98)", zIndex: 600, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 700, width: "100%" }}>
            {lightbox.isVideo ? <video src={lightbox.url} controls autoPlay style={{ width: "100%", borderRadius: 12, maxHeight: "75vh" }} /> : <img src={lightbox.url} style={{ width: "100%", borderRadius: 12, maxHeight: "75vh", objectFit: "contain" }} />}
          </div>
          <button onClick={() => setLightbox(null)} style={{ marginTop: 20, padding: "12px 32px", borderRadius: 50, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>✕ Close</button>
        </div>
      )}
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "32px 20px 120px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 28 }}>{trip.emoji}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 24, color: "#fff", fontWeight: 600 }}>{trip.name}</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{formatDateRange(trip.startDate, trip.endDate)}</div>
            {trip.note && <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{trip.note}</div>}
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 50, color: "#fff", cursor: "pointer", padding: "10px 18px", fontSize: 13, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>✕ Close</button>
        </div>

        {/* Upload from phone */}
        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} style={{ display: "none" }} />
        <button onClick={() => fileInputRef.current.click()} disabled={uploading} style={{ width: "100%", padding: "14px", borderRadius: 14, background: "rgba(255,179,160,0.05)", border: `1.5px dashed rgba(255,150,120,${uploading ? "0.6" : "0.3"})`, color: `rgba(255,180,150,${uploading ? "0.9" : "0.6"})`, cursor: uploading ? "not-allowed" : "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif", marginBottom: uploading ? 8 : 20, transition: "all 0.2s" }}>
          {uploading ? `Uploading... ${progress}%` : "📷  Upload photos & videos"}
        </button>
        {uploading && (
          <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 4, marginBottom: 20 }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #ffb3a0, #ff7c7c)", borderRadius: 4, transition: "width 0.3s" }} />
          </div>
        )}

        {trip.media && trip.media.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {trip.media.map((url, i) => {
              const vid = url.match(/\.(mp4|mov|webm|ogg)$/i) || url.includes("/video/");
              return (
                <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", cursor: "pointer", background: "#111" }}>
                  <div onClick={() => setLightbox({ url, isVideo: vid })} style={{ position: "absolute", inset: 0 }}>
                    {vid ? <><video src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted /><div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}><span style={{ fontSize: 22, color: "#fff" }}>▶</span></div></> : <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <button onClick={() => onDeleteMedia(trip.id, i)} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", color: "#fff", cursor: "pointer", width: 22, height: 22, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.2)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 16 }}>No photos yet</div>
          </div>
        )}

        {/* Delete trip button at bottom */}
        {/* Delete trip */}
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={{ width: "100%", marginTop: 24, padding: "12px", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: 12, color: "rgba(255,120,120,0.5)", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>
            Delete trip
          </button>
        ) : (
          <div style={{ marginTop: 24, background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.25)", borderRadius: 14, padding: "16px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 15, color: "rgba(255,180,160,0.8)", textAlign: "center", marginBottom: 14 }}>Delete this trip? This can't be undone.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: "11px", background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 10, color: "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 1 }}>Keep it</button>
              <button onClick={() => onDelete(trip.id)} style={{ flex: 1, padding: "11px", background: "rgba(255,80,80,0.2)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 10, color: "rgba(255,120,120,0.9)", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 1 }}>Yes, delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TripCard({ trip, onDelete, onOpen }) {
  const [time, setTime] = useState(getTimeLeft(trip.startDate));
  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft(trip.startDate)), 1000);
    return () => clearInterval(id);
  }, [trip.startDate]);
  const isPast = new Date(trip.endDate) < new Date();
  const isOngoing = !getTimeLeft(trip.startDate) && !isPast;

  return (
    <div onClick={() => onOpen(trip)} style={{ position: "relative", borderRadius: 22, overflow: "hidden", background: isPast ? "linear-gradient(135deg, #4a3060 0%, #2a1a40 100%)" : `linear-gradient(135deg, ${trip.color1} 0%, ${trip.color2} 100%)`, padding: "28px 28px 24px", marginBottom: 18, boxShadow: "0 8px 40px rgba(0,0,0,0.35)", cursor: "pointer", transition: "transform 0.15s ease" }}
      onMouseEnter={e => e.currentTarget.style.transform="translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform="translateY(0)"}>
      <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 14, right: 16, fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>tap to open</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 28 }}>{trip.emoji}</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 22, color: "#fff", fontWeight: 600, marginTop: 4 }}>{trip.name}</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 3 }}>{formatDateRange(trip.startDate, trip.endDate)}</div>
          {trip.note && <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>{trip.note}</div>}
          {trip.media?.length > 0 && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 6, letterSpacing: 1 }}>{trip.media.length} memories</div>}
        </div>
      </div>
      {isPast ? <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 18, color: "rgba(255,255,255,0.7)", textAlign: "center", padding: "10px 0" }}>💫 You were here!</div>
       : isOngoing ? <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 18, color: "rgba(255,255,255,0.9)", textAlign: "center", padding: "10px 0" }}>🌟 Happening now!</div>
       : time ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><CountdownBlock value={time.days} label="days" /><CountdownBlock value={time.hours} label="hrs" /><CountdownBlock value={time.mins} label="min" /><CountdownBlock value={time.secs} label="sec" /></div>
       : null}
    </div>
  );
}

export default function Trips() {
  const [trips, setTrips] = useState(DEFAULT_TRIPS);
  const [adding, setAdding] = useState(false);
  const [openTrip, setOpenTrip] = useState(null);
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "", emoji: "✈️", note: "" });
  const [error, setError] = useState("");
  const nameRef = useRef();

  useEffect(() => {
    const ref = doc(db, "shared", "trips");
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.list) setTrips(data.list);
      } else {
        setDoc(ref, { list: DEFAULT_TRIPS });
      }
    });
    return unsub;
  }, []);

  async function saveTrips(list) {
    setTrips(list);
    await setDoc(doc(db, "shared", "trips"), { list });
  }

  useEffect(() => { if (adding && nameRef.current) nameRef.current.focus(); }, [adding]);

  function addTrip() {
    if (!form.name.trim()) { setError("Give your trip a name"); return; }
    if (!form.startDate || !form.endDate) { setError("Pick start and end dates"); return; }
    const pair = GRADIENT_PAIRS[trips.length % GRADIENT_PAIRS.length];
    const trip = { id: Date.now(), name: form.name.trim(), startDate: form.startDate, endDate: form.endDate, emoji: form.emoji, note: form.note, color1: pair[0], color2: pair[1], media: [] };
    saveTrips([...trips, trip].sort((a, b) => new Date(a.startDate) - new Date(b.startDate)));
    setForm({ name: "", startDate: "", endDate: "", emoji: "✈️", note: "" });
    setAdding(false); setError("");
  }

  function deleteTrip(id) {
    const updated = trips.filter(t => t.id !== id);
    saveTrips(updated);
    setOpenTrip(null);
  }

  function deleteTripFromGallery(id) {
    deleteTrip(id);
  }

  function addMediaToTrip(tripId, urls) {
    const updated = trips.map(t => {
      if (t.id !== tripId) return t;
      const ex = new Set(t.media || []);
      return { ...t, media: [...(t.media || []), ...urls.filter(u => !ex.has(u))] };
    });
    saveTrips(updated);
    setOpenTrip(updated.find(t => t.id === tripId) || null);
  }

  function deleteMediaFromTrip(tripId, index) {
    const updated = trips.map(t => {
      if (t.id !== tripId) return t;
      return { ...t, media: t.media.filter((_, i) => i !== index) };
    });
    saveTrips(updated);
    setOpenTrip(updated.find(t => t.id === tripId) || null);
  }

  const upcoming = trips.filter(t => getTimeLeft(t.startDate));
  const ongoing = trips.filter(t => !getTimeLeft(t.startDate) && new Date(t.endDate) > new Date());
  const past = trips.filter(t => new Date(t.endDate) <= new Date());

  return (
    <>
      {openTrip && <TripGallery trip={openTrip} onClose={() => setOpenTrip(null)} onAddMedia={addMediaToTrip} onDeleteMedia={deleteMediaFromTrip} onDelete={deleteTripFromGallery} />}
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0f0c1e 0%, #1a1030 50%, #0d1a2e 100%)", fontFamily: "'DM Sans', sans-serif", padding: "0 0 100px" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,400;1,600&family=DM+Sans:wght@300;400;500&display=swap'); input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.25)} input,textarea{outline:none}`}</style>
        <div style={{ textAlign: "center", padding: "52px 24px 32px", background: "linear-gradient(to bottom, rgba(180,100,220,0.12), transparent)" }}>
          <div style={{ fontSize: 13, letterSpacing: 4, color: "rgba(200,160,255,0.6)", textTransform: "uppercase", marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>with love</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 38, fontWeight: 600, background: "linear-gradient(90deg, #e9a0d5, #c084fc, #7dd3fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Our Trips</h1>
          <p style={{ color: "rgba(255,255,255,0.35)", marginTop: 8, fontSize: 14 }}>Every adventure, counted down to the second</p>
        </div>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px" }}>
          {!adding && (
            <button onClick={() => setAdding(true)} style={{ width: "100%", padding: "16px", borderRadius: 16, marginBottom: 24, background: "linear-gradient(135deg, #c084fc22, #7dd3fc22)", border: "1.5px dashed rgba(192,132,252,0.4)", color: "rgba(200,160,255,0.8)", cursor: "pointer", fontSize: 15, fontFamily: "'DM Sans', sans-serif" }}
              onMouseEnter={e => e.currentTarget.style.borderColor="rgba(192,132,252,0.8)"}
              onMouseLeave={e => e.currentTarget.style.borderColor="rgba(192,132,252,0.4)"}>+ Plan a new trip</button>
          )}
          {adding && (
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 20, padding: "24px", marginBottom: 24, border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 18, color: "#fff", marginBottom: 18 }}>New adventure</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {DESTINATIONS.map(e => <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))} style={{ fontSize: 20, background: form.emoji===e?"rgba(192,132,252,0.3)":"rgba(255,255,255,0.06)", border: form.emoji===e?"1.5px solid rgba(192,132,252,0.7)":"1.5px solid transparent", borderRadius: 10, padding: "6px 8px", cursor: "pointer" }}>{e}</button>)}
              </div>
              <input ref={nameRef} value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Trip name" style={{ width:"100%",padding:"13px 16px",borderRadius:12,marginBottom:10,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",color:"#fff",fontSize:15,fontFamily:"'DM Sans',sans-serif" }} />
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10 }}>
                <div><div style={{ fontSize:10,color:"rgba(255,255,255,0.3)",fontFamily:"'DM Mono',monospace",letterSpacing:2,textTransform:"uppercase",marginBottom:5 }}>Start</div><input type="datetime-local" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))} style={{ width:"100%",padding:"11px 12px",borderRadius:12,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",color:form.startDate?"#fff":"rgba(255,255,255,0.25)",fontSize:12,fontFamily:"'DM Mono',monospace",colorScheme:"dark" }} /></div>
                <div><div style={{ fontSize:10,color:"rgba(255,255,255,0.3)",fontFamily:"'DM Mono',monospace",letterSpacing:2,textTransform:"uppercase",marginBottom:5 }}>End</div><input type="datetime-local" value={form.endDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))} style={{ width:"100%",padding:"11px 12px",borderRadius:12,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",color:form.endDate?"#fff":"rgba(255,255,255,0.25)",fontSize:12,fontFamily:"'DM Mono',monospace",colorScheme:"dark" }} /></div>
              </div>
              <input value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="A little note (optional)" style={{ width:"100%",padding:"13px 16px",borderRadius:12,marginBottom:12,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",color:"#fff",fontSize:15,fontFamily:"'DM Sans',sans-serif" }} />
              {error && <div style={{ color:"#f87171",fontSize:13,marginBottom:10 }}>{error}</div>}
              <div style={{ display:"flex",gap:10 }}>
                <button onClick={addTrip} style={{ flex:1,padding:"13px",borderRadius:12,background:"linear-gradient(135deg,#c084fc,#818cf8)",border:"none",color:"#fff",fontSize:15,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:500 }}>Add trip</button>
                <button onClick={()=>{setAdding(false);setError("")}} style={{ padding:"13px 16px",borderRadius:12,background:"rgba(255,255,255,0.07)",border:"none",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:15 }}>Cancel</button>
              </div>
            </div>
          )}
          {ongoing.length > 0 && <><div style={{ fontSize:11,letterSpacing:3,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",marginBottom:14,fontFamily:"'DM Mono',monospace" }}>Happening now</div>{ongoing.map(t => <TripCard key={t.id} trip={t} onDelete={deleteTrip} onOpen={setOpenTrip} />)}</>}
          {upcoming.length > 0 && <><div style={{ fontSize:11,letterSpacing:3,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",marginBottom:14,fontFamily:"'DM Mono',monospace" }}>Upcoming</div>{upcoming.map(t => <TripCard key={t.id} trip={t} onDelete={deleteTrip} onOpen={setOpenTrip} />)}</>}
          {past.length > 0 && <><div style={{ fontSize:11,letterSpacing:3,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",margin:"22px 0 14px",fontFamily:"'DM Mono',monospace" }}>Memories</div>{past.map(t => <TripCard key={t.id} trip={t} onDelete={deleteTrip} onOpen={setOpenTrip} />)}</>}
        </div>
      </div>
    </>
  );
}
