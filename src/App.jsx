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

// ─── COMPONENTES ATÓMICOS INTERACTIVOS ───────────────────────────────────────
function GlassPanel({ children, className = '' }) {
  return <div className={`core-glass-panel ${className}`}>{children}</div>
}

function ActionButton({ children, onClick, disabled, variant = 'primary', className = '' }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`action-btn-trigger btn-${variant} ${className}`}>
      {children}
    </button>
  )
}

function StatusBadge({ children, type = 'info' }) {
  return <span className={`ui-status-badge badge-style-${type}`}>{children}</span>
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="view-section-header">
      <div className="header-title-wrapper">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="header-decorative-line" />
    </div>
  )
}

// ─── PANTALLA DE ACCESO REIMAGINADA ──────────────────────────────────────────
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
        setErr('Credencial inválida o sin privilegios de extracción.')
        setLoading(false)
      }
    }, 500)
  }

  return (
    <div className="portal-auth-container">
      <div className="auth-central-nexus view-fade-in">
        <div className="auth-brand-shield">
          <span className="shield-icon">🏥</span>
        </div>
        <h1>GUARDIAS EM</h1>
        <p className="auth-brand-tagline">Módulo de Extracción Avanzada · Polygon</p>

        <div className="ui-input-field">
          <label>Clave de Seguridad del Sistema</label>
          <input 
            type="password" 
            value={pass}
            onChange={e => { setPass(e.target.value); setErr('') }}
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            placeholder="Introduce el token de acceso" 
            autoFocus 
          />
          {err && <p className="auth-critical-error">{err}</p>}
        </div>
        
        <ActionButton onClick={handleAuth} disabled={loading || !pass} variant="primary" className="w-full-element">
          {loading ? 'Sincronizando Pasarela…' : 'Autenticar Canal Seguro'}
        </ActionButton>
      </div>
    </div>
  )
}

