import ExcelJS from 'exceljs';

const C = {
  navy: 'FF294172', white: 'FFFFFFFF', bgLight: 'FFF2F6FC',
  slate50: 'FFF8FAFC', slate100: 'FFF1F5F9', slate300: 'FFE2E8F0',
  slate500: 'FF64748B', slate800: 'FF1E293B',
  bars: ['FF3B82F6','FF22C55E','FF6366F1','FFF59E0B','FFEF4444','FFEC4899','FF14B8A6','FFF97316'],
};

const border = () => ({
  top: { style: 'thin', color: { argb: C.slate300 } },
  bottom: { style: 'thin', color: { argb: C.slate300 } },
  left: { style: 'thin', color: { argb: C.slate300 } },
  right: { style: 'thin', color: { argb: C.slate300 } },
});

export async function buildWorkbook(sheets) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'WealthWise Platform';
  wb.created = new Date();

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name, {
      properties: { tabColor: { argb: C.navy }, defaultRowHeight: 20 },
    });
    const w = sheet.columnWidths || [16, 16, 16, 16, 16, 16];
    w.forEach((v, i) => { ws.getColumn(i + 1).width = v; });
    const nCols = w.length;
    let r = 1;

    // Title row
    ws.addRow([]);
    const tRow = ws.addRow([]);
    tRow.height = 36;
    ws.mergeCells(r, 1, r, nCols);
    const tCell = tRow.getCell(1);
    tCell.value = sheet.name;
    tCell.font = { size: 18, bold: true, color: { argb: C.navy }, name: 'Calibri' };
    r++;

    // Subtitle
    ws.addRow([]);
    const sRow = ws.addRow([]);
    sRow.height = 18;
    const sCell = sRow.getCell(1);
    sCell.value = 'Generated ' + new Date().toLocaleString();
    sCell.font = { size: 9, color: { argb: C.slate500 }, name: 'Calibri', italic: true };
    r++;

    // KPI cards (up to 4 per row, 2 rows each)
    if (sheet.kpis?.length) {
      r++;
      const n = Math.min(sheet.kpis.length, 4);
      const per = Math.floor(nCols / n);
      sheet.kpis.forEach((kpi, i) => {
        const sc = i * per + 1;
        const ec = Math.min((i + 1) * per, nCols);
        ws.addRow([]); // spacer
        ws.mergeCells(r, sc, r, ec);
        const lc = ws.getCell(r, sc);
        lc.value = kpi.label;
        lc.font = { size: 8, bold: true, color: { argb: C.slate500 }, name: 'Calibri' };
        lc.alignment = { horizontal: 'center', vertical: 'middle' };
        lc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.bgLight } };
        r++;
        ws.addRow([]);
        ws.mergeCells(r, sc, r, ec);
        const vc = ws.getCell(r, sc);
        vc.value = kpi.value;
        vc.font = { size: 16, bold: true, color: { argb: C.navy }, name: 'Calibri' };
        vc.alignment = { horizontal: 'center', vertical: 'middle' };
        vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.bgLight } };
        vc.border = { bottom: { style: 'medium', color: { argb: C.navy } } };
        r++;
      });
      ws.addRow([]); r++;
    }

    // Data sections
    for (const sec of (sheet.sections || [])) {
      r++;
      ws.mergeCells(r, 1, r, nCols);
      const st = ws.getCell(r, 1);
      st.value = sec.title;
      st.font = { size: 13, bold: true, color: { argb: C.navy }, name: 'Calibri' };
      st.border = { bottom: { style: 'thin', color: { argb: C.slate300 } } };
      ws.addRow([]);
      r++;

      const hdr = sec.headers || [];
      const data = sec.data || [];
      const barColIdx = sec.chartCol;
      const maxBar = barColIdx !== undefined ? Math.max(...data.map(d => d[barColIdx] || 0), 0.01) : 0;
      const barW = Math.max(2, nCols - hdr.length);

      // Header
      const hRow = ws.addRow(hdr);
      hRow.height = 24;
      for (let c = 1; c <= nCols; c++) {
        const cl = hRow.getCell(c);
        cl.font = { size: 9, bold: true, color: { argb: C.white }, name: 'Calibri' };
        cl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } };
        cl.alignment = { horizontal: 'center', vertical: 'middle' };
        cl.border = border();
      }
      r++;

      // Data rows
      data.forEach((row, ri) => {
        const dRow = ws.addRow(row);
        dRow.height = 22;
        const bg = ri % 2 === 1 ? C.slate100 : C.slate50;
        for (let c = 1; c <= hdr.length; c++) {
          const cell = dRow.getCell(c);
          cell.font = { size: 9, color: { argb: C.slate800 }, name: 'Calibri' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
          cell.border = border();
          if (sec.numberCols?.includes(c - 1) && typeof row[c - 1] === 'number') {
            cell.numFmt = '#,##0.00';
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          }
          if (sec.centerCols?.includes(c - 1)) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        }
        // inline bar chart in remaining columns
        if (barColIdx !== undefined) {
          const val = row[barColIdx] || 0;
          const col = C.bars[ri % C.bars.length];
          const filled = Math.round((val / maxBar) * barW);
          for (let b = 0; b < barW; b++) {
            const bc = dRow.getCell(hdr.length + b + 1);
            const on = b < filled;
            bc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: on ? col : C.slate100 } };
            bc.border = border();
            if (on && b === Math.floor(filled / 2)) {
              bc.value = val;
              bc.font = { size: 8, bold: true, color: { argb: C.white }, name: 'Calibri' };
              bc.alignment = { horizontal: 'center', vertical: 'middle' };
            }
          }
        }
        r++;
      });
    }
  }
  return wb;
}

