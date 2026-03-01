import { useState, useEffect } from 'react';
import { Plus, Search, Filter, RefreshCw, Pause, Play, X, DollarSign, Calendar, Building2, FileText, CreditCard } from 'lucide-react';
import api from '../../api/client';
import '../Shared.css';
import './Subscriptions.css';

const freqLabels = { WEEKLY: 'Weekly', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', YEARLY: 'Yearly' };
const statusColors = { ACTIVE: 'success', PAUSED: 'warning', CANCELLED: 'danger' };

export default function Subscriptions() {
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [form, setForm] = useState({
        clientName: '', serviceName: '', amount: '', frequency: 'MONTHLY', startDate: '', nextRenewal: ''
    });

    useEffect(() => { fetchSubs(); }, [statusFilter]);

    const fetchSubs = async () => {
        try {
            const params = {};
            if (statusFilter) params.status = statusFilter;
            const { data } = await api.get('/subscriptions', { params });
            setSubs(data.data || []);
        } catch (_) { }
        setLoading(false);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/subscriptions', { ...form, amount: parseFloat(form.amount) });
            setShowForm(false);
            setForm({ clientName: '', serviceName: '', amount: '', frequency: 'MONTHLY', startDate: '', nextRenewal: '' });
            fetchSubs();
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    const changeStatus = async (id, status) => {
        try { await api.patch(`/subscriptions/${id}/status`, { status }); fetchSubs(); }
        catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    const generateInvoice = async (id) => {
        try { await api.post(`/subscriptions/${id}/invoices`); alert('Invoice generated!'); }
        catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '---';

    const mrr = subs.filter(s => s.status === 'ACTIVE').reduce((sum, s) => {
        const amount = parseFloat(s.amount) || 0;
        if (s.frequency === 'WEEKLY') return sum + amount * 4.33;
        if (s.frequency === 'MONTHLY') return sum + amount;
        if (s.frequency === 'QUARTERLY') return sum + amount / 3;
        if (s.frequency === 'YEARLY') return sum + amount / 12;
        return sum;
    }, 0);

    return (
        <div className="subscriptions-page fade-in">
            <header className="page-header">
                <div className="header-left">
                    <h1 className="page-title">Recurring Revenue</h1>
                    <p className="page-subtitle">Manage retainers, subscriptions, and monthly services.</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <Plus size={18} /> New Retainer
                    </button>
                </div>
            </header>

            <div className="stats-row">
                <div className="stat-card accent-green">
                    <span className="stat-label">Active MRR</span>
                    <span className="stat-value">{fmt(mrr)}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Active Retainers</span>
                    <span className="stat-value">{subs.filter(s => s.status === 'ACTIVE').length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Total Retainers</span>
                    <span className="stat-value">{subs.length}</span>
                </div>
            </div>

            <div className="filter-bar">
                <div className="filter-group">
                    <Filter size={18} className="text-tertiary" />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="filter-select">
                        <option value="">All Statuses</option>
                        {Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="loading-spinner"><div className="spinner" /><span>Loading...</span></div>
            ) : (
                <div className="card">
                    <div className="card-body p-0">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Client / Service</th>
                                    <th>Amount</th>
                                    <th>Frequency</th>
                                    <th>Status</th>
                                    <th>Next Renewal</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subs.map(s => (
                                    <tr key={s.id}>
                                        <td>
                                            <div className="sub-cell">
                                                <span className="font-semibold">{s.clientName}</span>
                                                <span className="text-xs text-tertiary">{s.serviceName}</span>
                                            </div>
                                        </td>
                                        <td><span className="font-bold">{fmt(s.amount)}</span></td>
                                        <td><span className="text-sm">{freqLabels[s.frequency]}</span></td>
                                        <td><span className={`status-badge ${statusColors[s.status]}`}>{s.status}</span></td>
                                        <td><span className="text-xs">{fmtDate(s.nextRenewal)}</span></td>
                                        <td className="text-right">
                                            <div className="action-btns">
                                                {s.status === 'ACTIVE' && (
                                                    <>
                                                        <button className="mini-btn" title="Pause" onClick={() => changeStatus(s.id, 'PAUSED')}><Pause size={14} /></button>
                                                        <button className="mini-btn accent" title="Generate Invoice" onClick={() => generateInvoice(s.id)}><CreditCard size={14} /></button>
                                                    </>
                                                )}
                                                {s.status === 'PAUSED' && (
                                                    <button className="mini-btn" title="Resume" onClick={() => changeStatus(s.id, 'ACTIVE')}><Play size={14} /></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {subs.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-tertiary">No subscriptions found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-card fade-in">
                        <div className="modal-header">
                            <h3 className="card-title">Add Retainer / Subscription</h3>
                            <button className="icon-btn" onClick={() => setShowForm(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-row-2">
                                    <div className="form-group"><label className="form-label">Client Name</label>
                                        <div className="input-wrapper"><Building2 size={16} className="input-icon" />
                                            <input className="form-input" required value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} placeholder="Acme Corp" />
                                        </div>
                                    </div>
                                    <div className="form-group"><label className="form-label">Service Name</label>
                                        <div className="input-wrapper"><FileText size={16} className="input-icon" />
                                            <input className="form-input" required value={form.serviceName} onChange={e => setForm({ ...form, serviceName: e.target.value })} placeholder="Monthly Maintenance" />
                                        </div>
                                    </div>
                                </div>
                                <div className="form-row-2">
                                    <div className="form-group"><label className="form-label">Amount ($)</label>
                                        <div className="input-wrapper"><DollarSign size={16} className="input-icon" />
                                            <input className="form-input" type="number" min="0.01" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-group"><label className="form-label">Frequency</label>
                                        <div className="input-wrapper"><RefreshCw size={16} className="input-icon" />
                                            <select className="form-input" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
                                                {Object.entries(freqLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="form-row-2">
                                    <div className="form-group"><label className="form-label">Start Date</label>
                                        <div className="input-wrapper"><Calendar size={16} className="input-icon" />
                                            <input className="form-input" type="date" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-group"><label className="form-label">Next Renewal</label>
                                        <div className="input-wrapper"><Calendar size={16} className="input-icon" />
                                            <input className="form-input" type="date" required value={form.nextRenewal} onChange={e => setForm({ ...form, nextRenewal: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Retainer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
