import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { exportToWord } from './wordExporter'
import { getCurrentShift, getShiftRange, formatShiftRange } from './shiftUtils'

const ADMIN_PASSWORD = 'polygon2024'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --navy-950: #060d1a;
    --navy-900: #0a1628;
    --navy-800: #0f2040;
    --navy-700: #163058;
    --navy-600: #1e4070;
    --navy-500: #2a5490;
    --navy-400: #3a6baa;
    --accent: #4da6ff;
    --accent2: #1a7fff;
    --accent-glow: rgba(77,166,255,0.2);
    --glass: rgba(255,255,255,0.04);
    --glass-border: rgba(255,255,255,0.08);
    --glass-hover: rgba(255,255,255,0.07);
    --text: #e8f0fe;
    --text2: #8aabcc;
    --text3: #4a6a8a;
    --green: #34d399;
    --red: #f87171;
    --yellow: #fbbf24;
    --font: 'Inter', sans-serif;
    --mono: 'JetBrains Mono', monospace;
  }

  html, body, #root { height: 100%; background: var(--navy-950); color: var(--text); font-family: var(--font); -webkit-font-smoothing: antialiased; }

  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--navy-600); border-radius: 3px; }

  .glass {
    background: var(--glass);
    border: 1px solid var(--glass-border);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .glass-card {
    background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
    border: 1px solid var(--glass-border);
    backdrop-filter: blur(20px);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08);
  }

  input, select, textarea {
    font-family: var(--font);
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    color: var(--text);
    border-radius: 8px;
    padding: 9px 12px;
    font-size: 14px;
    outline: none;
    width: 100%;
    transition: all 0.2s;
  }
  input:focus, select:focus, textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
    background: rgba(255,255,255,0.06);
  }
  select option { background: #0f2040; }

  button { font-family: var(--font); cursor: pointer; border: none; border-radius: 8px; font-weight: 600; transition: all 0.2s; }
  button:disabled { opacity: 0.4; cursor: not-allowed; }

  label { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text2); display: block; margin-bottom: 5px; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
`

// ─── Login ──────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = () => {
    setLoading(true)
    setTimeout(() => {
      if (pass === ADMIN_PASSWORD) { sessionStorage.setItem('guardias_admin', '1'); onLogin() }
      else { setErr('Contraseña incorrecta'); setLoading(false) }
    }, 400)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(26,127,255,0.12) 0%, transparent 70%), var(--navy-950)' }}>
      <div className="glass-card" style={{ width: 380, padding: '44px 36px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, var(--navy-600), var(--navy-800))', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 16px' }}>🏥</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em' }}>GUARDIAS EM</div>
          <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>Panel de extracción · Polygon</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Contraseña de acceso</label>
          <input type="password" value={pass} onChange={e => { setPass(e.target.value); setErr('') }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="••••••••" autoFocus />
          {err && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 6 }}>{err}</div>}
        </div>
        <button onClick={handleLogin} disabled={loading || !pass}
          style={{ width: '100%', padding: 12, background: 'linear-gradient(135deg, var(--accent2), #0055cc)', color: '#fff', fontSize: 14, borderRadius: 10, letterSpacing: '0.04em', boxShadow: '0 4px 16px rgba(26,127,255,0.3)' }}>
          {loading ? 'Verificando...' : 'ACCEDER'}
        </button>
      </div>
    </div>
  )
}

// ─── Column config ──────────────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: 'fecha_aviso', label: 'Fecha Aviso' },
  { key: 'hora_aviso', label: 'Hora Aviso' },
  { key: 'servicio', label: 'Servicio' },
  { key: 'averia', label: 'Avería' },
  { key: 'acciones', label: 'Acciones' },
  { key: 'tecnico_nombre', label: 'Técnico' },
  { key: 'solucionado', label: 'Solucionado' },
  { key: 'fecha_fin', label: 'Fecha Fin' },
  { key: 'hora_fin', label: 'Hora Fin' },
  { key: 'created_at', label: 'Registro' },
]

// ─── Technician Manager ─────────────────────────────────────────────────────────
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

  const hashPassword = async (p) => {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p))
    return Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const handleAdd = async () => {
    if (!form.nombre || !form.email || !form.password) return
    setSaving(true)
    const hash = await hashPassword(form.password)
    const { error } = await supabase.from('tecnicos').insert({ nombre: form.nombre, email: form.email.toLowerCase(), password_hash: hash })
    if (error) setMsg('Error: ' + error.message)
    else { setMsg('Técnico creado'); setForm({ nombre: '', email: '', password: '' }); load() }
    setSaving(false); setTimeout(() => setMsg(''), 3000)
  }

  const toggleActivo = async (id, activo) => {
    await supabase.from('tecnicos').update({ activo: !activo }).eq('id', id); load()
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <SectionTitle icon="👥">Gestión de Técnicos</SectionTitle>
      <GlassPanel style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          {[['Nombre', 'nombre', 'text'], ['Email', 'email', 'email'], ['Contraseña', 'password', 'password']].map(([l, k, t]) => (
            <div key={k}><label>{l}</label>
              <input type={t} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={l} />
            </div>
          ))}
          <button onClick={handleAdd} disabled={saving} style={{ padding: '9px 18px', background: 'var(--accent2)', color: '#fff', height: 40 }}>+ Añadir</button>
        </div>
        {msg && <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 6, color: 'var(--green)', fontSize: 13 }}>{msg}</div>}
      </GlassPanel>
      {loading ? <Spinner /> : (
        <GlassPanel style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
              {['Nombre', 'Email', 'Estado', ''].map(h => <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text3)' }}>{h}</th>)}
            </tr></thead>
            <tbody>{tecnicos.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px 16px', fontWeight: 500 }}>{t.nombre}</td>
                <td style={{ padding: '10px 16px', color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 12 }}>{t.email}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: t.activo ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)', color: t.activo ? 'var(--green)' : 'var(--red)' }}>
                    {t.activo ? '● ACTIVO' : '● INACTIVO'}
                  </span>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <button onClick={() => toggleActivo(t.id, t.activo)} style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', color: 'var(--text2)', fontSize: 12 }}>
                    {t.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </GlassPanel>
      )}
    </div>
  )
}

// ─── Dashboard ──────────────────────────────────────────────────────────────────
function Dashboard({ onLogout }) {
  const [tab, setTab] = useState('extraer')
  const [selectorMode, setSelectorMode] = useState('actual') // 'actual' | 'turno' | 'libre'
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [turnoType, setTurnoType] = useState('lv') // 'lv' | 'sab' | 'dom'
  const [turnoDate, setTurnoDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedCols, setSelectedCols] = useState(ALL_COLUMNS.map(c => c.key))
  const [avisos, setAvisos] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [exporting, setExporting] = useState(false)

  const currentShift = getCurrentShift()

  const toggleCol = key => setSelectedCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  const getQueryRange = () => {
    if (selectorMode === 'actual') {
      const s = currentShift
      return { from: s.from, to: s.to, label: s.label }
    }
    if (selectorMode === 'turno') {
      let from, to, label
      const d = new Date(turnoDate + 'T12:00:00')
      const pad = n => String(n).padStart(2, '0')
      const fmt = dt => `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`
      if (turnoType === 'lv') {
        from = turnoDate
        const next = new Date(d); next.setDate(next.getDate() + 1)
        to = fmt(next)
        label = `Guardia L-V ${new Date(turnoDate+'T12:00:00').toLocaleDateString('es-ES')}`
      } else if (turnoType === 'sab') {
        from = turnoDate
        const next = new Date(d); next.setDate(next.getDate() + 1)
        to = fmt(next)
        label = `Guardia Sábado ${new Date(turnoDate+'T12:00:00').toLocaleDateString('es-ES')}`
      } else {
        from = turnoDate
        const next = new Date(d); next.setDate(next.getDate() + 1)
        to = fmt(next)
        label = `Guardia Domingo ${new Date(turnoDate+'T12:00:00').toLocaleDateString('es-ES')}`
      }
      return { from, to, label }
    }
    return { from: dateFrom, to: dateTo, label: `${new Date(dateFrom+'T12:00:00').toLocaleDateString('es-ES')} — ${new Date(dateTo+'T12:00:00').toLocaleDateString('es-ES')}` }
  }

  const handleSearch = async () => {
    setLoading(true); setSearched(true)
    const { from, to } = getQueryRange()
    const { data } = await supabase.from('avisos').select('*')
      .gte('fecha_aviso', from).lte('fecha_aviso', to)
      .order('fecha_aviso').order('hora_aviso')
    setAvisos(data || []); setLoading(false)
  }

  const handleExport = async () => {
    if (!avisos.length) return
    setExporting(true)
    const { label } = getQueryRange()
    await exportToWord(avisos, selectedCols, label)
    setExporting(false)
  }

  const formatCell = (key, value) => {
    if (value === null || value === undefined || value === '') return <span style={{ color: 'var(--text3)' }}>—</span>
    if (key === 'solucionado') return <span style={{ color: value ? 'var(--green)' : 'var(--red)', fontWeight: 600, fontSize: 12 }}>{value ? '✓ Sí' : '✗ No'}</span>
    if (key === 'hora_aviso' || key === 'hora_fin') return String(value).substring(0, 5)
    if (key === 'fecha_aviso' || key === 'fecha_fin') return new Date(value + 'T12:00:00').toLocaleDateString('es-ES')
    if (key === 'created_at') return new Date(value).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
    return <span style={{ fontSize: key === 'averia' || key === 'acciones' ? 12 : 13 }}>{value}</span>
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse 100% 50% at 50% -10%, rgba(26,127,255,0.08) 0%, transparent 60%), var(--navy-950)' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--glass-border)', padding: '0 32px', display: 'flex', alignItems: 'center', gap: 20, height: 58, position: 'sticky', top: 0, zIndex: 100, background: 'rgba(6,13,26,0.8)', backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🏥</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--accent)', letterSpacing: '0.05em' }}>GUARDIAS EM</span>
          <span style={{ color: 'var(--text3)', fontSize: 12 }}>· Polygon Servicio Técnico</span>
        </div>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {[['extraer', '📊 Extraer'], ['tecnicos', '👥 Técnicos']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: '6px 14px', background: tab === id ? 'var(--accent2)' : 'rgba(255,255,255,0.05)', color: tab === id ? '#fff' : 'var(--text2)', fontSize: 13, border: '1px solid ' + (tab === id ? 'transparent' : 'var(--glass-border)'), borderRadius: 8 }}>{label}</button>
          ))}
          <button onClick={onLogout} style={{ padding: '6px 12px', background: 'transparent', color: 'var(--text3)', fontSize: 12, border: '1px solid var(--glass-border)', borderRadius: 8, marginLeft: 8 }}>Salir</button>
        </div>
      </header>

      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '28px 32px' }}>
        {tab === 'tecnicos' && <TecnicoManager />}

        {tab === 'extraer' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <SectionTitle icon="📊">Extracción de Registros</SectionTitle>

            <GlassPanel style={{ marginBottom: 20 }}>
              {/* Selector de modo */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ marginBottom: 10 }}>Modo de selección</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    ['actual', '⚡ Guardia Actual', currentShift.label],
                    ['turno', '📅 Por Turno', ''],
                    ['libre', '🗓️ Rango Libre', ''],
                  ].map(([v, l, sub]) => (
                    <button key={v} onClick={() => setSelectorMode(v)} style={{
                      padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                      background: selectorMode === v ? 'linear-gradient(135deg, var(--accent2), #0044aa)' : 'rgba(255,255,255,0.04)',
                      color: selectorMode === v ? '#fff' : 'var(--text2)',
                      border: '1px solid ' + (selectorMode === v ? 'transparent' : 'var(--glass-border)'),
                      boxShadow: selectorMode === v ? '0 4px 16px rgba(26,127,255,0.25)' : 'none',
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2
                    }}>
                      {l}
                      {sub && <span style={{ fontSize: 10, opacity: 0.8, fontWeight: 400 }}>{sub}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Controles según modo */}
              {selectorMode === 'actual' && (
                <div style={{ padding: '12px 16px', background: 'rgba(26,127,255,0.08)', border: '1px solid rgba(26,127,255,0.2)', borderRadius: 10, fontSize: 13, color: 'var(--text2)' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{currentShift.label}</span>
                  <span style={{ marginLeft: 12 }}>{formatShiftRange(currentShift)}</span>
                </div>
              )}

              {selectorMode === 'turno' && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <div>
                    <label>Tipo de turno</label>
                    <select value={turnoType} onChange={e => setTurnoType(e.target.value)} style={{ width: 200 }}>
                      <option value="lv">L-V Noche (20:00→07:00)</option>
                      <option value="sab">Sábado (07:00→07:00)</option>
                      <option value="dom">Domingo (07:00→07:00)</option>
                    </select>
                  </div>
                  <div>
                    <label>Fecha inicio turno</label>
                    <input type="date" value={turnoDate} onChange={e => setTurnoDate(e.target.value)} style={{ width: 180 }} />
                  </div>
                </div>
              )}

              {selectorMode === 'libre' && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <div><label>Desde</label><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 180 }} /></div>
                  <div><label>Hasta</label><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 180 }} /></div>
                </div>
              )}

              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--glass-border)' }}>
                <label style={{ marginBottom: 10 }}>Columnas en el Word</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ALL_COLUMNS.map(col => (
                    <button key={col.key} onClick={() => toggleCol(col.key)} style={{
                      padding: '5px 12px', fontSize: 12, fontWeight: 600,
                      background: selectedCols.includes(col.key) ? 'rgba(77,166,255,0.12)' : 'rgba(255,255,255,0.03)',
                      color: selectedCols.includes(col.key) ? 'var(--accent)' : 'var(--text3)',
                      border: '1px solid ' + (selectedCols.includes(col.key) ? 'rgba(77,166,255,0.4)' : 'var(--glass-border)'),
                      borderRadius: 20,
                    }}>
                      {selectedCols.includes(col.key) ? '✓ ' : ''}{col.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <button onClick={handleSearch} disabled={loading} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, var(--accent2), #0044aa)', color: '#fff', fontSize: 14, borderRadius: 10, boxShadow: '0 4px 16px rgba(26,127,255,0.25)' }}>
                  {loading ? '...' : '🔍 Buscar'}
                </button>
                {avisos.length > 0 && (
                  <button onClick={handleExport} disabled={exporting || !selectedCols.length} style={{ padding: '10px 24px', background: 'rgba(255,255,255,0.06)', color: 'var(--text)', fontSize: 14, borderRadius: 10, border: '1px solid var(--glass-border)' }}>
                    📄 {exporting ? 'Generando...' : 'Exportar Word'}
                  </button>
                )}
              </div>
            </GlassPanel>

            {loading && <Spinner />}

            {!loading && searched && (
              <div style={{ animation: 'slideUp 0.3s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text2)' }}>{avisos.length} aviso{avisos.length !== 1 ? 's' : ''}</span>
                  {avisos.length > 0 && <>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: 'rgba(52,211,153,0.1)', color: 'var(--green)' }}>✓ {avisos.filter(a => a.solucionado).length} resueltos</span>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: 'rgba(251,191,36,0.1)', color: 'var(--yellow)' }}>⏳ {avisos.filter(a => !a.solucionado).length} pendientes</span>
                  </>}
                </div>

                {avisos.length === 0 ? (
                  <GlassPanel style={{ textAlign: 'center', padding: 48, color: 'var(--text3)' }}>No hay avisos para este período.</GlassPanel>
                ) : (
                  <GlassPanel style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead><tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                          {ALL_COLUMNS.filter(c => selectedCols.includes(c.key)).map(col => (
                            <th key={col.key} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text3)', whiteSpace: 'nowrap' }}>{col.label}</th>
                          ))}
                        </tr></thead>
                        <tbody>{avisos.map((aviso, i) => (
                          <tr key={aviso.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', transition: 'background 0.15s' }}>
                            {ALL_COLUMNS.filter(c => selectedCols.includes(c.key)).map(col => (
                              <td key={col.key} style={{ padding: '10px 14px', verticalAlign: 'top', maxWidth: col.key === 'averia' || col.key === 'acciones' ? 280 : 'auto' }}>
                                {formatCell(col.key, aviso[col.key])}
                              </td>
                            ))}
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </GlassPanel>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────────
function SectionTitle({ children, icon }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && <span>{icon}</span>}{children}
      </h2>
      <div style={{ height: 2, width: 40, background: 'var(--accent2)', marginTop: 8, borderRadius: 2 }} />
    </div>
  )
}

function GlassPanel({ children, style }) {
  return (
    <div className="glass-card" style={{ padding: '20px 24px', ...style }}>{children}</div>
  )
}

function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: 48 }}>
      <div style={{ display: 'inline-block', width: 28, height: 28, border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )
}

// ─── Root ────────────────────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(!!sessionStorage.getItem('guardias_admin'))
  return (
    <>
      <style>{css}</style>
      {authed ? <Dashboard onLogout={() => { sessionStorage.removeItem('guardias_admin'); setAuthed(false) }} /> : <LoginScreen onLogin={() => setAuthed(true)} />}
    </>
  )
}
