// Lógica de turnos de guardia electromedicina
// L-V: 20:00 → 07:00 siguiente día
// Sábado: 07:00 sáb → 07:00 dom
// Domingo: 07:00 dom → 07:00 lun

export function getCurrentShift() {
  const now = new Date()
  return getShiftForDate(now)
}

export function getShiftForDate(date) {
  const d = new Date(date)
  const dow = d.getDay() // 0=dom, 1=lun, ..., 6=sab
  const h = d.getHours()
  const m = d.getMinutes()
  const timeMin = h * 60 + m

  const pad = n => String(n).padStart(2, '0')
  const fmtDate = dt => `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`

  // Sábado (dow=6): guardia 07:00 sab → 07:00 dom
  if (dow === 6) {
    if (timeMin >= 7 * 60) {
      // Dentro del sábado después de las 7
      const start = new Date(d); start.setHours(7, 0, 0, 0)
      const end = new Date(d); end.setDate(end.getDate() + 1); end.setHours(7, 0, 0, 0)
      return { label: 'Guardia Sábado', from: fmtDate(start), to: fmtDate(end), type: 'weekend' }
    } else {
      // Madrugada del sábado = fin de guardia viernes noche
      const start = new Date(d); start.setDate(start.getDate() - 1); start.setHours(20, 0, 0, 0)
      const end = new Date(d); end.setHours(7, 0, 0, 0)
      return { label: 'Guardia Viernes Noche', from: fmtDate(start), to: fmtDate(end), type: 'weeknight' }
    }
  }

  // Domingo (dow=0): guardia 07:00 dom → 07:00 lun
  if (dow === 0) {
    if (timeMin >= 7 * 60) {
      const start = new Date(d); start.setHours(7, 0, 0, 0)
      const end = new Date(d); end.setDate(end.getDate() + 1); end.setHours(7, 0, 0, 0)
      return { label: 'Guardia Domingo', from: fmtDate(start), to: fmtDate(end), type: 'weekend' }
    } else {
      // Madrugada domingo = fin de guardia sábado
      const start = new Date(d); start.setDate(start.getDate() - 1); start.setHours(7, 0, 0, 0)
      const end = new Date(d); end.setHours(7, 0, 0, 0)
      return { label: 'Guardia Sábado', from: fmtDate(start), to: fmtDate(end), type: 'weekend' }
    }
  }

  // Lunes-Viernes (dow=1-5)
  if (timeMin >= 20 * 60) {
    // Después de las 20:00 → guardia esta noche
    const start = new Date(d); start.setHours(20, 0, 0, 0)
    const end = new Date(d); end.setDate(end.getDate() + 1); end.setHours(7, 0, 0, 0)
    const dayNames = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
    return { label: `Guardia ${dayNames[dow]} Noche`, from: fmtDate(start), to: fmtDate(end), type: 'weeknight' }
  } else if (timeMin < 7 * 60) {
    // Madrugada → fin de guardia de anoche
    const start = new Date(d); start.setDate(start.getDate() - 1); start.setHours(20, 0, 0, 0)
    const end = new Date(d); end.setHours(7, 0, 0, 0)
    const prevDow = dow === 1 ? 5 : dow - 1
    const dayNames = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
    return { label: `Guardia ${dayNames[prevDow]} Noche`, from: fmtDate(start), to: fmtDate(end), type: 'weeknight' }
  } else {
    // Horario diurno L-V, no hay guardia activa — mostrar próxima
    const start = new Date(d); start.setHours(20, 0, 0, 0)
    const end = new Date(d); end.setDate(end.getDate() + 1); end.setHours(7, 0, 0, 0)
    const dayNames = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
    return { label: `Próxima guardia: ${dayNames[dow]} Noche`, from: fmtDate(start), to: fmtDate(end), type: 'weeknight' }
  }
}

// Dada una fecha, calcula el rango completo de su guardia
export function getShiftRange(dateStr) {
  return getShiftForDate(new Date(dateStr + 'T12:00:00'))
}

// Formatea rango para mostrar
export function formatShiftRange(shift) {
  const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit' })
  return `${fmt(shift.from)} → ${fmt(shift.to)}`
}
