import React, { useEffect, useState } from 'react';
import {
    DollarSign,
    Briefcase,
    Users,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    ChevronRight,
    Plus
} from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../store/useAuthStore';
import AnalyticsDashboard from './AnalyticsDashboard';
import './Dashboard.css';

export default function Dashboard() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [financeRes, projectsRes] = await Promise.all([
                    api.get('/finance/overview'),
                    api.get('/projects')
                ]);

                setStats({
                    overview: financeRes.data.data,
                    recentProjects: projectsRes.data.data.slice(0, 5)
                });
            } catch (err) {
                console.error('Failed to fetch dashboard data', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) return <div className="loading-spinner">Loading Workspace...</div>;

    const cards = [
        { label: 'Total Revenue', value: stats?.overview?.totalRevenue || 0, icon: DollarSign, color: 'blue', trend: '+12.5%' },
        { label: 'Net Profit', value: stats?.overview?.netProfit || 0, icon: TrendingUp, color: 'emerald', trend: '+8.2%' },
        { label: 'Active Projects', value: stats?.overview?.activeProjectsCount || 0, icon: Briefcase, color: 'indigo', trend: '0%' },
        { label: 'Total Outstanding', value: stats?.overview?.totalOutstanding || 0, icon: Users, color: 'amber', trend: '-2.4%' },
    ];

    return (
        <div className="dashboard-page fade-in">
            <header className="page-header">
                <div className="header-left">
                    <h1 className="page-title">Welcome back, {user?.firstName || 'User'}!</h1>
                    <p className="page-subtitle">Here's what's happening with your projects today.</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary">Download Report</button>
                    <button className="btn btn-primary"><Plus size={18} /> New Project</button>
                </div>
            </header>

            <div className="tabs-container" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)' }}>
                <button
                    className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                    style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'overview' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'overview' ? 'var(--text)' : 'var(--text-muted)', fontWeight: activeTab === 'overview' ? '600' : '400', cursor: 'pointer' }}
                >
                    Overview
                </button>
                <button
                    className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('analytics')}
                    style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'analytics' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'analytics' ? 'var(--text)' : 'var(--text-muted)', fontWeight: activeTab === 'analytics' ? '600' : '400', cursor: 'pointer' }}
                >
                    Smart Analytics
                </button>
            </div>

            {activeTab === 'overview' ? (
                <>
                    <div className="stats-grid">
                        {cards.map((card, i) => (
                            <div key={i} className="stat-card">
                                <div className={`card-icon-bg ${card.color}`}>
                                    <card.icon size={24} />
                                </div>
                                <div className="card-info">
                                    <span className="card-label">{card.label}</span>
                                    <div className="card-value-row">
                                        <span className="card-value">${Number(card.value).toLocaleString()}</span>
                                        <span className={`card-trend ${card.trend.startsWith('+') ? 'up' : 'down'}`}>
                                            {card.trend.startsWith('+') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                            {card.trend}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="dashboard-grid-main">
                        <div className="card recent-activity">
                            <div className="card-header">
                                <h3 className="card-title">Recent Projects</h3>
                                <button className="text-btn">View All <ChevronRight size={16} /></button>
                            </div>
                            <div className="card-body">
                                <table className="modern-table">
                                    <thead>
                                        <tr>
                                            <th>Project Name</th>
                                            <th>Client</th>
                                            <th>Status</th>
                                            <th>Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats?.recentProjects?.map(project => (
                                            <tr key={project.id}>
                                                <td>
                                                    <div className="project-name-cell">
                                                        <div className="project-team-stack">
                                                            {(project.partners || []).slice(0, 3).map((p, idx) => (
                                                                <div
                                                                    key={p.id}
                                                                    className="team-avatar-mini"
                                                                    style={{
                                                                        zIndex: 3 - idx,
                                                                        marginLeft: idx === 0 ? 0 : '-8px',
                                                                        overflow: 'hidden'
                                                                    }}
                                                                    title={`${p.user?.firstName} ${p.user?.lastName}`}
                                                                >
                                                                    {p.user?.profilePicture ? (
                                                                        <img src={p.user.profilePicture} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                    ) : (
                                                                        p.user?.firstName?.charAt(0) || '?'
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {project.partners?.length > 3 && (
                                                                <div className="team-avatar-mini more" style={{ marginLeft: '-8px' }}>
                                                                    +{project.partners.length - 3}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span>{project.name}</span>
                                                    </div>
                                                </td>
                                                <td>{project.clientName}</td>
                                                <td>
                                                    <span className={`status-badge ${project.status.toLowerCase()}`}>
                                                        {project.status}
                                                    </span>
                                                </td>
                                                <td>${Number(project.totalValue).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="card company-health">
                            <div className="card-header">
                                <h3 className="card-title">Liquidity Overview</h3>
                            </div>
                            <div className="card-body">
                                <div className="liquidity-metric">
                                    <div className="metric-header">
                                        <span>Available Reserve</span>
                                        <span className="bold">${Number(stats?.overview?.companyProfit || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="progress-bar-container">
                                        <div className="progress-bar" style={{ width: '65%' }}></div>
                                    </div>
                                    <div className="metric-footer">
                                        <span>Target: $50,000</span>
                                        <span>65%</span>
                                    </div>
                                </div>

                                <div className="mini-stats-list">
                                    <div className="mini-stat-item">
                                        <div className="dot blue"></div>
                                        <span>Partner Earnings</span>
                                        <span className="ml-auto">${Number(stats?.overview?.totalPartnerEarnings || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="mini-stat-item">
                                        <div className="dot green"></div>
                                        <span>Total Paid Out</span>
                                        <span className="ml-auto">${Number(stats?.overview?.totalPaidOut || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <AnalyticsDashboard />
            )}
        </div>
    );
}
