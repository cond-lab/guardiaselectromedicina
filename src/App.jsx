import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { exportToWord } from './wordExporter'
import { getCurrentShift, getShiftRange, formatShiftRange } from './shiftUtils'

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

const G = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#03080f;
  --bg1:#060e1a;
  --bg2:#091424;
  --bg3:#0d1c34;
  --bg4:#112244;
  --b1:rgba(255,255,255,0.06);
  --b2:rgba(255,255,255,0.1);
  --b3:rgba(255,255,255,0.15);
  --a:#4facfe;
  --a2:#0070f3;
  --a3:#00c6fb;
  --ag:linear-gradient(135deg,#0070f3,#00c6fb);
  --glow:0 0 40px rgba(79,172,254,0.15);
  --t1:#f0f6ff;
  --t2:#8ab0cc;
  --t3:#3a5a7a;
  --green:#10b981;
  --red:#ef4444;
  --yellow:#f59e0b;
  --font:'DM Sans',sans-serif;
  --head:'Syne',sans-serif;
  --mono:'DM Mono',monospace;
}
html,body,#root{height:100%;background:var(--bg);color:var(--t1);font-family:var(--font);-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:2px}
input,select,textarea{font-family:var(--font);background:var(--bg3);border:1px solid var(--b1);color:var(--t1);border-radius:8px;padding:9px 13px;font-size:14px;outline:none;width:100%;transition:.2s}
input:focus,select:focus,textarea:focus{border-color:var(--a);box-shadow:0 0 0 3px rgba(79,172,254,0.12);background:var(--bg4)}
select option{background:var(--bg2)}
button{font-family:var(--font);cursor:pointer;border:none;border-radius:8px;font-weight:600;transition:.2s}
button:disabled{opacity:.35;cursor:not-allowed}
label{font-size:10.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);display:block;margin-bottom:5px}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
`

// ─── Atoms ─────────────────────────────────────────────────────────────────────
function Card({ children, style, className }) {
  return <div style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid var(--b1)', borderRadius: 16, backdropFilter: 'blur(24px)', boxShadow: '0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)', ...style }}>{children}</div>
}

function Btn({ children, onClick, disabled, variant = 'primary', style }) {
  const base = { padding: '10px 22px', fontSize: 13.5, borderRadius: 10, letterSpacing: '.03em' }
  const variants = {
    primary: { background: 'var(--ag)', color: '#fff', boxShadow: '0 4px 20px rgba(0,112,243,0.3)' },
    ghost: { background: 'rgba(255,255,255,0.05)', color: 'var(--t2)', border: '1px solid var(--b1)' },
    success: { background: 'rgba(16,185,129,0.12)', color: 'var(--green)', border: '1px solid rgba(16,185,129,0.25)' },
  }
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>{children}</button>
}

function Badge({ children, color = 'blue' }) {
  const colors = {
    blue: { bg: 'rgba(79,172,254,0.1)', color: 'var(--a)', border: 'rgba(79,172,254,0.25)' },
    green: { bg: 'rgba(16,185,129,0.1)', color: 'var(--green)', border: 'rgba(16,185,129,0.25)' },
    red: { bg: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: 'rgba(239,68,68,0.25)' },
    yellow: { bg: 'rgba(245,158,11,0.1)', color: 'var(--yellow)', border: 'rgba(245,158,11,0.25)' },
  }
  const c = colors[color]
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: '.06em', fontFamily: 'var(--mono)', background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>{children}</span>
}

function Spinner() {
  return <div style={{ textAlign: 'center', padding: 48 }}><div style={{ display: 'inline-block', width: 26, height: 26, border: '2px solid rgba(255,255,255,0.08)', borderTop: '2px solid var(--a)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /></div>
}

// ─── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const go = () => {
    setLoading(true)
    setTimeout(() => {
      if (pass === ADMIN_PASSWORD) { sessionStorage.setItem('guardias_admin','1'); onLogin() }
      else { setErr('Contraseña incorrecta'); setLoading(false) }
    }, 350)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,112,243,0.1) 0%, transparent 65%), var(--bg)' }}>
      {/* Grid background */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />

      <Card style={{ width: 400, padding: '48px 40px', position: 'relative', animation: 'fadeUp .5s ease' }}>
        {/* Top accent line */}
        <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 2, background: 'var(--ag)', borderRadius: '0 0 4px 4px' }} />

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, var(--bg4), var(--bg3))', border: '1px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px', boxShadow: 'var(--glow)' }}>🏥</div>
          <div style={{ fontFamily: 'var(--head)', fontSize: 22, fontWeight: 800, letterSpacing: '.04em', background: 'linear-gradient(135deg, #fff 30%, var(--a))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>GUARDIAS EM</div>
          <div style={{ color: 'var(--t3)', fontSize: 12.5, marginTop: 5, letterSpacing: '.05em' }}>Panel de extracción · Polygon</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label>Contraseña de acceso</label>
          <input type="password" value={pass} onChange={e => { setPass(e.target.value); setErr('') }}
            onKeyDown={e => e.key === 'Enter' && go()} placeholder="••••••••" autoFocus />
          {err && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 5 }}>{err}</div>}
        </div>
        <Btn onClick={go} disabled={loading || !pass} style={{ width: '100%', padding: 12 }}>
          {loading ? 'Verificando…' : 'ACCEDER →'}
        </Btn>
      </Card>
    </div>
  )
}

// ─── Tecnicos ──────────────────────────────────────────────────────────────────
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
    return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2,'0')).join('')
  }

  const add = async () => {
    if (!form.nombre || !form.email || !form.password) return
    setSaving(true)
    const hash = await hashP(form.password)
    const { error } = await supabase.from('tecnicos').insert({ nombre: form.nombre, email: form.email.toLowerCase(), password_hash: hash })
    if (error) setMsg('Error: ' + error.message)
    else { setMsg('Técnico creado'); setForm({ nombre: '', email: '', password: '' }); load() }
    setSaving(false); setTimeout(() => setMsg(''), 3000)
  }

  const toggle = async (id, activo) => { await supabase.from('tecnicos').update({ activo: !activo }).eq('id', id); load() }

  return (
    <div style={{ animation: 'fadeUp .3s ease' }}>
      <SectionTitle>Gestión de Técnicos</SectionTitle>
      <Card style={{ padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          {[['Nombre','nombre','text'],['Email','email','email'],['Contraseña','password','password']].map(([l,k,t]) => (
            <div key={k}><label>{l}</label><input type={t} value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} placeholder={l} /></div>
          ))}
          <Btn onClick={add} disabled={saving} style={{ height: 40, padding: '0 20px' }}>+ Añadir</Btn>
        </div>
        {msg && <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, color: 'var(--green)', fontSize: 13 }}>{msg}</div>}
      </Card>
      {loading ? <Spinner /> : (
        <Card style={{ overflow: 'hidden', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ borderBottom: '1px solid var(--b1)' }}>
              {['Nombre','Email','Estado',''].map(h => <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t3)', fontFamily: 'var(--mono)' }}>{h}</th>)}
            </tr></thead>
            <tbody>{tecnicos.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '11px 18px', fontWeight: 500 }}>{t.nombre}</td>
                <td style={{ padding: '11px 18px', color: 'var(--t2)', fontFamily: 'var(--mono)', fontSize: 12 }}>{t.email}</td>
                <td style={{ padding: '11px 18px' }}><Badge color={t.activo ? 'green' : 'red'}>{t.activo ? '● ACTIVO' : '● INACTIVO'}</Badge></td>
                <td style={{ padding: '11px 18px' }}>
                  <Btn variant="ghost" onClick={() => toggle(t.id, t.activo)} style={{ padding: '4px 14px', fontSize: 12 }}>{t.activo ? 'Desactivar' : 'Activar'}</Btn>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
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
      const pad = n => String(n).padStart(2,'0')
      const fmt = dt => `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`
      const next = new Date(d); next.setDate(next.getDate()+1)
      const labels = { lv: 'Guardia L-V', sab: 'Guardia Sábado', dom: 'Guardia Domingo' }
      return { from: date, to: fmt(next), label: `${labels[turnoType]} — ${new Date(date+'T12:00:00').toLocaleDateString('es-ES')}` }
    }
    return { from: dateFrom, to: dateTo, label: `${new Date(dateFrom+'T12:00:00').toLocaleDateString('es-ES')} — ${new Date(dateTo+'T12:00:00').toLocaleDateString('es-ES')}` }
  }

  const search = async () => {
    setLoading(true); setSearched(true)
    const { from, to } = getRange()
    const { data } = await supabase.from('avisos').select('*').gte('fecha_aviso', from).lte('fecha_aviso', to).order('fecha_aviso').order('hora_aviso')
    setAvisos(data || []); setLoading(false)
  }

  const doExport = async () => {
    setExporting(true)
    await exportToWord(avisos, selectedCols, getRange().label)
    setExporting(false)
  }

  const fmtCell = (key, val) => {
    if (val === null || val === undefined || val === '') return <span style={{ color: 'var(--t3)' }}>—</span>
    if (key === 'solucionado') return <Badge color={val ? 'green' : 'red'}>{val ? '✓ Sí' : '✗ No'}</Badge>
    if (key === 'hora_aviso' || key === 'hora_fin') return <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{String(val).substring(0,5)}</span>
    if (key === 'fecha_aviso' || key === 'fecha_fin') return <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{new Date(val+'T12:00:00').toLocaleDateString('es-ES')}</span>
    if (key === 'created_at') return <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)' }}>{new Date(val).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'})}</span>
    return <span style={{ fontSize: key==='averia'||key==='acciones' ? 12 : 13, lineHeight: 1.4 }}>{val}</span>
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse 120% 40% at 50% -5%, rgba(0,112,243,0.07) 0%, transparent 55%), var(--bg)' }}>
      {/* Grid bg */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none', zIndex: 0 }} />

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, height: 56, borderBottom: '1px solid var(--b1)', background: 'rgba(3,8,15,0.85)', backdropFilter: 'blur(24px)', display: 'flex', alignItems: 'center', padding: '0 32px', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--head)', fontSize: 16, fontWeight: 800, background: 'linear-gradient(135deg, #fff 20%, var(--a))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '.06em' }}>GUARDIAS EM</span>
          <span style={{ width: 1, height: 16, background: 'var(--b2)' }} />
          <span style={{ color: 'var(--t3)', fontSize: 12 }}>Polygon Servicio Técnico</span>
        </div>

        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', alignItems: 'center' }}>
          {[['extraer','📊 Datos'],['tecnicos','👥 Técnicos']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: '5px 14px', background: tab===id ? 'rgba(79,172,254,0.12)' : 'transparent', color: tab===id ? 'var(--a)' : 'var(--t3)', fontSize: 13, border: tab===id ? '1px solid rgba(79,172,254,0.25)' : '1px solid transparent', borderRadius: 8, fontWeight: tab===id ? 600 : 400 }}>{label}</button>
          ))}
          <button onClick={onLogout} style={{ padding: '5px 12px', background: 'transparent', color: 'var(--t3)', fontSize: 12, border: '1px solid var(--b1)', borderRadius: 8, marginLeft: 8 }}>↩ Salir</button>
        </div>
      </header>

      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '32px', position: 'relative', zIndex: 1 }}>
        {tab === 'tecnicos' && <TecnicoManager />}
        {tab === 'extraer' && (
          <div style={{ animation: 'fadeUp .3s ease' }}>
            <SectionTitle>Extracción de Registros</SectionTitle>

            <Card style={{ padding: '24px 28px', marginBottom: 20 }}>
              {/* Modo selector */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ marginBottom: 10 }}>Período de búsqueda</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    ['actual', '⚡', 'Guardia Actual', shift.label],
                    ['turno',  '📅', 'Por Turno', 'L-V, Sáb, Dom'],
                    ['libre',  '🗓', 'Rango Libre', 'Fechas personalizadas'],
                  ].map(([v, icon, label, sub]) => (
                    <button key={v} onClick={() => setMode(v)} style={{
                      flex: 1, padding: '12px 16px', textAlign: 'left',
                      background: mode===v ? 'rgba(79,172,254,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${mode===v ? 'rgba(79,172,254,0.35)' : 'var(--b1)'}`,
                      borderRadius: 12, color: mode===v ? 'var(--t1)' : 'var(--t2)',
                      boxShadow: mode===v ? '0 0 20px rgba(79,172,254,0.08)' : 'none',
                    }}>
                      <div style={{ fontSize: 16, marginBottom: 4 }}>{icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                      <div style={{ fontSize: 11, color: mode===v ? 'var(--a)' : 'var(--t3)', marginTop: 2 }}>{sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Controles */}
              {mode === 'actual' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(79,172,254,0.06)', border: '1px solid rgba(79,172,254,0.15)', borderRadius: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--a)', animation: 'pulse 2s infinite', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: 'var(--a)', fontSize: 13 }}>{shift.label}</span>
                  <span style={{ color: 'var(--t3)', fontSize: 12 }}>{formatShiftRange(shift)}</span>
                </div>
              )}

              {mode === 'turno' && (
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label>Tipo de turno</label>
                    <select value={turnoType} onChange={e => setTurnoType(e.target.value)}>
                      <option value="lv">L-V Noche (20:00 → 07:00)</option>
                      <option value="sab">Sábado (07:00 → 07:00 dom)</option>
                      <option value="dom">Domingo (07:00 → 07:00 lun)</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Fecha inicio</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                </div>
              )}

              {mode === 'libre' && (
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}><label>Desde</label><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
                  <div style={{ flex: 1 }}><label>Hasta</label><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
                </div>
              )}

              {/* Columnas */}
              <div style={{ marginTop: 22, paddingTop: 20, borderTop: '1px solid var(--b1)' }}>
                <label style={{ marginBottom: 10 }}>Columnas a incluir en el Word</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ALL_COLUMNS.map(col => {
                    const on = selectedCols.includes(col.key)
                    return (
                      <button key={col.key} onClick={() => toggleCol(col.key)} style={{ padding: '5px 13px', fontSize: 12, fontWeight: 600, background: on ? 'rgba(79,172,254,0.1)' : 'rgba(255,255,255,0.03)', color: on ? 'var(--a)' : 'var(--t3)', border: `1px solid ${on ? 'rgba(79,172,254,0.3)' : 'var(--b1)'}`, borderRadius: 20 }}>
                        {on ? '✓ ' : ''}{col.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                <Btn onClick={search} disabled={loading}>
                  {loading ? '⟳ Buscando…' : '🔍 Buscar registros'}
                </Btn>
                {avisos.length > 0 && (
                  <Btn variant="ghost" onClick={doExport} disabled={exporting || !selectedCols.length}>
                    📄 {exporting ? 'Generando Word…' : 'Exportar Word'}
                  </Btn>
                )}
              </div>
            </Card>

            {loading && <Spinner />}

            {!loading && searched && (
              <div style={{ animation: 'fadeUp .25s ease' }}>
                {avisos.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Badge color="blue">{avisos.length} AVISOS</Badge>
                    <Badge color="green">✓ {avisos.filter(a => a.solucionado).length} RESUELTOS</Badge>
                    <Badge color="yellow">⏳ {avisos.filter(a => !a.solucionado).length} PENDIENTES</Badge>
                  </div>
                )}

                {avisos.length === 0 ? (
                  <Card style={{ padding: 48, textAlign: 'center', color: 'var(--t3)' }}>No hay avisos para este período.</Card>
                ) : (
                  <Card style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.025)', borderBottom: '1px solid var(--b1)' }}>
                            {ALL_COLUMNS.filter(c => selectedCols.includes(c.key)).map(col => (
                              <th key={col.key} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--t3)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>{col.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {avisos.map((av, i) => (
                            <tr key={av.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.025)', background: i%2===0 ? 'transparent' : 'rgba(255,255,255,0.012)' }}>
                              {ALL_COLUMNS.filter(c => selectedCols.includes(c.key)).map(col => (
                                <td key={col.key} style={{ padding: '10px 16px', verticalAlign: 'top', maxWidth: col.key==='averia'||col.key==='acciones' ? 260 : 'auto' }}>
                                  {fmtCell(col.key, av[col.key])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontFamily: 'var(--head)', fontSize: 20, fontWeight: 700, color: 'var(--t1)' }}>{children}</h2>
      <div style={{ height: 2, width: 36, background: 'var(--ag)', marginTop: 8, borderRadius: 2 }} />
    </div>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(!!sessionStorage.getItem('guardias_admin'))
  return <>
    <style>{G}</style>
    {authed
      ? <Dashboard onLogout={() => { sessionStorage.removeItem('guardias_admin'); setAuthed(false) }} />
      : <LoginScreen onLogin={() => setAuthed(true)} />
    }
  </>
}