// ─── GESTIÓN DE TÉCNICOS (LAYOUT ASIMÉTRICO TOTAL) ───────────────────────────
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
      setToast('Error en el registro: ' + error.message)
    } else {
      setToast('✓ Técnico integrado en el sistema con éxito')
      setForm({ nombre: '', email: '', password: '' })
      loadData()
    }
    setSaving(false)
    setTimeout(() => setToast(''), 4000)
  }

  const toggleStatus = async (id, currentStatus) => {
    await supabase.from('tecnicos').update({ activo: !currentStatus }).eq('id', id)
    loadData()
  }

  return (
    <div className="split-asymmetric-layout view-fade-in">
      {/* Columna Izquierda: Formulario Flotante de Alta */}
      <div className="layout-sidebar-form">
        <SectionHeader title="Nuevo Operario" subtitle="Alta de credenciales en el ecosistema corporativo." />
        <GlassPanel className="interactive-form-box">
          <div className="ui-input-field">
            <label>Nombre y Apellidos</label>
            <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Juan Pérez" />
          </div>
          <div className="ui-input-field">
            <label>Correo Electrónico</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="usuario@polygon.com" />
          </div>
          <div className="ui-input-field">
            <label>Contraseña de Acceso Temporal</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
          </div>
          <ActionButton onClick={handleRegister} disabled={saving} variant="primary" className="w-full-element mt-element">
            + Confirmar Alta de Operario
          </ActionButton>
          {toast && <div className="embedded-notification-toast">{toast}</div>}
        </GlassPanel>
      </div>

      {/* Columna Derecha: Lista Grid de Personal */}
      <div className="layout-main-workspace">
        <SectionHeader title="Plantilla de Personal Activo" subtitle={`Fichas registradas en base de datos (${tecnicos.length})`} />
        
        {loading ? (
          <div className="ui-global-spinner"><div className="spinner-ring" /></div>
        ) : (
          <div className="dynamic-cards-grid">
            {tecnicos.map(t => (
              <GlassPanel key={t.id} className="team-member-profile-card">
                <div className="card-profile-meta">
                  <div className="avatar-placeholder">{t.nombre.charAt(0)}</div>
                  <div className="meta-identity">
                    <h3>{t.nombre}</h3>
                    <p>{t.email}</p>
                  </div>
                </div>
                <div className="card-profile-actions">
                  <StatusBadge type={t.activo ? 'success' : 'danger'}>
                    {t.activo ? 'OPERATIVO' : 'SUSPENDIDO'}
                  </StatusBadge>
                  <ActionButton onClick={() => toggleStatus(t.id, t.activo)} variant="ghost" className="btn-micro-size">
                    {t.activo ? 'Baja' : 'Activar'}
                  </ActionButton>
                </div>
              </GlassPanel>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── DASHBOARD DE EXTRACCIÓN AVANZADO ────────────────────────────────────────
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
      label: `Intervalo Libre: ${new Date(dateRangeFrom+'T12:00:00').toLocaleDateString('es-ES')} al ${new Date(dateRangeTo+'T12:00:00').toLocaleDateString('es-ES')}`
    }
  }

  const executeDatabaseSearch = async () => {
    setExecutingQuery(true)
    setHasQueried(true)
    const { from, to } = resolveTimeParameters()
    const { data, error } = await supabase.from('avisos').select('*')
      .gte('fecha_aviso', from).lte('fecha_aviso', to)
      .order('fecha_aviso').order('hora_aviso')
    
    if (error) console.error('Supabase Query Critical Error:', error)
    setQueryResults(data || [])
    setExecutingQuery(false)
  }

  const executeFileExport = async () => {
    setGeneratingFile(true)
    await exportToWord(queryResults, activeColumns, resolveTimeParameters().label)
    setGeneratingFile(false)
  }

  const renderDataCell = (columnKey, dataValue) => {
    if (dataValue === null || dataValue === undefined || dataValue === '') return <span className="cell-null-void">—</span>
    if (columnKey === 'solucionado') return <StatusBadge type={dataValue ? 'success' : 'danger'}>{dataValue ? 'SÍ' : 'NO'}</StatusBadge>
    if (columnKey === 'hora_aviso' || columnKey === 'hora_fin') return <span className="typography-mono color-alert">{String(dataValue).substring(0, 5)}</span>
    if (columnKey === 'fecha_aviso' || columnKey === 'fecha_fin') return <span className="typography-mono color-highlight">{new Date(dataValue + 'T12:00:00').toLocaleDateString('es-ES')}</span>
    if (columnKey === 'created_at') return <span className="typography-mono text-dimmed text-small-size">{new Date(dataValue).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>
    return <span className={`cell-block-text ${columnKey === 'averia' || columnKey === 'acciones' ? 'allow-text-wrapping' : ''}`}>{dataValue}</span>
  }

  return (
    <div className="workspace-mainframe">
      <div className="aesthetic-neon-top-bar" />

      {/* Cabecera de Navegación Unificada */}
      <header className="navigation-glass-blur-hub">
        <div className="hub-brand-area">
          <div className="brand-icon-wrapper">🏥</div>
          <div className="brand-typography-wrapper">
            <span className="brand-main-title">GUARDIAS EM</span>
            <span className="brand-sub-title">Polygon Servicio Técnico</span>
          </div>
        </div>

        <div className="hub-control-tabs">
          <button onClick={() => setCurrentTab('extraer')} className={`tab-button-item ${currentTab === 'extraer' ? 'active-state' : ''}`}>
            📊 Extracción de Datos
          </button>
          <button onClick={() => setCurrentTab('tecnicos')} className={`tab-button-item ${currentTab === 'tecnicos' ? 'active-state' : ''}`}>
            👥 Gestión de Técnicos
          </button>
          <button onClick={onLogout} className="tab-button-logout">Cerrar Sesión ↩</button>
        </div>
      </header>

      {/* Área de Visualización Modular */}
      <main className="view-content-viewport">
        {currentTab === 'tecnicos' && <TecnicoManager />}

        {currentTab === 'extraer' && (
          <div className="view-fade-in">
            <SectionHeader title="Consola de Extracción Avanzada" subtitle="Configura la ventana de consulta y personaliza las columnas de salida del informe técnico." />

            <div className="control-interactive-grid">
              
              {/* Bloque Izquierdo: Configuración del Filtro de Tiempo */}
              <GlassPanel className="control-card-block p-card-spacing">
                <h3>1. Selección de Ventana de Consulta</h3>
                <p className="block-helper-text">Escoge el modo en que el motor de base de datos filtrará los registros activos.</p>
                
                <div className="segmented-control-rail">
                  {[
                    { id: 'actual', label: '⚡ Guardia Activa' },
                    { id: 'turno',  label: '📅 Por Turno Fijo' },
                    { id: 'libre',  label: '🗓 Rango Libre' }
                  ].map(tabMode => (
                    <button key={tabMode.id} onClick={() => setFilterMode(tabMode.id)} className={`rail-segment-item ${filterMode === tabMode.id ? 'active' : ''}`}>
                      {tabMode.label}
                    </button>
                  ))}
                </div>

                {/* Sub-paneles Condicionales */}
                <div className="conditional-fields-wrapper">
                  {filterMode === 'actual' && (
                    <div className="status-live-banner view-fade-in">
                      <div className="banner-core-group">
                        <span className="live-status-pulse" />
                        <div>
                          <p className="live-banner-title">{currentLiveShift.label}</p>
                          <p className="live-banner-subtitle">{formatShiftRange(currentLiveShift)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {filterMode === 'turno' && (
                    <div className="form-fields-flex-row view-fade-in">
                      <div className="ui-input-field flexible-grow">
                        <label>Turno Rotativo</label>
                        <select value={shiftSelection} onChange={e => setShiftSelection(e.target.value)}>
                          <option value="lv">Lunes a Viernes (Noche)</option>
                          <option value="sab">Sábados (Ciclo Completo 24h)</option>
                          <option value="dom">Domingos (Ciclo Completo 24h)</option>
                        </select>
                      </div>
                      <div className="ui-input-field flexible-grow">
                        <label>Fecha de Guardia</label>
                        <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
                      </div>
                    </div>
                  )}

                  {filterMode === 'libre' && (
                    <div className="form-fields-flex-row view-fade-in">
                      <div className="ui-input-field flexible-grow">
                        <label>Desde (Fecha Inicio)</label>
                        <input type="date" value={dateRangeFrom} onChange={e => setDateRangeFrom(e.target.value)} />
                      </div>
                      <div className="ui-input-field flexible-grow">
                        <label>Hasta (Fecha Término)</label>
                        <input type="date" value={dateRangeTo} onChange={e => setDateRangeTo(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              </GlassPanel>

              {/* Bloque Derecho: Estructura y Columnas */}
              <GlassPanel className="control-card-block p-card-spacing">
                <h3>2. Columnas e Inclusión de Datos</h3>
                <p className="block-helper-text">Marca las propiedades que quieres visualizar e imprimir en el documento final.</p>
                
                <div className="interactive-checkbox-matrix">
                  {ALL_COLUMNS.map(col => {
                    const isSelected = activeColumns.includes(col.key)
                    return (
                      <button key={col.key} onClick={() => handleColumnToggle(col.key)} className={`matrix-checkbox-tile ${isSelected ? 'is-checked' : ''}`}>
                        <div className="checkbox-indicator-box"><span className="checkbox-inner-dot" /></div>
                        <span className="checkbox-tile-label">{col.label}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="control-actions-execution-bar">
                  <ActionButton onClick={executeDatabaseSearch} disabled={executingQuery} variant="primary">
                    {executingQuery ? 'Consultando...' : '🔍 Lanzar Extracción'}
                  </ActionButton>
                  {queryResults.length > 0 && (
                    <ActionButton onClick={executeFileExport} disabled={generatingFile || !activeColumns.length} variant="secondary">
                      📄 {generatingFile ? 'Generando Word…' : 'Compilar Documento Word'}
                    </ActionButton>
                  )}
                </div>
              </GlassPanel>

            </div>

            {/* Zona Inferior Dinámica de Resultados */}
            {executingQuery && <div className="ui-global-spinner"><div className="spinner-ring" /></div>}

            {!executingQuery && hasQueried && (
              <div className="results-view-wrapper view-fade-in">
                {queryResults.length > 0 && (
                  <div className="metrics-summary-ribbon">
                    <StatusBadge type="info">{queryResults.length} Registros Localizados</StatusBadge>
                    <StatusBadge type="success">{queryResults.filter(r => r.solucionado).length} Solventados</StatusBadge>
                    <StatusBadge type="danger">{queryResults.filter(r => !r.solucionado).length} Abiertos</StatusBadge>
                  </div>
                )}

                {queryResults.length === 0 ? (
                  <GlassPanel className="empty-query-placeholder-box">
                    <span className="placeholder-icon">📂</span>
                    <p>No se encontraron avisos registrados en los parámetros temporales configurados.</p>
                  </GlassPanel>
                ) : (
                  <GlassPanel className="table-wrapper-overflow-container">
                    <div className="scrollable-table-canvas">
                      <table className="custom-data-matrix">
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
                              {ALL_COLUMNS.filter(c => activeColumns.includes(c.key)).map(col => (
                                <td key={col.key}>
                                  {renderDataCell(col.key, row[col.key])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
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

export default function App() {
  const [authed, setAuthed] = useState(!!sessionStorage.getItem('guardias_admin'))
  return authed
    ? <Dashboard onLogout={() => { sessionStorage.removeItem('guardias_admin'); setAuthed(false) }} />
    : <LoginScreen onLogin={() => setAuthed(true)} />
}
