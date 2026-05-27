import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { exportToWord } from './wordExporter'

// ─── Auth ─────────────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = 'Rafa20ali.' // Cambia esto

function LoginScreen({ onLogin }) {
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = () => {
    setLoading(true)
    setTimeout(() => {
      if (pass === ADMIN_PASSWORD) {
        sessionStorage.setItem('guardias_admin', '1')
        onLogin()
      } else {
        setErr('Contraseña incorrecta')
        setLoading(false)
      }
    }, 400)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      backgroundImage: `
        radial-gradient(ellipse 60% 40% at 20% 20%, rgba(0,194,255,0.05) 0%, transparent 70%),
        radial-gradient(ellipse 40% 60% at 80% 80%, rgba(0,135,204,0.05) 0%, transparent 70%)
      `
    }}>
      <div style={{
        width: 380, padding: '40px 36px',
        background: 'var(--bg2)',
        border: '1px solid var(--border2)',
        borderRadius: 16,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,194,255,0.1)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏥</div>
          <div style={{ fontFamily: 'var(--font-cond)', fontSize: 22, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.05em' }}>
            GUARDIAS ELECTROMEDICINA
          </div>
          <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>Panel de extracción · Polygon</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Contraseña de acceso</label>
          <input
            type="password"
            value={pass}
            onChange={e => { setPass(e.target.value); setErr('') }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••••"
            autoFocus
          />
          {err && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 6 }}>{err}</div>}
        </div>

        <button
          onClick={handleLogin}
          disabled={loading || !pass}
          style={{
            width: '100%', padding: '11px',
            background: loading ? 'var(--accent2)' : 'var(--accent)',
            color: '#000', fontWeight: 700, fontSize: 14, borderRadius: 8,
            letterSpacing: '0.04em'
          }}
        >
          {loading ? 'Verificando...' : 'ACCEDER'}
        </button>
      </div>
    </div>
  )
}

// ─── Column config ─────────────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: 'fecha_aviso', label: 'Fecha Aviso' },
  { key: 'hora_aviso', label: 'Hora Aviso' },
  { key: 'servicio', label: 'Servicio' },
  { key: 'averia', label: 'Avería' },
  { key: 'acciones', label: 'Acciones Realizadas' },
  { key: 'tecnico_nombre', label: 'Técnico' },
  { key: 'created_at', label: 'Fecha Registro' },
]

