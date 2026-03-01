import { useState, useEffect } from 'react';
import { Search, History, Filter, User, Box, Activity, Calendar, ShieldCheck } from 'lucide-react';
import api from '../../api/client';
import '../Shared.css';
import './AuditLog.css';

export default function AuditLog() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [moduleFilter, setModuleFilter] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchLogs();
    }, [moduleFilter]);

    const fetchLogs = async () => {
        try {
            const params = {};
            if (moduleFilter) params.module = moduleFilter;
            const { data } = await api.get('/audit', { params });
            setLogs(data.data || []);
        } catch (_) { }
        setLoading(false);
    };

    const fmtDate = (d) => new Date(d).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const moduleColors = {
        projects: 'blue',
        finance: 'emerald',
        withdrawals: 'warning',
        expenses: 'danger',
        crm: 'indigo',
        auth: 'purple'
    };

    const filteredLogs = search
        ? logs.filter(l =>
            l.action.toLowerCase().includes(search.toLowerCase()) ||
            (l.user && `${l.user.firstName} ${l.user.lastName}`.toLowerCase().includes(search.toLowerCase()))
        )
        : logs;

    return (
        <div className="audit-page fade-in">
            <header className="page-header">
                <div className="header-left">
                    <h1 className="page-title">Compliance & Audits</h1>
                    <p className="page-subtitle">A immutable record of all system-wide administrative actions.</p>
                </div>
                <div className="header-actions">
                    <div className="badge-outline">
                        <ShieldCheck size={14} />
                        <span>Audit Secured</span>
                    </div>
                </div>
            </header>

            <div className="filter-bar">
                <div className="search-field">
                    <Search size={18} className="icon" />
                    <input
                        type="text"
                        placeholder="Search by action or user..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <Filter size={18} className="text-tertiary" />
                    <select
                        value={moduleFilter}
                        onChange={e => setModuleFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">All Operational Modules</option>
                        {['projects', 'finance', 'withdrawals', 'expenses', 'crm', 'auth'].map(m => (
                            <option key={m} value={m}>{m.toUpperCase()}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="loading-spinner">
                    <div className="spinner" />
                    <span>Retrieving Ledger...</span>
                </div>
            ) : (
                <div className="card">
                    <div className="card-body p-0">
                        <table className="modern-table density-high">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Initiator</th>
                                    <th>Functional Module</th>
                                    <th>System Action</th>
                                    <th>Resource ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map(l => (
                                    <tr key={l.id}>
                                        <td>
                                            <div className="time-stack">
                                                <Calendar size={12} className="text-tertiary" />
                                                <span className="text-xs font-medium">{fmtDate(l.createdAt)}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="partner-cell">
                                                <div className="avatar micro">{l.user ? l.user.firstName.charAt(0) : 'S'}</div>
                                                <span className="text-sm">{l.user ? `${l.user.firstName} ${l.user.lastName}` : 'System Kernel'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${moduleColors[l.module] || 'text-tertiary'}`}>
                                                {l.module.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-type-cell">
                                                <code>{l.action}</code>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="text-xxs font-mono text-tertiary">
                                                {l.entityId ? l.entityId : 'Global Action'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {filteredLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12 text-tertiary">
                                            No matching audit records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