// Helper to generate download
function downloadWorkbook(wb, filename) {
  wb.xlsx.writeBuffer().then(buf => {
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.xlsx';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  });
}

// Shared helpers
function fmt(v) {
  if (typeof v === 'number') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v);
  }
  return v ?? '—';
}
function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

// ── Smart Analytics XLS ──
export async function exportAnalyticsXLS(api, dateRange) {
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
  const projects = projRes.data.data || { byStatus: {} };
  const workload = workRes.data.data || [];
  const reports = reportRes.data.data || {};
  const activeWork = activeWorkRes.data.data || [];

  const sections = [];
  if (revenue.length) {
    sections.push({
      title: 'Revenue Trends',
      headers: ['Date', 'Revenue'],
      data: revenue.map(r => [r.date || '', r.revenue || 0]),
      numberCols: [1],
      chartCol: 1,
    });
  }
  const statusData = Object.entries(projects.byStatus || {}).filter(([, v]) => v > 0);
  if (statusData.length) {
    sections.push({
      title: 'Projects by Status (Avg: ' + (projects.averageCompletion || 0) + '%)',
      headers: ['Status', 'Count'],
      data: statusData.map(([n, v]) => [n, v]),
      chartCol: 1,
    });
  }
  if (workload.length) {
    sections.push({
      title: 'Team Workload',
      headers: ['Member', 'Active Tasks', 'Story Points'],
      data: workload.map(w => [w.name || '', w.activeTasksCount || 0, w.totalStoryPoints || 0]),
      chartCol: 1,
    });
  }
  const completionData = reports.completedOverTime || [];
  if (completionData.length) {
    sections.push({
      title: 'Completion Velocity',
      headers: ['Date', 'Completed Tasks'],
      data: completionData.map(r => [r.date || '', r.count || 0]),
      chartCol: 1,
    });
  }
  const bottlenecks = reports.bottlenecks || [];
  if (bottlenecks.length) {
    sections.push({
      title: 'Bottleneck Analysis',
      headers: ['Stage', 'Avg Days', 'Tasks Stuck'],
      data: bottlenecks.map(b => [b.stage || '', b.avgDaysStuck || 0, b.tasksStuck || 0]),
      chartCol: 1,
    });
  }
  const assigneeData = reports.completedByAssignee || [];
  if (assigneeData.length) {
    sections.push({
      title: 'Completed by Assignee',
      headers: ['Assignee', 'Completed'],
      data: assigneeData.map(a => [a.name || '', a.count || 0]),
      chartCol: 1,
    });
  }
  if (activeWork.length) {
    sections.push({
      title: 'Active Work Hours (Dev Sessions)',
      headers: ['Member', 'Active Hours', 'Sessions'],
      data: activeWork.slice(0, 15).map(a => [a.name || '', a.totalActiveHours || 0, a.sessionsCompleted || 0]),
      chartCol: 1,
    });
  }

  const wb = await buildWorkbook([{
    name: 'Smart Analytics',
    kpis: [
      { label: 'Tasks Completed', value: String(reports.tasksCompleted || 0) },
      { label: 'Tasks Created', value: String(reports.tasksCreated || 0) },
      { label: 'Avg Completion', value: (reports.avgCompletionDays || 0) + 'd' },
      { label: 'Team Members', value: String(workload.length) },
    ],
    sections,
    columnWidths: [22, 14, 14, 14, 14, 14, 14],
  }]);
  downloadWorkbook(wb, 'smart-analytics-report');
}

