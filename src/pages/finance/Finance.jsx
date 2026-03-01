import { useState, useEffect } from 'react';
import {
    DollarSign,
    TrendingUp,
    Briefcase,
    Activity,
    Wallet,
    ArrowUpRight,
    Clock,
    ShieldCheck,
    Download,
    Filter
} from 'lucide-react';
import api from '../../api/client';
import '../Shared.css';
import './Finance.css';

export default function Finance() {
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/finance/overview')
            .then(r => setOverview(r.data.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const fmt = (v) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(v || 0);

    if (loading) return (
        <div className="loading-spinner">
            <div className="spinner" />
            <span>Calculating Financials...</span>
        </div>
    );

    const stats = [
        { label: 'Gross Revenue', value: overview?.totalRevenue, icon: DollarSign, color: 'blue' },
        { label: 'Operational Profit', value: overview?.netProfit, icon: TrendingUp, color: 'emerald' },
        { label: 'Company Reserves', value: overview?.companyProfit, icon: ShieldCheck, color: 'indigo' },
        { label: 'Accounts Receivable', value: overview?.totalOutstanding, icon: Clock, color: 'amber' },
    ];

    return (
        <div className="finance-page fade-in">
            <header className="page-header">
                <div className="header-left">
                    <h1 className="page-title">Financial Performance</h1>
                    <p className="page-subtitle">Detailed breakdown of company revenue, expenses, and liquidity.</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary">
                        <Download size={18} /> Export PDF
                    </button>
                </div>
            </header>

            <div className="stats-grid">
                {stats.map((s, i) => (
                    <div key={i} className="stat-card">
                        <div className={`card-icon-bg ${s.color}`}>
                            <s.icon size={24} />
                        </div>
                        <div className="card-info">
                            <span className="card-label">{s.label}</span>
                            <span className="card-value">{fmt(s.value)}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="finance-layout-grid">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Profit & Loss Summary</h3>
                        <div className="card-badge info">Year to Date</div>
                    </div>
                    <div className="card-body">
                        <div className="breakdown-list">
                            <div className="breakdown-item">
                                <div className="item-info">
                                    <span className="item-label">Total Volume</span>
                                    <span className="item-sub">Total billed amount</span>
                                </div>
                                <span className="item-value">{fmt(overview.totalRevenue)}</span>
                            </div>
                            <div className="breakdown-item">
                                <div className="item-info">
                                    <span className="item-label">Total Expenses</span>
                                    <span className="item-sub">All operational costs</span>
                                </div>
                                <span className="item-value negative">-{fmt(overview.totalExpenses)}</span>
                            </div>
                            <div className="divider" />
                            <div className="breakdown-item total">
                                <div className="item-info">
                                    <span className="item-label">Net Operating Income</span>
                                    <span className="item-sub">Profit after all expenses</span>
                                </div>
                                <span className="item-value positive">{fmt(overview.netProfit)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Distribution Overview</h3>
                    </div>
                    <div className="card-body">
                        <div className="distribution-stack">
                            <div className="dist-item">
                                <div className="dist-header">
                                    <span className="dist-label">Partner Earnings</span>
                                    <span className="dist-val">{fmt(overview.totalPartnerEarnings)}</span>
                                </div>
                                <div className="dist-bar-bg">
                                    <div className="dist-bar" style={{ width: '45%', background: '#3b82f6' }} />
                                </div>
                            </div>
                            <div className="dist-item">
                                <div className="dist-header">
                                    <span className="dist-label">Company Retained</span>
                                    <span className="dist-val">{fmt(overview.companyProfit)}</span>
                                </div>
                                <div className="dist-bar-bg">
                                    <div className="dist-bar" style={{ width: '35%', background: '#4f46e5' }} />
                                </div>
                            </div>
                            <div className="dist-item">
                                <div className="dist-header">
                                    <span className="dist-label">Operational Reserve</span>
                                    <span className="dist-val">{fmt(overview.reserveAmount)}</span>
                                </div>
                                <div className="dist-bar-bg">
                                    <div className="dist-bar" style={{ width: '20%', background: '#10b981' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card full-width">
                    <div className="card-header">
                        <h3 className="card-title">Project Performance Matrix</h3>
                    </div>
                    <div className="card-body p-0">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Statistic Name</th>
                                    <th>Description</th>
                                    <th>Metric Value</th>
                                    <th>Health</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Total Projects</td>
                                    <td>Projects handled in the current period</td>
                                    <td>{overview.totalProjects}</td>
                                    <td><span className="status-badge active">Healthy</span></td>
                                </tr>
                                <tr>
                                    <td>Active Projects</td>
                                    <td>Projects currently under development</td>
                                    <td>{overview.activeProjects}</td>
                                    <td><span className="status-badge planning">In Progress</span></td>
                                </tr>
                                <tr>
                                    <td>Completed Projects</td>
                                    <td>Deliverables successfully handed over</td>
                                    <td>{overview.completedProjects}</td>
                                    <td><span className="status-badge active">Done</span></td>
                                </tr>
                                <tr>
                                    <td>Outstanding Payments</td>
                                    <td>Unpaid invoices from active projects</td>
                                    <td>{fmt(overview.totalOutstanding)}</td>
                                    <td><span className="status-badge cancelled">Alert</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
