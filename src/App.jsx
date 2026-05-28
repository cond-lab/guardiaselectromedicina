import { useState, useCallback, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { exportToWord } from './wordExporter'
import { getCurrentShift, formatShiftRange } from './shiftUtils'

const ADMIN_PASSWORD = 'polygon2024'

const ALL_COLUMNS = [
  { key: 'fecha_aviso',    label: 'Fecha Aviso' },
  { key: 'hora_aviso',     label: 'Hora Aviso' },
  { key: 'servicio',       label: 'Servicio' },
  { key: 'averia',         label: 'Avería' },
  { key: 'acciones',       label: 'Acciones' },
  { key: 'tecnico_nombre', label: 'Técnico' },
  { key: 'solucionado',    label: 'Solucionado' },
  { key: 'fecha_fin',      label: 'Fecha Fin' },
  { key: 'hora_fin',       label: 'Hora Fin' },
  { key: 'created_at',     label: 'Registro' },
]

// ─── Atoms ─────────────────────────────────────────────────────────────────────
function GlassCard({ children, className = '' }) {
  return <div className={`glass glass-glow ${className}`}>{children}</div>
}

function PrimaryBtn({ children, onClick, disabled, className = '' }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`btn-primary btn-shimmer ${className}`}>
      {children}
    </button>
  )
}

function GhostBtn({ children, onClick, disabled, className = '' }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`btn-ghost ${className}`}>
      {children}
    </button>
  )
}

function Badge({ children, color = 'blue' }) {
  return <span className={`badge badge-${color}`}>{children}</span>
}

function Spinner() {
  return (
    <div className="spinner-container">
      <div className="spinner-ring" />
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div className="section-title-container">
      <h2 className="section-title-text">{children}</h2>
      <div className="section-title-line" />
    </div>
  )
}

// ─── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const go = () => {
    setLoading(true)
    setTimeout(() => {
      if (pass === ADMIN_PASSWORD) { sessionStorage.setItem('guardias_admin', '1'); onLogin() }
      else { setErr('Contraseña incorrecta'); setLoading(false) }
    }, 350)
  }

  return (
    <div className="login-wrapper">
      <div className="glass glass-glow fade-up login-card">
        <div className="login-top-accent" />

        <div className="login-header">
          <div className="login-logo-box">🏥</div>
          <div className="brand-title">GUARDIAS EM</div>
          <div className="brand-subtitle">Panel de extracción · Polygon</div>
        </div>

        <div className="form-group">
          <label>Contraseña de acceso</label>
          <input type="password" value={pass}
            className="input-glow"
            onChange={e => { setPass(e.target.value); setErr('') }}
            onKeyDown={e => e.key === 'Enter' && go()}
            placeholder="••••••••" autoFocus />
          {err && <div className="error-text">{err}</div>}
        </div>
        <PrimaryBtn onClick={go} disabled={loading || !pass} className="w-full py-3">
          {loading ? 'Verificando…' : 'ACCEDER →'}
        </PrimaryBtn>
      </div>
    </div>
  )
}

