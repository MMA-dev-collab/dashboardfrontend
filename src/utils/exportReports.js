import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';

// Manually register the autoTable plugin on the jsPDF prototype
if (!jsPDF.API.autoTable) {
  applyPlugin(jsPDF);
}

// =============================================================================
// Shared helpers
// =============================================================================

function fmt(v) {
  if (typeof v === 'number') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v);
  }
  return v ?? '—';
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

function generatedText() {
  return `Generated ${new Date().toLocaleString()}`;
}

// Professional colour palette
const palette = {
  primary: [41, 65, 114],
  secondary: [39, 160, 90],
  accent: [0, 120, 212],
  headerBg: [41, 65, 114],
  headerText: [255, 255, 255],
  altRow: [245, 247, 250],
  darkText: [33, 37, 41],
  mutedText: [104, 117, 140],
  white: [255, 255, 255],
  lightBorder: [226, 232, 240],
  kpiBg: [242, 246, 252],
};

// =============================================================================
// PDF builder
// =============================================================================

class ReportPDF {
  constructor(title) {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4' });
    this.title = title;
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.y = 0;
    this._drawHeader();
  }

  _drawHeader() {
    const { doc } = this;
    doc.setFillColor(...palette.headerBg);
    doc.rect(0, 0, this.pageWidth, 32, 'F');
    doc.setTextColor(...palette.white);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(this.title, 18, 15);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(190, 200, 220);
    doc.text(generatedText(), 18, 23);
    doc.setDrawColor(...palette.secondary);
    doc.setLineWidth(0.8);
    doc.line(0, 32, this.pageWidth, 32);
    this.y = 42;
  }

  _newPage() {
    this.doc.addPage();
    this._drawHeader();
  }

  addKPIs(kpis) {
    const { doc } = this;
    const cols = Math.min(kpis.length, 4);
    const colW = (this.pageWidth - 36) / cols;
    const cardH = 26;

    kpis.forEach((kpi, i) => {
      const x = 18 + (i % cols) * colW;
      const y = this.y + Math.floor(i / cols) * (cardH + 6);
      doc.setFillColor(...palette.kpiBg);
      doc.roundedRect(x, y, colW - 4, cardH, 3, 3, 'F');
      doc.setDrawColor(...palette.lightBorder);
      doc.roundedRect(x, y, colW - 4, cardH, 3, 3, 'S');
      doc.setFontSize(7);
      doc.setTextColor(...palette.mutedText);
      doc.setFont('helvetica', 'normal');
      doc.text(kpi.label.toUpperCase(), x + 4, y + 8);
      doc.setFontSize(13);
      doc.setTextColor(...palette.primary);
      doc.setFont('helvetica', 'bold');
      doc.text(kpi.value, x + 4, y + 18);
    });

    this.y += Math.ceil(kpis.length / cols) * (cardH + 6) + 10;
    return this;
  }

  addTable({ title, columns, data = [], theme = 'grid' } = {}) {
    const { doc } = this;
    if (!columns || columns.length === 0) return this;

    if (title) {
      doc.setFontSize(12);
      doc.setTextColor(...palette.primary);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 18, this.y);
      this.y += 6;
    }

    doc.autoTable({
      startY: this.y,
      head: [columns.map(c => c.header)],
      body: data.map(row => columns.map(c => c.accessor ? (row?.[c.accessor] ?? '') : '')),
      theme,
      margin: { left: 18, right: 18 },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: palette.darkText,
        lineColor: palette.lightBorder,
        lineWidth: 0.2,
        font: 'helvetica',
      },
      headStyles: {
        fillColor: palette.headerBg,
        textColor: palette.white,
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: palette.altRow },
      columnStyles: Object.fromEntries(
        columns.map((c, i) => [i, c.width ? { cellWidth: c.width } : {}])
      ),
      didDrawPage: () => {
        const pageH = doc.internal.pageSize.getHeight();
        doc.setFontSize(7);
        doc.setTextColor(...palette.mutedText);
        doc.text(generatedText(), 18, pageH - 8);
        doc.text(
          `Page ${doc.internal.getNumberOfPages()}`,
          this.pageWidth - 30, pageH - 8
        );
      },
    });

    this.y = doc.lastAutoTable.finalY + 12;
    return this;
  }

  save(fileName) {
    this.doc.save(`${fileName}.pdf`);
  }
}

// =============================================================================
// PDF generators
// =============================================================================

