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

// ─── Componentes de Estilo Premium (Sin Estilos en Línea) ───────────────────
function GlassCard({ children, className = '' }) {
  return <div className={`glass-card ${className}`}>{children}</div>
}

function PrimaryBtn({ children, onClick, disabled, className = '' }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`btn-glow-primary ${className}`}>
      <span>{children}</span>
    </button>
  )
}

function GhostBtn({ children, onClick, disabled, className = '' }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`btn-glass-ghost ${className}`}>
      {children}
    </button>
  )
}

function Badge({ children, color = 'blue' }) {
  return <span className={`modern-badge badge-${color}`}>{children}</span>
}

function Spinner() {
  return (
    <div className="modern-spinner-zone">
      <div className="spinner-core" />
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div className="modern-title-area">
      <h2>{children}</h2>
      <div className="title-accent-bar" />
    </div>
  )
}

// ─── Pantalla de Login ────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const go = () => {
    setLoading(true)
    setTimeout(() => {
      if (pass === ADMIN_PASSWORD) { sessionStorage.setItem('guardias_admin', '1'); onLogin() }
      else { setErr('Contraseña de administrador incorrecta'); setLoading(false) }
    }, 400)
  }

  return (
    <div className="modern-login-viewport">
      <div className="glass-card login-glass-box fade-up">
        <div className="login-logo-glow">🏥</div>
        <h1>GUARDIAS EM</h1>
        <p className="login-subtitle">Panel de Extracción Integral · Polygon</p>

        <div className="input-container">
          <label>Credencial de Acceso</label>
          <input 
            type="password" 
            value={pass}
            onChange={e => { setPass(e.target.value); setErr('') }}
            onKeyDown={e => e.key === 'Enter' && go()}
            placeholder="••••••••" 
            autoFocus 
          />
          {err && <div className="login-error-msg">{err}</div>}
        </div>
        
        <PrimaryBtn onClick={go} disabled={loading || !pass} className="w-full mt-4">
          {loading ? 'Validando Token…' : 'ENTRAR AL PANEL →'}
        </PrimaryBtn>
      </div>
    </div>
  )
}

