import { useState, useEffect } from 'react';
import { Plus, ArrowRight, Search, Building2, User, Mail, Phone, Globe, DollarSign, FileText, X, Filter } from 'lucide-react';
import api from '../../api/client';
import '../Shared.css';
import './Leads.css';

const stageColors = {
    NEW: 'blue',
    CONTACTED: 'purple',
    QUALIFIED: 'indigo',
    PROPOSAL_SENT: 'warning',
    NEGOTIATION: 'orange',
    WON: 'success',
    LOST: 'danger'
};

export default function Leads() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState('');
    const [stageFilter, setStageFilter] = useState('');
    const [form, setForm] = useState({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        source: '',
        expectedValue: '',
        notes: ''
    });

    useEffect(() => {
        fetchLeads();
    }, [search, stageFilter]);

    const fetchLeads = async () => {
        try {
            const { data } = await api.get('/leads');
            let filtered = data.data || [];
            if (search) {
                filtered = filtered.filter(l =>
                    l.companyName.toLowerCase().includes(search.toLowerCase()) ||
                    l.contactName.toLowerCase().includes(search.toLowerCase())
                );
            }
            if (stageFilter) {
                filtered = filtered.filter(l => l.stage === stageFilter);
            }
            setLeads(filtered);
        } catch (_) { }
        setLoading(false);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/leads', {
                ...form,
                expectedValue: form.expectedValue ? parseFloat(form.expectedValue) : undefined
            });
            setShowForm(false);
            setForm({ companyName: '', contactName: '', email: '', phone: '', source: '', expectedValue: '', notes: '' });
            fetchLeads();
        } catch (err) {
            alert(err.response?.data?.message || 'Error creating lead');
        }
    };

    const handleConvert = async (id) => {
        if (!confirm('Convert this lead to an active project? This will create a project entry.')) return;
        try {
            await api.post(`/leads/${id}/convert`);
            fetchLeads();
        } catch (err) {
            alert(err.response?.data?.message || 'Error converting lead');
        }
    };

    const handleDeleteLead = async (id) => {
        if (!confirm('Are you sure you want to delete this lead?')) return;
        try {
            await api.delete(`/leads/${id}`);
            fetchLeads();
        } catch (err) {
            alert(err.response?.data?.message || 'Error deleting lead');
        }
    };

    const fmt = (v) => v ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(v) : '---';

    return (
        <div className="leads-page fade-in">
            <header className="page-header">
                <div className="header-left">
                    <h1 className="page-title">Sales Pipeline</h1>
                    <p className="page-subtitle">Manage prospects, tracking outreach, and converting leads to projects.</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <Plus size={18} /> New Prospect
                    </button>
                </div>
            </header>

            <div className="filter-bar">
                <div className="search-field">
                    <Search size={18} className="icon" />
                    <input
                        type="text"
                        placeholder="Search by company or primary contact..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <Filter size={18} className="text-tertiary" />
                    <select
                        value={stageFilter}
                        onChange={e => setStageFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">All Pipeline Stages</option>
                        {Object.keys(stageColors).map(s => (
                            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="loading-spinner">
                    <div className="spinner" />
                    <span>Refreshing Leads...</span>
                </div>
            ) : (
                <div className="card">
                    <div className="card-body p-0">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Prospect Entity</th>
                                    <th>Primary Contact</th>
                                    <th>Pipeline Stage</th>
                                    <th>Expected Deal Size</th>
                                    <th>Acquisition Source</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leads.map(l => (
                                    <tr key={l.id}>
                                        <td>
                                            <div className="prospect-cell">
                                                <div className="prospect-icon">
                                                    <Building2 size={16} />
                                                </div>
                                                <span className="font-semibold">{l.companyName}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="contact-info-stack">
                                                <span className="text-sm font-medium">{l.contactName}</span>
                                                {l.email && <span className="text-xs text-tertiary">{l.email}</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${stageColors[l.stage]}`}>
                                                {l.stage.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="font-bold">{fmt(l.expectedValue)}</span>
                                        </td>
                                        <td>
                                            <div className="source-cell">
                                                <Globe size={14} className="text-tertiary" />
                                                <span className="text-xs">{l.source || 'Direct Entry'}</span>
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                {l.stage !== 'WON' && l.stage !== 'LOST' && (
                                                    <button className="convert-pill" onClick={() => handleConvert(l.id)}>
                                                        <span>Convert</span>
                                                        <ArrowRight size={14} />
                                                    </button>
                                                )}
                                                <button 
                                                    className="icon-btn text-danger" 
                                                    onClick={() => handleDeleteLead(l.id)}
                                                    title="Delete Lead"
                                                    style={{ padding: '6px', borderRadius: '6px' }}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {leads.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-tertiary">
                                            No prospects found in the current view.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal for New Lead */}
            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-card fade-in">
                        <div className="modal-header">
                            <h3 className="card-title">Add New Prospect</h3>
                            <button className="icon-btn" onClick={() => setShowForm(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-grid">
                                    <div className="form-row-2">
                                        <div className="form-group">
                                            <label className="form-label">Company Name</label>
                                            <div className="input-wrapper">
                                                <Building2 size={16} className="input-icon" />
                                                <input
                                                    className="form-input"
                                                    required
                                                    value={form.companyName}
                                                    onChange={e => setForm({ ...form, companyName: e.target.value })}
                                                    placeholder="Legal entity name"
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Lead Source</label>
                                            <div className="input-wrapper">
                                                <Globe size={16} className="input-icon" />
                                                <input
                                                    className="form-input"
                                                    value={form.source}
                                                    onChange={e => setForm({ ...form, source: e.target.value })}
                                                    placeholder="e.g. LinkedIn"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-row-2">
                                        <div className="form-group">
                                            <label className="form-label">Contact Person</label>
                                            <div className="input-wrapper">
                                                <User size={16} className="input-icon" />
                                                <input
                                                    className="form-input"
                                                    required
                                                    value={form.contactName}
                                                    onChange={e => setForm({ ...form, contactName: e.target.value })}
                                                    placeholder="Decision maker"
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Phone Number</label>
                                            <div className="input-wrapper">
                                                <Phone size={16} className="input-icon" />
                                                <input
                                                    className="form-input"
                                                    value={form.phone}
                                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                                    placeholder="+1..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-row-2">
                                        <div className="form-group">
                                            <label className="form-label">Email Address</label>
                                            <div className="input-wrapper">
                                                <Mail size={16} className="input-icon" />
                                                <input
                                                    className="form-input"
                                                    type="email"
                                                    value={form.email}
                                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                                    placeholder="client@company.com"
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Estimated Deal Size ($)</label>
                                            <div className="input-wrapper">
                                                <DollarSign size={16} className="input-icon" />
                                                <input
                                                    className="form-input"
                                                    type="number"
                                                    min="0"
                                                    value={form.expectedValue}
                                                    onChange={e => setForm({ ...form, expectedValue: e.target.value })}
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Discovery Notes</label>
                                        <div className="input-wrapper align-top">
                                            <FileText size={16} className="input-icon mt-3" />
                                            <textarea
                                                className="form-input"
                                                value={form.notes}
                                                onChange={e => setForm({ ...form, notes: e.target.value })}
                                                rows={3}
                                                placeholder="Key requirements, budget, timeline..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create Lead
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