export async function exportAnalyticsPDF(api, dateRange) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - parseInt(dateRange || 30));
  const params = { startDate: startDate.toISOString(), endDate: endDate.toISOString() };

  const [revRes, projRes, workRes, reportRes, workloadRes, activeWorkRes] =
    await Promise.all([
      api.get('/analytics/revenue', { params }),
      api.get('/analytics/projects', { params }),
      api.get('/analytics/workload'),
      api.get('/reports/task-summary', { params: { range: dateRange || 30 } }),
      api.get('/reports/workload'),
      api.get('/reports/active-work-summary'),
    ]);

  const revenue = revRes.data.data || [];
  const projects = projRes.data.data || { byStatus: {}, averageCompletion: 0 };
  const workload = workRes.data.data || [];
  const reports = reportRes.data.data || {};
  const activeWork = activeWorkRes.data.data || [];

  const pdf = new ReportPDF('Smart Analytics Report');
  pdf.addKPIs([
    { label: 'Tasks Completed', value: String(reports.tasksCompleted || 0) },
    { label: 'Tasks Created', value: String(reports.tasksCreated || 0) },
    { label: 'Avg Completion', value: `${reports.avgCompletionDays || 0}d` },
    { label: 'Active Users', value: String(workload.length) },
  ]);

  if (revenue.length > 0) {
    pdf.addTable({
      title: 'Revenue Trends',
      columns: [
        { header: 'Date', accessor: 'date', width: 35 },
        { header: 'Revenue', accessor: 'revenue' },
      ],
    });
  }

  const statusData = Object.entries(projects.byStatus || {}).filter(([, v]) => v > 0);
  if (statusData.length > 0) {
    pdf.addTable({
      title: `Projects by Status (Avg Completion: ${projects.averageCompletion}%)`,
      columns: [
        { header: 'Status', accessor: 'name', width: 60 },
        { header: 'Count', accessor: 'value' },
      ],
    });
  }

  if (workload.length > 0) {
    pdf.addTable({
      title: 'Team Workload',
      columns: [
        { header: 'Member', accessor: 'name', width: 60 },
        { header: 'Active Tasks', accessor: 'activeTasksCount' },
        { header: 'Story Points', accessor: 'totalStoryPoints' },
      ],
    });
  }

  const completionData = reports.completedOverTime || [];
  if (completionData.length > 0) {
    pdf.addTable({
      title: 'Completion Velocity',
      columns: [
        { header: 'Date', accessor: 'date', width: 35 },
        { header: 'Completed Tasks', accessor: 'count' },
      ],
    });
  }

  const bottlenecks = reports.bottlenecks || [];
  if (bottlenecks.length > 0) {
    pdf.addTable({
      title: 'Bottleneck Analysis',
      columns: [
        { header: 'Stage', accessor: 'stage', width: 60 },
        { header: 'Avg Days Stuck', accessor: 'avgDaysStuck' },
        { header: 'Tasks Stuck', accessor: 'tasksStuck' },
      ],
    });
  }

  const assigneeData = reports.completedByAssignee || [];
  if (assigneeData.length > 0) {
    pdf.addTable({
      title: 'Completed Tasks by Assignee',
      columns: [
        { header: 'Assignee', accessor: 'name', width: 60 },
        { header: 'Completed', accessor: 'count' },
      ],
    });
  }

  if (activeWork.length > 0) {
    pdf.addTable({
      title: 'Active Work Hours (Dev Sessions)',
      columns: [
        { header: 'Member', accessor: 'name', width: 60 },
        { header: 'Active Hours', accessor: 'totalActiveHours' },
        { header: 'Sessions', accessor: 'sessionsCompleted' },
      ],
    });
  }

  pdf.save('smart-analytics-report');
}

export async function exportProjectsPDF(api) {
  const { data } = await api.get('/projects');
  const projects = data.data || [];
  const total = projects.length;
  const active = projects.filter(p => p.status === 'ACTIVE').length;
  const completed = projects.filter(p => p.status === 'COMPLETED').length;
  const totalValue = projects.reduce((s, p) => s + (p.totalValue || 0), 0);

  const pdf = new ReportPDF('Projects Portfolio Report');
  pdf.addKPIs([
    { label: 'Total Projects', value: String(total) },
    { label: 'Active', value: String(active) },
    { label: 'Completed', value: String(completed) },
    { label: 'Total Value', value: fmt(totalValue) },
  ]);

  pdf.addTable({
    title: 'Project Portfolio',
    columns: [
      { header: 'Project', accessor: 'name', width: 45 },
      { header: 'Client', accessor: 'clientName', width: 35 },
      { header: 'Value', accessor: '__value' },
      { header: 'Status', accessor: 'status', width: 30 },
      { header: 'Progress', accessor: '__progress', width: 22 },
      { header: 'Payment', accessor: 'paymentStatus', width: 30 },
      { header: 'Deadline', accessor: '__deadline', width: 30 },
    ],
    data: projects.map(p => ({
      ...p,
      __value: fmt(p.totalValue),
      __progress: `${p.completionPct}%`,
      __deadline: p.deadline ? fmtDate(p.deadline) : '—',
    })),
  });

  pdf.save('projects-portfolio-report');
}