// ─── Gestión de Técnicos ──────────────────────────────────────────────────────
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
    else { setMsg('✓ Alta de técnico procesada correctamente'); setForm({ nombre: '', email: '', password: '' }); load() }
    setSaving(false); setTimeout(() => setMsg(''), 3000)
  }

  const toggle = async (id, activo) => {
    await supabase.from('tecnicos').update({ activo: !activo }).eq('id', id); load()
  }

  return (
    <div className="fade-up">
      <SectionTitle>Gestión de Técnicos</SectionTitle>
      
      <GlassCard className="p-8 mb-8">
        <div className="split-form-grid">
          {[
            ['Nombre del Operario', 'nombre', 'text'], 
            ['Email Institucional', 'email', 'email'], 
            ['Clave de Acceso', 'password', 'password']
          ].map(([label, key, type]) => (
            <div key={key} className="input-container">
              <label>{label}</label>
              <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={label} />
            </div>
          ))}
          <PrimaryBtn onClick={add} disabled={saving} className="h-12 px-6">
            + Registrar
          </PrimaryBtn>
        </div>
        {msg && <div className="toast-success">{msg}</div>}
      </GlassCard>

      {loading ? <Spinner /> : (
        <div className="glass-card table-wrapper-glass">
          <table className="neon-table">
            <thead>
              <tr>
                {['Personal Técnico', 'Email de Contacto', 'Estado Operativo', 'Acción'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {tecnicos.map(t => (
                <tr key={t.id}>
                  <td className="font-bold text-highlight">{t.nombre}</td>
                  <td className="text-mono text-low-contrast">{t.email}</td>
                  <td>
                    <Badge color={t.activo ? 'green' : 'red'}>
                      {t.activo ? 'ACTIVO' : 'INACTIVO'}
                    </Badge>
                  </td>
                  <td>
                    <GhostBtn onClick={() => toggle(t.id, t.activo)} className="py-1 px-3 text-xs">
                      {t.activo ? 'Dar de baja' : 'Reactivar'}
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

// ─── Dashboard de Extracción ──────────────────────────────────────────────────
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
    if (val === null || val === undefined || val === '') return <span className="cell-empty">—</span>
    if (key === 'solucionado') return <Badge color={val ? 'green' : 'red'}>{val ? 'SÍ' : 'NO'}</Badge>
    if (key === 'hora_aviso' || key === 'hora_fin') return <span className="text-mono font-medium text-amber">{String(val).substring(0, 5)}</span>
    if (key === 'fecha_aviso' || key === 'fecha_fin') return <span className="text-mono text-cyan">{new Date(val + 'T12:00:00').toLocaleDateString('es-ES')}</span>
    if (key === 'created_at') return <span className="text-mono text-muted text-xs">{new Date(val).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>
    return <span className={`cell-content-text ${key === 'averia' || key === 'acciones' ? 'text-long' : ''}`}>{val}</span>
  }

  return (
    <div className="app-viewport-container">
      <div className="neon-top-line" />

      {/* Navegación Flotante */}
      <header className="glass-navigation">
        <div className="nav-branding">
          <span className="brand-icon">🏥</span>
          <div className="brand-texts">
            <span className="title">GUARDIAS EM</span>
            <span className="sub">Polygon Servicio Técnico</span>
          </div>
        </div>

        <div className="nav-tabs-group">
          {[['extraer', '📊 Datos'], ['tecnicos', '👥 Técnicos']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`tab-trigger ${tab === id ? 'is-active' : ''}`}>
              {label}
            </button>
          ))}
          <button onClick={onLogout} className="btn-exit-action">↩ Salir</button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="dashboard-content-frame">
        {tab === 'tecnicos' && <TecnicoManager />}

        {tab === 'extraer' && (
          <div className="fade-up">
            <SectionTitle>Extracción de Registros de Guardia</SectionTitle>

            <GlassCard className="p-8 mb-6">
              {/* Selectores de Período */}
              <div className="input-container mb-6">
                <label className="section-label-muted">Selección de Ventana de Tiempo</label>
                <div className="modern-selector-row">
                  {[
                    ['actual', '⚡', 'Guardia Actual', shift.label],
                    ['turno',  '📅', 'Por Turno Específico', 'L-V · Sáb · Dom'],
                    ['libre',  '🗓', 'Rango de Fechas', 'Fechas libres'],
                  ].map(([v, icon, title, subtitle]) => (
                    <button key={v} onClick={() => setMode(v)} className={`selector-tile ${mode === v ? 'selected' : ''}`}>
                      <span className="tile-icon">{icon}</span>
                      <div className="tile-body">
                        <span className="tile-title">{title}</span>
                        <span className="tile-subtitle">{subtitle}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-paneles Dinámicos */}
              {mode === 'actual' && (
                <div className="panel-live-status fade-in">
                  <div className="live-indicator"><span className="pulse-circle" /></div>
                  <div className="live-body">
                    <p className="live-title">{shift.label}</p>
                    <p className="live-time">{formatShiftRange(shift)}</p>
                  </div>
                </div>
              )}

              {mode === 'turno' && (
                <div className="inputs-inline-row fade-in">
                  <div className="input-container flex-1">
                    <label>Tipo de turno de guardia</label>
                    <select value={turnoType} onChange={e => setTurnoType(e.target.value)}>
                      <option value="lv">L-V Noche (20:00 → 07:00)</option>
                      <option value="sab">Sábado (07:00 sáb → 07:00 dom)</option>
                      <option value="dom">Domingo (07:00 dom → 07:00 lun)</option>
                    </select>
                  </div>
                  <div className="input-container flex-1">
                    <label>Fecha del Turno</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                </div>
              )}

              {mode === 'libre' && (
                <div className="inputs-inline-row fade-in">
                  <div className="input-container flex-1"><label>Fecha Inicial (Desde)</label><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
                  <div className="input-container flex-1"><label>Fecha Final (Hasta)</label><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
                </div>
              )}

              {/* Selector de Columnas */}
              <div className="columns-picker-area">
                <label className="section-label-muted">Estructura del Documento (Word/Vista)</label>
                <div className="badge-pills-flow">
                  {ALL_COLUMNS.map(col => {
                    const isActive = selectedCols.includes(col.key)
                    return (
                      <button key={col.key} onClick={() => toggleCol(col.key)} className={`pill-toggle-btn ${isActive ? 'active' : ''}`}>
                        <span className="pill-dot" />
                        {col.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="form-submit-footer">
                <PrimaryBtn onClick={search} disabled={loading}>
                  {loading ? 'Consultando Base de Datos…' : '🔍 Ejecutar Búsqueda'}
                </PrimaryBtn>
                {avisos.length > 0 && (
                  <GhostBtn onClick={doExport} disabled={exporting || !selectedCols.length}>
                    📄 {exporting ? 'Compilando Word…' : 'Descargar Reporte Word'}
                  </GhostBtn>
                )}
              </div>
            </GlassCard>

            {loading && <Spinner />}

            {!loading && searched && (
              <div className="fade-in">
                {avisos.length > 0 && (
                  <div className="metrics-summary-ribbon">
                    <Badge color="blue">{avisos.length} Registros Totales</Badge>
                    <Badge color="green">{avisos.filter(a => a.solucionado).length} Resueltos</Badge>
                    <Badge color="yellow">{avisos.filter(a => !a.solucionado).length} Pendientes</Badge>
                  </div>
                )}

                {avisos.length === 0 ? (
                  <GlassCard className="empty-state-card">
                    <span className="empty-icon">📂</span>
                    <p>Ningún aviso coincide con los parámetros seleccionados.</p>
                  </GlassCard>
                ) : (
                  <div className="glass-card table-wrapper-glass">
                    <div className="horizontal-scroll-container">
                      <table className="neon-table">
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
                                <td key={col.key}>
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
