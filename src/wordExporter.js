import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  HeadingLevel, PageOrientation
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
  if (key === 'created_at') {
    return new Date(value).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
  }
  if (key === 'hora_aviso') {
    return value.substring(0, 5) // HH:MM
  }
  if (key === 'fecha_aviso') {
    return new Date(value + 'T00:00:00').toLocaleDateString('es-ES')
  }
  return String(value)
}

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
const borders = { top: border, bottom: border, left: border, right: border }

export async function exportToWord(avisos, selectedColumns, dateLabel) {
  const cols = selectedColumns.filter(c => COLUMN_LABELS[c])

  // Calcular anchos de columna (A4 landscape content width ~13920 DXA)
  const totalWidth = 13920
  const colWidths = cols.map(c => {
    if (c === 'averia') return Math.floor(totalWidth * 0.25)
    if (c === 'acciones') return Math.floor(totalWidth * 0.30)
    if (c === 'servicio') return Math.floor(totalWidth * 0.15)
    return Math.floor(totalWidth * (1 / cols.length))
  })

  // Ajustar último para que sumen exacto
  const sumWidths = colWidths.reduce((a, b) => a + b, 0)
  colWidths[colWidths.length - 1] += totalWidth - sumWidths

  // Fila de cabecera
  const headerRow = new TableRow({
    tableHeader: true,
    children: cols.map((col, i) =>
      new TableCell({
        borders,
        width: { size: colWidths[i], type: WidthType.DXA },
        shading: { fill: '1B3A5C', type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            text: COLUMN_LABELS[col],
            bold: true,
            color: 'FFFFFF',
            font: 'Arial',
            size: 20,
          })]
        })]
      })
    )
  })

  // Filas de datos
  const dataRows = avisos.map((aviso, rowIdx) =>
    new TableRow({
      children: cols.map((col, i) =>
        new TableCell({
          borders,
          width: { size: colWidths[i], type: WidthType.DXA },
          shading: {
            fill: rowIdx % 2 === 0 ? 'FFFFFF' : 'F0F5FA',
            type: ShadingType.CLEAR
          },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            children: [new TextRun({
              text: formatValue(col, aviso[col]),
              font: 'Arial',
              size: 18,
            })]
          })]
        })
      )
    })
  )

  const table = new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
  })

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } }
    },
    sections: [{
      properties: {
        page: {
          size: {
            width: 12240,
            height: 15840,
            orientation: PageOrientation.LANDSCAPE,
          },
          margin: { top: 720, right: 720, bottom: 720, left: 720 }
        }
      },
      children: [
        new Paragraph({
          children: [new TextRun({
            text: 'INFORME DE GUARDIAS — ELECTROMEDICINA',
            bold: true,
            size: 32,
            font: 'Arial',
            color: '1B3A5C',
          })]
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({
            text: `Período: ${dateLabel}   ·   Total avisos: ${avisos.length}   ·   Generado: ${new Date().toLocaleString('es-ES')}`,
            size: 18,
            font: 'Arial',
            color: '666666',
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
          children: [new TextRun({
            text: `Polygon Servicio Técnico · Electromedicina`,
            size: 16,
            font: 'Arial',
            color: '999999',
          })]
        }),
      ]
    }]
  })

  const buffer = await Packer.toBlob(doc)
  const filename = `guardias_${dateLabel.replace(/\//g, '-').replace(/ /g, '_')}.docx`
  saveAs(buffer, filename)
}
