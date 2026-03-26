import { useState, useRef, useEffect } from "react";
import { AGENTS, PROJECTS } from "./agents.js";


// ─── Typing indicator ───────────────────────────────────────
const Dots = ({ color }) => (
  <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
    {[0,1,2].map(i => (
      <span key={i} style={{
        width: 5, height: 5, borderRadius: "50%", background: color,
        display: "inline-block",
        animation: "pulse 1.3s ease-in-out infinite",
        animationDelay: `${i*0.2}s`,
      }}/>
    ))}
  </span>
);

// ─── Project Badge ───────────────────────────────────────────
const ProjectBadge = ({ project, active, onClick }) => (
  <button onClick={onClick} style={{
    padding: "4px 10px", borderRadius: 4, cursor: "pointer",
    background: active ? project.color + "20" : "transparent",
    border: `1px solid ${active ? project.color + "60" : "#1a1a2a"}`,
    color: active ? project.color : "#333",
    fontSize: 10, fontFamily: "inherit", fontWeight: 700,
    letterSpacing: 1, transition: "all 0.15s",
  }}>{project.label}</button>
);

// ─── Quick Action Button ────────────────────────────────────
const QuickBtn = ({ label, onClick, accent }) => (
  <button onClick={onClick} style={{
    padding: "6px 11px", borderRadius: 6, cursor: "pointer",
    background: "transparent",
    border: `1px solid ${accent}30`,
    color: accent + "cc",
    fontSize: 11, fontFamily: "inherit",
    transition: "all 0.15s", whiteSpace: "nowrap",
  }}
  onMouseEnter={e => {
    e.target.style.background = accent + "15";
    e.target.style.borderColor = accent + "60";
    e.target.style.color = accent;
  }}
  onMouseLeave={e => {
    e.target.style.background = "transparent";
    e.target.style.borderColor = accent + "30";
    e.target.style.color = accent + "cc";
  }}
  >{label}</button>
);

