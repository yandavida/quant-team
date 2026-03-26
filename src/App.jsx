import { useState, useRef, useEffect } from "react";
import { AGENTS, PROJECTS } from "./agents.js";

// ─── Color palette ───────────────────────────────────────────
const C = {
  bg:        "#f4f6fb",
  panel:     "#ffffff",
  hover:     "#eef1fa",
  active:    "#eef1fa",
  inputBg:   "#f9fafd",
  border:    "#e4e7f0",
  borderSub: "#ced3e5",
  userMsg:   "#eef1fa",
  text:      "#1e2040",
  textSec:   "#6b7490",
  textDim:   "#9aa0bb",
  textMuted: "#bcc0d5",
  title:     "#111830",
};

const font     = "'Inter', -apple-system, sans-serif";
const fontMono = "'JetBrains Mono', monospace";

// ─── Typing indicator ───────────────────────────────────────
const Dots = ({ color }) => (
  <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
    {[0,1,2].map(i => (
      <span key={i} style={{
        width: 6, height: 6, borderRadius: "50%", background: color,
        display: "inline-block",
        animation: "pulse 1.3s ease-in-out infinite",
        animationDelay: `${i * 0.2}s`,
      }} />
    ))}
  </span>
);

// ─── Quick Action Button ─────────────────────────────────────
const QuickBtn = ({ label, onClick, accent }) => (
  <button onClick={onClick} style={{
    padding: "8px 14px", borderRadius: 8, cursor: "pointer",
    background: accent + "0e", border: `1px solid ${accent}28`,
    color: accent, fontSize: 13, fontFamily: font, fontWeight: 500,
    transition: "all 0.15s", whiteSpace: "nowrap", minHeight: 40,
  }}
  onMouseEnter={e => { e.currentTarget.style.background = accent + "1e"; }}
  onMouseLeave={e => { e.currentTarget.style.background = accent + "0e"; }}
  >{label}</button>
);