// ── Projects XLS ──
export async function exportProjectsXLS(api) {
  const { data } = await api.get('/projects');
  const projects = data.data || [];

  const wb = await buildWorkbook([{
    name: 'Projects Portfolio',
    kpis: [
      { label: 'Total Projects', value: String(projects.length) },
      { label: 'Active', value: String(projects.filter(p => p.status === 'ACTIVE').length) },
      { label: 'Completed', value: String(projects.filter(p => p.status === 'COMPLETED').length) },
      { label: 'Total Value', value: fmt(projects.reduce((s, p) => s + (p.totalValue || 0), 0)) },
    ],
    sections: [{
      title: 'Project Portfolio',
      headers: ['Project', 'Client', 'Value', 'Status', 'Progress %', 'Payment', 'Deadline'],
      data: projects.map(p => [
        p.name || '', p.clientName || '', p.totalValue || 0,
        (p.status || '').replace('_', ' '), p.completionPct || 0,
        (p.paymentStatus || '').replace('_', ' '), p.deadline || '—',
      ]),
      numberCols: [2, 4],
      chartCol: 4,
      centerCols: [3, 4],
    }],
    columnWidths: [24, 18, 14, 14, 12, 14, 14, 18],
  }]);
  downloadWorkbook(wb, 'projects-portfolio-report');
}

// ── Finance XLS ──
export async function exportFinanceXLS(api) {
  const { data } = await api.get('/finance/overview');
  const d = data.data || {};

  const wb = await buildWorkbook([{
    name: 'Financial Performance',
    kpis: [
      { label: 'Gross Revenue', value: fmt(d.totalRevenue) },
      { label: 'Net Profit', value: fmt(d.netProfit) },
      { label: 'Company Reserves', value: fmt(d.companyProfit) },
      { label: 'Receivable', value: fmt(d.totalOutstanding) },
    ],
    sections: [
      {
        title: 'Profit & Loss Summary',
        headers: ['Category', 'Description', 'Amount'],
        data: [
          ['Total Volume', 'Total billed amount', d.totalRevenue || 0],
          ['Total Expenses', 'All operational costs', d.totalExpenses || 0],
          ['Net Operating Income', 'Profit after all expenses', d.netProfit || 0],
          ['Partner Earnings', 'Distributed to partners', d.totalPartnerEarnings || 0],
          ['Company Retained', 'Retained earnings', d.companyProfit || 0],
          ['Operational Reserve', 'Reserved funds', d.reserveAmount || 0],
        ],
        numberCols: [2],
      },
      {
        title: 'Project Performance',
        headers: ['Metric', 'Description', 'Value'],
        data: [
          ['Total Projects', 'Projects in current period', d.totalProjects || 0],
          ['Active Projects', 'Projects under development', d.activeProjects || 0],
          ['Completed Projects', 'Delivered projects', d.completedProjects || 0],
        ],
        chartCol: 2,
      },
    ],
    columnWidths: [24, 32, 18, 14, 14, 14, 14],
  }]);
  downloadWorkbook(wb, 'financial-performance-report');
}