export async function exportFinancePDF(api) {
  const { data } = await api.get('/finance/overview');
  const d = data.data;

  const pdf = new ReportPDF('Financial Performance Report');
  pdf.addKPIs([
    { label: 'Gross Revenue', value: fmt(d.totalRevenue) },
    { label: 'Operational Profit', value: fmt(d.netProfit) },
    { label: 'Company Reserves', value: fmt(d.companyProfit) },
    { label: 'Accounts Receivable', value: fmt(d.totalOutstanding) },
  ]);

  pdf.addTable({
    title: 'Profit & Loss Summary',
    columns: [
      { header: 'Category', accessor: 'label', width: 60 },
      { header: 'Description', accessor: 'desc', width: 70 },
      { header: 'Amount', accessor: 'value' },
    ],
    data: [
      { label: 'Total Volume', desc: 'Total billed amount', value: fmt(d.totalRevenue) },
      { label: 'Total Expenses', desc: 'All operational costs', value: `-${fmt(d.totalExpenses)}` },
      { label: 'Net Operating Income', desc: 'Profit after expenses', value: fmt(d.netProfit) },
      { label: 'Partner Earnings', desc: 'Distributed to partners', value: fmt(d.totalPartnerEarnings) },
      { label: 'Company Retained', desc: 'Retained earnings', value: fmt(d.companyProfit) },
      { label: 'Operational Reserve', desc: 'Reserved funds', value: fmt(d.reserveAmount) },
    ],
  });

  pdf.addTable({
    title: 'Project Performance Matrix',
    columns: [
      { header: 'Metric', accessor: 'metric', width: 55 },
      { header: 'Description', accessor: 'desc', width: 70 },
      { header: 'Value', accessor: 'value' },
    ],
    data: [
      { metric: 'Total Projects', desc: 'Projects in current period', value: String(d.totalProjects || 0) },
      { metric: 'Active Projects', desc: 'Under development', value: String(d.activeProjects || 0) },
      { metric: 'Completed Projects', desc: 'Delivered', value: String(d.completedProjects || 0) },
    ],
  });

  pdf.save('financial-performance-report');
}

export async function exportWalletsPDF(api, userId, isAdmin) {
  const [walletRes, txRes] = await Promise.all([
    api.get('/wallets/me'),
    api.get(`/wallets/${userId}/transactions`),
  ]);

  const wallet = walletRes.data.data;
  const transactions = txRes.data.data || [];

  const pdf = new ReportPDF('Pocket & Wallet Report');
  pdf.addKPIs([
    { label: 'Cumulative Earnings', value: fmt(wallet?.totalEarned) },
    { label: 'Available Balance', value: fmt(wallet?.availableBalance) },
    { label: 'Pending Balance', value: fmt(wallet?.pendingBalance) },
    { label: 'Total Withdrawn', value: fmt(wallet?.totalWithdrawn) },
  ]);

  if (transactions.length > 0) {
    pdf.addTable({
      title: 'Transaction History',
      columns: [
        { header: 'Date', accessor: '__date', width: 35 },
        { header: 'Type', accessor: 'type', width: 40 },
        { header: 'Amount', accessor: '__amount' },
        { header: 'Balance After', accessor: '__balance' },
        { header: 'Description', accessor: 'description' },
      ],
      data: transactions.map(t => ({
        ...t,
        __date: fmtDate(t.createdAt),
        __amount: `${t.type === 'WITHDRAWAL' ? '-' : t.type === 'EARNING' ? '+' : ''}${fmt(t.amount)}`,
        __balance: fmt(t.balanceAfter),
      })),
    });
  }

  if (isAdmin) {
    const allRes = await api.get('/wallets');
    const allWallets = allRes.data.data || [];
    if (allWallets.length > 0) {
      pdf.addTable({
        title: 'Partner Ledger',
        columns: [
          { header: 'Partner', accessor: '__name', width: 60 },
          { header: 'Available', accessor: '__available' },
          { header: 'Pending', accessor: '__pending' },
          { header: 'Withdrawn', accessor: '__withdrawn' },
        ],
        data: allWallets.map(w => ({
          ...w,
          __name: w.user?.name || 'Unknown',
          __available: fmt(w.availableBalance),
          __pending: fmt(w.pendingBalance),
          __withdrawn: fmt(w.totalWithdrawn),
        })),
      });
    }
  }

  pdf.save('wallet-report');
}

export async function exportWithdrawalsPDF(api) {
  const { data } = await api.get('/withdrawals');
  const requests = data.data || [];

  const pdf = new ReportPDF('Payout Requests Report');
  if (requests.length > 0) {
    pdf.addTable({
      title: 'Withdrawal Requests',
      columns: [
        { header: 'Requester', accessor: '__name', width: 45 },
        { header: 'Amount', accessor: '__amount', width: 30 },
        { header: 'Status', accessor: 'status', width: 30 },
        { header: 'Note', accessor: '__note' },
        { header: 'Requested', accessor: '__requested', width: 35 },
        { header: 'Processed', accessor: '__processed', width: 35 },
      ],
      data: requests.map(r => ({
        ...r,
        __name: `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() || 'Unknown',
        __amount: fmt(r.amount),
        __note: r.note || (r.status === 'REJECTED' && r.rejectReason ? `Rejected: ${r.rejectReason}` : '—'),
        __requested: fmtDate(r.createdAt),
        __processed: r.processedAt ? fmtDate(r.processedAt) : '—',
      })),
    });
  }

  pdf.save('withdrawals-report');
}
