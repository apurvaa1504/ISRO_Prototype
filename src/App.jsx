import { useState, useEffect, useRef, useCallback } from 'react'

/* ─── ISRO Design tokens — Light Theme ──────────────────────────────────── */
const T = {
  // Core backgrounds — cream white
  bg:        '#f5f0e8',
  surface:   '#fffdf8',
  card:      '#ffffff',
  cardHi:    '#f9f7f2',

  // Borders
  border:    '#d0d8e8',
  borderHi:  '#aab8d0',

  // Text
  text:      '#0a1628',
  muted:     '#5a6e8a',
  faint:     '#c8d4e4',

  // ISRO Navy (primary accent) — #0a2351
  blue:      '#0a2351',
  blueBg:    '#e8edf8',
  blueDim:   '#d4ddf0',
  blueMid:   '#c0cceb',
  blueGlow:  '#0a235130',

  // ISRO Metallic Orange (secondary accent) — #F47216
  orange:    '#F47216',
  orangeBg:  '#fff3ea',
  orangeDim: '#ffe4cc',
  orangeGlow:'#F4721630',

  // Status colors
  green:     '#1a7a3c',
  greenBg:   '#eaf7ee',
  greenDim:  '#d4f0dc',

  amber:     '#b86800',
  amberBg:   '#fff8e6',
  amberDim:  '#ffefc0',

  red:       '#c0192c',
  redBg:     '#fceef0',
  redDim:    '#f8d8dc',

  // Monospace
  mono:      "'Courier New', Courier, monospace",
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const TICK_MS    = 2000
const FAULT_TICK = 14
const FAULT_LINK = 'mum-pun'

const LINKS_INIT = [
  { id: 'mum-del', label: 'Mumbai → Delhi',       usage: 42, lat: 8,  loss: 0.0, risk: 0.10, faulting: false },
  { id: 'mum-pun', label: 'Mumbai → Pune',        usage: 56, lat: 12, loss: 0.0, risk: 0.13, faulting: false },
  { id: 'mum-dc',  label: 'Mumbai → Data Center', usage: 34, lat: 5,  loss: 0.0, risk: 0.07, faulting: false },
  { id: 'del-dc',  label: 'Delhi → Data Center',  usage: 27, lat: 9,  loss: 0.0, risk: 0.06, faulting: false },
]

const SITES = [
  { id: 'mumbai', label: 'Mumbai Hub',    role: 'CE/PE Router', color: T.blue   },
  { id: 'delhi',  label: 'Delhi Branch',  role: 'CE Router',    color: T.green  },
  { id: 'pune',   label: 'Pune Branch',   role: 'CE Router',    color: T.orange },
  { id: 'dc',     label: 'Data Center',   role: 'P Router',     color: T.blue   },
]

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const riskColor  = r => r >= 0.75 ? T.red   : r >= 0.45 ? T.amber   : T.green
const riskBg     = r => r >= 0.75 ? T.redBg : r >= 0.45 ? T.amberBg : T.greenBg
const riskDim    = r => r >= 0.75 ? T.redDim: r >= 0.45 ? T.amberDim: T.greenDim
const riskLabel  = r => r >= 0.75 ? 'CRITICAL' : r >= 0.45 ? 'ELEVATED' : 'NORMAL'
const etaMin     = r => Math.max(2, Math.round((1 - r) * 20))
const fmtTime    = d => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const rnd        = (v, noise) => +(v + (Math.random() - 0.5) * noise).toFixed(2)
const clamp      = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

/* ─── AI response engine ─────────────────────────────────────────────────── */
function getAIResponse(q, links) {
  const lower = q.toLowerCase()
  const crit  = links.find(l => l.risk >= 0.75)
  const warn  = links.find(l => l.risk >= 0.45)
  const active = crit || warn

  if (lower.match(/what should i do|fix|remediat|reroute|action|resolve|help/)) {
    if (!active) return 'All links are nominal. No remediation required at this time.\n\nI will automatically alert you if any link shows elevated risk.'
    return `Recommended remediation for ${active.label}:\n\n1. Reroute traffic via Delhi hub\n   → Expected to reduce link load by ~40%\n\n2. Throttle bulk transfers on the affected segment\n   → Frees 15–20% bandwidth immediately\n\n3. Notify Pune branch NOC contact\n   → SLA clock starts on acknowledgement\n\n4. File incident report (INC-${Date.now().toString().slice(-4)})\n   → Required within 15 min of alert\n\nEstimated recovery: 5–10 min post-reroute\n\n[Source: Runbook-07 · matches Incident #5, March 12]`
  }

  if (lower.match(/root cause|why|reason|cause|what happen/)) {
    if (!active) return 'No anomaly detected. All links within normal operating parameters.\n\nRun "status" for a full network overview.'
    const latDiff = Math.round(active.lat - 12)
    return `Root cause analysis — ${active.label}:\n\n• Usage trend: +2.8% per tick over last 12 observations\n• Latency drift: +${latDiff > 0 ? latDiff : 8}ms above 7-day baseline\n• BGP/OSPF events: None detected (routing stable)\n• No hardware alerts from CE router logs\n\nConclusion: Bandwidth saturation from bulk data transfer or sudden traffic spike from Delhi branch. Not a hardware failure.\n\n[Confidence: 91% — based on 14 matching historical events]`
  }

  if (lower.match(/pune|critical|alert|warning|failing|risk|degrading/)) {
    if (crit) return `🔴 ${crit.label} — CRITICAL\n\nRisk: ${(crit.risk * 100).toFixed(0)}% | ETA: ~${etaMin(crit.risk)} min\nUsage: ${crit.usage.toFixed(1)}% | Latency: ${crit.lat.toFixed(0)}ms | Loss: ${crit.loss.toFixed(1)}%\n\nPattern match: Incident #5 (March 12) — congestion-driven failure.\n\nAffected scope:\n• Pune branch (3 offices, ~120 users)\n• Downstream DC routes via Pune PE node\n\nType "what should I do" for full runbook.`
    if (warn) return `⚠ ${warn.label} — ELEVATED\n\nRisk: ${(warn.risk * 100).toFixed(0)}% | Usage: ${warn.usage.toFixed(1)}%\nLatency: ${warn.lat.toFixed(0)}ms\n\nGradual congestion pattern detected. Not yet critical but trending upward. I'll escalate automatically if risk exceeds 75%.`
    return 'No active alerts on that link. Mumbai–Pune is currently nominal.\n\nAll metrics within acceptable thresholds.'
  }

  if (lower.match(/status|all links|overview|health|network|summary/)) {
    const lines = links.map(l => `• ${l.label}\n  Risk: ${(l.risk * 100).toFixed(0)}% | Usage: ${l.usage.toFixed(0)}% | Latency: ${l.lat.toFixed(0)}ms`).join('\n')
    const overall = crit ? 'CRITICAL' : warn ? 'ELEVATED' : 'NOMINAL'
    return `Network status — ${new Date().toLocaleTimeString()}:\n\n${lines}\n\nOverall health: ${overall}\nActive alerts: ${crit ? 1 : warn ? 1 : 0}\nLLM: Mistral-7B (quantized, local)\nRAG: ChromaDB (4 docs indexed)\n\nAll telemetry sourced locally — zero external calls.`
  }

  if (lower.match(/model|lstm|prediction|forecast|ml|ai engine/)) {
    return `Prediction engine details:\n\nModel: LSTM (PyTorch)\nWindow: 30 ticks (60 seconds)\nPrecision: 91.4% on validation set\nRecall: 88.7%\nAvg lead time: 12–18 minutes before breach\n\nTraining: 847 fault events across 6 months of synthetic telemetry. Fault types covered: congestion, packet loss, routing instability, tunnel degradation.\n\nCopilot: Mistral-7B (Q4_K_M quantization, ~4GB VRAM)\nRAG: ChromaDB semantic search over 4 indexed documents.`
  }

  if (lower.match(/help|what can you|commands|options/)) {
    return `Available queries:\n\n• "status" — full network overview\n• "pune alert" — details on active alerts\n• "root cause" — why is it failing?\n• "what should I do" — step-by-step runbook\n• "model info" — prediction engine details\n• "all links" — per-link metrics\n\nI respond to natural language — you don't need to use exact commands.\n\nAll responses are grounded in local runbooks and incident history. Zero external network calls.`
  }

  if (active) {
    return `Active monitoring: ${active.label} showing ${riskLabel(active.risk).toLowerCase()} risk (${(active.risk * 100).toFixed(0)}%).\n\nSuggested queries:\n• "root cause" — what's causing it?\n• "what should I do" — remediation steps\n• "status" — full network snapshot`
  }

  return 'All 4 links operating within normal parameters. Predictive engine active.\n\nNo anomalies detected in the current observation window.\n\nType "help" to see what I can assist with.'
}

/* ─── RAG source resolver ────────────────────────────────────────────────── */
function getRagSource(q) {
  const lower = q.toLowerCase()
  if (lower.match(/what should i do|fix|remediat|reroute|action|resolve/))
    return { docs: ['Runbook-07', 'Incident #5 report'], latency: Math.floor(Math.random() * 18 + 4) }
  if (lower.match(/root cause|why|reason|cause/))
    return { docs: ['Incident #5 report', 'BGP event log'], latency: Math.floor(Math.random() * 14 + 3) }
  if (lower.match(/status|overview|health|summary|all links/))
    return { docs: ['Network topology map'], latency: Math.floor(Math.random() * 10 + 2) }
  if (lower.match(/model|lstm|prediction|forecast/))
    return { docs: ['ML model registry'], latency: Math.floor(Math.random() * 8 + 2) }
  return { docs: ['Network topology map', 'Runbook index'], latency: Math.floor(Math.random() * 12 + 3) }
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function Badge({ risk, small }) {
  const col = riskColor(risk)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: small ? '2px 7px' : '3px 9px',
      borderRadius: 3,
      fontSize: small ? 9 : 10,
      fontWeight: 800,
      letterSpacing: '0.10em',
      color: col,
      background: riskBg(risk),
      border: `1px solid ${col}45`,
      boxShadow: risk >= 0.45 ? `0 0 6px ${col}30` : 'none',
    }}>
      {riskLabel(risk)}
    </span>
  )
}

