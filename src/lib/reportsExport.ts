import type {
  ReportMetrics,
  FaturamentoPorPeriodoItem,
  ServicoMaisVendido,
  ProdutividadeProfissional,
  StatusDistribuicao,
  AppointmentReportRow,
} from "@/services/reports.service";

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmado",
  pending: "Pendente",
  completed: "Concluído",
  cancelled: "Cancelado",
  blocked: "Bloqueado",
  no_show: "Não compareceu",
};

type ExportParams = {
  companyName: string;
  startDate: string;
  endDate: string;
  metrics: ReportMetrics;
  faturamentoPorPeriodo: FaturamentoPorPeriodoItem[];
  servicosMaisVendidos: ServicoMaisVendido[];
  produtividade: ProdutividadeProfissional[];
  statusDistribuicao: StatusDistribuicao[];
  tableRows: AppointmentReportRow[];
};

export function exportReportPDF(params: ExportParams) {
  void (async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(params.companyName, 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Relatório: ${params.startDate} a ${params.endDate}`, 14, 28);
    doc.setTextColor(0, 0, 0);

    let y = 40;
    doc.setFontSize(14);
    doc.text("Resumo Executivo", 14, y);
    y += 10;

    const metrics = [
      ["Faturamento Total", `R$ ${params.metrics.faturamentoTotal.toFixed(2)}`],
      ["Total de Agendamentos", String(params.metrics.totalAgendamentos)],
      ["Ticket Médio", `R$ ${params.metrics.ticketMedio.toFixed(2)}`],
      ["Serviços Realizados", String(params.metrics.servicosRealizados)],
      ["Cancelamentos", String(params.metrics.cancelamentos)],
      ["Taxa de Conversão", `${params.metrics.taxaConversao.toFixed(1)}%`],
    ];

    autoTable(doc, {
      startY: y,
      head: [["Métrica", "Valor"]],
      body: metrics,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246] },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 15;

    if (params.faturamentoPorPeriodo.length > 0) {
      doc.setFontSize(12);
      doc.text("Faturamento por Período", 14, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [["Data", "Valor (R$)"]],
        body: params.faturamentoPorPeriodo.map((r) => [r.date, r.valor.toFixed(2)]),
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] },
      });
      y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 12;
    }

    if (params.servicosMaisVendidos.length > 0) {
      doc.setFontSize(12);
      doc.text("Serviços Mais Vendidos", 14, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [["Serviço", "Quantidade"]],
        body: params.servicosMaisVendidos.map((r) => [r.serviceName, String(r.quantidade)]),
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] },
      });
      y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 12;
    }

    if (params.produtividade.length > 0) {
      doc.setFontSize(12);
      doc.text("Produtividade por Funcionário", 14, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [["Funcionário", "Atendimentos", "Valor (R$)"]],
        body: params.produtividade.map((r) => [
          r.professionalName,
          String(r.atendimentos),
          r.valorGerado.toFixed(2),
        ]),
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] },
      });
      y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 12;
    }

    if (params.tableRows.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.text("Agendamentos (amostra)", 14, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [["Data", "Cliente", "Serviço", "Funcionário", "Valor", "Status"]],
        body: params.tableRows.slice(0, 30).map((r) => [
          r.date,
          r.clientName,
          r.serviceNames,
          r.professionalName,
          r.valor.toFixed(2),
          STATUS_LABELS[r.status] ?? r.status,
        ]),
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] },
      });
    }

    doc.save(`relatorio-${params.startDate}-${params.endDate}.pdf`);
  })();
}

export function exportReportExcel(params: ExportParams) {
  void (async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    const resumo = [
      ["Relatório", `${params.companyName}`],
      ["Período", `${params.startDate} a ${params.endDate}`],
      [],
      ["Métrica", "Valor"],
      ["Faturamento Total", params.metrics.faturamentoTotal],
      ["Total Agendamentos", params.metrics.totalAgendamentos],
      ["Ticket Médio", params.metrics.ticketMedio],
      ["Serviços Realizados", params.metrics.servicosRealizados],
      ["Cancelamentos", params.metrics.cancelamentos],
      ["Taxa de Conversão (%)", params.metrics.taxaConversao],
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

    const wsApt = XLSX.utils.json_to_sheet(
      params.tableRows.map((r) => ({
        Data: r.date,
        Cliente: r.clientName,
        Serviço: r.serviceNames,
        Funcionário: r.professionalName,
        Valor: r.valor,
        Status: STATUS_LABELS[r.status] ?? r.status,
        Observações: r.notes ?? "",
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsApt, "Agendamentos");

    const wsFinanceiro = XLSX.utils.aoa_to_sheet([
      ["Tipo", "Descrição", "Valor"],
      ...params.tableRows
        .filter((r) => r.valor > 0)
        .map((r) => ["Receita", `${r.serviceNames} - ${r.clientName}`, r.valor]),
    ]);
    XLSX.utils.book_append_sheet(wb, wsFinanceiro, "Financeiro");

    const wsServicos = XLSX.utils.json_to_sheet(
      params.servicosMaisVendidos.map((r) => ({
        Serviço: r.serviceName,
        Quantidade: r.quantidade,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsServicos, "Serviços");

    const wsProdutividade = XLSX.utils.json_to_sheet(
      params.produtividade.map((r) => ({
        Funcionário: r.professionalName,
        Atendimentos: r.atendimentos,
        "Valor Gerado": r.valorGerado,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsProdutividade, "Produtividade");

    XLSX.writeFile(wb, `relatorio-${params.startDate}-${params.endDate}.xlsx`);
  })();
}
