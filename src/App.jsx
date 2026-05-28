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

// ─── PANTALLA DE ACCESO: INVERSIÓN DE DISEÑO CRÍTICA ─────────────────────────
function LoginScreen({ onLogin }) {
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = () => {
    setLoading(true)
    setTimeout(() => {
      if (pass === ADMIN_PASSWORD) {
        sessionStorage.setItem('guardias_admin', '1')
        onLogin()
      } else {
        setErr('Acceso denegado. Credencial incorrección o bypass detectado.')
        setLoading(false)
      }
    }, 600)
  }

  return (
    <div className="brutalist-auth-matrix">
      <div className="split-auth-side-banner">
        <div className="banner-matrix-code">EM_SYSTEM_v4.0</div>
        <h2>SISTEMA DE EXTRACCIÓN DE DATOS DE GUARDIA</h2>
      </div>
      <div className="split-auth-interactive-panel">
        <div className="form-brutalist-wrapper">
          <span className="system-terminal-tag">[SECURITY GATEWAY]</span>
          <h1>Autenticación Requerida</h1>
          <p>Introduce el token criptográfico para inicializar la pasarela de datos.</p>
          
          <div className="brutalist-input-group">
            <input 
              type="password" 
              value={pass}
              onChange={e => { setPass(e.target.value); setErr('') }}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              placeholder="••••••••••••••••" 
              autoFocus 
            />
            {err && <div className="terminal-error-message">!! {err}</div>}
          </div>

          <button onClick={handleAuth} disabled={loading || !pass} className="btn-brutalist-action">
            {loading ? 'DESENCRIPTANDO CANAL...' : 'CONECTAR AL NÚCLEO →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── GESTIÓN DE TÉCNICOS: FLUJO DE CONTROL INTERACTIVO ────────────────────────
function TecnicoManager() {
  const [tecnicos, setTecnicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nombre: '', email: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const loadData = useCallback(async () => {
    const { data } = await supabase.from('tecnicos').select('*').order('nombre')
    setTecnicos(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const generateSecureHash = async text => {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const handleRegister = async () => {
    if (!form.nombre || !form.email || !form.password) return
    setSaving(true)
    const password_hash = await generateSecureHash(form.password)
    const { error } = await supabase.from('tecnicos').insert({ 
      nombre: form.nombre, 
      email: form.email.toLowerCase(), 
      password_hash 
    })
    
    if (error) {
      setToast('Error: ' + error.message)
    } else {
      setToast('✓ Operario insertado en el clúster activo')
      setForm({ nombre: '', email: '', password: '' })
      loadData()
    }
    setSaving(false)
    setTimeout(() => setToast(''), 3500)
  }

  const toggleStatus = async (id, currentStatus) => {
    await supabase.from('tecnicos').update({ activo: !currentStatus }).eq('id', id)
    loadData()
  }

  return (
    <div className="asymmetric-operator-workspace">
      {/* Módulo A: Alta de Personal Estilo Consola Inyectada */}
      <div className="operator-control-tower">
        <div className="tower-header-badge">INYECCIÓN DE OPERARIOS</div>
        <p className="tower-description">Vincula credenciales directamente a la pasarela de autenticación móvil.</p>
        
        <div className="tower-fields-stack">
          <div className="cyber-field">
            <span>ALIAS / NOMBRE COMPLETO</span>
            <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Escriba aquí..." />
          </div>
          <div className="cyber-field">
            <span>CORREO ELECTRÓNICO</span>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="correo@polygon.com" />
          </div>
          <div className="cyber-field">
            <span>CLAVE TEMPORAL</span>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
          </div>

          <button onClick={handleRegister} disabled={saving} className="btn-cyber-inject">
            {saving ? 'INYECTANDO...' : 'REGISTRAR NUEVO OPERARIO'}
          </button>
          
          {toast && <div className="tower-toast-log">{toast}</div>}
        </div>
      </div>

      {/* Módulo B: Tablero Dinámico Desestructurado */}
      <div className="operator-display-grid">
        <div className="display-grid-meta">
          <h3>Nodos de Personal ({tecnicos.length})</h3>
          <div className="meta-divider" />
        </div>

        {loading ? (
          <div className="radar-loader-box"><div className="radar-pulse-ring" /></div>
        ) : (
          <div className="cyber-cards-masonry">
            {tecnicos.map(t => (
              <div key={t.id} className={`node-card-profile ${t.activo ? 'state-active' : 'state-disabled'}`}>
                <div className="node-card-body">
                  <div className="node-indicator" />
                  <div className="node-info">
                    <h4>{t.nombre}</h4>
                    <p>{t.email}</p>
                  </div>
                </div>
                <div className="node-card-footer">
                  <span className="status-label">{t.activo ? 'ACTIVO' : 'INACTIVO'}</span>
                  <button onClick={() => toggleStatus(t.id, t.activo)} className="btn-node-toggle">
                    {t.activo ? '[SUSPENDER]' : '[HABILITAR]'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── CONSOLA DE EXTRACCIÓN: INTERFAZ DE FILTRADO RADICAL ──────────────────────
function Dashboard({ onLogout }) {
  const [currentTab, setCurrentTab] = useState('extraer')
  const [filterMode, setFilterMode] = useState('actual')
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0])
  const [dateRangeFrom, setDateRangeFrom] = useState(new Date().toISOString().split('T')[0])
  const [dateRangeTo, setDateRangeTo] = useState(new Date().toISOString().split('T')[0])
  const [shiftSelection, setShiftSelection] = useState('lv')
  const [activeColumns, setActiveColumns] = useState(ALL_COLUMNS.map(c => c.key))
  const [queryResults, setQueryResults] = useState([])
  const [executingQuery, setExecutingQuery] = useState(false)
  const [hasQueried, setHasQueried] = useState(false)
  const [generatingFile, setGeneratingFile] = useState(false)
  const currentLiveShift = getCurrentShift()

  const handleColumnToggle = columnKey => {
    setActiveColumns(prev => prev.includes(columnKey) ? prev.filter(k => k !== columnKey) : [...prev, columnKey])
  }

  const resolveTimeParameters = () => {
    if (filterMode === 'actual') return { from: currentLiveShift.from, to: currentLiveShift.to, label: currentLiveShift.label }
    if (filterMode === 'turno') {
      const target = new Date(targetDate + 'T12:00:00')
      const padLeft = val => String(val).padStart(2, '0')
      const nextDay = new Date(target); nextDay.setDate(nextDay.getDate() + 1)
      const parseDateString = d => `${d.getFullYear()}-${padLeft(d.getMonth()+1)}-${padLeft(d.getDate())}`
      const shiftLabels = { lv: 'Guardia Laborable L-V', sab: 'Guardia Fin de Semana (Sábado)', dom: 'Guardia Fin de Semana (Domingo)' }
      return { 
        from: targetDate, 
        to: parseDateString(nextDay), 
        label: `${shiftLabels[shiftSelection]} [${new Date(targetDate+'T12:00:00').toLocaleDateString('es-ES')}]` 
      }
    }
    return {
      from: dateRangeFrom, 
      to: dateRangeTo,
      label: `Rango Libre: ${new Date(dateRangeFrom+'T12:00:00').toLocaleDateString('es-ES')} a ${new Date(dateRangeTo+'T12:00:00').toLocaleDateString('es-ES')}`
    }
  }

  const executeDatabaseSearch = async () => {
    setExecutingQuery(true)
    setHasQueried(true)
    const { from, to } = resolveTimeParameters()
    const { data, error } = await supabase.from('avisos').select('*')
      .gte('fecha_aviso', from).lte('fecha_aviso', to)
      .order('fecha_aviso').order('hora_aviso')
    
    if (error) console.error(error)
    setQueryResults(data || [])
    setExecutingQuery(false)
  }

  const executeFileExport = async () => {
    setGeneratingFile(true)
    await exportToWord(queryResults, activeColumns, resolveTimeParameters().label)
    setGeneratingFile(false)
  }

  return (
    <div className="quantum-mainframe-layout">
      {/* Barra de Comandos Superior Alternativa */}
      <nav className="command-center-navbar">
        <div className="navbar-identity-block">
          <div className="identity-pulse-core" />
          <div>
            <h2>NÚCLEO EXTRACCIÓN</h2>
            <span>POLYGON MEDICAL MAINTENANCE</span>
          </div>
        </div>

        <div className="navbar-navigation-triggers">
          <button onClick={() => setCurrentTab('extraer')} className={`nav-trigger-item ${currentTab === 'extraer' ? 'state-selected' : ''}`}>
            [01] PANEL EXTRACCIÓN
          </button>
          <button onClick={() => setCurrentTab('tecnicos')} className={`nav-trigger-item ${currentTab === 'tecnicos' ? 'state-selected' : ''}`}>
            [02] NODOS OPERARIOS
          </button>
          <button onClick={onLogout} className="nav-trigger-logout">DISCONNECT ✕</button>
        </div>
      </nav>

      {/* Visor de Modos Principal */}
      <main className="mainframe-viewport-content">
        {currentTab === 'tecnicos' && <TecnicoManager />}

        {currentTab === 'extraer' && (
          <div className="query-builder-dashboard">
            
            {/* PANEL DE MANDOS ASIMÉTRICO DE DOS BLOQUES DESIGUALES */}
            <div className="query-configuration-grid">
              
              {/* Bloque Izquierdo: Interruptores de Modo de Tiempo */}
              <div className="matrix-control-panel">
                <div className="panel-accent-tag">PASO 01 // CRITERIO TEMPORAL</div>
                
                <div className="brutalist-radio-list">
                  {[
                    { id: 'actual', title: 'Guardia en Curso Activa', desc: 'Sincroniza en tiempo real el turno del equipo electromédico actual.' },
                    { id: 'turno',  title: 'Parámetro de Turno Específico', desc: 'Aísla guardias históricas rotativas L-V o fines de semana completos.' },
                    { id: 'libre',  title: 'Extractor entre Intervalos Libres', desc: 'Rango libre sin restricciones horarias ni solapamientos de turnos.' }
                  ].map(mode => (
                    <div key={mode.id} onClick={() => setFilterMode(mode.id)} className={`radio-brutalist-card ${filterMode === mode.id ? 'is-selected' : ''}`}>
                      <div className="radio-visual-dot" />
                      <div className="radio-card-content">
                        <h4>{mode.title}</h4>
                        <p>{mode.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Inyección Dinámica de Parámetros Interactivos en la Base del Filtro */}
                <div className="dynamic-parameter-injection-zone">
                  {filterMode === 'actual' && (
                    <div className="live-status-card-embedded">
                      <div className="live-flash-badge">LIVE REFRESHING</div>
                      <h3>{currentLiveShift.label}</h3>
                      <p>{formatShiftRange(currentLiveShift)}</p>
                    </div>
                  )}

                  {filterMode === 'turno' && (
                    <div className="inline-fields-brutalist">
                      <div className="brutalist-field">
                        <label>Turno Rotativo</label>
                        <select value={shiftSelection} onChange={e => setShiftSelection(e.target.value)}>
                          <option value="lv">Lunes a Viernes (Noche)</option>
                          <option value="sab">Sábados (24 Horas)</option>
                          <option value="dom">Domingos (24 Horas)</option>
                        </select>
                      </div>
                      <div className="brutalist-field">
                        <label>Fecha de Guardia</label>
                        <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
                      </div>
                    </div>
                  )}

                  {filterMode === 'libre' && (
                    <div className="inline-fields-brutalist">
                      <div className="brutalist-field">
                        <label>Fecha de Inicio (GTE)</label>
                        <input type="date" value={dateRangeFrom} onChange={e => setDateRangeFrom(e.target.value)} />
                      </div>
                      <div className="brutalist-field">
                        <label>Fecha de Fin (LTE)</label>
                        <input type="date" value={dateRangeTo} onChange={e => setDateRangeTo(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bloque Derecho: Selector Estructural Multitarea */}
              <div className="matrix-control-panel">
                <div className="panel-accent-tag">PASO 02 // MAPEADO DE EXPORTACIÓN Y COLUMNAS</div>
                <p className="matrix-panel-description">Filtra qué datos se omitirán del clúster antes de realizar la conversión de registros.</p>
                
                <div className="columns-pill-cloud">
                  {ALL_COLUMNS.map(col => {
                    const active = activeColumns.includes(col.key)
                    return (
                      <button key={col.key} onClick={() => handleColumnToggle(col.key)} className={`column-pill-item ${active ? 'is-active' : ''}`}>
                        <span className="pill-status-dot" />
                        {col.label}
                      </button>
                    )
                  })}
                </div>

                <div className="action-trigger-execution-zone">
                  <button onClick={executeDatabaseSearch} disabled={executingQuery} className="btn-execute-query">
                    {executingQuery ? 'PROCESANDO CONSULTA...' : 'EJECUTAR EXTRACCIÓN DE PARÁMETROS'}
                  </button>
                  
                  {queryResults.length > 0 && (
                    <button onClick={executeFileExport} disabled={generatingFile || !activeColumns.length} className="btn-export-word-brutalist">
                      {generatingFile ? 'COMPILANDO WORD...' : 'DESCARGAR INFORME .DOCX'}
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* ÁREA INFERIOR: VISOR DE BASE DE DATOS DOCK COMPACTO */}
            {executingQuery && <div className="radar-loader-box"><div className="radar-pulse-ring" /></div>}

            {!executingQuery && hasQueried && (
              <div className="query-output-terminal-workspace">
                
                <div className="terminal-results-ribbon">
                  <div className="ribbon-metric-tag">[ENCONTRADOS: <strong>{queryResults.length}</strong>]</div>
                  <div className="ribbon-metric-tag state-ok">[SOLVENTADOS: {queryResults.filter(r => r.solucionado).length}]</div>
                  <div className="ribbon-metric-tag state-err">[ABIERTOS: {queryResults.filter(r => !r.solucionado).length}]</div>
                </div>

                {queryResults.length === 0 ? (
                  <div className="terminal-empty-log-state">
                    NO_RECORDS_FOUND: No existen partes de asistencia técnica registrados para los parámetros de tiempo inyectados.
                  </div>
                ) : (
                  <div className="brutalist-data-table-container">
                    <table className="terminal-data-table">
                      <thead>
                        <tr>
                          {ALL_COLUMNS.filter(c => activeColumns.includes(c.key)).map(col => (
                            <th key={col.key}>{col.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResults.map(row => (
                          <tr key={row.id}>
                            {ALL_COLUMNS.filter(c => activeColumns.includes(c.key)).map(col => {
                              const val = row[col.key]
                              
                              // Renderizado In-Line desestructurado
                              if (val === null || val === undefined || val === '') {
                                return <td key={col.key} className="cell-void">NULL</td>
                              }
                              if (col.key === 'solucionado') {
                                return (
                                  <td key={col.key}>
                                    <span className={`table-inline-badge ${val ? 'ok' : 'err'}`}>
                                      {val ? 'SÍ' : 'NO'}
                                    </span>
                                  </td>
                                )
                              }
                              if (col.key === 'hora_aviso' || col.key === 'hora_fin') {
                                return <td key={col.key} className="cell-mono-time">{String(val).substring(0, 5)}</td>
                              }
                              if (col.key === 'fecha_aviso' || col.key === 'fecha_fin') {
                                return <td key={col.key} className="cell-mono-date">{new Date(val + 'T12:00:00').toLocaleDateString('es-ES')}</td>
                              }
                              return (
                                <td key={col.key} className={col.key === 'averia' || col.key === 'acciones' ? 'cell-dense-description' : ''}>
                                  {val}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