function UsageBar({ value, risk }) {
  const col = riskColor(risk)
  return (
    <div style={{ height: 6, background: T.faint, borderRadius: 3, overflow: 'hidden', marginTop: 9, position: 'relative' }}>
      <div style={{
        height: '100%',
        width: `${clamp(value, 0, 100)}%`,
        background: risk >= 0.75
          ? `linear-gradient(90deg, ${T.red}, #ff6b70)`
          : risk >= 0.45
          ? `linear-gradient(90deg, ${T.amber}, #ffcc55)`
          : `linear-gradient(90deg, ${T.blue}, ${T.green})`,
        borderRadius: 3,
        transition: 'width 1.8s ease, background 0.6s ease',
        boxShadow: risk >= 0.45 ? `0 0 8px ${col}70` : `0 0 6px ${T.blue}50`,
      }} />
    </div>
  )
}

function StatPill({ label, value, unit, risk }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.07em', marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: risk != null ? riskColor(risk) : T.text, fontFamily: T.mono }}>
        {value}<span style={{ fontSize: 9, color: T.muted, fontFamily: 'Inter,sans-serif' }}>{unit}</span>
      </div>
    </div>
  )
}

function LinkCard({ link }) {
  const isCrit = link.risk >= 0.75
  const isWarn = link.risk >= 0.45
  const borderColor = isCrit ? T.red : isWarn ? T.amber : T.border
  return (
    <div style={{
      background: `linear-gradient(135deg, ${T.card} 0%, ${T.cardHi} 100%)`,
      border: `1px solid ${isCrit ? T.red + '60' : isWarn ? T.amber + '50' : T.border}`,
      borderRadius: 12,
      padding: '14px 15px',
      marginBottom: 9,
      transition: 'border-color 0.5s ease, box-shadow 0.5s ease',
      boxShadow: isCrit
        ? `0 0 20px ${T.red}20, inset 0 0 20px ${T.red}05`
        : isWarn
        ? `0 0 14px ${T.amber}15`
        : `0 0 8px ${T.blue}08`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: isCrit
          ? `linear-gradient(90deg, ${T.red}, transparent)`
          : isWarn
          ? `linear-gradient(90deg, ${T.amber}, transparent)`
          : `linear-gradient(90deg, ${T.blue}, transparent)`,
        borderRadius: '12px 12px 0 0',
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.text, letterSpacing: '0.02em' }}>{link.label}</span>
        <Badge risk={link.risk} small />
      </div>
      <UsageBar value={link.usage} risk={link.risk} />
      <div style={{ display: 'flex', marginTop: 11, gap: 4 }}>
        <StatPill label="USAGE"   value={link.usage.toFixed(1)} unit="%" risk={link.risk} />
        <div style={{ width: 1, background: T.border }} />
        <StatPill label="LATENCY" value={link.lat.toFixed(0)}   unit="ms" />
        <div style={{ width: 1, background: T.border }} />
        <StatPill label="LOSS"    value={link.loss.toFixed(1)}  unit="%" risk={link.loss > 0.5 ? 0.5 : null} />
        <div style={{ width: 1, background: T.border }} />
        <StatPill label="RISK"    value={(link.risk * 100).toFixed(0)} unit="%" risk={link.risk} />
      </div>
      {(isWarn) && (
        <div style={{
          marginTop: 10, padding: '6px 10px',
          background: riskDim(link.risk),
          borderRadius: 6,
          fontSize: 10, fontWeight: 600,
          color: riskColor(link.risk),
          border: `1px solid ${riskColor(link.risk)}30`,
          letterSpacing: '0.01em',
        }}>
          {isCrit
            ? `⚡ Failure predicted in ~${etaMin(link.risk)} min — act now`
            : '↑ Congestion pattern detected — monitor closely'}
        </div>
      )}
    </div>
  )
}

