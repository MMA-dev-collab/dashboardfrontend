import { useState, useEffect } from 'react';
import { Plus, Search, Filter, FileText, Send, CheckCircle, XCircle, Eye, X, User, Building2, DollarSign, Calendar, Edit2 } from 'lucide-react';
import api from '../../api/client';
import '../Shared.css';
import './Proposals.css';

const statusColors = {
    DRAFT: 'text-tertiary',
    SENT: 'blue',
    ACCEPTED: 'success',
    REJECTED: 'danger',
};

export default function Proposals() {
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selected, setSelected] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [form, setForm] = useState({
        title: '', clientName: '', totalAmount: '', validUntil: '', content: null, leadId: null
    });

    useEffect(() => { fetchProposals(); }, []);

    const fetchProposals = async () => {
        try {
            const params = {};
            if (statusFilter) params.status = statusFilter;
            const { data } = await api.get('/proposals', { params });
            setProposals(data.data || []);
        } catch (_) { }
        setLoading(false);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/proposals', {
                ...form,
                totalAmount: parseFloat(form.totalAmount) || 0,
                content: { sections: [{ title: 'Overview', body: '' }, { title: 'Scope of Work', body: '' }, { title: 'Pricing', body: '' }] },
            });
            setShowForm(false);
            setForm({ title: '', clientName: '', totalAmount: '', validUntil: '', content: null, leadId: null });
            fetchProposals();
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    const updateStatus = async (id, status) => {
        try {
            await api.patch(`/proposals/${id}/status`, { status });
            fetchProposals();
            setSelected(null);
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '---';

    const filtered = proposals.filter(p =>
        (!search || p.title.toLowerCase().includes(search.toLowerCase()) || p.clientName.toLowerCase().includes(search.toLowerCase())) &&
        (!statusFilter || p.status === statusFilter)
    );

    return (
        <div className="proposals-page fade-in">
            <header className="page-header">
                <div className="header-left">
                    <h1 className="page-title">Proposal Builder</h1>
                    <p className="page-subtitle">Draft, manage, and track client proposals.</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <Plus size={18} /> New Proposal
                    </button>
                </div>
            </header>

            <div className="filter-bar">
                <div className="search-field">
                    <Search size={18} className="icon" />
                    <input type="text" placeholder="Search proposals..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
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
                <div className="proposals-grid">
                    {filtered.map(p => (
                        <div key={p.id} className="proposal-card" onClick={() => setSelected(p)}>
                            <div className="proposal-card-header">
                                <span className={`status-badge ${statusColors[p.status]}`}>{p.status}</span>
                                <span className="text-xs text-tertiary">{fmtDate(p.createdAt)}</span>
                            </div>
                            <h3 className="proposal-card-title">{p.title}</h3>
                            <div className="proposal-card-client">
                                <Building2 size={14} className="text-tertiary" />
                                <span>{p.clientName}</span>
                            </div>
                            <div className="proposal-card-footer">
                                <span className="proposal-amount">{fmt(p.totalAmount)}</span>
                                <span className="text-xs text-tertiary">Valid until {fmtDate(p.validUntil)}</span>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="empty-state-block">
                            <FileText size={48} className="text-tertiary" />
                            <p>No proposals found.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Detail / Action Modal */}
            {selected && (
                <div className="modal-overlay" onClick={() => setSelected(null)}>
                    <div className="modal-card fade-in wide" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="card-title">{selected.title}</h3>
                            <button className="icon-btn" onClick={() => setSelected(null)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-grid">
                                <div className="detail-item"><span className="detail-label">Client</span><span>{selected.clientName}</span></div>
                                <div className="detail-item"><span className="detail-label">Value</span><span className="font-bold">{fmt(selected.totalAmount)}</span></div>
                                <div className="detail-item"><span className="detail-label">Status</span><span className={`status-badge ${statusColors[selected.status]}`}>{selected.status}</span></div>
                                <div className="detail-item"><span className="detail-label">Valid Until</span><span>{fmtDate(selected.validUntil)}</span></div>
                                <div className="detail-item"><span className="detail-label">Created By</span><span>{selected.creator?.firstName} {selected.creator?.lastName}</span></div>
                                <div className="detail-item"><span className="detail-label">Created</span><span>{fmtDate(selected.createdAt)}</span></div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            {selected.status === 'DRAFT' && (
                                <button className="btn btn-primary" onClick={() => updateStatus(selected.id, 'SENT')}>
                                    <Send size={16} /> Mark as Sent
                                </button>
                            )}
                            {selected.status === 'SENT' && (
                                <>
                                    <button className="btn btn-success" onClick={() => updateStatus(selected.id, 'ACCEPTED')}>
                                        <CheckCircle size={16} /> Accepted
                                    </button>
                                    <button className="btn btn-danger" onClick={() => updateStatus(selected.id, 'REJECTED')}>
                                        <XCircle size={16} /> Rejected
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-card fade-in">
                        <div className="modal-header">
                            <h3 className="card-title">Draft New Proposal</h3>
                            <button className="icon-btn" onClick={() => setShowForm(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Proposal Title</label>
                                    <div className="input-wrapper"><FileText size={16} className="input-icon" />
                                        <input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Website Redesign Proposal" />
                                    </div>
                                </div>
                                <div className="form-row-2">
                                    <div className="form-group">
                                        <label className="form-label">Client Name</label>
                                        <div className="input-wrapper"><Building2 size={16} className="input-icon" />
                                            <input className="form-input" required value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} placeholder="Company Inc." />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Total Amount ($)</label>
                                        <div className="input-wrapper"><DollarSign size={16} className="input-icon" />
                                            <input className="form-input" type="number" min="0" step="0.01" value={form.totalAmount} onChange={e => setForm({ ...form, totalAmount: e.target.value })} placeholder="0" />
                                        </div>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Valid Until</label>
                                    <div className="input-wrapper"><Calendar size={16} className="input-icon" />
                                        <input className="form-input" type="date" value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Draft</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