// ─── Technician Manager ────────────────────────────────────────────────────────
function TecnicoManager() {
  const [tecnicos, setTecnicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nombre: '', email: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const loadTecnicos = useCallback(async () => {
    const { data } = await supabase.from('tecnicos').select('*').order('nombre')
    setTecnicos(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadTecnicos() }, [loadTecnicos])

  const hashPassword = async (password) => {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hash = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const handleAdd = async () => {
    if (!form.nombre || !form.email || !form.password) return
    setSaving(true)
    const hash = await hashPassword(form.password)
    const { error } = await supabase.from('tecnicos').insert({
      nombre: form.nombre,
      email: form.email.toLowerCase(),
      password_hash: hash,
    })
    if (error) {
      setMsg('Error: ' + error.message)
    } else {
      setMsg('Técnico creado correctamente')
      setForm({ nombre: '', email: '', password: '' })
      loadTecnicos()
    }
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const toggleActivo = async (id, activo) => {
    await supabase.from('tecnicos').update({ activo: !activo }).eq('id', id)
    loadTecnicos()
  }

  return (
    <div>
      <SectionTitle>Gestión de Técnicos</SectionTitle>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, marginBottom: 20, alignItems: 'end' }}>
        <div>
          <label>Nombre</label>
          <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre completo" />
        </div>
        <div>
          <label>Email</label>
          <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="usuario@polygon.local" />
        </div>
        <div>
          <label>Contraseña</label>
          <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Contraseña inicial" />
        </div>
        <button onClick={handleAdd} disabled={saving} style={{ padding: '9px 18px', background: 'var(--accent)', color: '#000', fontWeight: 700, height: 40 }}>
          + Añadir
        </button>
      </div>

      {msg && <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(46,213,115,0.1)', border: '1px solid rgba(46,213,115,0.3)', borderRadius: 6, color: 'var(--green)', fontSize: 13 }}>{msg}</div>}

      {loading ? <Spinner /> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border2)' }}>
              {['Nombre', 'Email', 'Estado', 'Acción'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tecnicos.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{t.nombre}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{t.email}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span className="tag" style={{ background: t.activo ? 'rgba(46,213,115,0.1)' : 'rgba(255,71,87,0.1)', color: t.activo ? 'var(--green)' : 'var(--red)' }}>
                    {t.activo ? '● ACTIVO' : '● INACTIVO'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <button onClick={() => toggleActivo(t.id, t.activo)} style={{ padding: '4px 12px', background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text2)', fontSize: 12 }}>
                    {t.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
function Dashboard({ onLogout }) {
  const [tab, setTab] = useState('extraer') // 'extraer' | 'tecnicos'
  const [mode, setMode] = useState('dia') // 'dia' | 'rango'
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [selectedCols, setSelectedCols] = useState(ALL_COLUMNS.map(c => c.key))
  const [avisos, setAvisos] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [exporting, setExporting] = useState(false)

  const toggleCol = (key) => {
    setSelectedCols(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const handleSearch = async () => {
    setLoading(true)
    setSearched(true)
    let query = supabase.from('avisos').select('*').order('fecha_aviso').order('hora_aviso')

    if (mode === 'dia') {
      query = query.eq('fecha_aviso', date)
    } else {
      query = query.gte('fecha_aviso', dateFrom).lte('fecha_aviso', dateTo)
    }

    const { data, error } = await query
    if (!error) setAvisos(data || [])
    setLoading(false)
  }

  const handleExport = async () => {
    if (!avisos.length) return
    setExporting(true)
    const label = mode === 'dia'
      ? new Date(date + 'T00:00:00').toLocaleDateString('es-ES')
      : `${new Date(dateFrom + 'T00:00:00').toLocaleDateString('es-ES')} — ${new Date(dateTo + 'T00:00:00').toLocaleDateString('es-ES')}`
    await exportToWord(avisos, selectedCols, label)
    setExporting(false)
  }

  const formatCell = (key, value) => {
    if (!value) return <span style={{ color: 'var(--text3)' }}>—</span>
    if (key === 'hora_aviso') return value.substring(0, 5)
    if (key === 'fecha_aviso') return new Date(value + 'T00:00:00').toLocaleDateString('es-ES')
    if (key === 'created_at') return new Date(value).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
    if (key === 'averia' || key === 'acciones') return <span style={{ fontSize: 12, lineHeight: 1.4 }}>{value}</span>
    return value
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--bg2)', borderBottom: '1px solid var(--border2)',
        padding: '0 32px', display: 'flex', alignItems: 'center', gap: 20, height: 60,
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 20px rgba(0,0,0,0.3)'
      }}>
        <span style={{ fontFamily: 'var(--font-cond)', fontSize: 18, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em' }}>
          🏥 GUARDIAS ELECTROMEDICINA
        </span>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {[['extraer', 'Extraer Datos'], ['tecnicos', 'Técnicos']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '6px 16px', background: tab === id ? 'var(--accent)' : 'transparent',
              color: tab === id ? '#000' : 'var(--text2)', fontWeight: 600, fontSize: 13,
              border: tab === id ? 'none' : '1px solid var(--border2)', borderRadius: 6
            }}>{label}</button>
          ))}
          <button onClick={onLogout} style={{ padding: '6px 14px', background: 'transparent', color: 'var(--text3)', fontSize: 13, border: '1px solid var(--border)', borderRadius: 6, marginLeft: 8 }}>
            Salir
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 32px' }}>

        {tab === 'tecnicos' && <TecnicoManager />}

        {tab === 'extraer' && (
          <div>
            <SectionTitle>Extracción de Registros</SectionTitle>

            {/* Filtros */}
            <Panel style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 20 }}>
                <div>
                  <label>Modo</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[['dia', 'Día'], ['rango', 'Rango']].map(([v, l]) => (
                      <button key={v} onClick={() => setMode(v)} style={{
                        padding: '8px 16px',
                        background: mode === v ? 'var(--accent)' : 'var(--bg3)',
                        color: mode === v ? '#000' : 'var(--text2)',
                        border: '1px solid var(--border2)', fontWeight: 600, fontSize: 13
                      }}>{l}</button>
                    ))}
                  </div>
                </div>

                {mode === 'dia' ? (
                  <div>
                    <label>Fecha</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 180 }} />
                  </div>
                ) : (
                  <>
                    <div>
                      <label>Desde</label>
                      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 180 }} />
                    </div>
                    <div>
                      <label>Hasta</label>
                      <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 180 }} />
                    </div>
                  </>
                )}

                <button onClick={handleSearch} disabled={loading} style={{
                  padding: '9px 24px', background: 'var(--accent)', color: '#000', fontWeight: 700,
                  fontSize: 14, borderRadius: 8, letterSpacing: '0.03em'
                }}>
                  {loading ? '...' : '🔍 Buscar'}
                </button>
              </div>

              {/* Selector de columnas */}
              <div>
                <label style={{ marginBottom: 10 }}>Columnas en el documento Word</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ALL_COLUMNS.map(col => (
                    <button key={col.key} onClick={() => toggleCol(col.key)} style={{
                      padding: '5px 12px', fontSize: 12, fontWeight: 600,
                      background: selectedCols.includes(col.key) ? 'rgba(0,194,255,0.15)' : 'var(--bg3)',
                      color: selectedCols.includes(col.key) ? 'var(--accent)' : 'var(--text3)',
                      border: selectedCols.includes(col.key) ? '1px solid var(--accent)' : '1px solid var(--border)',
                      borderRadius: 20, transition: 'all 0.15s'
                    }}>
                      {selectedCols.includes(col.key) ? '✓ ' : ''}{col.label}
                    </button>
                  ))}
                </div>
              </div>
            </Panel>

            {/* Resultados */}
            {loading && <Spinner />}

            {!loading && searched && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text2)' }}>
                      {avisos.length} aviso{avisos.length !== 1 ? 's' : ''} encontrado{avisos.length !== 1 ? 's' : ''}
                    </span>
                    {avisos.length > 0 && (
                      <span className="tag" style={{ background: 'rgba(46,213,115,0.1)', color: 'var(--green)' }}>
                        ● {avisos.length} REGISTROS
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleExport}
                    disabled={exporting || !avisos.length || !selectedCols.length}
                    style={{
                      padding: '9px 22px', background: avisos.length ? '#1e5fa0' : 'var(--bg3)',
                      color: avisos.length ? '#fff' : 'var(--text3)',
                      fontWeight: 700, fontSize: 14, borderRadius: 8,
                      border: '1px solid ' + (avisos.length ? '#2876cc' : 'var(--border)'),
                      display: 'flex', alignItems: 'center', gap: 8
                    }}
                  >
                    📄 {exporting ? 'Generando...' : 'Exportar Word'}
                  </button>
                </div>

                {avisos.length === 0 ? (
                  <Panel style={{ textAlign: 'center', padding: '48px', color: 'var(--text2)' }}>
                    No hay avisos registrados para el período seleccionado.
                  </Panel>
                ) : (
                  <Panel style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: 'var(--bg3)' }}>
                            {ALL_COLUMNS.filter(c => selectedCols.includes(c.key)).map(col => (
                              <th key={col.key} style={{
                                padding: '10px 14px', textAlign: 'left',
                                fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                                color: 'var(--text3)', fontFamily: 'var(--font-mono)',
                                borderBottom: '2px solid var(--border2)',
                                whiteSpace: 'nowrap'
                              }}>{col.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {avisos.map((aviso, i) => (
                            <tr key={aviso.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                              {ALL_COLUMNS.filter(c => selectedCols.includes(c.key)).map(col => (
                                <td key={col.key} style={{
                                  padding: '10px 14px',
                                  color: 'var(--text)',
                                  maxWidth: col.key === 'averia' || col.key === 'acciones' ? 260 : 'auto',
                                  verticalAlign: 'top'
                                }}>
                                  {formatCell(col.key, aviso[col.key])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Panel>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontFamily: 'var(--font-cond)', fontSize: 20, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text)' }}>{children}</h2>
      <div style={{ height: 2, width: 40, background: 'var(--accent)', marginTop: 6, borderRadius: 2 }} />
    </div>
  )
}

function Panel({ children, style }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border2)',
      borderRadius: 12,
      padding: '20px 24px',
      ...style
    }}>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text3)' }}>
      <div style={{
        display: 'inline-block', width: 32, height: 32,
        border: '3px solid var(--border2)', borderTop: '3px solid var(--accent)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(!!sessionStorage.getItem('guardias_admin'))

  const handleLogout = () => {
    sessionStorage.removeItem('guardias_admin')
    setAuthed(false)
  }

  return authed
    ? <Dashboard onLogout={handleLogout} />
    : <LoginScreen onLogin={() => setAuthed(true)} />
}