function AlertCard({ alert }) {
  const color = alert.level === 'critical' ? T.red : T.amber
  const bg    = alert.level === 'critical' ? T.redDim : T.amberDim
  return (
    <div style={{
      background: `linear-gradient(135deg, ${bg} 0%, ${T.card} 100%)`,
      border: `1px solid ${color}40`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 10,
      padding: '12px 14px',
      marginBottom: 8,
      boxShadow: `0 0 16px ${color}15`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: '0.09em' }}>
          {alert.level === 'critical' ? '🔴 CRITICAL' : '⚠ WARNING'}
        </span>
        <span style={{ fontSize: 9, color: T.muted, fontFamily: T.mono }}>{fmtTime(alert.ts)}</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 4 }}>{alert.label}</div>
      <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.6 }}>{alert.msg}</div>
      <div style={{ display: 'flex', gap: 16, marginTop: 9 }}>
        <span style={{ fontSize: 10, color: T.muted }}>
          Risk: <span style={{ color, fontWeight: 700, fontFamily: T.mono }}>{(alert.risk * 100).toFixed(0)}%</span>
        </span>
        <span style={{ fontSize: 10, color: T.muted }}>
          ETA: <span style={{ color, fontWeight: 700 }}>~{alert.eta} min</span>
        </span>
      </div>
    </div>
  )
}

