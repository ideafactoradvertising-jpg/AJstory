import { Routes, Route, NavLink } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import NextMeeting from './NextMeeting'
import Trips from './Trips'
import LoveNotes from './LoveNotes'
import Album from './Album'
import Chat from './Chat'
import Us from './Us'

const PLAYLIST = [
  "https://res.cloudinary.com/deg8gb0mt/video/upload/v1778414075/DAISIES_cz0o8t.mp3",
  "https://res.cloudinary.com/deg8gb0mt/video/upload/v1778426125/Wi_h_Li_t_j4hl0u.mp3",
  "https://res.cloudinary.com/deg8gb0mt/video/upload/v1778430291/My_Love_Mine_All_Mine_fe1cxu.mp3",
];

function GlobalAudio() {
  const audioRef = useRef(null);
  const indexRef = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const startIndex = Math.floor(Math.random() * PLAYLIST.length);
    const audio = new Audio(PLAYLIST[startIndex]);
    audio.volume = 0.4;
    audioRef.current = audio;
    indexRef.current = startIndex;

    audio.addEventListener("ended", () => {
      indexRef.current = (indexRef.current + 1) % PLAYLIST.length;
      audio.src = PLAYLIST[indexRef.current];
      audio.play().catch(() => {});
    });

    const tryPlay = () => {
      if (startedRef.current) return;
      audio.play().then(() => {
        startedRef.current = true;
        const btn = document.getElementById("global-play-btn");
        if (btn) btn.style.display = "none";
      }).catch(() => {
        const btn = document.getElementById("global-play-btn");
        if (btn) btn.style.display = "flex";
      });
    };

    tryPlay();
    document.addEventListener("click", tryPlay, { once: true });
    return () => { audio.pause(); audio.src = ""; };
  }, []);

  return (
    <div id="global-play-btn" style={{ display: "none", position: "fixed", bottom: 90, right: 20, zIndex: 100, alignItems: "center", gap: 6, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,120,100,0.3)", borderRadius: 50, padding: "8px 14px", cursor: "pointer" }}
      onClick={() => audioRef.current?.play()}>
      <span style={{ fontSize: 14, color: "rgba(255,180,160,0.8)" }}>♪</span>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "rgba(255,180,160,0.7)", letterSpacing: 2, textTransform: "uppercase" }}>tap to play</span>
    </div>
  );
}

export default function App() {
  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #000; }
        .nav {
          position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          z-index: 1000; display: flex; gap: 2px;
          background: rgba(20,10,30,0.85); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 50px; padding: 5px; backdrop-filter: blur(20px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4); white-space: nowrap;
        }
        .nav a {
          text-decoration: none; padding: 8px 9px; border-radius: 50px;
          font-size: 9px; letter-spacing: 0.2px; color: rgba(255,255,255,0.35);
          transition: all 0.2s; font-family: 'DM Mono', monospace;
        }
        .nav a:hover { color: rgba(255,255,255,0.7); }
        .nav a.active { background: rgba(255,255,255,0.1); color: #fff; }
      `}</style>

      <GlobalAudio />

      <nav className="nav">
        <NavLink to="/">♥ Meet</NavLink>
        <NavLink to="/trips">✈ Trips</NavLink>
        <NavLink to="/notes">💌 Notes</NavLink>
        <NavLink to="/album">📸 Album</NavLink>
        <NavLink to="/chat">💬 Chat</NavLink>
        <NavLink to="/us">🌏 Us</NavLink>
      </nav>

      <Routes>
        <Route path="/" element={<NextMeeting />} />
        <Route path="/trips" element={<Trips />} />
        <Route path="/notes" element={<LoveNotes />} />
        <Route path="/album" element={<Album />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/us" element={<Us />} />
      </Routes>
    </>
  )
}
