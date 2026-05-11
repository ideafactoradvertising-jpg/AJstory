import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { uploadToCloudinary } from "./upload";

export default function Album() {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lightbox, setLightbox] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [captions, setCaptions] = useState({});
  const fileInputRef = useRef();

  useEffect(() => {
    const ref = doc(db, "shared", "album");
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists() && snap.data().list) setPhotos(snap.data().list);
    });
    return unsub;
  }, []);

  async function savePhotos(list) {
    setPhotos(list);
    await setDoc(doc(db, "shared", "album"), { list });
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setPendingFiles(files);
    const initial = {};
    files.forEach((f, i) => { initial[i] = ""; });
    setCaptions(initial);
    e.target.value = "";
  }

  async function uploadWithCaptions() {
    if (!pendingFiles.length) return;
    setUploading(true); setProgress(0);
    try {
      const newItems = [];
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        const url = await uploadToCloudinary(file, p =>
          setProgress(Math.round((i / pendingFiles.length) * 100 + p / pendingFiles.length))
        );
        newItems.push({
          id: Date.now() + i,
          url,
          isVideo: file.type.startsWith("video/"),
          caption: captions[i] || "",
          uploadedAt: new Date().toISOString(),
        });
      }
      await savePhotos([...newItems, ...photos]);
      setPendingFiles([]);
      setCaptions({});
    } catch { alert("Upload failed. Please try again."); }
    finally { setUploading(false); setProgress(0); }
  }

  function deletePhoto(id) {
    savePhotos(photos.filter(p => p.id !== id));
    setConfirmDelete(null);
    if (lightbox?.id === id) setLightbox(null);
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0a0510 0%, #050208 60%, #000 100%)", fontFamily: "'DM Sans', sans-serif", padding: "0 0 100px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300;1,400&family=DM+Mono:wght@300;400&family=DM+Sans:wght@300;400&display=swap');
        * { box-sizing: border-box; }
        input, textarea { outline: none; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }
      `}</style>

      {/* Lightbox */}
      {lightbox && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.98)", zIndex: 500, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 20px 120px" }}>
          <div style={{ maxWidth: 700, width: "100%" }}>
            {lightbox.isVideo
              ? <video src={lightbox.url} controls autoPlay style={{ width: "100%", borderRadius: 12, maxHeight: "70vh" }} />
              : <img src={lightbox.url} style={{ width: "100%", borderRadius: 12, maxHeight: "70vh", objectFit: "contain" }} />}
            {lightbox.caption && (
              <div style={{ textAlign: "center", marginTop: 12, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 16, color: "rgba(255,255,255,0.7)" }}>
                {lightbox.caption}
              </div>
            )}
            {lightbox.uploadedAt && (
              <div style={{ textAlign: "center", marginTop: 4, fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: 1 }}>
                {new Date(lightbox.uploadedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button onClick={() => setLightbox(null)} style={{ padding: "11px 24px", borderRadius: 50, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 2 }}>✕ Close</button>
            <button onClick={() => { setConfirmDelete(lightbox.id); setLightbox(null); }} style={{ padding: "11px 24px", borderRadius: 50, background: "rgba(255,80,80,0.15)", border: "1px solid rgba(255,80,80,0.3)", color: "rgba(255,120,120,0.8)", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 2 }}>Delete</button>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 340, background: "rgba(20,5,15,0.95)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: 20, padding: "28px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 20, color: "#ffb3a0", marginBottom: 8 }}>Delete this photo?</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 24 }}>This can't be undone</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 12, color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 14 }}>Keep it</button>
              <button onClick={() => deletePhoto(confirmDelete)} style={{ flex: 1, padding: "12px", background: "rgba(255,80,80,0.2)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 12, color: "rgba(255,120,120,0.9)", cursor: "pointer", fontSize: 14 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Caption form for pending uploads */}
      {pendingFiles.length > 0 && !uploading && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(20px)", overflow: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px 120px" }}>
          <div style={{ width: "100%", maxWidth: 500 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 24, color: "#c084fc", marginBottom: 6, textAlign: "center" }}>Add captions</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "rgba(200,160,255,0.4)", marginBottom: 24, textAlign: "center" }}>optional — describe the moment</div>

            {pendingFiles.map((file, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(192,132,252,0.15)", borderRadius: 16, padding: "16px", marginBottom: 12, display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 60, height: 60, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "#111" }}>
                  <img src={URL.createObjectURL(file)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <input
                  value={captions[i] || ""}
                  onChange={e => setCaptions(c => ({ ...c, [i]: e.target.value }))}
                  placeholder="Add a caption..."
                  style={{ flex: 1, background: "transparent", border: "none", borderBottom: "1px solid rgba(192,132,252,0.2)", color: "#fff", fontSize: 14, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", padding: "6px 0" }}
                />
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={uploadWithCaptions} style={{ flex: 1, padding: "14px", background: "linear-gradient(135deg, #c084fc, #f472b6)", border: "none", borderRadius: 14, color: "#fff", fontSize: 15, cursor: "pointer", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
                Upload {pendingFiles.length > 1 ? `${pendingFiles.length} photos` : "photo"}
              </button>
              <button onClick={() => { setPendingFiles([]); setCaptions({}); }} style={{ padding: "14px 18px", borderRadius: 14, background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 15 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: "center", padding: "52px 24px 28px", background: "linear-gradient(to bottom, rgba(150,80,200,0.08), transparent)" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 5, textTransform: "uppercase", color: "rgba(200,160,255,0.5)", marginBottom: 10 }}>alex &amp; justine</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 300, fontSize: 38, background: "linear-gradient(90deg, #c084fc, #f472b6, #c084fc)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 4s linear infinite" }}>Our Album</h1>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 13, color: "rgba(200,160,255,0.3)", marginTop: 6, animation: "pulse 4s infinite" }}>every moment, saved forever</div>
      </div>

      <div style={{ maxWidth: 500, margin: "0 auto", padding: "0 20px" }}>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileSelect} style={{ display: "none" }} />
        <button onClick={() => fileInputRef.current.click()} disabled={uploading} style={{ width: "100%", padding: "16px", borderRadius: 16, marginBottom: uploading ? 8 : 20, background: "linear-gradient(135deg, rgba(192,132,252,0.08), rgba(244,114,182,0.08))", border: `1.5px dashed rgba(192,132,252,${uploading ? "0.7" : "0.35"})`, color: `rgba(200,160,255,${uploading ? "1" : "0.7"})`, cursor: uploading ? "not-allowed" : "pointer", fontSize: 15, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
          {uploading ? `Uploading... ${progress}%` : "📷  Add photos & videos"}
        </button>
        {uploading && (
          <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 4, marginBottom: 20 }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #c084fc, #f472b6)", borderRadius: 4, transition: "width 0.3s" }} />
          </div>
        )}

        {photos.length > 0 && (
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "rgba(200,160,255,0.3)", marginBottom: 16, textAlign: "center" }}>
            {photos.length} {photos.length === 1 ? "memory" : "memories"}
          </div>
        )}

        {photos.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {photos.map((photo, i) => (
              <div key={photo.id} onClick={() => setLightbox(photo)} style={{ position: "relative", cursor: "pointer", animation: `fadeIn 0.4s ease ${i * 0.03}s both` }}>
                <div style={{ aspectRatio: "1", borderRadius: 10, overflow: "hidden", background: "#111" }}>
                  {photo.isVideo ? (
                    <><video src={photo.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted /><div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)" }}><span style={{ fontSize: 20, color: "#fff" }}>▶</span></div></>
                  ) : (
                    <img src={photo.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </div>
                {photo.caption && (
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 10, color: "rgba(200,160,255,0.6)", textAlign: "center", marginTop: 4, padding: "0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {photo.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.15)" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📸</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 20, marginBottom: 8 }}>No memories yet</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>Upload your first photo above</div>
          </div>
        )}
      </div>
    </div>
  );
}
