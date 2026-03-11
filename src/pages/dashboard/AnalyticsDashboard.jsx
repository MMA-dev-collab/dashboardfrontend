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
    const [dateRange, setDateRange] = useState('30'); // days
    const [data, setData] = useState({
        revenue: [],
        projects: null,
        workload: []
    });
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

            const [revRes, projRes, workRes] = await Promise.all([
                api.get('/analytics/revenue', { params }),
                api.get('/analytics/projects', { params }),
                api.get('/analytics/workload')
            ]);

            setData({
                revenue: revRes.data.data,
                projects: projRes.data.data,
                workload: workRes.data.data
            });
        } catch (err) {
            console.error('Failed to load analytics', err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = (type) => {
        // Basic export simulation
        alert(`Exporting dashboard to ${type} format. (Feature uses jspdf / exceljs in action)`);
    };

    if (loading) return <div className="loading-spinner">Loading Analytics...</div>;

    const projectStatusData = data.projects ? Object.entries(data.projects.byStatus).map(([name, value]) => ({
        name, value
    })).filter(item => item.value > 0) : [];

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
            </div>
        </div>
    );
}
