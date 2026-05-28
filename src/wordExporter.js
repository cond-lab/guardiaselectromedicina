import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageOrientation
} from 'docx'
import { saveAs } from 'file-saver'

const COLUMN_LABELS = {
  fecha_aviso:    'Fecha',
  hora_aviso:     'Hora',
  servicio:       'Servicio',
  averia:         'Avería',
  acciones:       'Acciones',
  tecnico_nombre: 'Técnico',
  solucionado:    'Resuelto',
  fecha_fin:      'Fecha Fin',
  hora_fin:       'Hora Fin',
  created_at:     'Registro',
}

// Pesos relativos — se convierten a % sobre 100
const COL_PCT = {
  fecha_aviso:    7,
  hora_aviso:     5,
  servicio:       11,
  averia:         22,
  acciones:       26,
  tecnico_nombre: 11,
  solucionado:    6,
  fecha_fin:      7,
  hora_fin:       5,
  created_at:     10,
}

function formatValue(key, value) {
  if (value === null || value === undefined || value === '') return '—'
  if (key === 'solucionado') return value ? '✓ Sí' : '✗ No'
  if (key === 'created_at') return new Date(value).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
  if (key === 'hora_aviso' || key === 'hora_fin') return String(value).substring(0, 5)
  if (key === 'fecha_aviso' || key === 'fecha_fin') return new Date(value + 'T00:00:00').toLocaleDateString('es-ES')
  return String(value)
}

export async function exportToWord(avisos, selectedColumns, dateLabel) {
  const cols = selectedColumns.filter(c => COLUMN_LABELS[c])

  // Calcular porcentajes que sumen exactamente 100
  const totalPct = cols.reduce((s, c) => s + (COL_PCT[c] || 8), 0)
  const pcts = cols.map(c => Math.floor(((COL_PCT[c] || 8) / totalPct) * 100))
  const diff = 100 - pcts.reduce((a, b) => a + b, 0)
  pcts[pcts.length - 1] += diff

  const brd = { style: BorderStyle.SINGLE, size: 1, color: 'C8D8E8' }
  const brds = { top: brd, bottom: brd, left: brd, right: brd }
  const noBrd = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  const noBrds = { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd }

  const headerRow = new TableRow({
    tableHeader: true,
    height: { value: 400, rule: 'exact' },
    children: cols.map((col, i) =>
      new TableCell({
        borders: brds,
        width: { size: pcts[i], type: WidthType.PERCENTAGE },
        shading: { fill: '1B3A5C', type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            text: COLUMN_LABELS[col],
            bold: true, color: 'FFFFFF', font: 'Calibri', size: 17,
          })]
        })]
      })
    )
  })

  const dataRows = avisos.map((aviso, rowIdx) =>
    new TableRow({
      children: cols.map((col, i) =>
        new TableCell({
          borders: brds,
          width: { size: pcts[i], type: WidthType.PERCENTAGE },
          shading: { fill: rowIdx % 2 === 0 ? 'FFFFFF' : 'EEF4FB', type: ShadingType.CLEAR },
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            children: [new TextRun({
              text: formatValue(col, aviso[col]),
              font: 'Calibri', size: 16,
              color: col === 'solucionado'
                ? (aviso[col] ? '1a7a3c' : 'cc2222')
                : '1a2a3a',
              bold: col === 'solucionado',
            })]
          })]
        })
      )
    })
  )

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  })

  const resolved = avisos.filter(a => a.solucionado).length

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 20 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE },
          margin: { top: 720, right: 720, bottom: 720, left: 720 }
        }
      },
      children: [
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: 'INFORME DE GUARDIAS — ELECTROMEDICINA', bold: true, size: 28, font: 'Calibri', color: '1B3A5C' })]
        }),
        new Paragraph({
          spacing: { after: 20 },
          children: [
            new TextRun({ text: `Período: `, size: 19, font: 'Calibri', color: '333333', bold: true }),
            new TextRun({ text: dateLabel, size: 19, font: 'Calibri', color: '1B3A5C', bold: true }),
            new TextRun({ text: `   |   Avisos: ${avisos.length}   |   Resueltos: ${resolved}   |   Pendientes: ${avisos.length - resolved}`, size: 17, font: 'Calibri', color: '666666' }),
          ]
        }),
        new Paragraph({
          spacing: { after: 20 },
          children: [new TextRun({ text: `Generado: ${new Date().toLocaleString('es-ES')}   |   Polygon Servicio Técnico · Electromedicina`, size: 15, font: 'Calibri', color: '999999' })]
        }),
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '1B3A5C', space: 1 } },
          spacing: { after: 280 },
          children: []
        }),
        table,
      ]
    }]
  })

  const buffer = await Packer.toBlob(doc)
  saveAs(buffer, `guardias_${dateLabel.replace(/[\/\s·—]/g, '_')}.docx`)
}