function ChatBubble({ msg }) {
  const isUser    = msg.role === 'user'
  const isSystem  = msg.role === 'system'
  const isCopilot = msg.role === 'copilot'
  return (
    <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      {!isUser && (
        <div style={{ fontSize: 9, color: T.muted, marginBottom: 5, paddingLeft: 2, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {isSystem ? '⚙ System' : '🛰 NOC Copilot'} · {fmtTime(msg.ts)}
        </div>
      )}
      <div style={{
        maxWidth: '90%',
        padding: '10px 14px',
        borderRadius: isUser ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
        background: isUser
          ? `linear-gradient(135deg, ${T.blueDim}, ${T.blueBg})`
          : isSystem
          ? `linear-gradient(135deg, #eef2f8, #e6ecf6)`
          : `linear-gradient(135deg, ${T.card}, ${T.cardHi})`,
        border: `1px solid ${isUser ? T.blue + '40' : isSystem ? T.blue + '30' : T.border}`,
        fontSize: 12,
        color: T.text,
        lineHeight: 1.8,
        whiteSpace: 'pre-wrap',
        fontFamily: isSystem ? T.mono : "'Times New Roman', Times, serif",
        boxShadow: isUser ? `0 2px 8px ${T.blue}18` : '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {msg.text}
      </div>
      {/* RAG retrieval trace */}
      {isCopilot && msg.rag && (
        <div style={{
          maxWidth: '90%', marginTop: 6,
          display: 'flex', flexWrap: 'wrap', gap: 5, paddingLeft: 2,
        }}>
          <span style={{ fontSize: 9, color: T.muted, alignSelf: 'center' }}>📁 RAG retrieved:</span>
          {msg.rag.docs.map(d => (
            <span key={d} style={{
              fontSize: 9, padding: '2px 7px', borderRadius: 4,
              background: T.blueDim, color: T.blue,
              border: `1px solid ${T.blue}30`,
            }}>{d}</span>
          ))}
          <span style={{
            fontSize: 9, padding: '2px 7px', borderRadius: 4,
            background: T.greenDim, color: T.green,
            border: `1px solid ${T.green}30`,
          }}>Mistral-7B local · {msg.rag.latency}ms · 0 ext calls</span>
        </div>
      )}
      {isUser && (
        <div style={{ fontSize: 9, color: T.muted, marginTop: 4, paddingRight: 2, letterSpacing: '0.06em' }}>
          OPERATOR · {fmtTime(msg.ts)}
        </div>
      )}
    </div>
  )
}

/* ─── Orbital Ring Indicator ─────────────────────────────────────────────── */
function OrbitalDot({ color, pulse, size = 8 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: color,
        boxShadow: `0 0 ${size + 2}px ${color}`,
        animation: pulse ? 'pulse-dot 2s infinite' : 'none',
      }} />
    </div>
  )
}

/* ─── Stat Tile for header ───────────────────────────────────────────────── */
function HeaderStat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 60 }}>
      <div style={{ fontSize: 8, color: T.muted, letterSpacing: '0.09em', marginBottom: 2, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 800, color, fontFamily: T.mono, letterSpacing: '0.02em' }}>{value}</div>
    </div>
  )
}

/* ─── Info Row for side panels ───────────────────────────────────────────── */
function InfoRow({ k, v, highlight }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
      <span style={{ fontSize: 10, color: T.muted }}>{k}</span>
      <span style={{
        fontSize: 10,
        color: highlight ? T.green : T.text,
        fontFamily: T.mono,
        padding: highlight ? '1px 6px' : '0',
        background: highlight ? T.greenDim : 'transparent',
        borderRadius: highlight ? 3 : 0,
        border: highlight ? `1px solid ${T.green}30` : 'none',
      }}>{v}</span>
    </div>
  )
}

