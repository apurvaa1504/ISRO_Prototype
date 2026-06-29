import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Dna,
  Lock,
  MessageSquare,
  Network,
  RefreshCw,
  Rocket,
  Send,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Wifi,
  WifiOff,
  Zap,
  MapPin
} from 'lucide-react'

/* ─── PRISM Design tokens — Cool Blue-Gray Theme ─────────────────────────── */
const T = {
  bg:        '#F8FAFC',
  surface:   '#FFFFFF',
  card:      '#FFFFFF',
  cardHi:    '#F1F5F9',
  border:    '#E2E8F0',
  borderHi:  '#CBD5E1',
  text:      '#1E293B',
  muted:     '#64748B',
  faint:     '#E2E8F0',

  // Deep blue (primary accent)
  blue:      '#1E40AF',
  blueBg:    '#F0F4FF',
  blueDim:   '#DBEAFE',
  blueMid:   '#BFDBFE',
  blueGlow:  'rgba(30, 64, 175, 0.05)',

  // Status colors - keep exactly as they are
  green:     '#22C55E',
  greenBg:   '#DCFCE7',
  greenDim:  '#F0FDF4',

  amber:     '#F59E0B',
  amberBg:   '#FEF3C7',
  amberDim:  '#FFFBEB',

  red:       '#EF4444',
  redBg:     '#FEE2E2',
  redDim:    '#FEF2F2',

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
  { id: 'pune',   label: 'Pune Branch',   role: 'CE Router',    color: T.amber },
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
    if (crit) return `🔴 ${crit.label} — CRITICAL\n\nRisk: ${(crit.risk * 100).toFixed(0)}% | ETA: ~${etaMin(crit.risk)} min\nUsage: ${crit.usage.toFixed(1)}% | Latency: ${crit.lat.toFixed(0)}ms | Loss: ${crit.loss.toFixed(1)}%\n\nPattern match: Incident #5 (congestion-driven failure).\n\nAffected scope:\n• Pune branch (3 offices, ~120 users)\n• Downstream DC routes via Pune PE node\n\nType "what should I do" for full runbook.`
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

function OrbitalDot({ color, pulse, size = 8 }) {
  return (
    <span style={{
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      flexShrink: 0,
      animation: pulse ? 'pulse-dot 1.4s ease-in-out infinite' : 'none',
    }} />
  )
}

function Badge({ risk, small }) {
  const col = riskColor(risk)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: small ? '2px 7px' : '3px 9px',
      borderRadius: 3,
      fontSize: small ? 9 : 10,
      fontWeight: 700,
      letterSpacing: '0.10em',
      color: col,
      background: riskBg(risk),
      border: `1px solid ${col}45`,
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
        background: col,
        borderRadius: 3,
        transition: 'width 1.8s ease, background 0.6s ease',
      }} />
    </div>
  )
}

function StatPill({ label, value, unit, risk }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#64748B', letterSpacing: '1px', marginBottom: 4, textTransform: 'uppercase', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: risk != null ? riskColor(risk) : '#1E293B' }}>
        {value}<span style={{ fontSize: 9, color: '#64748B', fontWeight: 400, marginLeft: 1 }}>{unit}</span>
      </div>
    </div>
  )
}

