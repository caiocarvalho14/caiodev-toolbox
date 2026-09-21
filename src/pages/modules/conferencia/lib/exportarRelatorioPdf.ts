// src/modules/conferencia/lib/exportarRelatorioPdf.ts
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { RelatorioConferencia } from './relatorio'

export function exportarRelatorioPdf(relatorios: RelatorioConferencia[]) {
  const doc = new jsPDF({ orientation: 'landscape' })
  const margemInferior = 15
  const alturaPagina = doc.internal.pageSize.getHeight()

  let cursorY = 15

  relatorios.forEach((rel) => {
    const titulo = rel.conferencia.nome
      ? `${rel.conferencia.nome} — ${new Date(rel.conferencia.data + 'T00:00:00').toLocaleDateString('pt-BR')}`
      : new Date(rel.conferencia.data + 'T00:00:00').toLocaleDateString('pt-BR')
    const observacao = rel.conferencia.observacao ? `Observação: ${rel.conferencia.observacao}` : ``

    // Se não sobra espaço nem pro título, pula de página antes de desenhar
    if (cursorY + 20 > alturaPagina - margemInferior) {
      doc.addPage()
      cursorY = 15
    }

    doc.setFontSize(14)
    doc.text(titulo, 14, cursorY)
    cursorY += 6
    doc.setFontSize(10)
    doc.text(observacao, 14, cursorY)
    cursorY += 8

    const head = [['Código', 'Produto', 'Encontrado', 'Sistema', 'Divergência', ...rel.locaisUsados.map((l) => l.nome)]]

    const body = rel.linhas.map((l) => [
      l.codigo ?? '-',
      l.marcaNome ? `${l.marcaNome} - ${l.nome}` : l.nome,
      l.fisico.toFixed(2),
      l.sistema.toFixed(2),
      `${l.divergencia > 0 ? '+' : ''}${l.divergencia.toFixed(2)}`,
      ...rel.locaisUsados.map((loc) => (l.porLocal[loc.id] != null ? l.porLocal[loc.id].toFixed(2) : '-')),
    ])

    body.push([
      '',
      'Total',
      rel.totalFisico.toFixed(2),
      rel.totalSistema.toFixed(2),
      `${rel.totalDivergencia > 0 ? '+' : ''}${rel.totalDivergencia.toFixed(2)}`,
      ...rel.locaisUsados.map(() => ''),
    ])

    autoTable(doc, {
      startY: cursorY,
      head,
      body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 41, 59] },
      margin: { bottom: margemInferior },
      didParseCell: (data) => {
        if (data.column.index === 4 && data.section === 'body') {
          const valor = parseFloat(data.cell.raw as string)
          if (!Number.isNaN(valor)) {
            if (valor < -0.001) {
              data.cell.styles.fillColor = [254, 226, 226]
              data.cell.styles.textColor = [185, 28, 28]
            } else if (valor > 0.001) {
              data.cell.styles.fillColor = [209, 250, 229]
              data.cell.styles.textColor = [4, 120, 87]
            }
          }
        }
      },
    })

    // autoTable com margin.bottom já quebra de página sozinho se a tabela não couber;
    // aqui só avançamos o cursor pra próxima tabela ter espaço extra depois dela
    cursorY = (doc as any).lastAutoTable.finalY + 12
  })

  const nomeArquivo =
    relatorios.length === 1
      ? `${relatorios[0].conferencia.nome} - ${relatorios[0].conferencia.data}.pdf`
      : `relatorio-conferencias-${new Date().toISOString().slice(0, 10)}.pdf`

  doc.save(nomeArquivo)
}