// ─── Message ────────────────────────────────────────────────
const Message = ({ msg, agent, isMobile }) => (
  <div style={{
    display: "flex",
    flexDirection: msg.role === "user" ? "row-reverse" : "row",
    gap: 8, alignItems: "flex-start",
    animation: "fadeUp 0.2s ease",
  }}>
    {msg.role === "assistant" && (
      <div style={{
        width: isMobile ? 30 : 28, height: isMobile ? 30 : 28,
        borderRadius: 6, flexShrink: 0,
        background: agent.accent + "18", border: `1px solid ${agent.accent}35`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, color: agent.accent, fontWeight: 700, fontFamily: fontMono,
      }}>{agent.emoji}</div>
    )}
    <div style={{
      maxWidth: isMobile ? "88%" : "78%",
      padding: isMobile ? "11px 14px" : "10px 14px",
      borderRadius: msg.role === "user" ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
      background: msg.role === "user" ? C.userMsg : C.panel,
      border: `1px solid ${msg.role === "user" ? C.borderSub : agent.accent + "28"}`,
      fontSize: isMobile ? 15 : 14, lineHeight: 1.8,
      whiteSpace: "pre-wrap", direction: "rtl",
      color: C.text, fontFamily: font, fontWeight: 400,
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>{msg.content}</div>
  </div>
);

// ─── Meeting Room Round ──────────────────────────────────────
const MeetingRound = ({ round, isMobile }) => (
  <div style={{ animation: "fadeUp 0.25s ease", marginBottom: 24 }}>
    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 14 }}>
      <div style={{
        padding: "11px 14px", borderRadius: "12px 4px 12px 12px",
        background: C.userMsg, border: `1px solid ${C.borderSub}`,
        fontSize: isMobile ? 15 : 14, lineHeight: 1.8, color: C.text,
        direction: "rtl", maxWidth: isMobile ? "88%" : "78%",
        whiteSpace: "pre-wrap", fontFamily: font,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}>{round.question}</div>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {round.responses.map(({ agent, content, loading: isLoading }) => (
        <div key={agent.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{
            width: 30, height: 30, borderRadius: 6, flexShrink: 0,
            background: agent.accent + "18", border: `1px solid ${agent.accent}35`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, color: agent.accent, fontWeight: 700, fontFamily: fontMono,
          }}>{agent.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: agent.accent, letterSpacing: 0.5, marginBottom: 4, fontWeight: 700, fontFamily: fontMono }}>
              {agent.name} · {agent.tag}
            </div>
            <div style={{
              padding: "11px 14px", borderRadius: "4px 12px 12px 12px",
              background: C.panel, border: `1px solid ${agent.accent}28`,
              fontSize: isMobile ? 15 : 14, lineHeight: 1.8,
              whiteSpace: "pre-wrap", direction: "rtl",
              color: C.text, fontFamily: font,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}>
              {isLoading ? <Dots color={agent.accent} /> : content}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── API call ────────────────────────────────────────────────
const callAgent = async (agent, messages) => {
  const res = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: agent.system,
      messages,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.map(b => b.text || "").join("") || "שגיאה בתגובה.";
};

// ─── Main App ────────────────────────────────────────────────
export default function App() {
  const [meetingMode, setMeetingMode]     = useState(false);
  const [activeAgent, setActiveAgent]     = useState(AGENTS[0]);
  const [activeProject, setActiveProject] = useState(PROJECTS[0]);
  const [conversations, setConversations] = useState(
    Object.fromEntries(AGENTS.map(a => [a.id, []]))
  );
  const [meetingRounds, setMeetingRounds] = useState([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  const bottomRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, meetingRounds, loading, activeAgent, meetingMode]);

  // Close drawer when switching to desktop
  useEffect(() => { if (!isMobile) setDrawerOpen(false); }, [isMobile]);

  const msgs = conversations[activeAgent.id];
  const totalQueries = Object.values(conversations)
    .reduce((s, c) => s + c.filter(m => m.role === "user").length, 0);

  const sendMessage = async (text) => {
    const t = (text || input).trim();
    if (!t || loading) return;
    setInput("");
    setLoading(true);
    setShowQuick(false);
    const contextualText = `[Project: ${activeProject.label}]\n${t}`;
    const userMsg = { role: "user", content: t };
    const history = [...conversations[activeAgent.id], userMsg];
    setConversations(p => ({ ...p, [activeAgent.id]: history }));
    try {
      const reply = await callAgent(activeAgent, [...conversations[activeAgent.id], { role: "user", content: contextualText }]);
      setConversations(p => ({ ...p, [activeAgent.id]: [...history, { role: "assistant", content: reply }] }));
    } catch (err) {
      setConversations(p => ({ ...p, [activeAgent.id]: [...history, { role: "assistant", content: `⚠️ שגיאת חיבור: ${err.message}` }] }));
    }
    setLoading(false);
  };

  const sendMeetingMessage = async (text) => {
    const t = (text || input).trim();
    if (!t || loading) return;
    setInput("");
    setLoading(true);
    const contextualText = `[Project: ${activeProject.label}]\n${t}`;
    setMeetingRounds(prev => [...prev, {
      question: t,
      responses: AGENTS.map(a => ({ agent: a, content: "", loading: true })),
    }]);
    const results = await Promise.allSettled(
      AGENTS.map(a => callAgent(a, [{ role: "user", content: contextualText }]))
    );
    setMeetingRounds(prev => {
      const updated = [...prev];
      const round = { ...updated[updated.length - 1] };
      round.responses = AGENTS.map((a, i) => ({
        agent: a,
        content: results[i].status === "fulfilled" ? results[i].value : `⚠️ שגיאה: ${results[i].reason?.message}`,
        loading: false,
      }));
      updated[updated.length - 1] = round;
      return updated;
    });
    setLoading(false);
  };

  const clearConversation = () => {
    if (meetingMode) setMeetingRounds([]);
    else { setConversations(p => ({ ...p, [activeAgent.id]: [] })); setShowQuick(true); }
  };

  const selectAgent = (agent) => {
    setMeetingMode(false);
    setActiveAgent(agent);
    setShowQuick(conversations[agent.id].length === 0);
    setDrawerOpen(false);
  };

  const selectMeeting = () => { setMeetingMode(true); setDrawerOpen(false); };

  // ── Sidebar content (shared between desktop sidebar and mobile drawer) ──
  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div style={{
        padding: "16px 16px 14px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: 3, fontFamily: fontMono }}>DEMOBOT2</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.title }}>AGENT TEAM</div>
        </div>
        {isMobile && (
          <button onClick={() => setDrawerOpen(false)} style={{
            background: "none", border: "none", color: C.textSec,
            cursor: "pointer", fontSize: 22, padding: "0 4px", lineHeight: 1,
          }}>×</button>
        )}
      </div>

      {/* Meeting Room */}
      <div onClick={selectMeeting} style={{
        padding: "12px 16px", cursor: "pointer",
        background: meetingMode ? C.active : "transparent",
        borderRight: meetingMode ? `3px solid ${C.borderSub}` : "3px solid transparent",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 10,
        minHeight: 52,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: meetingMode ? C.border : C.bg,
          border: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, color: meetingMode ? C.text : C.textDim, fontFamily: fontMono,
        }}>⬡</div>
        <div>
          <div style={{ fontSize: 13, color: meetingMode ? C.title : C.textSec, fontWeight: meetingMode ? 700 : 500 }}>חדר ישיבות</div>
          <div style={{ fontSize: 10, color: C.textMuted, fontFamily: fontMono, letterSpacing: 1 }}>ALL AGENTS</div>
        </div>
      </div>

      {/* Agents list */}
      <div style={{ flex: 1, overflowY: "auto", paddingTop: 4 }}>
        {AGENTS.map(agent => {
          const active = !meetingMode && agent.id === activeAgent.id;
          const cnt = conversations[agent.id].filter(m => m.role === "user").length;
          return (
            <div key={agent.id} onClick={() => selectAgent(agent)} style={{
              padding: "10px 16px", cursor: "pointer", minHeight: 52,
              background: active ? C.active : "transparent",
              borderRight: active ? `3px solid ${agent.accent}` : "3px solid transparent",
              display: "flex", alignItems: "center", gap: 10, position: "relative",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: active ? agent.accent + "18" : C.bg,
                border: `1px solid ${active ? agent.accent + "45" : C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, color: active ? agent.accent : C.textDim,
                fontWeight: 700, fontFamily: fontMono,
              }}>{agent.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: active ? C.title : C.textSec, fontWeight: active ? 700 : 500 }}>{agent.name}</span>
                  {cnt > 0 && <span style={{ fontSize: 10, padding: "1px 6px", background: agent.accent + "18", color: agent.accent, borderRadius: 4, fontWeight: 700, fontFamily: fontMono }}>{cnt}</span>}
                </div>
                <div style={{ fontSize: 10, color: active ? agent.accent : C.textMuted, fontFamily: fontMono, letterSpacing: 1 }}>{agent.tag}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6, fontFamily: fontMono }}>{totalQueries} QUERIES</div>
        <div style={{ display: "flex", gap: 5 }}>
          {[["FX","#39ff14"],["OPT","#00e5ff"],["ARB","#c77dff"]].map(([l,c]) => (
            <div key={l} style={{ fontSize: 9, padding: "3px 7px", borderRadius: 4, background: c+"15", color: c, border: `1px solid ${c}30`, fontFamily: fontMono, fontWeight: 700 }}>{l}</div>
          ))}
        </div>
      </div>
    </>
  );

  const accent = meetingMode ? C.borderSub : activeAgent.accent;

  return (
    <div style={{
      fontFamily: font, height: "100dvh",
      display: "flex", background: C.bg, color: C.text, overflow: "hidden",
    }}>
      <style>{`
        @keyframes pulse{0%,80%,100%{transform:scale(0.5);opacity:0.2}40%{transform:scale(1);opacity:1}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
        textarea:focus{outline:none}
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>

      {/* ── Desktop sidebar ── */}
      {!isMobile && (
        <div style={{
          width: 220, background: C.panel,
          borderRight: `1px solid ${C.border}`,
          display: "flex", flexDirection: "column", flexShrink: 0,
          boxShadow: "1px 0 8px rgba(0,0,0,0.04)",
        }}>
          <SidebarContent />
        </div>
      )}

      {/* ── Mobile drawer backdrop ── */}
      {isMobile && drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
          zIndex: 40, backdropFilter: "blur(2px)",
        }} />
      )}

      {/* ── Mobile drawer ── */}
      {isMobile && (
        <div style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 260,
          background: C.panel, zIndex: 50,
          display: "flex", flexDirection: "column",
          boxShadow: "4px 0 20px rgba(0,0,0,0.12)",
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease",
        }}>
          <SidebarContent />
        </div>
      )}

      {/* ── Main panel ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/* Header */}
        <div style={{
          padding: isMobile ? "10px 14px" : "11px 20px",
          background: C.panel, borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)", flexShrink: 0,
        }}>
          {/* Hamburger (mobile only) */}
          {isMobile && (
            <button onClick={() => setDrawerOpen(true)} style={{
              background: "none", border: "none", cursor: "pointer",
              color: C.textSec, fontSize: 22, padding: "0 2px", lineHeight: 1, flexShrink: 0,
            }}>☰</button>
          )}

          {/* Agent/Room icon */}
          <div style={{
            width: isMobile ? 32 : 36, height: isMobile ? 32 : 36,
            borderRadius: 8, flexShrink: 0,
            background: meetingMode ? C.bg : activeAgent.accent + "15",
            border: `1px solid ${meetingMode ? C.border : activeAgent.accent + "35"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, color: meetingMode ? C.textSec : activeAgent.accent,
            fontWeight: 700, fontFamily: fontMono,
          }}>{meetingMode ? "⬡" : activeAgent.emoji}</div>

          {/* Title */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "nowrap" }}>
              <span style={{ fontWeight: 700, color: C.title, fontSize: isMobile ? 14 : 14, whiteSpace: "nowrap" }}>
                {meetingMode ? "חדר ישיבות" : activeAgent.name}
              </span>
              <span style={{
                fontSize: 9, padding: "2px 6px",
                background: meetingMode ? C.bg : activeAgent.accent + "15",
                color: meetingMode ? C.textSec : activeAgent.accent,
                borderRadius: 4, letterSpacing: 1.5, fontWeight: 700,
                fontFamily: fontMono, border: `1px solid ${meetingMode ? C.border : activeAgent.accent + "30"}`,
                whiteSpace: "nowrap",
              }}>{meetingMode ? "ALL" : activeAgent.tag}</span>
            </div>
            {!isMobile && (
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 1 }}>
                {meetingMode ? "שאלה אחת — כל הסוכנים עונים במקביל" : activeAgent.description}
              </div>
            )}
          </div>

          {/* Project badges — horizontal scroll on mobile */}
          <div style={{
            display: "flex", gap: 5, alignItems: "center",
            overflowX: "auto", flexShrink: 0,
            maxWidth: isMobile ? 160 : "none",
            paddingBottom: isMobile ? 2 : 0,
            scrollbarWidth: "none",
          }}>
            {PROJECTS.map(p => (
              <button key={p.id} onClick={() => setActiveProject(p)} style={{
                padding: isMobile ? "5px 8px" : "4px 10px", borderRadius: 4, cursor: "pointer",
                background: activeProject.id === p.id ? p.color + "18" : "transparent",
                border: `1px solid ${activeProject.id === p.id ? p.color + "55" : C.border}`,
                color: activeProject.id === p.id ? p.color : C.textDim,
                fontSize: isMobile ? 9 : 10, fontFamily: fontMono, fontWeight: 700,
                letterSpacing: 1, transition: "all 0.15s", whiteSpace: "nowrap",
                flexShrink: 0, minHeight: isMobile ? 32 : "auto",
              }}>{isMobile ? p.id.toUpperCase() : p.label}</button>
            ))}
          </div>

          {/* Clear */}
          {(meetingMode ? meetingRounds.length > 0 : msgs.length > 0) && (
            <button onClick={clearConversation} style={{
              background: "none", border: "none", color: C.textMuted,
              cursor: "pointer", fontSize: isMobile ? 12 : 11,
              fontFamily: font, whiteSpace: "nowrap", flexShrink: 0, padding: "4px",
            }}>נקה</button>
          )}
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: isMobile ? "14px 12px" : "18px 20px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>

          {meetingMode ? (
            <>
              {meetingRounds.length === 0 && (
                <div style={{ textAlign: "center", paddingTop: isMobile ? 30 : 50, animation: "fadeUp 0.35s ease" }}>
                  <div style={{ fontSize: 32, color: C.textMuted, marginBottom: 12, fontFamily: fontMono }}>⬡</div>
                  <div style={{ fontSize: 15, color: C.textSec, fontWeight: 600, marginBottom: 4 }}>חדר הישיבות</div>
                  <div style={{ fontSize: 13, color: C.textDim }}>שלחי שאלה — כל {AGENTS.length} הסוכנים יענו במקביל</div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 18, flexWrap: "wrap", maxWidth: 480, margin: "18px auto 0" }}>
                    {AGENTS.map(a => (
                      <div key={a.id} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: a.accent + "12", color: a.accent, border: `1px solid ${a.accent}28`, fontWeight: 600 }}>{a.name}</div>
                    ))}
                  </div>
                </div>
              )}
              {meetingRounds.map((round, i) => <MeetingRound key={i} round={round} isMobile={isMobile} />)}
            </>
          ) : (
            <>
              {msgs.length === 0 && (
                <div style={{ animation: "fadeUp 0.35s ease" }}>
                  <div style={{ textAlign: "center", marginBottom: 24, paddingTop: isMobile ? 16 : 30 }}>
                    <div style={{ fontSize: 28, color: activeAgent.accent, marginBottom: 10, fontFamily: fontMono }}>{activeAgent.emoji}</div>
                    <div style={{ fontSize: 15, color: C.textSec, fontWeight: 600 }}>{activeAgent.name}</div>
                    <div style={{ fontSize: 12, color: C.textDim, marginTop: 3 }}>{activeAgent.description}</div>
                  </div>
                  {showQuick && (
                    <>
                      <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 2, marginBottom: 10, textAlign: "center", fontFamily: fontMono, fontWeight: 700 }}>שאלות מהירות</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 600, margin: "0 auto" }}>
                        {activeAgent.quickActions.map((qa, i) => (
                          <QuickBtn key={i} label={qa.label} accent={activeAgent.accent} onClick={() => sendMessage(qa.prompt)} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {msgs.map((msg, i) => <Message key={i} msg={msg} agent={activeAgent} isMobile={isMobile} />)}

              {loading && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 6,
                    background: activeAgent.accent + "18", border: `1px solid ${activeAgent.accent}35`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, color: activeAgent.accent, fontFamily: fontMono,
                  }}>{activeAgent.emoji}</div>
                  <div style={{
                    padding: "11px 14px", background: C.panel,
                    border: `1px solid ${activeAgent.accent}28`,
                    borderRadius: "4px 12px 12px 12px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}>
                    <Dots color={activeAgent.accent} />
                  </div>
                </div>
              )}

              {msgs.length > 0 && !loading && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 4 }}>
                  {activeAgent.quickActions.slice(0, 3).map((qa, i) => (
                    <QuickBtn key={i} label={qa.label} accent={activeAgent.accent} onClick={() => sendMessage(qa.prompt)} />
                  ))}
                  {!showQuick && (
                    <button onClick={() => setShowQuick(true)} style={{
                      padding: "8px 14px", borderRadius: 8, cursor: "pointer", minHeight: 40,
                      background: C.bg, border: `1px solid ${C.border}`,
                      color: C.textSec, fontSize: 13, fontFamily: font,
                    }}>עוד ›</button>
                  )}
                </div>
              )}
              {showQuick && msgs.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {activeAgent.quickActions.slice(3).map((qa, i) => (
                    <QuickBtn key={i} label={qa.label} accent={activeAgent.accent} onClick={() => sendMessage(qa.prompt)} />
                  ))}
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: isMobile ? "10px 12px" : "12px 20px",
          background: C.panel, borderTop: `1px solid ${C.border}`,
          display: "flex", gap: 8, alignItems: "flex-end",
          boxShadow: "0 -1px 4px rgba(0,0,0,0.04)", flexShrink: 0,
          paddingBottom: isMobile ? "max(10px, env(safe-area-inset-bottom))" : "12px",
        }}>
          <div style={{ flex: 1, position: "relative" }}>
            <div style={{
              position: "absolute", top: 9, left: 13, zIndex: 1,
              fontSize: 9, color: activeProject.color, letterSpacing: 1,
              fontFamily: fontMono, fontWeight: 700,
            }}>{activeProject.id.toUpperCase()}</div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                  e.preventDefault();
                  meetingMode ? sendMeetingMessage() : sendMessage();
                }
              }}
              placeholder={meetingMode ? "שאל/י את כולם..." : `שאל/י את ${activeAgent.name}...`}
              rows={isMobile ? 1 : 2}
              style={{
                width: "100%", background: C.inputBg,
                border: `1.5px solid ${C.border}`, borderRadius: 10,
                padding: isMobile ? "28px 14px 10px" : "26px 14px 10px",
                color: C.text, fontSize: isMobile ? 16 : 14,
                resize: "none", fontFamily: font, lineHeight: 1.6,
                direction: "rtl", transition: "border-color 0.15s",
              }}
              onFocus={e => e.target.style.borderColor = accent + "70"}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>
          <button
            onClick={() => meetingMode ? sendMeetingMessage() : sendMessage()}
            disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? C.bg : accent + "18",
              color: loading || !input.trim() ? C.textMuted : meetingMode ? C.text : accent,
              border: `1.5px solid ${loading || !input.trim() ? C.border : accent + "55"}`,
              borderRadius: 10,
              padding: isMobile ? "14px 18px" : "14px 18px",
              minHeight: isMobile ? 50 : 46, minWidth: isMobile ? 50 : 46,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              fontSize: 18, fontFamily: font, fontWeight: 700,
              transition: "all 0.12s", flexShrink: 0,
            }}>↑</button>
        </div>
      </div>
    </div>
  );
}