// ─── Message ────────────────────────────────────────────────
const Message = ({ msg, agent }) => (
  <div style={{
    display: "flex",
    flexDirection: msg.role === "user" ? "row-reverse" : "row",
    gap: 8, alignItems: "flex-start",
    animation: "fadeUp 0.2s ease",
  }}>
    {msg.role === "assistant" && (
      <div style={{
        width: 24, height: 24, borderRadius: 5, flexShrink: 0,
        background: agent.accent + "15",
        border: `1px solid ${agent.accent}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, color: agent.accent, fontWeight: 800,
      }}>{agent.emoji}</div>
    )}
    <div style={{
      maxWidth: "78%", padding: "9px 13px",
      borderRadius: msg.role === "user" ? "8px 2px 8px 8px" : "2px 8px 8px 8px",
      background: msg.role === "user" ? "#0e0e1e" : "#090916",
      border: `1px solid ${msg.role === "user" ? "#181828" : agent.accent + "20"}`,
      fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-wrap", direction: "rtl",
      color: "#c8c8d8",
    }}>{msg.content}</div>
  </div>
);

// ─── Main App ───────────────────────────────────────────────
export default function App() {
  const [activeAgent, setActiveAgent]     = useState(AGENTS[0]);
  const [activeProject, setActiveProject] = useState(PROJECTS[0]);
  const [conversations, setConversations] = useState(
    Object.fromEntries(AGENTS.map(a => [a.id, []]))
  );
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [apiError, setApiError] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, loading, activeAgent]);

  const msgs = conversations[activeAgent.id];
  const totalQueries = Object.values(conversations)
    .reduce((s, c) => s + c.filter(m => m.role === "user").length, 0);

  const sendMessage = async (text) => {
    const t = (text || input).trim();
    if (!t || loading) return;
    setInput("");
    setLoading(true);
    setShowQuick(false);
    setApiError(false);

    // הוסף context פרויקט
    const contextualText = `[Project: ${activeProject.label}]\n${t}`;
    const userMsg = { role: "user", content: t }; // מציג בלי prefix
    const apiMsg  = { role: "user", content: contextualText };

    const history = [...conversations[activeAgent.id], userMsg];
    const apiHistory = [
      ...conversations[activeAgent.id],
      apiMsg,
    ];

    setConversations(p => ({ ...p, [activeAgent.id]: history }));

    try {
      const res = await fetch("/api/anthropic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: activeAgent.system,
          messages: apiHistory.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const reply = data.content?.map(b => b.text || "").join("") || "שגיאה בתגובה.";
      setConversations(p => ({
        ...p,
        [activeAgent.id]: [...history, { role: "assistant", content: reply }]
      }));
    } catch (err) {
      setApiError(true);
      setConversations(p => ({
        ...p,
        [activeAgent.id]: [...history, {
          role: "assistant",
          content: `⚠️ שגיאת חיבור: ${err.message}\n\nוודאי שה-API key תקין ב-.env`,
        }]
      }));
    }
    setLoading(false);
  };

  const clearConversation = () => {
    setConversations(p => ({ ...p, [activeAgent.id]: [] }));
    setShowQuick(true);
  };

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      height: "100vh", display: "flex",
      background: "#07070e", color: "#b0b0c8",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes pulse{0%,80%,100%{transform:scale(0.5);opacity:0.2}40%{transform:scale(1);opacity:1}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1a1a2a;border-radius:2px}
        textarea:focus{outline:none}
        .arow:hover{background:#0c0c18!important}
        .sbtn:hover:not(:disabled){filter:brightness(1.3)}
        .clr:hover{color:#888!important}
      `}</style>

      {/* ── Sidebar ── */}
      <div style={{
        width: sideCollapsed ? 44 : 200,
        background: "#080810",
        borderRight: "1px solid #111120",
        display: "flex", flexDirection: "column",
        transition: "width 0.18s", overflow: "hidden", flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          padding: sideCollapsed ? "14px 8px" : "14px 12px",
          borderBottom: "1px solid #111120",
          display: "flex", alignItems: "center",
          justifyContent: sideCollapsed ? "center" : "space-between",
        }}>
          {!sideCollapsed && (
            <div>
              <div style={{ fontSize: 8, color: "#1e1e30", letterSpacing: 3 }}>DEMOBOT2</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#eee" }}>AGENT TEAM</div>
            </div>
          )}
          <button onClick={() => setSideCollapsed(!sideCollapsed)} style={{
            background: "none", border: "none", color: "#2a2a40",
            cursor: "pointer", fontSize: 16, padding: 0,
          }}>{sideCollapsed ? "›" : "‹"}</button>
        </div>

        {/* Agents */}
        <div style={{ flex: 1, overflowY: "auto", paddingTop: 6 }}>
          {AGENTS.map(agent => {
            const active = agent.id === activeAgent.id;
            const cnt = conversations[agent.id].filter(m => m.role === "user").length;
            return (
              <div key={agent.id} className="arow" onClick={() => { setActiveAgent(agent); setShowQuick(msgs.length === 0); }}
                style={{
                  padding: sideCollapsed ? "9px 8px" : "8px 12px",
                  cursor: "pointer",
                  background: active ? "#0d0d1c" : "transparent",
                  borderRight: active ? `2px solid ${agent.accent}` : "2px solid transparent",
                  display: "flex", alignItems: "center",
                  gap: sideCollapsed ? 0 : 9,
                  justifyContent: sideCollapsed ? "center" : "flex-start",
                  position: "relative",
                }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 5, flexShrink: 0,
                  background: active ? agent.accent + "18" : "#0e0e18",
                  border: `1px solid ${active ? agent.accent + "45" : "#161626"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, color: active ? agent.accent : "#2a2a40", fontWeight: 700,
                }}>{agent.emoji}</div>
                {!sideCollapsed && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: active ? "#eee" : "#444", fontWeight: active ? 600 : 400 }}>{agent.name}</span>
                      {cnt > 0 && <span style={{ fontSize: 8, padding: "1px 4px", background: agent.accent+"18", color: agent.accent, borderRadius: 3, fontWeight: 700 }}>{cnt}</span>}
                    </div>
                    <div style={{ fontSize: 8, color: active ? agent.accent+"90" : "#222", letterSpacing: 1 }}>{agent.tag}</div>
                  </div>
                )}
                {sideCollapsed && cnt > 0 && (
                  <div style={{ position: "absolute", top: 5, right: 5, width: 5, height: 5, borderRadius: "50%", background: agent.accent }}/>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer stats */}
        {!sideCollapsed && (
          <div style={{ padding: "10px 12px", borderTop: "1px solid #111120" }}>
            <div style={{ fontSize: 8, color: "#181828", marginBottom: 5 }}>{totalQueries} QUERIES</div>
            <div style={{ display: "flex", gap: 3 }}>
              {[["FX","#39ff14"],["OPT","#00e5ff"],["ARB","#c77dff"]].map(([l,c])=>(
                <div key={l} style={{ fontSize: 7, padding: "2px 5px", borderRadius: 3, background: c+"12", color: c+"80", border: `1px solid ${c}20` }}>{l}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Main Panel ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Header */}
        <div style={{
          padding: "10px 18px",
          background: "#080810",
          borderBottom: `1px solid ${activeAgent.accent}18`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 7, flexShrink: 0,
            background: activeAgent.accent + "12",
            border: `1px solid ${activeAgent.accent}35`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, color: activeAgent.accent, fontWeight: 800,
          }}>{activeAgent.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 700, color: "#eee", fontSize: 13 }}>{activeAgent.name}</span>
              <span style={{ fontSize: 8, padding: "2px 6px", background: activeAgent.accent+"14", color: activeAgent.accent, borderRadius: 3, letterSpacing: 1.5, fontWeight: 700 }}>{activeAgent.tag}</span>
              <span style={{ fontSize: 10, color: "#2a2a40" }}>{activeAgent.role}</span>
            </div>
            <div style={{ fontSize: 9, color: "#1e1e30", marginTop: 1 }}>{activeAgent.description}</div>
          </div>

          {/* Project selector */}
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {PROJECTS.map(p => (
              <ProjectBadge key={p.id} project={p}
                active={activeProject.id === p.id}
                onClick={() => setActiveProject(p)}
              />
            ))}
          </div>

          {/* Clear button */}
          {msgs.length > 0 && (
            <button className="clr" onClick={clearConversation} style={{
              background: "none", border: "none", color: "#2a2a40",
              cursor: "pointer", fontSize: 10, fontFamily: "inherit",
              transition: "color 0.15s", whiteSpace: "nowrap",
            }}>נקה שיחה</button>
          )}
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Empty state + Quick Actions */}
          {msgs.length === 0 && (
            <div style={{ animation: "fadeUp 0.35s ease" }}>
              {/* Agent intro */}
              <div style={{ textAlign: "center", marginBottom: 28, paddingTop: 20 }}>
                <div style={{ fontSize: 26, color: activeAgent.accent+"30", marginBottom: 8 }}>{activeAgent.emoji}</div>
                <div style={{ fontSize: 12, color: "#2a2a3a" }}>{activeAgent.name} · {activeAgent.role}</div>
                <div style={{ fontSize: 10, color: "#161626", marginTop: 3 }}>{activeAgent.description}</div>
              </div>

              {/* Quick actions */}
              {showQuick && (
                <div>
                  <div style={{ fontSize: 9, color: "#1e1e30", letterSpacing: 2, marginBottom: 10, textAlign: "center" }}>
                    שאלות מהירות
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", maxWidth: 620, margin: "0 auto" }}>
                    {activeAgent.quickActions.map((qa, i) => (
                      <QuickBtn key={i} label={qa.label} accent={activeAgent.accent}
                        onClick={() => sendMessage(qa.prompt)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {msgs.map((msg, i) => (
            <Message key={i} msg={msg} agent={activeAgent} />
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", animation: "fadeUp 0.2s ease" }}>
              <div style={{
                width: 24, height: 24, borderRadius: 5,
                background: activeAgent.accent+"12",
                border: `1px solid ${activeAgent.accent}28`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, color: activeAgent.accent,
              }}>{activeAgent.emoji}</div>
              <div style={{
                padding: "10px 14px",
                background: "#090916",
                border: `1px solid ${activeAgent.accent}20`,
                borderRadius: "2px 8px 8px 8px",
              }}>
                <Dots color={activeAgent.accent} />
              </div>
            </div>
          )}

          {/* Quick actions after conversation starts */}
          {msgs.length > 0 && !loading && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {activeAgent.quickActions.slice(0, 3).map((qa, i) => (
                <QuickBtn key={i} label={qa.label} accent={activeAgent.accent}
                  onClick={() => sendMessage(qa.prompt)}
                />
              ))}
              {!showQuick && (
                <button onClick={() => setShowQuick(true)} style={{
                  padding: "6px 11px", borderRadius: 6, cursor: "pointer",
                  background: "transparent", border: `1px solid #1a1a2a`,
                  color: "#333", fontSize: 11, fontFamily: "inherit",
                }}>עוד ›</button>
              )}
            </div>
          )}

          {showQuick && msgs.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {activeAgent.quickActions.slice(3).map((qa, i) => (
                <QuickBtn key={i} label={qa.label} accent={activeAgent.accent}
                  onClick={() => sendMessage(qa.prompt)}
                />
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "12px 18px",
          background: "#080810",
          borderTop: `1px solid ${activeAgent.accent}14`,
          display: "flex", gap: 9, alignItems: "flex-end",
        }}>
          <div style={{ flex: 1, position: "relative" }}>
            {/* Project context indicator */}
            <div style={{
              position: "absolute", top: 8, left: 12,
              fontSize: 8, color: activeProject.color + "60",
              letterSpacing: 1, zIndex: 1,
            }}>{activeProject.label}</div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={`שאל/י את ${activeAgent.name}...`}
              rows={2}
              style={{
                width: "100%",
                background: "#0c0c1a",
                border: `1px solid ${activeAgent.accent}22`,
                borderRadius: 7,
                padding: "22px 13px 9px",
                color: "#b0b0c8",
                fontSize: 13,
                resize: "none",
                fontFamily: "inherit",
                lineHeight: 1.6,
                direction: "rtl",
                transition: "border-color 0.15s",
              }}
              onFocus={e => e.target.style.borderColor = activeAgent.accent+"55"}
              onBlur={e => e.target.style.borderColor = activeAgent.accent+"22"}
            />
          </div>
          <button className="sbtn" onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? "#0e0e1a" : activeAgent.accent+"18",
              color: loading || !input.trim() ? "#222" : activeAgent.accent,
              border: `1px solid ${loading || !input.trim() ? "#181828" : activeAgent.accent+"45"}`,
              borderRadius: 7, padding: "14px 16px",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              fontSize: 15, fontFamily: "inherit", fontWeight: 700,
              transition: "all 0.12s",
            }}>↑</button>
        </div>
      </div>
    </div>
  );
}
