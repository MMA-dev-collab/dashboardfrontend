import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, Users, CheckCircle, AlertTriangle, ChevronRight,
    TrendingUp, Target, Clock, ArrowRight
} from 'lucide-react';
import api from '../../api/client';
import './ProjectComparison.css';

const statusOrder = { ACTIVE: 0, PLANNING: 1, ON_HOLD: 2, COMPLETED: 3, CANCELLED: 4 };

const sortByOptions = [
    { value: 'name', label: 'Name' },
    { value: 'progress', label: 'Progress %' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'deadline', label: 'Deadline' },
    { value: 'velocity', label: 'Velocity' },
    { value: 'value', label: 'Value' },
];

function fmtDate(d) {
    if (!d) return 'No deadline';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtCurrency(v) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

export default function ProjectComparison() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('name');

    useEffect(() => {
        fetchComparison();
    }, []);

    const fetchComparison = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/reports/project-comparison');
            setProjects(data.data || []);
        } catch (err) {
            console.error('Failed to load project comparison', err);
        } finally {
            setLoading(false);
        }
    };

    const sorted = [...projects].sort((a, b) => {
        switch (sortBy) {
            case 'progress': return b.completionPct - a.completionPct;
            case 'overdue': return b.overdueTasks - a.overdueTasks;
            case 'deadline': return (a.daysRemaining || 9999) - (b.daysRemaining || 9999);
            case 'velocity': return b.velocity - a.velocity;
            case 'value': return b.totalValue - a.totalValue;
            default: return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
        }
    });

    if (loading) return <div className="loading-spinner"><div className="spinner" /> Loading Comparison...</div>;

    return (
        <div className="project-comparison">
            <div className="comparison-header">
                <div className="header-left">
                    <h3>Project Comparison</h3>
                    <p>{projects.length} active projects</p>
                </div>
                <div className="sort-controls">
                    <span className="sort-label">Sort by</span>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sort-select">
                        {sortByOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {sorted.length === 0 ? (
                <div className="empty-state">
                    <Target size={48} className="empty-icon" />
                    <h3>No active projects</h3>
                </div>
            ) : (
                <div className="comparison-cards">
                    {sorted.map(p => (
                        <div
                            key={p.projectId}
                            className="comparison-card"
                            onClick={() => navigate(`/projects/${p.projectId}`)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="card-top">
                                <div className="card-title-row">
                                    <span className="project-title">{p.name}</span>
                                    <ChevronRight size={16} className="arrow-icon" />
                                </div>
                                <span className={`status-dot status-${p.status.toLowerCase()}`}>
                                    {p.status.replace('_', ' ')}
                                </span>
                            </div>

                            <div className="progress-row">
                                <div className="progress-label">
                                    <span className="progress-text">{p.completionPct}% complete</span>
                                </div>
                                <div className="progress-track">
                                    <div
                                        className="progress-fill"
                                        style={{
                                            width: `${p.completionPct}%`,
                                            backgroundColor: p.completionPct >= 80 ? '#22c55e' : p.completionPct >= 50 ? '#3b82f6' : p.completionPct >= 25 ? '#f59e0b' : '#ef4444'
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="metrics-grid">
                                <div className="metric">
                                    <CheckCircle size={14} className="metric-icon green" />
                                    <span className="metric-val">{p.completedTasks}</span>
                                    <span className="metric-lbl">Done</span>
                                </div>
                                <div className="metric">
                                    <AlertTriangle size={14} className={`metric-icon ${p.overdueTasks > 0 ? 'red' : 'gray'}`} />
                                    <span className={`metric-val ${p.overdueTasks > 0 ? 'text-red' : ''}`}>{p.overdueTasks}</span>
                                    <span className="metric-lbl">Overdue</span>
                                </div>
                                <div className="metric">
                                    <Users size={14} className="metric-icon blue" />
                                    <span className="metric-val">{p.assigneeCount}</span>
                                    <span className="metric-lbl">Team</span>
                                </div>
                                <div className="metric">
                                    {p.daysRemaining !== null && p.daysRemaining !== undefined ? (
                                        <>
                                            <Clock size={14} className={`metric-icon ${p.daysRemaining < 0 ? 'red' : p.daysRemaining < 14 ? 'amber' : 'gray'}`} />
                                            <span className="metric-val">{p.daysRemaining > 0 ? `${p.daysRemaining}d` : p.daysRemaining < 0 ? `${Math.abs(p.daysRemaining)}d overdue` : 'Today'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <TrendingUp size={14} className="metric-icon blue" />
                                            <span className="metric-val">{p.velocity}/mo</span>
                                        </>
                                    )}
                                    <span className="metric-lbl">{p.daysRemaining !== null ? 'Deadline' : 'Velocity'}</span>
                                </div>
                            </div>

                            <div className="card-footer-row">
                                <span className="footer-value">{fmtCurrency(p.totalValue)}</span>
                                <ArrowRight size={14} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