// ─── Técnicos ──────────────────────────────────────────────────────────────────
function TecnicoManager() {
  const [tecnicos, setTecnicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nombre: '', email: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('tecnicos').select('*').order('nombre')
    setTecnicos(data || []); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const hashP = async p => {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p))
    return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('')
  }

  const add = async () => {
    if (!form.nombre || !form.email || !form.password) return
    setSaving(true)
    const hash = await hashP(form.password)
    const { error } = await supabase.from('tecnicos').insert({ nombre: form.nombre, email: form.email.toLowerCase(), password_hash: hash })
    if (error) setMsg('Error: ' + error.message)
    else { setMsg('✓ Técnico creado con éxito'); setForm({ nombre: '', email: '', password: '' }); load() }
    setSaving(false); setTimeout(() => setMsg(''), 3000)
  }

  const toggle = async (id, activo) => {
    await supabase.from('tecnicos').update({ activo: !activo }).eq('id', id); load()
  }

  return (
    <div className="fade-up">
      <SectionTitle>Gestión de Técnicos</SectionTitle>
      
      <GlassCard className="p-6 mb-6">
        <div className="manager-grid">
          {[
            ['Nombre Completo', 'nombre', 'text'], 
            ['Correo Electrónico', 'email', 'email'], 
            ['Contraseña', 'password', 'password']
          ].map(([l, k, t]) => (
            <div key={k} className="form-group">
              <label>{l}</label>
              <input type={t} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={l} />
            </div>
          ))}
          <PrimaryBtn onClick={add} disabled={saving} className="h-11 px-6 mb-0.5">
            + Añadir Técnico
          </PrimaryBtn>
        </div>
        {msg && <div className="alert-success">{msg}</div>}
      </GlassCard>

      {loading ? <Spinner /> : (
        <div className="glass table-container">
          <table className="data-table">
            <thead>
              <tr>
                {['Nombre', 'Email', 'Estado', 'Acción'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {tecnicos.map(t => (
                <tr key={t.id}>
                  <td className="font-semibold text-white">{t.nombre}</td>
                  <td className="text-mono text-dim font-medium">{t.email}</td>
                  <td>
                    <Badge color={t.activo ? 'green' : 'red'}>
                      {t.activo ? '● ACTIVO' : '● INACTIVO'}
                    </Badge>
                  </td>
                  <td>
                    <GhostBtn onClick={() => toggle(t.id, t.activo)} className="py-1 px-3 text-xs">
                      {t.activo ? 'Desactivar' : 'Activar'}
                    </GhostBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ onLogout }) {
  const [tab, setTab] = useState('extraer')
  const [mode, setMode] = useState('actual')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [turnoType, setTurnoType] = useState('lv')
  const [selectedCols, setSelectedCols] = useState(ALL_COLUMNS.map(c => c.key))
  const [avisos, setAvisos] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [exporting, setExporting] = useState(false)
  const shift = getCurrentShift()

  const toggleCol = key => setSelectedCols(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key])

  const getRange = () => {
    if (mode === 'actual') return { from: shift.from, to: shift.to, label: shift.label }
    if (mode === 'turno') {
      const d = new Date(date + 'T12:00:00')
      const pad = n => String(n).padStart(2, '0')
      const next = new Date(d); next.setDate(next.getDate() + 1)
      const fmt = dt => `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`
      const labels = { lv: 'Guardia L-V', sab: 'Guardia Sábado', dom: 'Guardia Domingo' }
      return { from: date, to: fmt(next), label: `${labels[turnoType]} ${new Date(date+'T12:00:00').toLocaleDateString('es-ES')}` }
    }
    return {
      from: dateFrom, to: dateTo,
      label: `${new Date(dateFrom+'T12:00:00').toLocaleDateString('es-ES')} — ${new Date(dateTo+'T12:00:00').toLocaleDateString('es-ES')}`
    }
  }

  const search = async () => {
    setLoading(true); setSearched(true)
    const { from, to } = getRange()
    const { data, error } = await supabase.from('avisos').select('*')
      .gte('fecha_aviso', from).lte('fecha_aviso', to)
      .order('fecha_aviso').order('hora_aviso')
    if (error) console.error(error)
    setAvisos(data || []); setLoading(false)
  }

  const doExport = async () => {
    setExporting(true)
    await exportToWord(avisos, selectedCols, getRange().label)
    setExporting(false)
  }

  const fmtCell = (key, val) => {
    if (val === null || val === undefined || val === '') return <span className="text-muted">—</span>
    if (key === 'solucionado') return <Badge color={val ? 'green' : 'red'}>{val ? '✓ Sí' : '✗ No'}</Badge>
    if (key === 'hora_aviso' || key === 'hora_fin') return <span className="text-mono text-xs">{String(val).substring(0, 5)}</span>
    if (key === 'fecha_aviso' || key === 'fecha_fin') return <span className="text-mono text-xs">{new Date(val + 'T12:00:00').toLocaleDateString('es-ES')}</span>
    if (key === 'created_at') return <span className="text-mono text-muted text-2xs">{new Date(val).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>
    return <span className={`cell-text ${key === 'averia' || key === 'acciones' ? 'text-xs' : 'text-sm'}`}>{val}</span>
  }

  return (
    <div className="dashboard-layout">
      {/* Glow top line */}
      <div className="top-glow-bar" />

      {/* Header */}
      <header className="main-header">
        <div className="header-brand">
          <span className="logo">🏥</span>
          <span className="brand-title-sm">GUARDIAS EM</span>
          <span className="header-divider" />
          <span className="header-tag">Polygon Servicio Técnico</span>
        </div>

        <nav className="header-nav">
          {[['extraer', '📊 Datos'], ['tecnicos', '👥 Técnicos']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`nav-tab ${tab === id ? 'active' : ''}`}>
              {label}
            </button>
          ))}
          <button onClick={onLogout} className="btn-logout">↩ Salir</button>
        </nav>
      </header>

      <main className="main-content">
        {tab === 'tecnicos' && <TecnicoManager />}

        {tab === 'extraer' && (
          <div className="fade-up">
            <SectionTitle>Extracción de Registros</SectionTitle>

            <GlassCard className="p-6 mb-6">
              {/* Selector de Período */}
              <div className="form-group mb-6">
                <label className="mb-3 text-dim">Período de búsqueda</label>
                <div className="period-selector-grid">
                  {[
                    ['actual', '⚡', 'Guardia Actual', shift.label],
                    ['turno',  '📅', 'Por Turno',      'L-V · Sáb · Dom'],
                    ['libre',  '🗓', 'Rango Libre',    'Fechas personalizadas'],
                  ].map(([v, icon, label, sub]) => (
                    <button key={v} onClick={() => setMode(v)} className={`period-card ${mode === v ? 'active' : ''}`}>
                      <div className="period-icon">{icon}</div>
                      <div className="period-label">{label}</div>
                      <div className="period-sub">{sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Paneles Dinámicos según Modo */}
              {mode === 'actual' && (
                <div className="info-badge-panel fade-in">
                  <span className="pulse-dot" />
                  <span className="panel-highlight">{shift.label}</span>
                  <span className="panel-desc">{formatShiftRange(shift)}</span>
                </div>
              )}

              {mode === 'turno' && (
                <div className="controls-row fade-in">
                  <div className="form-group flex-1">
                    <label>Tipo de turno</label>
                    <select value={turnoType} onChange={e => setTurnoType(e.target.value)}>
                      <option value="lv">L-V Noche (20:00 → 07:00)</option>
                      <option value="sab">Sábado (07:00 sáb → 07:00 dom)</option>
                      <option value="dom">Domingo (07:00 dom → 07:00 lun)</option>
                    </select>
                  </div>
                  <div className="form-group flex-1">
                    <label>Fecha inicio del turno</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                </div>
              )}

              {mode === 'libre' && (
                <div className="controls-row fade-in">
                  <div className="form-group flex-1">
                    <label>Desde</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                  </div>
                  <div className="form-group flex-1">
                    <label>Hasta</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Columnas */}
              <div className="columns-section">
                <label className="mb-3 text-dim">Columnas a incluir en el Word</label>
                <div className="pills-container">
                  {ALL_COLUMNS.map(col => {
                    const on = selectedCols.includes(col.key)
                    return (
                      <button key={col.key} onClick={() => toggleCol(col.key)} className={`pill-btn ${on ? 'active' : ''}`}>
                        {on ? '✓ ' : ''}{col.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Acciones principales */}
              <div className="actions-footer">
                <PrimaryBtn onClick={search} disabled={loading} className="px-5 py-2.5">
                  {loading ? '⟳ Buscando…' : '🔍 Buscar registros'}
                </PrimaryBtn>
                {avisos.length > 0 && (
                  <GhostBtn onClick={doExport} disabled={exporting || !selectedCols.length} className="px-5 py-2.5">
                    📄 {exporting ? 'Generando…' : 'Exportar Word'}
                  </GhostBtn>
                )}
              </div>
            </GlassCard>

            {loading && <Spinner />}

            {!loading && searched && (
              <div className="fade-in">
                {avisos.length > 0 && (
                  <div className="metrics-row">
                    <Badge color="blue">{avisos.length} AVISOS</Badge>
                    <Badge color="green">✓ {avisos.filter(a => a.solucionado).length} RESUELTOS</Badge>
                    <Badge color="yellow">⏳ {avisos.filter(a => !a.solucionado).length} PENDIENTES</Badge>
                  </div>
                )}

                {avisos.length === 0 ? (
                  <GlassCard className="empty-state">
                    No se han encontrado avisos registrados para este período.
                  </GlassCard>
                ) : (
                  <div className="glass table-container">
                    <div className="responsive-table-scroll">
                      <table className="data-table">
                        <thead>
                          <tr>
                            {ALL_COLUMNS.filter(c => selectedCols.includes(c.key)).map(col => (
                              <th key={col.key}>{col.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {avisos.map((av) => (
                            <tr key={av.id}>
                              {ALL_COLUMNS.filter(c => selectedCols.includes(c.key)).map(col => (
                                <td key={col.key} className={col.key === 'averia' || col.key === 'acciones' ? 'cell-long-text' : ''}>
                                  {fmtCell(col.key, av[col.key])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(!!sessionStorage.getItem('guardias_admin'))
  return authed
    ? <Dashboard onLogout={() => { sessionStorage.removeItem('guardias_admin'); setAuthed(false) }} />
    : <LoginScreen onLogin={() => setAuthed(true)} />
}
