import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageOrientation
} from 'docx'
import { saveAs } from 'file-saver'

const COLUMN_LABELS = {
  fecha_aviso: 'Fecha',
  hora_aviso: 'Hora',
  servicio: 'Servicio',
  averia: 'Avería',
  acciones: 'Acciones Realizadas',
  tecnico_nombre: 'Técnico',
  created_at: 'Fecha Registro',
}

function formatValue(key, value) {
  if (!value) return '—'
  if (key === 'created_at') return new Date(value).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
  if (key === 'hora_aviso') return value.substring(0, 5)
  if (key === 'fecha_aviso') return new Date(value + 'T00:00:00').toLocaleDateString('es-ES')
  return String(value)
}

export async function exportToWord(avisos, selectedColumns, dateLabel) {
  const cols = selectedColumns.filter(c => COLUMN_LABELS[c])

  // A4 landscape: height=15840, margins 720 cada lado → contenido = 15840 - 1440 = 14400
  const TOTAL = 15000

const baseWidths = cols.map(c => {
    if (c === 'averia') return 3500
    if (c === 'acciones') return 4000
    if (c === 'servicio') return 2000
    if (c === 'fecha_aviso') return 900
    if (c === 'hora_aviso') return 700
    if (c === 'tecnico_nombre') return 2000
    if (c === 'created_at') return 900
    return 1500
  })

  const sumBase = baseWidths.reduce((a, b) => a + b, 0)
  const W = baseWidths.map(w => Math.floor((w / sumBase) * TOTAL))
  W[W.length - 1] += TOTAL - W.reduce((a, b) => a + b, 0)

  const brd = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
  const brds = { top: brd, bottom: brd, left: brd, right: brd }

  const headerRow = new TableRow({
    tableHeader: true,
    children: cols.map((col, i) =>
      new TableCell({
        borders: brds,
        width: { size: W[i], type: WidthType.DXA },
        shading: { fill: '1B3A5C', type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: COLUMN_LABELS[col], bold: true, color: 'FFFFFF', font: 'Arial', size: 20 })]
        })]
      })
    )
  })

  const dataRows = avisos.map((aviso, rowIdx) =>
    new TableRow({
      children: cols.map((col, i) =>
        new TableCell({
          borders: brds,
          width: { size: W[i], type: WidthType.DXA },
          shading: { fill: rowIdx % 2 === 0 ? 'FFFFFF' : 'F0F5FA', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            children: [new TextRun({ text: formatValue(col, aviso[col]), font: 'Arial', size: 18 })]
          })]
        })
      )
    })
  )

  const table = new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: W,
    rows: [headerRow, ...dataRows],
  })

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE },
          margin: { top: 500, right: 400, bottom: 500, left: 400 }
        }
      },
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'INFORME DE GUARDIAS — ELECTROMEDICINA', bold: true, size: 32, font: 'Arial', color: '1B3A5C' })]
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({
            text: `Período: ${dateLabel}   ·   Total avisos: ${avisos.length}   ·   Generado: ${new Date().toLocaleString('es-ES')}`,
            size: 18, font: 'Arial', color: '666666'
          })]
        }),
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1B3A5C', space: 1 } },
          spacing: { after: 240 },
          children: []
        }),
        table,
        new Paragraph({
          spacing: { before: 240 },
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: 'Polygon Servicio Técnico · Electromedicina', size: 16, font: 'Arial', color: '999999' })]
        }),
      ]
    }]
  })

  const buffer = await Packer.toBlob(doc)
  const filename = `guardias_${dateLabel.replace(/\//g, '-').replace(/ /g, '_')}.docx`
  saveAs(buffer, filename)
}