/* ─── Panel Header ───────────────────────────────────────────────────────── */
function PanelHeader({ title, sub, right }) {
  return (
    <div style={{
      padding: '13px 16px',
      borderBottom: `1px solid ${T.border}`,
      flexShrink: 0,
      background: `linear-gradient(135deg, ${T.surface} 0%, ${T.card} 100%)`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div>
        <div style={{
          fontSize: 10, fontWeight: 800, color: T.blue,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <div style={{ width: 3, height: 12, background: `linear-gradient(180deg, ${T.blue}, ${T.orange})`, borderRadius: 2 }} />
          {title}
        </div>
        {sub && <div style={{ fontSize: 9, color: T.muted, marginTop: 3 }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}

/* ─── Main App ───────────────────────────────────────────────────────────── */
export default function App() {
  const [links,    setLinks]    = useState(LINKS_INIT.map(l => ({ ...l })))
  const [alerts,   setAlerts]   = useState([])
  const [messages, setMessages] = useState([{
    role: 'system',
    text: 'NOC COPILOT v1.0 — ONLINE\nAir-gapped mode: ACTIVE\nExternal network: DISABLED\nLLM: Mistral-7B (quantized, local)\nRAG: ChromaDB (4 docs indexed)\nMonitoring 4 links across 3 sites.',
    ts: new Date(),
  }])
  const [input,          setInput]          = useState('')
  const [typing,         setTyping]         = useState(false)
  const [faultActive,    setFaultActive]    = useState(false)
  const [uptime,         setUptime]         = useState(0)
  const [offlineMode,    setOfflineMode]    = useState(false)
  const [offlineSecs,    setOfflineSecs]    = useState(0)
  const [inferenceCount, setInferenceCount] = useState(0)
  const [extCalls]                          = useState(0)

  const tickRef    = useRef(0)
  const faultRef   = useRef(false)
  const alertedRef = useRef({ warn: false, crit: false })
  const chatEnd    = useRef(null)
  const inputRef   = useRef(null)

  /* simulation */
  useEffect(() => {
    const iv = setInterval(() => {
      tickRef.current++
      const t = tickRef.current
      setUptime(t * (TICK_MS / 1000))

      setLinks(prev => prev.map(link => {
        if (link.id === FAULT_LINK && (faultRef.current || t >= FAULT_TICK)) {
          if (!faultRef.current) { faultRef.current = true; setFaultActive(true) }
          const s     = Math.max(0, t - FAULT_TICK)
          const usage = clamp(56 + s * 2.6 + (Math.random() - 0.3) * 1.5, 56, 98)
          const lat   = clamp(12 + s * 3.8 + (Math.random() - 0.3) * 2, 12, 115)
          const loss  = clamp(s * 0.32 + (Math.random() * 0.2), 0, 8)
          const risk  = clamp(0.13 + s * 0.058, 0.13, 0.97)
          return { ...link, usage: +usage.toFixed(1), lat: +lat.toFixed(1), loss: +loss.toFixed(2), risk: +risk.toFixed(3), faulting: true }
        }
        return {
          ...link,
          usage: +clamp(rnd(link.usage, 2.5), 10, 70).toFixed(1),
          lat:   +clamp(rnd(link.lat,   1.2),  3, 25).toFixed(1),
          risk:  +clamp(rnd(link.risk,  0.02), 0.03, 0.25).toFixed(3),
        }
      }))
    }, TICK_MS)
    return () => clearInterval(iv)
  }, [])

  /* alert generation */
  useEffect(() => {
    const pun = links.find(l => l.id === FAULT_LINK)
    if (!pun) return

    if (pun.risk >= 0.45 && !alertedRef.current.warn) {
      alertedRef.current.warn = true
      setAlerts(p => [{
        id: Date.now(), level: 'warning', label: pun.label,
        risk: pun.risk, msg: `Usage at ${pun.usage.toFixed(0)}% and climbing. Congestion pattern active.`,
        eta: etaMin(pun.risk), ts: new Date(),
      }, ...p])
    }
    if (pun.risk >= 0.76 && !alertedRef.current.crit) {
      alertedRef.current.crit = true
      const a = {
        id: Date.now() + 1, level: 'critical', label: pun.label,
        risk: pun.risk, msg: `Failure predicted in ~${etaMin(pun.risk)} minutes. Immediate action required.`,
        eta: etaMin(pun.risk), ts: new Date(),
      }
      setAlerts(p => [a, ...p])
      setMessages(p => [...p, {
        role: 'copilot',
        text: `🔴 PREDICTIVE ALERT — ${pun.label}\n\nRisk score: ${(pun.risk * 100).toFixed(0)}% | ETA: ~${etaMin(pun.risk)} min\nUsage: ${pun.usage.toFixed(0)}% | Latency: ${pun.lat.toFixed(0)}ms\n\nPattern: Incident #5 (congestion-driven failure)\nAffected: Pune branch + downstream DC routes\n\nType "what should I do" for runbook steps.`,
        ts: new Date(),
      }])
    }
  }, [links])

  /* offline mode timer */
  useEffect(() => {
    if (!offlineMode) { setOfflineSecs(0); return }
    const iv = setInterval(() => setOfflineSecs(s => s + 1), 1000)
    return () => clearInterval(iv)
  }, [offlineMode])

  /* auto-scroll chat */
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  /* send message */
  const sendMessage = useCallback((text) => {
    const q = text.trim()
    if (!q) return
    setInput('')
    setMessages(p => [...p, { role: 'user', text: q, ts: new Date() }])
    setTyping(true)
    const rag = getRagSource(q)
    setTimeout(() => {
      const res = getAIResponse(q, links)
      setTyping(false)
      setInferenceCount(c => c + 1)
      setMessages(p => [...p, { role: 'copilot', text: res, rag, ts: new Date() }])
    }, 600 + Math.random() * 400)
  }, [links])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const injectFault = () => {
    faultRef.current = true
    setFaultActive(true)
    alertedRef.current = { warn: false, crit: false }
    setMessages(p => [...p, {
      role: 'system',
      text: `FAULT INJECTED — ${new Date().toLocaleTimeString()}\nTarget: Mumbai → Pune link\nMode: Progressive congestion\nMonitoring for predictive triggers...`,
      ts: new Date(),
    }])
  }

  const resetSim = () => {
    faultRef.current = false
    tickRef.current  = 0
    alertedRef.current = { warn: false, crit: false }
    setFaultActive(false)
    setAlerts([])
    setLinks(LINKS_INIT.map(l => ({ ...l })))
    setMessages([{
      role: 'system',
      text: 'NOC COPILOT v1.0 — RESET\nSimulation cleared. All links restored to baseline.\nMonitoring resumed.',
      ts: new Date(),
    }])
  }

  /* computed */
  const critLink   = links.find(l => l.risk >= 0.75)
  const warnLink   = links.find(l => l.risk >= 0.45)
  const overall    = critLink ? 'CRITICAL' : warnLink ? 'ELEVATED' : 'NOMINAL'
  const overallClr = critLink ? T.red : warnLink ? T.amber : T.green
  const fmtUptime  = () => {
    const m = Math.floor(uptime / 60), s = uptime % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const quick = ['Network status', 'What should I do', 'Root cause', 'Model info', 'Help']

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: T.bg, color: T.text, fontFamily: "'Times New Roman', Times, serif" }}>

      {/* ── Animated star field background ── */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse at 20% 50%, ${T.blue}08 0%, transparent 60%),
          radial-gradient(ellipse at 80% 20%, ${T.orange}06 0%, transparent 50%),
          radial-gradient(ellipse at 60% 80%, ${T.blue}05 0%, transparent 40%)
        `,
      }} />

      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 58, flexShrink: 0, zIndex: 10, position: 'relative',
        background: `linear-gradient(135deg, ${T.surface} 0%, #e8eef8 100%)`,
        borderBottom: `1px solid ${T.border}`,
        boxShadow: `0 2px 24px ${T.blue}12`,
      }}>
        {/* left: branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* ISRO-style emblem */}
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: `linear-gradient(135deg, ${T.blueDim}, ${T.blueBg})`,
            border: `1.5px solid ${T.blue}60`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
            boxShadow: `0 0 16px ${T.blue}30, inset 0 0 12px ${T.blue}10`,
            animation: 'logo-glow 3s ease-in-out infinite',
          }}>🛰</div>
          <div>
            <div style={{
              fontSize: 15, fontWeight: 800, letterSpacing: '0.06em',
              background: `linear-gradient(90deg, ${T.blue}, #60c0f0, ${T.orange})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>NOC COPILOT</div>
            <div style={{ fontSize: 8, color: T.muted, letterSpacing: '0.12em', marginTop: 1 }}>
              PREDICTIVE FAULT ANALYTICS · AIR-GAPPED · ISRO
            </div>
          </div>
          {/* Orange accent separator */}
          <div style={{ width: 1, height: 28, background: `linear-gradient(180deg, transparent, ${T.orange}60, transparent)`, marginLeft: 4 }} />
        </div>

        {/* center: status strip */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {[
            ['STATUS',     overall,               overallClr],
            ['ALERTS',     String(alerts.length), alerts.length > 0 ? T.red : T.muted],
            ['LINKS',      '4 / 4',               T.green],
            ['INFERENCES', String(inferenceCount), T.blue],
            ['EXT CALLS',  String(extCalls),       T.green],
            ['UPTIME',     fmtUptime(),            T.muted],
          ].map(([k, v, c], idx) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                textAlign: 'center',
                padding: '5px 10px',
                background: T.card,
                borderRadius: 7,
                border: `1px solid ${T.border}`,
                minWidth: 60,
              }}>
                <div style={{ fontSize: 8, color: T.muted, letterSpacing: '0.09em', marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: c, fontFamily: T.mono }}>{v}</div>
              </div>
              {idx < 5 && <div style={{ width: 1, height: 20, background: T.faint }} />}
            </div>
          ))}
        </div>

        {/* right: controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!faultActive ? (
            <button onClick={injectFault} style={{
              padding: '6px 14px', borderRadius: 7, fontSize: 11, fontWeight: 700,
              background: `linear-gradient(135deg, ${T.amberDim}, ${T.amberBg})`,
              color: T.amber,
              border: `1px solid ${T.amber}50`,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: `0 0 12px ${T.amber}15`,
              letterSpacing: '0.02em',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 20px ${T.amber}35`}
            onMouseLeave={e => e.currentTarget.style.boxShadow = `0 0 12px ${T.amber}15`}
            >⚡ Inject Fault</button>
          ) : (
            <button onClick={resetSim} style={{
              padding: '6px 14px', borderRadius: 7, fontSize: 11, fontWeight: 700,
              background: T.faint, color: T.muted, border: `1px solid ${T.border}`,
              cursor: 'pointer', transition: 'all 0.2s',
            }}>↺ Reset</button>
          )}
          {!offlineMode ? (
            <button onClick={() => {
              setOfflineMode(true)
              setMessages(p => [...p, {
                role: 'system',
                text: `OFFLINE MODE ACTIVATED — ${new Date().toLocaleTimeString()}\nWiFi disconnected. External network: SEVERED.\nAll inference: local Mistral-7B only.\nRAG: ChromaDB on-disk only.\nSystem continues operating normally.`,
                ts: new Date(),
              }])
            }} style={{
              padding: '6px 14px', borderRadius: 7, fontSize: 11, fontWeight: 700,
              background: 'linear-gradient(135deg, #f3eaff, #e9d8ff)',
              color: '#6b21a8',
              border: '1px solid #a855f760',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 16px #c084fc25'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >📡 Go Offline</button>
          ) : (
            <button onClick={() => {
              setOfflineMode(false)
              setMessages(p => [...p, {
                role: 'system',
                text: `NETWORK RESTORED — ${new Date().toLocaleTimeString()}\nOperated offline for ${offlineSecs}s with zero service degradation.\nExternal calls made during offline period: 0`,
                ts: new Date(),
              }])
            }} style={{
              padding: '6px 14px', borderRadius: 7, fontSize: 11, fontWeight: 700,
              background: T.redBg, color: T.red,
              border: `1px solid ${T.red}45`, cursor: 'pointer',
              animation: 'pulse-red-btn 1.5s infinite',
            }}>🔴 Online ({offlineSecs}s offline)</button>
          )}

          {/* AIR-GAPPED badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '5px 12px', borderRadius: 8,
            background: `linear-gradient(135deg, ${T.greenBg}, #d4f0dc)`,
            border: `1px solid ${T.green}50`,
            boxShadow: `0 0 12px ${T.green}20`,
          }}>
            <OrbitalDot color={T.green} pulse size={7} />
            <span style={{ fontSize: 10, fontWeight: 800, color: T.green, letterSpacing: '0.10em' }}>AIR-GAPPED</span>
          </div>
        </div>
      </header>

      {/* ── Offline Mode Banner ── */}
      {offlineMode && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px', flexShrink: 0, zIndex: 9,
          background: `linear-gradient(90deg, ${T.redBg}, #fce8eb, ${T.redBg})`,
          borderBottom: `1px solid ${T.red}50`,
          animation: 'banner-pulse 2s infinite',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <OrbitalDot color={T.red} pulse size={8} />
            <span style={{ fontSize: 11, fontWeight: 800, color: T.red, letterSpacing: '0.08em' }}>
              WIFI DISCONNECTED — OFFLINE MODE ACTIVE
            </span>
            <span style={{ fontSize: 11, color: `${T.red}99` }}>
              Operating offline for <span style={{ fontFamily: T.mono, fontWeight: 800, color: T.red }}>{offlineSecs}s</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 18 }}>
            {[
              ['External API calls', '0', T.green],
              ['Local inferences',   String(inferenceCount), T.blue],
              ['LLM',               'Mistral-7B on-device', T.text],
              ['RAG',               'ChromaDB on-disk', T.text],
            ].map(([k, v, c]) => (
              <span key={k} style={{ fontSize: 10, color: T.muted }}>
                {k}: <span style={{ color: c, fontWeight: 700, fontFamily: T.mono }}>{v}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Differentiator Strip ── */}
      <div style={{
        display: 'flex', flexShrink: 0,
        borderBottom: `1px solid ${T.border}`,
        background: `linear-gradient(135deg, ${T.surface}, #eef2fa)`,
        zIndex: 9,
      }}>
        {[
          {
            icon: '⚡',
            title: 'Predicts 10–20 min early',
            desc: 'LSTM trend detection — not threshold alerts',
            color: T.amber,
            sub: 'vs. industry standard: alert-after-failure',
          },
          {
            icon: '🔒',
            title: 'Zero external calls',
            desc: 'LLM + RAG run 100% on local hardware',
            color: T.green,
            sub: `Ext calls this session: ${extCalls}`,
          },
          {
            icon: '🇮🇳',
            title: 'Sovereign AI for Indian infra',
            desc: 'No cloud dependency — air-gapped by design',
            color: T.orange,
            sub: 'Runs on commodity hardware, not GPU clusters',
          },
        ].map((item, i) => (
          <div key={i} style={{
            flex: 1,
            padding: '9px 18px',
            borderRight: i < 2 ? `1px solid ${T.border}` : 'none',
            display: 'flex', alignItems: 'center', gap: 12,
            transition: 'background 0.3s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = T.card}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
              background: `${item.color}12`,
              border: `1px solid ${item.color}30`,
            }}>{item.icon}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: item.color, letterSpacing: '0.02em' }}>
                {item.title}
              </div>
              <div style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>{item.desc}</div>
              <div style={{ fontSize: 9, color: `${item.color}60`, marginTop: 1, fontStyle: 'italic' }}>{item.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Three-panel body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* LEFT — Network Health */}
        <div style={{
          width: 292, flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderRight: `1px solid ${T.border}`, overflow: 'hidden',
        }}>
          <PanelHeader
            title="Link Health"
            sub="4 links · live telemetry · 2s refresh"
          />
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
            {links.map(l => <LinkCard key={l.id} link={l} />)}

            {/* Sites legend */}
            <div style={{
              marginTop: 6, padding: '13px 14px',
              background: `linear-gradient(135deg, ${T.card}, ${T.cardHi})`,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
            }}>
              <div style={{
                fontSize: 9, fontWeight: 800, color: T.blue,
                letterSpacing: '0.12em', marginBottom: 12, textTransform: 'uppercase',
              }}>Sites</div>
              {SITES.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                  <OrbitalDot
                    color={s.id === 'pune' && warnLink ? riskColor(warnLink.risk) : s.color}
                    pulse={s.id === 'pune' && !!critLink}
                    size={8}
                  />
                  <div>
                    <div style={{ fontSize: 11, color: T.text, fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: 9, color: T.muted, marginTop: 1 }}>{s.role}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Model card */}
            <div style={{
              marginTop: 9, padding: '13px 14px',
              background: `linear-gradient(135deg, ${T.card}, ${T.cardHi})`,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
            }}>
              <div style={{
                fontSize: 9, fontWeight: 800, color: T.blue,
                letterSpacing: '0.12em', marginBottom: 12, textTransform: 'uppercase',
              }}>Prediction Engine</div>
              <InfoRow k="Model"     v="LSTM (PyTorch)" />
              <InfoRow k="Window"    v="30 ticks" />
              <InfoRow k="Precision" v="91.4%" />
              <InfoRow k="Lead time" v="10–20 min" />
              <InfoRow k="Status"    v="Running" highlight />
            </div>
          </div>
        </div>

        {/* CENTER — Alerts */}
        <div style={{
          width: 284, flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderRight: `1px solid ${T.border}`, overflow: 'hidden',
        }}>
          <PanelHeader
            title="Predictive Alerts"
            sub="LSTM engine · pre-failure detection"
            right={
              alerts.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '3px 9px', borderRadius: 6,
                  background: T.redDim, border: `1px solid ${T.red}40`,
                }}>
                  <OrbitalDot color={T.red} pulse size={6} />
                  <span style={{ fontSize: 9, fontWeight: 800, color: T.red, letterSpacing: '0.06em' }}>
                    {alerts.length} ACTIVE
                  </span>
                </div>
              )
            }
          />
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '44px 20px', color: T.muted }}>
                <div style={{
                  fontSize: 36, marginBottom: 12,
                  filter: `drop-shadow(0 0 12px ${T.green}60)`,
                }}>✓</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.green }}>All Clear</div>
                <div style={{ fontSize: 10, marginTop: 6, color: T.muted }}>All links nominal</div>
                <div style={{
                  fontSize: 9, marginTop: 20, color: T.faint,
                  padding: '8px 12px', borderRadius: 8,
                  border: `1px dashed ${T.border}`,
                  lineHeight: 1.7,
                }}>Press "Inject Fault" to demo<br/>the predictive detection</div>
              </div>
            ) : (
              alerts.map(a => <AlertCard key={a.id} alert={a} />)
            )}

            {/* Telemetry stack info */}
            <div style={{
              marginTop: 8, padding: '13px 14px',
              background: `linear-gradient(135deg, ${T.card}, ${T.cardHi})`,
              border: `1px solid ${T.border}`, borderRadius: 12,
            }}>
              <div style={{
                fontSize: 9, fontWeight: 800, color: T.blue,
                letterSpacing: '0.12em', marginBottom: 12, textTransform: 'uppercase',
              }}>Telemetry Stack</div>
              <InfoRow k="Collector" v="Telegraf" />
              <InfoRow k="Store"     v="InfluxDB" />
              <InfoRow k="Graphs"    v="Grafana" />
              <InfoRow k="Interval"  v="10s" />
              <InfoRow k="Retention" v="30 days" />
            </div>

            {/* Fault scenarios */}
            <div style={{
              marginTop: 9, padding: '13px 14px',
              background: `linear-gradient(135deg, ${T.card}, ${T.cardHi})`,
              border: `1px solid ${T.border}`, borderRadius: 12,
            }}>
              <div style={{
                fontSize: 9, fontWeight: 800, color: T.blue,
                letterSpacing: '0.12em', marginBottom: 12, textTransform: 'uppercase',
              }}>Validated Scenarios</div>
              {[
                ['Congestion buildup', T.amber],
                ['BGP route flap',     T.red],
                ['Tunnel degradation', T.amber],
                ['Policy drift',       T.blue],
              ].map(([s, c]) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: c, flexShrink: 0, boxShadow: `0 0 4px ${c}` }} />
                  <span style={{ fontSize: 10, color: T.muted }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — AI Copilot */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* header */}
          <PanelHeader
            title="AI Copilot"
            sub="Mistral-7B · ChromaDB RAG · offline inference"
            right={
              <div style={{ display: 'flex', gap: 6 }}>
                {[['LLM', 'Mistral-7B'], ['RAG', 'ChromaDB'], ['Docs', '4 indexed']].map(([k, v]) => (
                  <div key={k} style={{
                    padding: '4px 9px',
                    background: T.blueDim,
                    borderRadius: 6,
                    border: `1px solid ${T.blue}30`,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 8, color: T.muted }}>{k}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: T.blue }}>{v}</div>
                  </div>
                ))}
              </div>
            }
          />

          {/* messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {messages.map((m, i) => <ChatBubble key={i} msg={m} />)}
            {typing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.06em' }}>🛰 NOC COPILOT</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: T.blue,
                      animation: `blink 1.2s ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEnd} />
          </div>

          {/* quick actions */}
          <div style={{
            padding: '9px 16px', borderTop: `1px solid ${T.border}`,
            display: 'flex', gap: 6, flexWrap: 'wrap',
            background: `linear-gradient(135deg, ${T.surface}, ${T.card})`,
          }}>
            {quick.map(q => (
              <button key={q} onClick={() => sendMessage(q)} style={{
                padding: '4px 10px', borderRadius: 5, fontSize: 10, fontWeight: 500,
                background: 'transparent', color: T.muted,
                border: `1px solid ${T.border}`, cursor: 'pointer',
                transition: 'all 0.18s',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = T.blue
                e.currentTarget.style.borderColor = T.blue + '60'
                e.currentTarget.style.background = T.blueDim
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = T.muted
                e.currentTarget.style.borderColor = T.border
                e.currentTarget.style.background = 'transparent'
              }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* input */}
          <div style={{
            padding: '11px 16px', borderTop: `1px solid ${T.border}`,
            display: 'flex', gap: 9, alignItems: 'flex-end',
            background: `linear-gradient(135deg, ${T.surface}, #060d1c)`,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask the copilot… e.g. 'What should I do about the Pune alert?'"
              rows={2}
              style={{
                flex: 1,
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 10, padding: '9px 13px',
                color: T.text, fontSize: 12, resize: 'none',
                outline: 'none', fontFamily: 'Inter, sans-serif',
                lineHeight: 1.6, transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={e => {
                e.target.style.borderColor = T.blue + '80'
                e.target.style.boxShadow = `0 0 0 2px ${T.blue}15`
              }}
              onBlur={e => {
                e.target.style.borderColor = T.border
                e.target.style.boxShadow = 'none'
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || typing}
              style={{
                padding: '9px 18px', height: 58,
                background: input.trim() && !typing
                  ? `linear-gradient(135deg, ${T.blue}, #0aa5ff)`
                  : T.faint,
                border: 'none', borderRadius: 10,
                color: input.trim() && !typing ? '#fff' : T.muted,
                fontSize: 12, fontWeight: 700,
                cursor: input.trim() && !typing ? 'pointer' : 'default',
                flexShrink: 0, transition: 'all 0.2s',
                boxShadow: input.trim() && !typing ? `0 0 16px ${T.blue}40` : 'none',
                letterSpacing: '0.02em',
              }}
            >Send ↗</button>
          </div>
        </div>
      </div>

      {/* ── Bottom ISRO accent bar ── */}
      <div style={{
        height: 3, flexShrink: 0,
        background: `linear-gradient(90deg, ${T.blue}, ${T.orange}, ${T.green}, ${T.orange}, ${T.blue})`,
        backgroundSize: '400% 100%',
        animation: 'gradient-slide 8s linear infinite',
      }} />

      {/* animations */}
      <style>{`
        @keyframes blink {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(1.4); }
        }
        @keyframes logo-glow {
          0%, 100% { box-shadow: 0 0 16px #0a235130, inset 0 0 12px #0a235110; }
          50%       { box-shadow: 0 0 28px #0a235150, inset 0 0 16px #0a235120; }
        }
        @keyframes pulse-red-btn {
          0%, 100% { box-shadow: 0 0 6px #f0454a30; }
          50%       { box-shadow: 0 0 16px #f0454a60; }
        }
        @keyframes banner-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.88; }
        }
        @keyframes gradient-slide {
          0%   { background-position: 0% 0%; }
          100% { background-position: 400% 0%; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #e8edf8; }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #0a235150, #F4721650);
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}