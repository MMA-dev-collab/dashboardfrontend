import React, { useEffect, useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Download, Calendar, Filter } from 'lucide-react';
import api from '../../api/client';
import './AnalyticsDashboard.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsDashboard() {
    const [dateRange, setDateRange] = useState('30');
    const [data, setData] = useState({
        revenue: [],
        projects: null,
        workload: []
    });
    const [reports, setReports] = useState(null);
    const [workloadDetailed, setWorkloadDetailed] = useState([]);
    const [activeWorkSummary, setActiveWorkSummary] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, [dateRange]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - parseInt(dateRange));

            const params = {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            };

            const [revRes, projRes, workRes, reportRes, workloadRes, activeWorkRes] = await Promise.all([
                api.get('/analytics/revenue', { params }),
                api.get('/analytics/projects', { params }),
                api.get('/analytics/workload'),
                api.get('/reports/task-summary', { params: { range: dateRange } }),
                api.get('/reports/workload'),
                api.get('/reports/active-work-summary')
            ]);

            setData({
                revenue: revRes.data.data,
                projects: projRes.data.data,
                workload: workRes.data.data
            });
            setReports(reportRes.data.data);
            setWorkloadDetailed(workloadRes.data.data || []);
            setActiveWorkSummary(activeWorkRes.data.data || []);
        } catch (err) {
            console.error('Failed to load analytics', err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (type) => {
        const { exportAnalyticsPDF } = await import('../../utils/exportReports');
        const { exportAnalyticsXLS } = await import('../../utils/exportXls');
        if (type === 'PDF') {
            await exportAnalyticsPDF(api, dateRange);
        } else {
            await exportAnalyticsXLS(api, dateRange);
        }
    };

    // Bottleneck bar color helper
    function bottleneckColor(days) {
        if (days < 2) return '#22c55e';
        if (days < 5) return '#f59e0b';
        return '#ef4444';
    }

    if (loading) return <div className="loading-spinner">Loading Analytics...</div>;

    const projectStatusData = data.projects ? Object.entries(data.projects.byStatus).map(([name, value]) => ({
        name, value
    })).filter(item => item.value > 0) : [];

    // Chart data from reports
    const completionTrendData = reports?.completedOverTime || [];
    const bottleneckData = reports?.bottlenecks || [];

    return (
        <div className="analytics-dashboard">
            <div className="analytics-header">
                <div className="filters-group">
                    <Calendar size={18} className="text-muted" />
                    <select
                        className="date-select"
                        value={dateRange}
                        onChange={e => setDateRange(e.target.value)}
                    >
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                        <option value="365">Last Year</option>
                    </select>
                    <button className="btn btn-outline btn-sm">
                        <Filter size={14} /> Compare
                    </button>
                </div>
                <div className="filters-group">
                    <button className="btn btn-outline btn-sm" onClick={() => handleExport('PDF')}>
                        <Download size={14} /> PDF
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => handleExport('Excel')}>
                        <Download size={14} /> Excel
                    </button>
                </div>
            </div>

            {/* Report Summary KPIs */}
            {reports && (
                <div className="report-kpis">
                    <div className="report-kpi-card">
                        <span className="kpi-label">Tasks Completed</span>
                        <span className="kpi-value">{reports.tasksCompleted}</span>
                    </div>
                    <div className="report-kpi-card">
                        <span className="kpi-label">Tasks Created</span>
                        <span className="kpi-value">{reports.tasksCreated}</span>
                    </div>
                    <div className="report-kpi-card">
                        <span className="kpi-label">Avg Completion</span>
                        <span className="kpi-value">{reports.avgCompletionDays}d</span>
                    </div>
                    <div className="report-kpi-card">
                        <span className="kpi-label">Bottleneck Stages</span>
                        <span className="kpi-value">{bottleneckData.length}</span>
                    </div>
                </div>
            )}

            <div className="charts-grid">
                {/* Revenue Trend */}
                <div className="chart-card full-width">
                    <h3 className="chart-title">Revenue Trends</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.revenue}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="var(--border)" />
                                <XAxis dataKey="date" stroke="var(--text-muted)" />
                                <YAxis stroke="var(--text-muted)" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                                    itemStyle={{ color: 'var(--text)' }}
                                />
                                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Project Performance */}
                <div className="chart-card">
                    <h3 className="chart-title">Projects by Status (Avg Completion: {data.projects?.averageCompletion || 0}%)</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={projectStatusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    label
                                >
                                    {projectStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Team Workload */}
                <div className="chart-card">
                    <h3 className="chart-title">Team Workload (Active Tasks & Points)</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.workload.slice(0, 10)}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="var(--border)" />
                                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} />
                                <Legend />
                                <Bar yAxisId="left" dataKey="activeTasksCount" name="Active Tasks" fill="#8884d8" radius={[4, 4, 0, 0]} />
                                <Bar yAxisId="right" dataKey="totalStoryPoints" name="Story Points" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Completion Velocity */}
                {completionTrendData.length > 0 && (
                    <div className="chart-card full-width">
                        <h3 className="chart-title">Completion Velocity (Tasks/Day)</h3>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={completionTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="var(--border)" />
                                    <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                                    <YAxis stroke="var(--text-muted)" />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} />
                                    <Bar dataKey="count" name="Completed" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Bottleneck Analysis */}
                {bottleneckData.length > 0 && (
                    <div className="chart-card full-width">
                        <h3 className="chart-title">Bottleneck Analysis — Avg Days Stuck</h3>
                        <div className="bottleneck-bars">
                            {bottleneckData.map((stage, i) => (
                                <div key={stage.stage + i} className="bottleneck-bar">
                                    <span className="bottleneck-label">{stage.stage}</span>
                                    <div className="bottleneck-track">
                                        <div
                                            className="bottleneck-fill"
                                            style={{ width: `${Math.min(100, (stage.avgDaysStuck / 10) * 100)}%`, backgroundColor: bottleneckColor(stage.avgDaysStuck) }}
                                        />
                                    </div>
                                    <span className="bottleneck-value">{stage.avgDaysStuck}d</span>
                                    <span className="bottleneck-count">{stage.tasksStuck} tasks</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Completed by Assignee */}
                {(reports?.completedByAssignee?.length > 0) && (
                    <div className="chart-card full-width">
                        <h3 className="chart-title">Completed Tasks by Assignee</h3>
                        <div className="assignee-bars">
                            {reports.completedByAssignee.slice(0, 10).map((a, i) => (
                                <div key={i} className="assignee-bar">
                                    <span className="assignee-name">{a.name}</span>
                                    <div className="assignee-track">
                                        <div
                                            className="assignee-fill"
                                            style={{ width: `${reports?.tasksCompleted > 0 ? (a.count / reports.tasksCompleted) * 100 : 0}%`, backgroundColor: COLORS[i % COLORS.length] }}
                                        />
                                    </div>
                                    <span className="assignee-count">{a.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Workload Heatmap */}
                {workloadDetailed.length > 0 && workloadDetailed.some(u => u.totalActiveTasks > 0) && (
                    <div className="chart-card full-width">
                        <h3 className="chart-title">Workload Heatmap</h3>
                        <div className="heatmap-table">
                            <div className="heatmap-header-row">
                                <span className="heatmap-name-cell">Team Member</span>
                                <span className="heatmap-priority critical">Critical</span>
                                <span className="heatmap-priority high">High</span>
                                <span className="heatmap-priority medium">Medium</span>
                                <span className="heatmap-priority low">Low</span>
                                <span className="heatmap-priority overdue">Overdue</span>
                                <span className="heatmap-priority total">Total</span>
                            </div>
                            {workloadDetailed
                                .filter(u => u.totalActiveTasks > 0)
                                .slice(0, 15)
                                .map(user => (
                                    <div key={user.userId} className="heatmap-data-row">
                                        <span className="heatmap-name-cell">
                                            {user.avatar ? (
                                                <img src={user.avatar} alt="" className="heatmap-avatar" />
                                            ) : (
                                                <span className="heatmap-avatar-placeholder">{user.name.split(' ').map(n => n[0]).join('')}</span>
                                            )}
                                            <span className="heatmap-name-text">{user.name}</span>
                                        </span>
                                        <HeatmapCell count={user.byPriority.CRITICAL} />
                                        <HeatmapCell count={user.byPriority.HIGH} />
                                        <HeatmapCell count={user.byPriority.MEDIUM} />
                                        <HeatmapCell count={user.byPriority.LOW} />
                                        <HeatmapCell count={user.overdueCount} type="overdue" />
                                        <span className="heatmap-count-badge">{user.totalActiveTasks}</span>
                                    </div>
                            ))}
                        </div>

                        {/* Expandable project breakdown for top-loaded users */}
                        {workloadDetailed.filter(u => u.totalActiveTasks > 3).map(user => (
                            <div key={`detail-${user.userId}`} className="heatmap-detail-row">
                                <span className="heatmap-detail-name">{user.name}</span>
                                <div className="heatmap-project-tags">
                                    {user.byProject.map(proj => (
                                        <span key={proj.projectId} className="heatmap-project-tag">
                                            {proj.name}
                                            <span className="heatmap-project-count">{proj.count}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Active Work Hours from Dev Sessions */}
                {activeWorkSummary.length > 0 && (
                    <div className="chart-card full-width">
                        <h3 className="chart-title">Active Work Hours (Dev Sessions)</h3>
                        <div className="work-hours-bars">
                            {activeWorkSummary.slice(0, 15).map((user, i) => (
                                <div key={user.userId} className="work-hours-row">
                                    <span className="work-hours-name">{user.name}</span>
                                    <div className="work-hours-track">
                                        <div
                                            className="work-hours-fill"
                                            style={{
                                                width: `${activeWorkSummary[0]?.totalActiveHours > 0 ? (user.totalActiveHours / activeWorkSummary[0].totalActiveHours) * 100 : 0}%`,
                                                backgroundColor: i === 0 ? '#22c55e' : i < 3 ? '#3b82f6' : '#6366f1'
                                            }}
                                        />
                                    </div>
                                    <span className="work-hours-value">{user.totalActiveHours}h</span>
                                    <span className="work-hours-meta">{user.sessionsCompleted} sessions</span>
                                </div>
                            ))}
                        </div>

                        {/* Per-user project breakdown */}
                        {activeWorkSummary.filter(u => u.byProject.length > 0).map(user => (
                            <div key={`proj-${user.userId}`} className="work-hours-detail-row">
                                <span className="work-hours-detail-name">{user.name}</span>
                                <div className="work-hours-project-tags">
                                    {user.byProject.map(proj => (
                                        <span key={proj.projectId} className="work-hours-project-tag">
                                            {proj.name}
                                            <span className="work-hours-project-count">{proj.sessions} sessions · {proj.hours}h</span>
                                        </span>
                                    ))}
                                    {user.sessionsPushed > 0 && (
                                        <span className="work-hours-push-badge">{user.sessionsPushed} pushes</span>
                                    )}
                                    {user.sessionsRequiresPull > 0 && (
                                        <span className="work-hours-pull-badge">{user.sessionsRequiresPull} pull reqs</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function formatHours(h) {
    return `${h}h`;
}

function HeatmapCell({ count, type = 'priority' }) {
    if (!count || count === 0) return <div className="heatmap-cell heatmap-empty">0</div>;
    const intensity = type === 'overdue'
        ? count >= 3 ? 'critical' : count >= 2 ? 'high' : 'low'
        : count >= 5 ? 'critical' : count >= 3 ? 'high' : count >= 1 ? 'medium' : 'low';
    return <div className={`heatmap-cell heatmap-${intensity}`}>{count}</div>;
}