// ── Wallets XLS ──
export async function exportWalletsXLS(api, userId, isAdmin) {
  const [walletRes, txRes] = await Promise.all([
    api.get('/wallets/me'),
    api.get('/wallets/' + userId + '/transactions'),
  ]);
  const wallet = walletRes.data.data || {};
  const transactions = txRes.data.data || [];

  const sections = [{
    title: 'Transaction History',
    headers: ['Date', 'Type', 'Amount', 'Balance After'],
    data: transactions.map(t => [
      fmtDate(t.createdAt),
      (t.type || '').replace(/_/g, ' '),
      t.type === 'WITHDRAWAL' ? -(t.amount || 0) : (t.amount || 0),
      t.balanceAfter || 0,
    ]),
    numberCols: [2, 3],
  }];

  if (isAdmin) {
    const allRes = await api.get('/wallets');
    const allWallets = allRes.data.data || [];
    if (allWallets.length) {
      sections.push({
        title: 'Partner Ledger',
        headers: ['Partner', 'Available', 'Pending', 'Withdrawn'],
        data: allWallets.map(w => [
          w.user?.name || 'Unknown', w.availableBalance || 0,
          w.pendingBalance || 0, w.totalWithdrawn || 0,
        ]),
        numberCols: [1, 2, 3],
        chartCol: 1,
      });
    }
  }

  const wb = await buildWorkbook([{
    name: 'Wallet Report',
    kpis: [
      { label: 'Cumulative Earnings', value: fmt(wallet.totalEarned) },
      { label: 'Available Balance', value: fmt(wallet.availableBalance) },
      { label: 'Pending Balance', value: fmt(wallet.pendingBalance) },
      { label: 'Total Withdrawn', value: fmt(wallet.totalWithdrawn) },
    ],
    sections,
    columnWidths: [18, 20, 16, 16, 35, 16, 16, 16],
  }]);
  downloadWorkbook(wb, 'wallet-report');
}

// ── Withdrawals XLS ──
export async function exportWithdrawalsXLS(api) {
  const { data } = await api.get('/withdrawals');
  const requests = data.data || [];
  const pending = requests.filter(r => r.status === 'PENDING').length;
  const approved = requests.filter(r => r.status === 'APPROVED').length;
  const rejected = requests.filter(r => r.status === 'REJECTED').length;

  const wb = await buildWorkbook([{
    name: 'Payout Requests',
    kpis: [
      { label: 'Total Requests', value: String(requests.length) },
      { label: 'Pending', value: String(pending) },
      { label: 'Approved', value: String(approved) },
      { label: 'Total Amount', value: fmt(requests.reduce((s, r) => s + (r.amount || 0), 0)) },
    ],
    sections: [{
      title: 'Withdrawal Requests',
      headers: ['Requester', 'Amount', 'Status', 'Note', 'Requested', 'Processed'],
      data: requests.map(r => [
        ((r.user?.firstName || '') + ' ' + (r.user?.lastName || '')).trim() || 'Unknown',
        r.amount || 0,
        r.status || '',
        r.note || '—',
        fmtDate(r.createdAt),
        r.processedAt ? fmtDate(r.processedAt) : '—',
      ]),
      numberCols: [1],
      chartCol: 1,
    }],
    columnWidths: [22, 14, 14, 32, 14, 14, 16],
  }]);
  downloadWorkbook(wb, 'payout-requests-report');
}
