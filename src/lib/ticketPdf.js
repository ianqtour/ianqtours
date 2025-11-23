import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function buildTicketPdf({ bookingId, excursion, bus, passengers, seats }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const title = 'Ingresso de Viagem'
  doc.setFontSize(18)
  doc.text(title, 40, 50)
  doc.setFontSize(11)
  const y1 = 80
  doc.text(`Reserva: ${bookingId}`, 40, y1)
  doc.text(`Excursão: ${excursion?.name || ''}`, 40, y1 + 18)
  doc.text(`Destino: ${excursion?.destination || ''}`, 40, y1 + 36)
  doc.text(`Data/Hora: ${formatDateHour(excursion?.date)}`, 40, y1 + 54)
  doc.text(`Ônibus: ${bus?.identification || bus?.type || bus?.name || ''}`, 40, y1 + 72)
  const tableStartY = y1 + 100
  const rows = (passengers || []).map((p) => [String(p.name || ''), formatCpf(p.cpf), String(p.seatNumber || '')])
  autoTable(doc, {
    head: [['Passageiro', 'CPF', 'Assento']],
    body: rows,
    startY: tableStartY,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [236, 174, 98] },
  })
  doc.setFontSize(10)
  const infoY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 30 : tableStartY + 30
  doc.text('Apresente este ingresso no embarque.', 40, infoY)
  const ab = doc.output('arraybuffer')
  return new Blob([ab], { type: 'application/pdf' })
}

function formatCpf(v) {
  const digits = String(v || '').replace(/\D/g, '').slice(0, 11)
  const p1 = digits.slice(0, 3)
  const p2 = digits.slice(3, 6)
  const p3 = digits.slice(6, 9)
  const p4 = digits.slice(9, 11)
  let out = ''
  if (p1) out = p1
  if (p2) out = `${out}.${p2}`
  if (p3) out = `${out}.${p3}`
  if (p4) out = `${out}-${p4}`
  return out
}

function formatDateHour(s) {
  if (!s) return ''
  const d = new Date(s)
  const dateStr = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const hourStr = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }).format(d)
  const hourNum = Number(hourStr)
  const period = hourNum < 12 ? 'da manhã' : hourNum < 18 ? 'da tarde' : 'da noite'
  const h = String(hourNum)
  return `${dateStr} às ${h} horas ${period}`
}