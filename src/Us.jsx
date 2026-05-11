import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

const KL = { lat: 3.1390, lng: 101.6869 };
const MANILA = { lat: 14.5995, lng: 120.9842 };

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

const DISTANCE_KM = getDistanceKm(KL.lat, KL.lng, MANILA.lat, MANILA.lng);
const DISTANCE_MILES = Math.round(DISTANCE_KM * 0.621371);

const MOODS = [
  { emoji: "🥰", label: "In love" }, { emoji: "😊", label: "Happy" },
  { emoji: "😌", label: "Peaceful" }, { emoji: "🥺", label: "Missing you" },
  { emoji: "😴", label: "Tired" }, { emoji: "😔", label: "Sad" },
  { emoji: "🤩", label: "Excited" }, { emoji: "😤", label: "Stressed" },
  { emoji: "🥳", label: "Celebrating" }, { emoji: "💭", label: "Thoughtful" },
];

function getTime(tz) { return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: tz }); }
function getDate(tz) { return new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: tz }); }

export default function Us() {
  const [data, setData] = useState({ alexMood: null, justineMood: null, alexNote: "", justineNote: "", lastUpdated: null });
  const [pickingFor, setPickingFor] = useState(null);
  const [klTime, setKlTime] = useState(getTime("Asia/Kuala_Lumpur"));
  const [manilaTime, setManilaTime] = useState(getTime("Asia/Manila"));
  const [klDate, setKlDate] = useState(getDate("Asia/Kuala_Lumpur"));
  const [manilaDate, setManilaDate] = useState(getDate("Asia/Manila"));

  useEffect(() => {
    const id = setInterval(() => {
      setKlTime(getTime("Asia/Kuala_Lumpur")); setManilaTime(getTime("Asia/Manila"));
      setKlDate(getDate("Asia/Kuala_Lumpur")); setManilaDate(getDate("Asia/Manila"));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Firebase sync
  useEffect(() => {
    const ref = doc(db, "shared", "us");
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) setData(snap.data());
    });
    return unsub;
  }, []);

  async function saveData(updates) {
    const updated = { ...data, ...updates, lastUpdated: new Date().toISOString() };
    setData(updated);
    await setDoc(doc(db, "shared", "us"), updated);
  }

  function selectMood(mood, person) {
    saveData({ [`${person}Mood`]: mood });
    setPickingFor(null);
  }

  const alexMood = MOODS.find(m => m.emoji === data.alexMood);
  const justineMood = MOODS.find(m => m.emoji === data.justineMood);

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 20% 10%, #0f0a1a 0%, #050208 60%, #000 100%)", fontFamily: "'DM Sans', sans-serif", padding: "0 0 100px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300;1,400&family=DM+Mono:wght@300;400&family=DM+Sans:wght@300;400&display=swap');
        * { box-sizing: border-box; }
        input, textarea { outline: none; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      `}</style>

      <div style={{ textAlign: "center", padding: "52px 24px 28px", background: "linear-gradient(to bottom, rgba(150,80,200,0.08), transparent)" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 5, textTransform: "uppercase", color: "rgba(200,160,255,0.5)", marginBottom: 10 }}>alex &amp; justine</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 300, fontSize: 38, background: "linear-gradient(90deg, #c084fc, #f472b6, #c084fc)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 4s linear infinite" }}>Us</h1>
      </div>

      <div style={{ maxWidth: 500, margin: "0 auto", padding: "0 20px" }}>
        {/* Distance */}
        <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", border: "1px solid rgba(192,132,252,0.15)", borderRadius: 20, padding: "24px", marginBottom: 16, animation: "fadeIn 0.5s ease both", textAlign: "center" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 4, textTransform: "uppercase", color: "rgba(200,160,255,0.5)", marginBottom: 16 }}>distance between us</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 4, animation: "float 3s ease infinite" }}>🇲🇾</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 16, color: "#fff" }}>Alex</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(200,160,255,0.5)", marginTop: 2 }}>Kuala Lumpur</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{klTime}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{klDate}</div>
            </div>
            <div style={{ textAlign: "center", flex: 1, padding: "0 12px" }}>
              <div style={{ borderTop: "1px dashed rgba(192,132,252,0.3)", position: "relative", margin: "0 8px" }}>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "rgba(10,5,20,0.9)", padding: "4px 8px", borderRadius: 20 }}><span style={{ fontSize: 16 }}>✈️</span></div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 300, fontSize: "clamp(28px, 8vw, 42px)", lineHeight: 1, background: "linear-gradient(90deg, #c084fc, #f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{DISTANCE_KM.toLocaleString()}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "rgba(200,160,255,0.5)", letterSpacing: 2, textTransform: "uppercase" }}>km apart</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "rgba(200,160,255,0.3)", marginTop: 2 }}>{DISTANCE_MILES.toLocaleString()} miles</div>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 4, animation: "float 3s ease infinite 1s" }}>🇵🇭</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 16, color: "#fff" }}>Justine</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(200,160,255,0.5)", marginTop: 2 }}>Manila</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{manilaTime}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{manilaDate}</div>
            </div>
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 13, color: "rgba(200,160,255,0.3)", animation: "pulse 4s infinite" }}>but never far from each other's hearts ♥</div>
        </div>

        {/* Mood */}
        <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", border: "1px solid rgba(192,132,252,0.15)", borderRadius: 20, padding: "24px", marginBottom: 16, animation: "fadeIn 0.5s ease both 0.1s" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 4, textTransform: "uppercase", color: "rgba(200,160,255,0.5)", marginBottom: 20 }}>how are we feeling today?</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[{ person: "alex", label: "Alex", mood: alexMood, note: data.alexNote, borderColor: "rgba(192,132,252,0.2)", hoverColor: "rgba(192,132,252,0.5)" },
              { person: "justine", label: "Justine", mood: justineMood, note: data.justineNote, borderColor: "rgba(244,114,182,0.2)", hoverColor: "rgba(244,114,182,0.5)" }].map(({ person, label, mood, note, borderColor, hoverColor }) => (
              <div key={person} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 10 }}>{label}</div>
                <div onClick={() => setPickingFor(person)} style={{ cursor: "pointer", background: "rgba(255,255,255,0.05)", border: `1px solid ${borderColor}`, borderRadius: 16, padding: "16px 12px", transition: "all 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor=hoverColor}
                  onMouseLeave={e => e.currentTarget.style.borderColor=borderColor}>
                  {mood ? (
                    <><div style={{ fontSize: 36, marginBottom: 6 }}>{mood.emoji}</div><div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{mood.label}</div></>
                  ) : (
                    <><div style={{ fontSize: 28, marginBottom: 6, opacity: 0.3 }}>🙂</div><div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 2 }}>tap to set</div></>
                  )}
                </div>
                {mood && (
                  <textarea defaultValue={note} onBlur={e => saveData({ [`${person}Note`]: e.target.value })}
                    placeholder="Add a note..." rows={2}
                    style={{ width: "100%", marginTop: 8, padding: "8px 10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${borderColor}`, borderRadius: 10, color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", resize: "none" }}
                  />
                )}
              </div>
            ))}
          </div>
          {data.lastUpdated && (
            <div style={{ textAlign: "center", marginTop: 14, fontFamily: "'DM Mono', monospace", fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: 1 }}>
              last updated {new Date(data.lastUpdated).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>
      </div>

      {pickingFor && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 120px" }}>
          <div style={{ width: "100%", maxWidth: 500, background: "rgba(15,8,25,0.95)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: "20px 20px 0 0", padding: "28px 24px", animation: "fadeIn 0.3s ease" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 20, color: "#c084fc", marginBottom: 20, textAlign: "center" }}>
              How is {pickingFor === "alex" ? "Alex" : "Justine"} feeling?
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
              {MOODS.map(mood => (
                <div key={mood.emoji} onClick={() => selectMood(mood.emoji, pickingFor)} style={{ textAlign: "center", cursor: "pointer", padding: "10px 6px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background="rgba(192,132,252,0.15)"; e.currentTarget.style.borderColor="rgba(192,132,252,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"; }}>
                  <div style={{ fontSize: 26, marginBottom: 4 }}>{mood.emoji}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: 1 }}>{mood.label}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setPickingFor(null)} style={{ width: "100%", marginTop: 16, padding: "12px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "rgba(255,255,255,0.3)", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