function LinkCard({ link, appState }) {
  const isCrit = link.risk >= 0.75
  const isWarn = link.risk >= 0.45
  
  // Check if this is the Mumbai-Pune link in State 2
  const isMumPunState2 = link.id === 'mum-pun' && appState === 2;
  
  const cardBg = isMumPunState2 ? '#FEF2F2' : '#FFFFFF';
  const borderStyle = isMumPunState2 
    ? '3px solid #EF4444' 
    : `1px solid ${isCrit ? '#EF4444' : isWarn ? '#F59E0B' : '#E2E8F0'}`;
    
  return (
    <div style={{
      background: cardBg,
      border: borderStyle,
      borderRadius: 12,
      padding: '14px 15px',
      marginBottom: 9,
      transition: 'all 0.4s ease',
      boxShadow: isMumPunState2 
        ? '0 4px 12px rgba(239, 68, 68, 0.08)' 
        : '0 1px 3px rgba(0,0,0,0.02)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top accent bar if not Mumbai-Pune State 2 */}
      {!isMumPunState2 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: isCrit ? '#EF4444' : isWarn ? '#F59E0B' : '#1E40AF',
          borderRadius: '12px 12px 0 0',
        }} />
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
          {isMumPunState2 && (
            <span className="blinking-dot" style={{
              width: 8, height: 8, borderRadius: '50%', background: '#EF4444', display: 'inline-block'
            }} />
          )}
          {link.label}
        </span>
        <Badge risk={isMumPunState2 ? 0.87 : link.risk} small />
      </div>
      
      <UsageBar value={isMumPunState2 ? 97 : link.usage} risk={isMumPunState2 ? 0.87 : link.risk} />
      
      <div style={{ display: 'flex', marginTop: 11, gap: 4 }}>
        <StatPill label="USAGE"   value={isMumPunState2 ? "97.0" : link.usage.toFixed(1)} unit="%" />
        <div style={{ width: 1, background: '#E2E8F0' }} />
        <StatPill label="LATENCY" value={isMumPunState2 ? "67" : link.lat.toFixed(0)}   unit="ms" />
        <div style={{ width: 1, background: '#E2E8F0' }} />
        <StatPill label="LOSS"    value={isMumPunState2 ? "4.8" : link.loss.toFixed(1)}  unit="%" risk={link.loss > 0.5 ? 0.5 : null} />
        <div style={{ width: 1, background: '#E2E8F0' }} />
        <StatPill label="RISK"    value={isMumPunState2 ? "87" : (link.risk * 100).toFixed(0)} unit="%" risk={isMumPunState2 ? 0.87 : link.risk} />
      </div>
      
      {isWarn && !isMumPunState2 && (
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
  return (
    <div style={{
      background: '#FFFFFF',
      border: `1px solid ${T.border}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 10,
      padding: '12px 14px',
      marginBottom: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.09em', display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertTriangle size={10} />
          {alert.level === 'critical' ? 'CRITICAL' : 'WARNING'}
        </span>
        <span style={{ fontSize: 9, color: T.muted, fontFamily: T.mono }}>{fmtTime(alert.ts)}</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 4 }}>{alert.label}</div>
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
        <div style={{ fontSize: 9, color: T.muted, marginBottom: 5, paddingLeft: 2, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
          {isSystem ? <Server size={10} /> : <Shield size={10} />}
          {isSystem ? 'System' : 'PRISM Copilot'} · {fmtTime(msg.ts)}
        </div>
      )}
      <div style={{
        maxWidth: '90%',
        padding: '10px 14px',
        borderRadius: isUser ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
        background: isUser
          ? T.blue
          : isSystem
          ? '#F1F5F9'
          : '#F0F4FF',
        border: isCopilot ? 'none' : `1px solid ${T.border}`,
        borderLeft: isCopilot ? `3px solid ${T.blue}` : undefined,
        fontSize: 12,
        color: isUser ? '#FFFFFF' : T.text,
        lineHeight: 1.8,
        whiteSpace: 'pre-wrap',
        fontFamily: 'Inter, sans-serif',
        boxShadow: isUser ? '0 2px 8px rgba(30, 64, 175, 0.15)' : '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        {msg.text}
      </div>
      
      {/* Source tags */}
      {isCopilot && msg.sourceTags && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {msg.sourceTags.map(tag => (
            <span key={tag} style={{
              fontSize: 9, padding: '2px 8px', borderRadius: 4,
              background: '#EFF6FF', color: '#1E40AF',
              border: '1px solid #BFDBFE', fontWeight: 500
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* RAG trace (for non-hardcoded messages) */}
      {isCopilot && !msg.sourceTags && msg.rag && (
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

      {/* Feedback buttons */}
      {isCopilot && msg.showFeedback && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#64748B' }}>Was this helpful?</span>
          <button style={{
            background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 10,
            color: '#64748B', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 4
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#1E40AF'; e.currentTarget.style.color = '#1E40AF'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#64748B'; }}
          >
            <ThumbsUp size={10} />
          </button>
          <button style={{
            background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 10,
            color: '#64748B', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 4
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#1E40AF'; e.currentTarget.style.color = '#1E40AF'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#64748B'; }}
          >
            <ThumbsDown size={10} />
          </button>
        </div>
      )}

      {isUser && (
        <div style={{ fontSize: 9, color: T.muted, marginTop: 4, paddingRight: 2, letterSpacing: '0.06em', fontWeight: 500 }}>
          OPERATOR · {fmtTime(msg.ts)}
        </div>
      )}
    </div>
  )
}

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
        fontWeight: highlight ? 700 : 500,
      }}>{v}</span>
    </div>
  )
}

function PanelHeader({ title, sub, icon: Icon, right }) {
  return (
    <div style={{
      padding: '13px 16px',
      borderBottom: `1px solid ${T.border}`,
      flexShrink: 0,
      background: '#FFFFFF',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div>
        <div style={{
          fontSize: 10, fontWeight: 700, color: T.blue,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {Icon ? <Icon size={12} strokeWidth={2.5} style={{ color: T.blue }} /> : <div style={{ width: 3, height: 12, background: T.blue, borderRadius: 2 }} />}
          {title}
        </div>
        {sub && <div style={{ fontSize: 9, color: T.muted, marginTop: 3 }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}

/* ─── DnaPanel collapsible failure signature library ────────────────────── */
function DnaPanel({ appState }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (appState >= 2) {
      setExpanded(true);
    } else {
      setExpanded(false);
    }
  }, [appState]);

  return (
    <div style={{
      marginTop: 9,
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 12,
      overflow: 'hidden',
      transition: 'all 0.4s ease',
    }}>
      {/* Header bar */}
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '12px 14px',
          background: '#F8FAFC',
          borderBottom: expanded ? '1px solid #E2E8F0' : 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#1E293B',
          borderLeft: '3px solid #1E40AF',
          paddingLeft: 8,
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <Dna size={12} style={{ color: '#1E40AF' }} />
          Network DNA — Failure Signature Library
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 9,
            padding: '2px 6px',
            borderRadius: 10,
            background: appState >= 2 ? '#DBEAFE' : '#E2E8F0',
            color: appState >= 2 ? '#1E40AF' : '#64748B',
            fontWeight: 700,
          }}>
            {appState >= 2 ? '1 match' : '0 matches'}
          </span>
          <span style={{ fontSize: 10, color: '#64748B', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            ▼
          </span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '14px', borderTop: 'none' }}>
          {/* Match Card */}
          <div style={{
            borderLeft: '3px solid #1E40AF',
            background: '#F0F4FF',
            padding: '10px 12px',
            borderRadius: '0 8px 8px 0',
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 10, color: '#1E40AF', fontWeight: 700, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={10} />
              Pattern Match Found — 94% Similarity
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
              Current Event vs Incident #5 (March 12, 2025)
            </div>
            <div style={{ fontSize: 12, color: '#1E293B', fontWeight: 600, marginTop: 4 }}>
              "Mumbai–Pune Congestion Buildup"
            </div>
          </div>

          {/* Signature Overlay Chart */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#1E293B', fontWeight: 600, marginBottom: 8 }}>
              Signature Overlay
            </div>
            
            {/* SVG Sparkline */}
            <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 8px', border: '1px solid #E2E8F0' }}>
              <svg width="100%" height="90" viewBox="0 0 240 90" style={{ overflow: 'visible' }}>
                {/* Line 1: Incident #5 (blue dashed) */}
                <path d="M 10 63 L 230 15" fill="none" stroke="#1E40AF" strokeWidth="2" strokeDasharray="4 4" />
                
                {/* Line 2: Current Event - Live (red solid) */}
                {appState < 3 ? (
                  <path d="M 10 55 L 120 19" fill="none" stroke="#EF4444" strokeWidth="2" />
                ) : (
                  <path d="M 10 55 L 120 19" fill="none" stroke="#22C55E" strokeWidth="2" />
                )}
                
                {/* Line 2 Projection (red dotted) */}
                {appState < 3 ? (
                  <path d="M 120 19 L 230 15" fill="none" stroke="#EF4444" strokeWidth="2" strokeDasharray="2 2" />
                ) : (
                  <path d="M 120 19 L 230 15" fill="none" stroke="#22C55E" strokeWidth="2" strokeDasharray="2 2" />
                )}
                
                {/* Vertical line: NOW */}
                <line x1="120" y1="10" x2="120" y2="70" stroke="#64748B" strokeWidth="1" strokeDasharray="2 2" />
                
                {/* Vertical line: Predicted Failure */}
                <line x1="230" y1="10" x2="230" y2="70" stroke="#EF4444" strokeWidth="1" />
                
                {/* Labels */}
                <text x="120" y="8" fontSize="8" fill="#64748B" textAnchor="middle" fontWeight="600">NOW</text>
                <text x="230" y="8" fontSize="8" fill="#EF4444" textAnchor="end" fontWeight="600">Predicted Failure</text>
                
                {/* X Axis labels */}
                <text x="10" y="82" fontSize="8" fill="#94A3B8">T-14m</text>
                <text x="120" y="82" fontSize="8" fill="#94A3B8" textAnchor="middle">T-7m</text>
                <text x="230" y="82" fontSize="8" fill="#94A3B8" textAnchor="end">T-0</text>
              </svg>
            </div>
            <div style={{ fontSize: 9, color: '#64748B', marginTop: 6, fontStyle: 'italic' }}>
              You are at minute 7 of a 14-minute failure trajectory
            </div>
          </div>

          {/* Past Incidents Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            <span style={{
              fontSize: 9, padding: '4px 8px', borderRadius: 4,
              background: '#EFF6FF', color: '#1E40AF',
              border: '1px solid #BFDBFE', fontWeight: 500
            }}>
              Incident #5 — Mar 12 — Congestion — 14 min
            </span>
            <span style={{
              fontSize: 9, padding: '4px 8px', borderRadius: 4,
              background: '#EFF6FF', color: '#1E40AF',
              border: '1px solid #BFDBFE', fontWeight: 500
            }}>
              Incident #9 — Jan 8 — Congestion — 11 min
            </span>
            <span style={{
              fontSize: 9, padding: '4px 8px', borderRadius: 4,
              background: '#EFF6FF', color: '#1E40AF',
              border: '1px solid #BFDBFE', fontWeight: 500
            }}>
              Incident #17 — Dec 3 — Congestion — 16 min
            </span>
            {appState === 4 && (
              <span style={{
                fontSize: 9, padding: '4px 8px', borderRadius: 4,
                background: '#DCFCE7', color: '#15803D',
                border: '1px solid #86EFAC', fontWeight: 600,
              }}>
                Incident #35 — Today — Congestion — 12 min ✓ NEW
              </span>
            )}
          </div>

          {/* In-progress or resolved note */}
          {appState === 3 && (
            <div style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600, marginBottom: 8, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={10} />
              Remediation in progress... signature updates pending stabilization
            </div>
          )}

          {appState === 4 && (
            <div style={{ fontSize: 10, color: '#22C55E', fontWeight: 600, marginBottom: 8, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={10} />
              Signature added to DNA Library — ChromaDB updated
            </div>
          )}

          {/* Average Resolution Time */}
          <div style={{ fontSize: 10, color: '#64748B', fontStyle: 'italic' }}>
            Average resolution time for this pattern: 4 min 18 sec via traffic rerouting
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Main App ───────────────────────────────────────────────────────────── */
export default function App() {
  const [links,    setLinks]    = useState(LINKS_INIT.map(l => ({ ...l })))
  const [alerts,   setAlerts]   = useState([])
  const [messages, setMessages] = useState([{
    role: 'system',
    text: 'PRISM v1.0 — ONLINE\nAir-gapped mode: ACTIVE\nExternal network: DISABLED\nLLM: Mistral-7B (quantized, local)\nRAG: ChromaDB (4 docs indexed)\nMonitoring 4 links across 3 sites.',
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

  // State machine state
  const [appState, setAppState] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const [savedCountdown, setSavedCountdown] = useState(0)

  const tickRef    = useRef(0)
  const faultRef   = useRef(false)
  const alertedRef = useRef({ warn: false, crit: false })
  const chatEnd    = useRef(null)
  const inputRef   = useRef(null)

  const appStateRef = useRef(0)
  useEffect(() => {
    appStateRef.current = appState
  }, [appState])

  /* simulation */
  useEffect(() => {
    const iv = setInterval(() => {
      tickRef.current++
      const t = tickRef.current
      setUptime(t * (TICK_MS / 1000))

      setLinks(prev => prev.map(link => {
        if (link.id === FAULT_LINK && (faultRef.current || t >= FAULT_TICK)) {
          if (!faultRef.current) { 
            faultRef.current = true
            setFaultActive(true) 
          }
          if (appStateRef.current >= 3) {
            // stabilized normal drift
            return {
              ...link,
              usage: +clamp(rnd(56, 2.5), 10, 70).toFixed(1),
              lat:   +clamp(rnd(12, 1.2),  3, 25).toFixed(1),
              risk:  +clamp(rnd(0.13, 0.02), 0.03, 0.25).toFixed(3),
              faulting: false
            }
          }
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
    if (!pun || appState >= 3) return

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
      
      if (pun.risk < 0.85) {
        setMessages(p => [...p, {
          role: 'copilot',
          text: `🔴 PREDICTIVE ALERT — ${pun.label}\n\nRisk score: ${(pun.risk * 100).toFixed(0)}% | ETA: ~${etaMin(pun.risk)} min\nUsage: ${pun.usage.toFixed(0)}% | Latency: ${pun.lat.toFixed(0)}ms\n\nPattern: Incident #5 (congestion-driven failure)\nAffected: Pune branch + downstream DC routes\n\nType "what should I do" for runbook steps.`,
          ts: new Date(),
        }])
      }
    }
  }, [links, appState])

  // Watch links risk to transition appState
  useEffect(() => {
    const pun = links.find(l => l.id === FAULT_LINK);
    if (!pun || !faultActive) return;

    if (pun.risk >= 0.85 && appState < 2) {
      setAppState(2);
      setCountdown(707); // 11:47
    } else if (pun.risk >= 0.45 && pun.risk < 0.85 && appState < 1) {
      setAppState(1);
      setCountdown(1653); // 27:33
    }
  }, [links, faultActive, appState]);

  // Live countdown timer ticking down every second
  useEffect(() => {
    let timer;
    if (appState === 1 || appState === 2) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [appState]);

  // Handle remediation button click
  const handleApproveRemediation = () => {
    setSavedCountdown(countdown);
    setAppState(3);
  };

  // State 3 -> State 4 auto transition after 3s
  useEffect(() => {
    if (appState === 3) {
      const timer = setTimeout(() => {
        setAppState(4);
        setAlerts([]); // Clear alerts
        setLinks(prev => prev.map(l => {
          if (l.id === FAULT_LINK) {
            return {
              ...l,
              usage: 56,
              lat: 12,
              loss: 0.0,
              risk: 0.13,
              faulting: false
            };
          }
          return l;
        }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [appState]);

  // Auto-populate chat based on state
  useEffect(() => {
    if (appState === 2) {
      setMessages([
        {
          role: 'system',
          text: 'Alert triggered — Mumbai–Pune Link — Risk 0.87 — Copilot auto-activated',
          ts: new Date(),
        },
        {
          role: 'user',
          text: 'What is happening with the Mumbai–Pune link and what should I do?',
          ts: new Date(),
        },
        {
          role: 'copilot',
          text: `Mumbai–Pune link is showing congestion-driven degradation. Utilization at 97%, latency spiked to 67ms, packet loss 4.8%.\nThis matches Incident #5 (March 12, 2025) — resolved by traffic rerouting in 4 min 18 sec.\n\nRunbook v3.2 recommends:\n\n• Reroute Pune traffic via Delhi hub\n• Execute on Mumbai CE router: ip route 10.0.2.0 255.255.255.0 via 10.0.1.2\n• Notify Pune branch of temporary reroute\n• Monitor Delhi–DC link load — expected +40% increase\n\nEstimated impact if unaddressed: Pune branch full connectivity loss in ~12 minutes.\n\nSource: Runbook v3.2 | Incident Log #5 | Topology Map v2`,
          ts: new Date(),
          showFeedback: true,
          sourceTags: ['Runbook v3.2', 'Incident #5']
        }
      ]);
    } else if (appState === 3) {
      setMessages(prev => {
        if (prev.some(m => m.text.includes("Auto-remediation executed successfully"))) return prev;
        return [
          ...prev,
          {
            role: 'copilot',
            text: 'Auto-remediation executed successfully. Traffic rerouted via Delhi hub. Mumbai CE router updated. Pune branch connectivity maintained via alternate path.',
            ts: new Date(),
          }
        ];
      });
    } else if (appState === 4) {
      setMessages(prev => {
        if (prev.some(m => m.text.includes("Mumbai–Pune link restored to normal"))) return prev;
        return [
          ...prev,
          {
            role: 'copilot',
            text: 'Mumbai–Pune link restored to normal. Incident report generated and added to Network DNA Library. ChromaDB updated with this incident for future reference.',
            ts: new Date(),
          }
        ];
      });
    }
  }, [appState]);

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
    setAppState(0)
    setCountdown(0)
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
    setAppState(0)
    setCountdown(0)
    setLinks(LINKS_INIT.map(l => ({ ...l })))
    setMessages([{
      role: 'system',
      text: 'PRISM v1.0 — RESET\nSimulation cleared. All links restored to baseline.\nMonitoring resumed.',
      ts: new Date(),
    }])
  }

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  /* computed */
  const overall    = appState === 2 ? 'CRITICAL' : appState === 1 ? 'ELEVATED' : 'NOMINAL'
  const overallClr = appState === 2 ? T.red : appState === 1 ? T.amber : T.green
  const fmtUptime  = () => {
    const m = Math.floor(uptime / 60), s = uptime % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const quick = ['Network status', 'What should I do', 'Root cause', 'Model info', 'Help']

  // Predictive Alerts Clock component rendering
  const renderPredictiveAlertsSection = () => {
    if (appState === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '30px 20px', color: T.muted, background: '#FFFFFF', borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 9 }}>
          <CheckCircle2 size={36} style={{ color: T.green, marginBottom: 12, filter: `drop-shadow(0 0 10px rgba(34, 197, 94, 0.3))` }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: T.green }}>All Clear</div>
          <div style={{ fontSize: 10, marginTop: 6, color: T.muted }}>All links nominal</div>
          <div style={{
            fontSize: 9, marginTop: 20, color: T.muted,
            padding: '8px 12px', borderRadius: 8,
            border: `1px dashed ${T.border}`,
            lineHeight: 1.7,
          }}>Press "Inject Fault" to demo<br/>the predictive detection</div>
        </div>
      );
    }
    if (appState === 1) {
      return (
        <div style={{
          textAlign: 'center', padding: '20px 16px', background: '#FFFFFF', borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 9,
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)', transition: 'all 0.4s ease'
        }}>
          <div style={{ fontSize: 11, color: '#F59E0B', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>
            Early Warning — Mumbai–Pune
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#F59E0B', fontFamily: T.mono, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap' }}>
            <Clock size={20} />
            <span>T − {formatCountdown(countdown)}</span>
          </div>
        </div>
      );
    }
    if (appState === 2) {
      return (
        <div style={{
          textAlign: 'center', padding: '24px 16px', background: '#FFFFFF', borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 9,
          boxShadow: '0 0 20px rgba(239,68,68,0.15)', transition: 'all 0.4s ease'
        }}>
          <div style={{ fontSize: 11, color: '#94A3B8', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>
            IMPACT CLOCK
          </div>
          <div style={{
            fontSize: 64, fontWeight: 700, color: '#EF4444', fontFamily: T.mono,
            textShadow: '0 0 10px rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            whiteSpace: 'nowrap'
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#EF4444' }}>T −</span>
            <span>{formatCountdown(countdown)}</span>
          </div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 8, fontWeight: 500 }}>
            Mumbai–Pune Link Failure Predicted
          </div>
          
          {/* depletion progress bar */}
          <div style={{ height: 4, width: '100%', background: '#E2E8F0', borderRadius: 2, overflow: 'hidden', marginTop: 16, marginBottom: 12 }}>
            <div style={{
              height: '100%',
              width: `${(countdown / 720) * 100}%`,
              background: '#EF4444',
              transition: 'width 1s linear',
            }} />
          </div>
          
          <div style={{ fontSize: 10, color: '#64748B', fontWeight: 500 }}>
            Risk Score: <span style={{ fontWeight: 700, color: '#EF4444' }}>0.87</span> | Confidence: <span style={{ fontWeight: 700, color: '#1E293B' }}>91%</span> | Pattern: <span style={{ fontWeight: 700, color: '#1E293B' }}>Congestion Buildup</span>
          </div>
          
          <button
            onClick={handleApproveRemediation}
            style={{
              marginTop: 16,
              width: '100%',
              padding: '10px 16px',
              background: '#1E40AF',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(30, 64, 175, 0.2)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'}
            onMouseLeave={e => e.currentTarget.style.background = '#1E40AF'}
          >
            <ShieldCheck size={14} />
            Approve Auto-Remediation
          </button>
        </div>
      );
    }
    if (appState === 3) {
      return (
        <div style={{
          textAlign: 'center', padding: '24px 16px', background: '#FFFFFF', borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 9,
          boxShadow: '0 0 20px rgba(34,197,94,0.15)', transition: 'all 0.4s ease'
        }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: '#22C55E', textShadow: '0 0 10px rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <CheckCircle2 size={40} style={{ color: '#22C55E' }} />
            LINK SECURED
          </div>
          <div style={{ fontSize: 12, color: '#1E293B', fontWeight: 600, marginTop: 8 }}>
            Remediation executed at T − {formatCountdown(savedCountdown)}
          </div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Mumbai–Pune link stabilized
          </div>
        </div>
      );
    }
    if (appState === 4) {
      return (
        <div style={{ textAlign: 'center', padding: '30px 20px', color: T.muted, background: '#FFFFFF', borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 9 }}>
          <CheckCircle2 size={36} style={{ color: T.green, marginBottom: 12, filter: `drop-shadow(0 0 10px rgba(34, 197, 94, 0.3))` }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: T.green }}>All Clear</div>
          <div style={{ fontSize: 10, marginTop: 6, color: T.muted }}>All links nominal</div>
          <div style={{
            fontSize: 9, marginTop: 20, color: T.muted,
            padding: '8px 12px', borderRadius: 8,
            border: `1px dashed ${T.border}`,
            lineHeight: 1.7,
          }}>Press "Inject Fault" to demo<br/>the predictive detection</div>
        </div>
      );
    }
  };

  return (
    <div className="app-main-wrapper" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: T.bg, color: T.text, fontFamily: "Inter, sans-serif" }}>

      {/* Star field background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse at 20% 50%, rgba(30, 64, 175, 0.03) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 20%, rgba(30, 64, 175, 0.02) 0%, transparent 50%),
          radial-gradient(ellipse at 60% 80%, rgba(30, 64, 175, 0.02) 0%, transparent 40%)
        `,
      }} />

      {/* Header Bar */}
      <header className="responsive-header" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 64, flexShrink: 0, zIndex: 10, position: 'relative',
        background: '#EFF6FF',
        borderBottom: `1px solid #BFDBFE`,
        boxShadow: `0 2px 8px rgba(30, 64, 175, 0.08)`,
      }}>
        {/* left: branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* PRISM Logo */}
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 60%, #3B82F6 100%)',
            border: '1.5px solid rgba(59,130,246,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(30, 64, 175, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
            flexShrink: 0,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Prism triangle shape */}
              <polygon points="12,2 22,20 2,20" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinejoin="round" />
              {/* Light refraction rays */}
              <line x1="12" y1="20" x2="6" y2="26" stroke="#60A5FA" strokeWidth="1.2" opacity="0.8" />
              <line x1="12" y1="20" x2="12" y2="26" stroke="#34D399" strokeWidth="1.2" opacity="0.8" />
              <line x1="12" y1="20" x2="18" y2="26" stroke="#F87171" strokeWidth="1.2" opacity="0.8" />
              {/* Center dot */}
              <circle cx="12" cy="13" r="1.8" fill="white" opacity="0.9" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.06em', color: '#1E3A8A', lineHeight: 1 }}>PRISM</div>
            <div style={{ fontSize: 8, color: '#3B82F6', letterSpacing: '0.08em', marginTop: 4, textTransform: 'uppercase', fontWeight: 600 }}>
              Predictive Risk Intelligence &amp; Surveillance Monitor · Air-Gapped · BAH 2026
            </div>
          </div>
          <div style={{ width: 1, height: 28, background: '#BFDBFE', marginLeft: 6 }} />
        </div>

        {/* center: status strip */}
        <div className="header-center-strip" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            display: 'flex',
            background: '#DBEAFE',
            border: '1px solid #BFDBFE',
            borderRadius: 8,
            padding: '3px 8px',
            gap: 12
          }}>
            {[
              ['STATUS',     overall,               overallClr, Activity],
              ['ALERTS',     String(alerts.length), alerts.length > 0 ? T.red : '#64748B', AlertTriangle],
              ['LINKS',      '4 / 4',               T.green, Network],
              ['INFERENCES', String(inferenceCount), '#3B82F6', Cpu],
              ['EXT CALLS',  String(extCalls),       T.green, Wifi],
              ['UPTIME',     fmtUptime(),            '#64748B', Clock],
            ].map(([k, v, c, Icon], idx) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ textAlign: 'center', padding: '4px 6px', minWidth: 62 }}>
                  <div style={{ fontSize: 7, color: '#3B82F6', letterSpacing: '0.08em', marginBottom: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, fontWeight: 600 }}>
                    {Icon && <Icon size={8} />}
                    {k}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#1E3A8A', fontFamily: T.mono }}>{v}</div>
                </div>
                {idx < 5 && <div style={{ width: 1, height: 16, background: '#BFDBFE', alignSelf: 'center' }} />}
              </div>
            ))}
          </div>
        </div>

        {/* right: controls */}
        <div className="header-controls" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!faultActive ? (
            <button onClick={injectFault} style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: '#F59E0B',
              color: '#0F172A',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#D97706'}
            onMouseLeave={e => e.currentTarget.style.background = '#F59E0B'}
            >
              <Zap size={11} fill="#0F172A" />
              Inject Fault
            </button>
          ) : (
            <button onClick={resetSim} style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: '#DBEAFE', color: '#1E3A8A', border: '1px solid #93C5FD',
              cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#BFDBFE'}
            onMouseLeave={e => e.currentTarget.style.background = '#DBEAFE'}
            >
              <RefreshCw size={11} />
              Reset
            </button>
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
              padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: '#DBEAFE',
              color: '#1E3A8A',
              border: '1px solid #93C5FD',
              cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#BFDBFE'}
            onMouseLeave={e => e.currentTarget.style.background = '#DBEAFE'}
            >
              <WifiOff size={11} />
              Go Offline
            </button>
          ) : (
            <button onClick={() => {
              setOfflineMode(false)
              setMessages(p => [...p, {
                role: 'system',
                text: `NETWORK RESTORED — ${new Date().toLocaleTimeString()}\nOperated offline for ${offlineSecs}s with zero service degradation.\nExternal calls made during offline period: 0`,
                ts: new Date(),
              }])
            }} style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: '#EF4444', color: '#FFFFFF',
              border: 'none', cursor: 'pointer',
              animation: 'pulse-red-btn 1.5s infinite',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <Wifi size={11} />
              Online ({offlineSecs}s offline)
            </button>
          )}

          {/* AIR-GAPPED badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 10px',
            borderRadius: 6,
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            animation: 'pulse-badge 2s infinite',
          }}>
            <Lock size={10} style={{ color: '#22C55E' }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#15803D', letterSpacing: '0.08em' }}>AIR-GAPPED</span>
          </div>

          {/* ISRO badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 10px',
            borderRadius: 12,
            background: '#1E40AF',
            border: '1px solid #1D4ED8',
          }}>
            <Rocket size={10} style={{ color: '#FFFFFF' }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.05em' }}>ISRO BAH 2026</span>
          </div>
        </div>
      </header>

      {/* Differentiator Strip */}
      <div className="diff-strip" style={{
        display: 'flex',
        flexShrink: 0,
        borderBottom: `1px solid ${T.border}`,
        background: '#FFFFFF',
        zIndex: 9,
        padding: '10px 24px',
        gap: 16
      }}>
        {[
          {
            icon: Clock,
            title: 'Predicts 10–20 min early',
            desc: 'LSTM trend detection — not threshold alerts',
            color: T.amber,
            sub: 'vs. industry standard: alert-after-failure',
          },
          {
            icon: Lock,
            title: 'Zero external calls',
            desc: 'LLM + RAG run 100% on local hardware',
            color: T.green,
            sub: `Ext calls this session: ${extCalls}`,
          },
          {
            icon: Server,
            title: 'Sovereign AI for Indian infra',
            desc: 'No cloud dependency — air-gapped by design',
            color: T.blue,
            sub: 'Runs on commodity hardware, not GPU clusters',
          },
        ].map((item, i) => {
          const IconComponent = item.icon;
          return (
            <div key={i} className="diff-item" style={{
              flex: 1,
              padding: '6px 12px',
              borderRight: i < 2 ? `1px solid ${T.border}` : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              transition: 'background 0.3s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: i === 0 ? '#FEF3C7' : i === 1 ? '#DCFCE7' : '#DBEAFE',
                color: item.color,
              }}>
                <IconComponent size={16} strokeWidth={2.5} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#1E293B', letterSpacing: '0.01em' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 9, color: T.muted, marginTop: 1 }}>{item.desc}</div>
                <div style={{ fontSize: 9, color: item.color, marginTop: 1, fontWeight: 500, fontStyle: 'italic' }}>{item.sub}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Offline Mode Banner */}
      {offlineMode && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 24px', flexShrink: 0, zIndex: 9,
          background: '#FEE2E2',
          borderBottom: `1px solid ${T.red}50`,
          animation: 'banner-pulse 2s infinite',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <OrbitalDot color={T.red} pulse size={8} />
            <span style={{ fontSize: 11, fontWeight: 800, color: T.red, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 4 }}>
              <WifiOff size={12} />
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

      {/* Three-panel body */}
      <div className="panels-container" style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* LEFT — Network Health */}
        <div className="panel-col" style={{
          width: 292, flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderRight: `1px solid ${T.border}`, overflow: 'hidden',
          background: '#F1F5F9',
        }}>
          <PanelHeader
            title="Link Health"
            sub="4 links · live telemetry · 2s refresh"
            icon={Network}
          />
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px' }}>
            {links.map(l => <LinkCard key={l.id} link={l} appState={appState} />)}

            {/* Sites legend */}
            <div style={{
              marginTop: 12, padding: '16px',
              background: '#FFFFFF',
              border: `1px solid ${T.border}`,
              borderRadius: 12,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: '#1E293B',
                borderLeft: '3px solid #1E40AF', paddingLeft: 8,
                letterSpacing: '0.05em', marginBottom: 12, textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 4
              }}>
                <MapPin size={12} style={{ color: '#1E40AF' }} />
                Sites
              </div>
              {SITES.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                  <OrbitalDot
                    color={s.id === 'pune' && (appState === 1 || appState === 2) ? riskColor(0.8) : s.color}
                    pulse={s.id === 'pune' && appState === 2}
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
              marginTop: 12, padding: '16px',
              background: '#FFFFFF',
              border: `1px solid ${T.border}`,
              borderRadius: 12,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: '#1E293B',
                borderLeft: '3px solid #1E40AF', paddingLeft: 8,
                letterSpacing: '0.05em', marginBottom: 12, textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 4
              }}>
                <TrendingUp size={12} style={{ color: '#1E40AF' }} />
                Prediction Engine
              </div>
              <InfoRow k="Model"     v="LSTM (PyTorch)" />
              <InfoRow k="Window"    v="30 ticks" />
              <InfoRow k="Precision" v="91.4%" />
              <InfoRow k="Lead time" v="10–20 min" />
              <InfoRow k="Status"    v="Running" highlight />
            </div>
          </div>
        </div>

        {/* CENTER — Alerts */}
        <div className="panel-col" style={{
          width: 284, flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderRight: `1px solid ${T.border}`, overflow: 'hidden',
          background: '#F8FAFC',
        }}>
          <PanelHeader
            title="Predictive Alerts"
            sub="LSTM engine · pre-failure detection"
            icon={AlertTriangle}
            right={
              alerts.length > 0 && appState !== 4 && (
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
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px' }}>
            
            {/* Clock & Alerts Area */}
            {renderPredictiveAlertsSection()}

            {/* Signature Library Collapsible panel */}
            <DnaPanel appState={appState} />

            {/* Telemetry stack info */}
            <div style={{
              marginTop: 12, padding: '16px',
              background: '#FFFFFF',
              border: `1px solid ${T.border}`, borderRadius: 12,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: '#1E293B',
                borderLeft: '3px solid #1E40AF', paddingLeft: 8,
                letterSpacing: '0.05em', marginBottom: 12, textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 4
              }}>
                <Database size={12} style={{ color: '#1E40AF' }} />
                Telemetry Stack
              </div>
              <InfoRow k="Collector" v="Telegraf" />
              <InfoRow k="Store"     v="InfluxDB" />
              <InfoRow k="Graphs"    v="Grafana" />
              <InfoRow k="Interval"  v="10s" />
              <InfoRow k="Retention" v="30 days" />
            </div>

            {/* Fault scenarios */}
            <div style={{
              marginTop: 12, padding: '16px',
              background: '#FFFFFF',
              border: `1px solid ${T.border}`, borderRadius: 12,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: '#1E293B',
                borderLeft: '3px solid #1E40AF', paddingLeft: 8,
                letterSpacing: '0.05em', marginBottom: 12, textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 4
              }}>
                <ShieldCheck size={12} style={{ color: '#1E40AF' }} />
                Validated Scenarios
              </div>
              {[
                ['Congestion buildup', T.amber],
                ['BGP route flap',     T.red],
                ['Tunnel degradation', T.amber],
                ['Policy drift',       T.blue],
              ].map(([s, c]) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: c, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: T.muted }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — AI Copilot */}
        <div className="panel-col panel-copilot" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F8FAFC' }}>
          {/* Panel Header */}
          <PanelHeader
            title="AI Copilot"
            sub="Mistral-7B · ChromaDB RAG · offline inference"
            icon={MessageSquare}
          />

          {/* Static Status Bar */}
          <div style={{
            padding: '6px 16px',
            borderBottom: `1px solid ${T.border}`,
            background: '#F1F5F9',
            color: '#64748B',
            fontSize: 11,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <Cpu size={12} style={{ color: '#64748B' }} />
            🧠 LLM: Mistral-7B · 📚 RAG: ChromaDB · 📡 Docs: 4 indexed · 🔒 Offline: Verified
          </div>

          {/* messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {messages.map((m, i) => <ChatBubble key={i} msg={m} />)}
            {typing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.06em', fontWeight: 600 }}>🛰 PRISM COPILOT</div>
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
            background: '#FFFFFF',
          }}>
            {quick.map(q => (
              <button key={q} onClick={() => sendMessage(q)} style={{
                padding: '5px 12px', borderRadius: 16, fontSize: 10, fontWeight: 500,
                background: '#FFFFFF', color: '#1E40AF',
                border: '1px solid #1E40AF', cursor: 'pointer',
                transition: 'all 0.2s',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#FFFFFF'
                e.currentTarget.style.background = '#1E40AF'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = '#1E40AF'
                e.currentTarget.style.background = '#FFFFFF'
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
            background: '#FFFFFF',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask the copilot anything..."
              rows={2}
              style={{
                flex: 1,
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: 8, padding: '9px 13px',
                color: '#1E293B', fontSize: 12, resize: 'none',
                outline: 'none', fontFamily: 'Inter, sans-serif',
                lineHeight: 1.6, transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#1E40AF'
                e.target.style.boxShadow = `0 0 0 2px rgba(30, 64, 175, 0.15)`
              }}
              onBlur={e => {
                e.target.style.borderColor = '#CBD5E1'
                e.target.style.boxShadow = 'none'
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || typing}
              style={{
                padding: '9px 18px', height: 44,
                background: input.trim() && !typing ? '#1E40AF' : '#E2E8F0',
                border: 'none', borderRadius: 8,
                color: input.trim() && !typing ? '#FFFFFF' : '#64748B',
                fontSize: 12, fontWeight: 600,
                cursor: input.trim() && !typing ? 'pointer' : 'default',
                flexShrink: 0, transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Send size={12} />
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Bottom accent bar */}
      <div style={{
        height: 3, flexShrink: 0,
        background: '#1E40AF',
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
        @keyframes pulse-red-btn {
          0%, 100% { box-shadow: 0 0 6px rgba(239, 68, 68, 0.3); }
          50%       { box-shadow: 0 0 16px rgba(239, 68, 68, 0.6); }
        }
        @keyframes banner-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.88; }
        }
        @keyframes pulse-badge {
          0%, 100% { opacity: 1; box-shadow: 0 0 4px rgba(34, 197, 94, 0.2); }
          50%       { opacity: 0.8; box-shadow: 0 0 12px rgba(34, 197, 94, 0.5); }
        }
        @keyframes blinking-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.3; transform: scale(1.2); }
        }
        .blinking-dot {
          animation: blinking-dot 1s infinite;
        }
      `}</style>
    </div>
  )
}