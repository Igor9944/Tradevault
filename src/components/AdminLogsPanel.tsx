import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { Variants } from 'motion/react'
import { supabase } from '../lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────
interface AuditLog {
  id: string
  user_id: string | null
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT'
  table_name: string
  record_id: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
  _email?: string
}

interface SessionRow {
  id: string
  user_id: string
  ip_address: string | null
  user_agent: string | null
  device_info: Record<string, unknown>
  location: string | null
  is_active: boolean
  last_active: string
  expires_at: string
  created_at: string
  revoked_at: string | null
  _email?: string
}

interface SystemLog {
  id: string
  user_id: string | null
  action: string
  details: Record<string, unknown>
  created_at: string
  _email?: string
}

type Tab = 'audit' | 'sessions' | 'system' | 'live'

// ── Helpers ───────────────────────────────────────────────────────────────
const API = '/api/supabase/proxy'
async function proxy<T>(action: string, args = {}): Promise<T[]> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action, arguments: args }),
  })
  const j = await res.json()
  return j?.data ?? []
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'2-digit' })
    + ' ' + d.toTimeString().slice(0, 8)
}

function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'à l\'instant'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}j`
}

function parseUA(ua: string | null): string {
  if (!ua) return '—'
  if (ua.includes('Mobile')) return '📱 Mobile'
  if (ua.includes('Chrome'))  return '🌐 Chrome'
  if (ua.includes('Firefox')) return '🦊 Firefox'
  if (ua.includes('Safari'))  return '🧭 Safari'
  return '💻 Desktop'
}

function exportCSV(data: unknown[], filename: string) {
  if (!data.length) return
  const keys = Object.keys(data[0] as object).filter(k => !k.startsWith('_'))
  const rows = data.map(r =>
    keys.map(k => JSON.stringify((r as Record<string,unknown>)[k] ?? '')).join(',')
  )
  const csv = [keys.join(','), ...rows].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
}

// ── Action Badge ──────────────────────────────────────────────────────────
const ACTION_STYLE: Record<string, string> = {
  INSERT: 'bg-green-500/10 text-green-400 border-green-500/20',
  UPDATE: 'bg-cyan-500/10  text-cyan-400  border-cyan-500/20',
  DELETE: 'bg-red-500/10   text-red-400   border-red-500/20',
  SELECT: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}
const ActionBadge = memo(({ action }: { action: string }) => (
  <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border tracking-wider ${ACTION_STYLE[action] ?? 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
    {action}
  </span>
))
ActionBadge.displayName = 'ActionBadge'

// ── Log Detail Popover ────────────────────────────────────────────────────
function JsonPopover({ data, label }: { data: unknown; label: string }) {
  const [open, setOpen] = useState(false)
  if (!data) return <span className="text-[#4a5568]">—</span>
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        className="text-[9px] px-2 py-0.5 rounded border border-[#223040] bg-[#0d1520] text-[#94a3b8] hover:border-[#00e5ff] hover:text-[#00e5ff] transition"
      >
        {label} ▾
      </button>
      {open && (
        <div className="absolute left-0 top-6 z-50 min-w-[280px] max-w-[420px] bg-[#070c14] border border-[#223040] rounded-lg p-3 shadow-2xl">
          <pre className="text-[9px] text-[#00e676] font-mono overflow-auto max-h-[200px] whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
          <button onClick={() => setOpen(false)} className="mt-2 text-[9px] text-[#4a5568] hover:text-[#ff3d57]">✕ Fermer</button>
        </div>
      )}
    </div>
  )
}

// ── TAB: Audit Trail ──────────────────────────────────────────────────────
function AuditTab() {
  const [logs, setLogs]     = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]     = useState(1)
  const [total, setTotal]   = useState(0)
  const [filterAction, setFilterAction] = useState('')
  const [filterTable,  setFilterTable]  = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const LIMIT = 50

  const load = useCallback(async () => {
    setLoading(true)
    const data = await proxy<AuditLog>('getAuditLogs', {
      page, limit: LIMIT, action: filterAction || undefined, tableName: filterTable || undefined,
    })
    setLogs(data)
    setLoading(false)
  }, [page, filterAction, filterTable])

  useEffect(() => { load() }, [load])

  const tables = [...new Set(logs.map(l => l.table_name))].sort()

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          className="px-3 py-1.5 bg-[#0d1520] border border-[#1a2535] rounded text-[10px] text-[#94a3b8] focus:border-[#00e5ff] outline-none"
          value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1) }}
        >
          <option value="">Toutes les actions</option>
          {['INSERT','UPDATE','DELETE','SELECT'].map(a => <option key={a}>{a}</option>)}
        </select>
        <select
          className="px-3 py-1.5 bg-[#0d1520] border border-[#1a2535] rounded text-[10px] text-[#94a3b8] focus:border-[#00e5ff] outline-none"
          value={filterTable} onChange={e => { setFilterTable(e.target.value); setPage(1) }}
        >
          <option value="">Toutes les tables</option>
          {tables.map(t => <option key={t}>{t}</option>)}
        </select>
        <button onClick={() => exportCSV(logs, 'audit_logs')}
          className="px-3 py-1.5 bg-[#0d1520] border border-[#1a2535] rounded text-[9px] text-[#94a3b8] hover:border-[#00e5ff] hover:text-[#00e5ff] transition ml-auto">
          ↓ Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[#1a2535]">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-[#1a2535]">
              {['Date','Utilisateur','Action','Table','Record ID','IP','Données'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[8px] font-bold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-[#4a5568]">
                <span className="animate-pulse">Chargement...</span>
              </td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-[#4a5568]">Aucun log</td></tr>
            ) : logs.map(log => (
              <>
                <tr
                  key={log.id}
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  className="border-b border-[#1a2535]/40 hover:bg-white/[0.015] cursor-pointer transition"
                >
                  <td className="px-3 py-2 text-[#4a5568] whitespace-nowrap font-mono">{fmtDate(log.created_at)}</td>
                  <td className="px-3 py-2 text-[#94a3b8] max-w-[140px] truncate">{log._email ?? log.user_id?.slice(0,8) ?? 'system'}</td>
                  <td className="px-3 py-2"><ActionBadge action={log.action} /></td>
                  <td className="px-3 py-2 text-[#00e5ff] font-mono">{log.table_name}</td>
                  <td className="px-3 py-2 text-[#4a5568] font-mono max-w-[100px] truncate">{log.record_id}</td>
                  <td className="px-3 py-2 text-[#4a5568] font-mono">{log.ip_address ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {log.old_data && <JsonPopover data={log.old_data} label="avant" />}
                      {log.new_data && <JsonPopover data={log.new_data} label="après" />}
                    </div>
                  </td>
                </tr>
                {expanded === log.id && (
                  <tr key={`${log.id}-exp`} className="bg-[#070c14]">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[8px] text-[#4a5568] uppercase mb-1">Avant</div>
                          <pre className="text-[9px] text-[#ff3d57] font-mono">{JSON.stringify(log.old_data, null, 2) ?? '—'}</pre>
                        </div>
                        <div>
                          <div className="text-[8px] text-[#4a5568] uppercase mb-1">Après</div>
                          <pre className="text-[9px] text-[#00e676] font-mono">{JSON.stringify(log.new_data, null, 2) ?? '—'}</pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-[9px] text-[#4a5568]">{logs.length} entrées · page {page}</span>
        <div className="flex gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 text-[9px] rounded border border-[#1a2535] text-[#94a3b8] disabled:opacity-30 hover:border-[#00e5ff] transition">
            ‹ Préc
          </button>
          <button disabled={logs.length < LIMIT} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 text-[9px] rounded border border-[#1a2535] text-[#94a3b8] disabled:opacity-30 hover:border-[#00e5ff] transition">
            Suiv ›
          </button>
        </div>
      </div>
    </div>
  )
}

// ── TAB: Sessions ─────────────────────────────────────────────────────────
function SessionsTab() {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [filterActive, setFilterActive] = useState<boolean | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await proxy<SessionRow>('getSessions', {
      activeOnly: filterActive ?? undefined,
    })
    setSessions(data)
    setLoading(false)
  }, [filterActive])

  useEffect(() => { load() }, [load])

  const handleRevoke = async (id: string) => {
    if (!confirm('Révoquer cette session ?')) return
    setRevoking(id)
    await proxy('revokeSession', { sessionId: id })
    await load()
    setRevoking(null)
  }

  const active   = sessions.filter(s => s.is_active && !s.revoked_at)
  const inactive = sessions.filter(s => !s.is_active || s.revoked_at)

  return (
    <div>
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Sessions actives', val: active.length,   color: '#00e676' },
          { label: 'Expirées / révoquées', val: inactive.length, color: '#ff3d57' },
          { label: 'Total', val: sessions.length, color: '#00e5ff' },
        ].map(s => (
          <div key={s.label} className="bg-[#0e1825] border border-[#1a2535] rounded-lg px-4 py-3">
            <div className="text-[8px] text-[#4a5568] uppercase tracking-wider mb-1">{s.label}</div>
            <div className="font-['Syne'] text-xl font-bold" style={{ color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {[
          { label: 'Toutes', val: null },
          { label: 'Actives', val: true },
          { label: 'Inactives', val: false },
        ].map(f => (
          <button key={String(f.val)}
            onClick={() => setFilterActive(f.val)}
            className={`px-3 py-1.5 rounded text-[9px] font-bold border transition ${
              filterActive === f.val
                ? 'bg-[#00e5ff]/10 border-[#00e5ff]/40 text-[#00e5ff]'
                : 'bg-[#0d1520] border-[#1a2535] text-[#94a3b8] hover:border-[#223040]'
            }`}
          >{f.label}</button>
        ))}
        <button onClick={() => exportCSV(sessions, 'sessions')}
          className="px-3 py-1.5 bg-[#0d1520] border border-[#1a2535] rounded text-[9px] text-[#94a3b8] hover:border-[#00e5ff] hover:text-[#00e5ff] transition ml-auto">
          ↓ Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[#1a2535]">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-[#1a2535]">
              {['Utilisateur','IP','Device','Location','Dernière activité','Expire','Statut','Action'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[8px] font-bold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-[#4a5568] animate-pulse">Chargement...</td></tr>
            ) : sessions.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-[#4a5568]">Aucune session</td></tr>
            ) : sessions.map(s => {
              const isAlive = s.is_active && !s.revoked_at && new Date(s.expires_at) > new Date()
              return (
                <tr key={s.id} className="border-b border-[#1a2535]/40 hover:bg-white/[0.015] transition">
                  <td className="px-3 py-2 text-[#94a3b8] max-w-[130px] truncate">{s._email ?? s.user_id.slice(0,8)}</td>
                  <td className="px-3 py-2 text-[#4a5568] font-mono">{String(s.ip_address ?? '—')}</td>
                  <td className="px-3 py-2 text-[#94a3b8]">{parseUA(s.user_agent)}</td>
                  <td className="px-3 py-2 text-[#4a5568]">{s.location ?? '—'}</td>
                  <td className="px-3 py-2 text-[#4a5568] font-mono whitespace-nowrap">{timeSince(s.last_active)}</td>
                  <td className="px-3 py-2 text-[#4a5568] font-mono whitespace-nowrap">{fmtDate(s.expires_at)}</td>
                  <td className="px-3 py-2">
                    {s.revoked_at ? (
                      <span className="text-[9px] font-bold text-[#ff3d57]">🚫 Révoquée</span>
                    ) : isAlive ? (
                      <span className="text-[9px] font-bold text-[#00e676]">● Active</span>
                    ) : (
                      <span className="text-[9px] font-bold text-[#4a5568]">◌ Expirée</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isAlive && (
                      <button
                        onClick={() => handleRevoke(s.id)}
                        disabled={revoking === s.id}
                        className="px-2 py-0.5 text-[9px] font-bold rounded bg-red-500/8 border border-red-500/20 text-red-400 hover:bg-red-500/15 disabled:opacity-40 transition"
                      >
                        {revoking === s.id ? '...' : 'Révoquer'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── TAB: System Logs ──────────────────────────────────────────────────────
function SystemTab() {
  const [logs, setLogs]     = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')
  const LIMIT = 50

  const load = useCallback(async () => {
    setLoading(true)
    const data = await proxy<SystemLog>('getSystemLogs', { page, limit: LIMIT, search: search || undefined })
    setLogs(data)
    setLoading(false)
  }, [page, search])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Rechercher une action..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="flex-1 px-3 py-1.5 bg-[#0d1520] border border-[#1a2535] rounded text-[11px] text-[#e2e8f0] placeholder-[#4a5568] focus:border-[#00e5ff] outline-none"
        />
        <button onClick={() => exportCSV(logs, 'system_logs')}
          className="px-3 py-1.5 bg-[#0d1520] border border-[#1a2535] rounded text-[9px] text-[#94a3b8] hover:border-[#00e5ff] hover:text-[#00e5ff] transition">
          ↓ CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#1a2535]">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-[#1a2535]">
              {['Date','Utilisateur','Action','Détails'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[8px] font-bold text-[#4a5568] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-[#4a5568] animate-pulse">Chargement...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-[#4a5568]">Aucun log système</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} className="border-b border-[#1a2535]/40 hover:bg-white/[0.015] transition">
                <td className="px-3 py-2 text-[#4a5568] font-mono whitespace-nowrap">{fmtDate(log.created_at)}</td>
                <td className="px-3 py-2 text-[#94a3b8]">{log._email ?? log.user_id?.slice(0,8) ?? 'system'}</td>
                <td className="px-3 py-2">
                  <span className="font-mono text-[#8b5cf6]">{log.action}</span>
                </td>
                <td className="px-3 py-2">
                  <JsonPopover data={log.details} label="détails" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-[9px] text-[#4a5568]">{logs.length} entrées · page {page}</span>
        <div className="flex gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 text-[9px] rounded border border-[#1a2535] text-[#94a3b8] disabled:opacity-30 hover:border-[#00e5ff] transition">‹ Préc</button>
          <button disabled={logs.length < LIMIT} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 text-[9px] rounded border border-[#1a2535] text-[#94a3b8] disabled:opacity-30 hover:border-[#00e5ff] transition">Suiv ›</button>
        </div>
      </div>
    </div>
  )
}

// ── TAB: Live Feed ────────────────────────────────────────────────────────
function LiveFeedTab() {
  const [events, setEvents] = useState<AuditLog[]>([])
  const [connected, setConnected] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)
  const maxEvents = 100

  useEffect(() => {
    const channel = supabase
      .channel('admin-live-logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_logs' },
        (payload) => {
          const ev = payload.new as AuditLog
          setEvents(prev => [ev, ...prev].slice(0, maxEvents))
          // Auto-scroll to top
          feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [])

  const getActionColor = (action: string) => {
    if (action === 'INSERT') return '#00e676'
    if (action === 'DELETE') return '#ff3d57'
    if (action === 'UPDATE') return '#00e5ff'
    return '#8b5cf6'
  }

  return (
    <div>
      {/* Status */}
      <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-[#0e1825] border border-[#1a2535] rounded-lg">
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[#00e676] animate-pulse' : 'bg-[#ff3d57]'}`} />
        <span className="text-[10px] text-[#94a3b8]">
          {connected ? 'Connecté — écoute les changements DB en temps réel' : 'Connexion...'}
        </span>
        <span className="ml-auto text-[9px] text-[#4a5568]">{events.length} / {maxEvents} événements</span>
        <button onClick={() => setEvents([])}
          className="text-[9px] text-[#4a5568] hover:text-[#ff3d57] transition px-2">
          ✕ Vider
        </button>
      </div>

      {/* Terminal-style feed */}
      <div
        ref={feedRef}
        className="bg-[#070c14] border border-[#1a2535] rounded-lg p-4 h-[480px] overflow-y-auto font-mono text-[10px]"
      >
        {events.length === 0 ? (
          <div className="text-[#4a5568] text-center py-8">
            <div className="text-2xl mb-2">⌛</div>
            En attente d'événements DB...
            <div className="text-[8px] mt-1">Les changements apparaissent ici en temps réel</div>
          </div>
        ) : (
          <AnimatePresence>
            {events.map((ev, i) => (
              <motion.div
                key={ev.id ?? i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="flex gap-3 py-1 border-b border-[#1a2535]/30"
              >
                <span className="text-[#4a5568] whitespace-nowrap shrink-0">{fmtDate(ev.created_at)}</span>
                <span className="font-bold shrink-0" style={{ color: getActionColor(ev.action) }}>
                  {ev.action.padEnd(6)}
                </span>
                <span className="text-[#00e5ff] shrink-0">{ev.table_name}</span>
                <span className="text-[#94a3b8] truncate">{ev.record_id}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'audit',    label: 'Audit Trail',   icon: '◉' },
  { id: 'sessions', label: 'Sessions',      icon: '🔑' },
  { id: 'system',   label: 'System Logs',   icon: '⬡' },
  { id: 'live',     label: 'Live Feed',     icon: '▶' },
]

const tabVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.2 } },
}

export default function AdminLogsPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('audit')

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-['Syne'] text-lg font-bold">
            Logs & <span className="text-[#00e5ff]">Sessions</span>
          </h2>
          <p className="text-[9px] text-[#4a5568] mt-0.5">
            Audit trail · Sessions actives · Events système · Live feed
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0e1825] border border-[#1a2535] rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-pulse" />
          <span className="text-[9px] text-[#4a5568] font-mono">Supabase Realtime</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#0a1018] p-1 rounded-lg border border-[#1a2535] w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-[10px] font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-[#0e1825] text-[#e2e8f0] border border-[#223040]'
                : 'text-[#4a5568] hover:text-[#94a3b8]'
            }`}
          >
            <span className="text-xs">{tab.icon}</span>
            {tab.label}
            {tab.id === 'live' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} variants={tabVariants} initial="hidden" animate="show">
            {activeTab === 'audit'    && <AuditTab />}
            {activeTab === 'sessions' && <SessionsTab />}
            {activeTab === 'system'   && <SystemTab />}
            {activeTab === 'live'     && <LiveFeedTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}