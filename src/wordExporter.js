import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageOrientation
} from 'docx'
import { saveAs } from 'file-saver'

const COLUMN_LABELS = {
  fecha_aviso:    'Fecha Aviso',
  hora_aviso:     'Hora Aviso',
  servicio:       'Servicio',
  averia:         'Avería',
  acciones:       'Acciones Realizadas',
  tecnico_nombre: 'Técnico',
  solucionado:    'Solucionado',
  fecha_fin:      'Fecha Fin',
  hora_fin:       'Hora Fin',
  created_at:     'Registro',
}

// Anchos fijos en DXA — NO usar columnWidths en Table (causa error negativo)
const COL_WIDTHS = {
  fecha_aviso:    1350,
  hora_aviso:     900,
  servicio:       1800,
  averia:         3200,
  acciones:       3600,
  tecnico_nombre: 1800,
  solucionado:    1000,
  fecha_fin:      1350,
  hora_fin:       900,
  created_at:     1400,
}

function formatValue(key, value) {
  if (value === null || value === undefined || value === '') return '—'
  if (key === 'solucionado') return value ? '✓ Sí' : '✗ No'
  if (key === 'created_at') return new Date(value).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
  if (key === 'hora_aviso' || key === 'hora_fin') return String(value).substring(0, 5)
  if (key === 'fecha_aviso' || key === 'fecha_fin') {
    return new Date(value + 'T00:00:00').toLocaleDateString('es-ES')
  }
  return String(value)
}

export async function exportToWord(avisos, selectedColumns, dateLabel) {
  const cols = selectedColumns.filter(c => COLUMN_LABELS[c])

  const brd = { style: BorderStyle.SINGLE, size: 1, color: 'C5D5E8' }
  const brds = { top: brd, bottom: brd, left: brd, right: brd }

  const headerRow = new TableRow({
    tableHeader: true,
    children: cols.map(col =>
      new TableCell({
        borders: brds,
        width: { size: COL_WIDTHS[col] || 1500, type: WidthType.DXA },
        shading: { fill: '1B3A5C', type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            text: COLUMN_LABELS[col],
            bold: true, color: 'FFFFFF', font: 'Calibri', size: 18,
          })]
        })]
      })
    )
  })

  const dataRows = avisos.map((aviso, rowIdx) =>
    new TableRow({
      children: cols.map(col =>
        new TableCell({
          borders: brds,
          width: { size: COL_WIDTHS[col] || 1500, type: WidthType.DXA },
          shading: { fill: rowIdx % 2 === 0 ? 'FFFFFF' : 'EEF4FB', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            children: [new TextRun({
              text: formatValue(col, aviso[col]),
              font: 'Calibri', size: 17,
              color: col === 'solucionado' && aviso[col] ? '1a7a3c' : '1a2a3a',
            })]
          })]
        })
      )
    })
  )

  // ⚠️ NO pasar columnWidths al Table — causa error de valor negativo
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  })

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 20 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE },
          margin: { top: 600, right: 600, bottom: 600, left: 600 }
        }
      },
      children: [
        new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({
            text: 'INFORME DE GUARDIAS — ELECTROMEDICINA',
            bold: true, size: 30, font: 'Calibri', color: '1B3A5C',
          })]
        }),
        new Paragraph({
          spacing: { after: 20 },
          children: [new TextRun({
            text: `Período: ${dateLabel}`,
            size: 20, font: 'Calibri', color: '1B3A5C', bold: true,
          }),
          new TextRun({
            text: `   ·   Total avisos: ${avisos.length}   ·   Resueltos: ${avisos.filter(a => a.solucionado).length}   ·   Generado: ${new Date().toLocaleString('es-ES')}`,
            size: 18, font: 'Calibri', color: '666666',
          })]
        }),
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '1B3A5C', space: 1 } },
          spacing: { after: 200 },
          children: []
        }),
        table,
        new Paragraph({
          spacing: { before: 200 },
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({
            text: 'Polygon Servicio Técnico · Electromedicina · Alicante',
            size: 14, font: 'Calibri', color: '999999',
          })]
        }),
      ]
    }]
  })

  const buffer = await Packer.toBlob(doc)
  const filename = `guardias_${dateLabel.replace(/[\/\s]/g, '_')}.docx`
  saveAs(buffer, filename)
}
