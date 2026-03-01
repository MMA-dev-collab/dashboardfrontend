import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Briefcase, User, Mail, DollarSign, Percent, FileText, ChevronRight, X, Trash2, Edit2 } from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../store/useAuthStore';
import '../Shared.css';
import './Projects.css';

const statusColors = {
    PLANNING: 'planning',
    ACTIVE: 'active',
    ON_HOLD: 'on-hold',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

const paymentColors = {
    NOT_PAID: 'danger',
    PARTIALLY_PAID: 'warning',
    FULLY_PAID: 'success',
};

export default function Projects() {
    const navigate = useNavigate();
    const { hasRole } = useAuthStore();
    const isAdmin = hasRole('Admin');

    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editProject, setEditProject] = useState(null);
    const [paymentProject, setPaymentProject] = useState(null);
    const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'BANK_TRANSFER', note: '' });
    const [form, setForm] = useState({
        name: '',
        clientName: '',
        clientEmail: '',
        totalValue: '',
        companyPercentage: 30,
        description: '',
        partners: []
    });

    useEffect(() => {
        fetchProjects();
        fetchUsers();
    }, [search, statusFilter]);

    const fetchUsers = async () => {
        try {
            const { data } = await api.get('/users', { params: { limit: 100 } });
            setUsers(data.data || []);
        } catch (_) { }
    };

    const fetchProjects = async () => {
        try {
            const params = {};
            if (search) params.search = search;
            if (statusFilter) params.status = statusFilter;
            const { data } = await api.get('/projects', { params });
            setProjects(data.data || []);
        } catch (_) { }
        setLoading(false);
    };

    const handleCreate = async (e) => {
        e.preventDefault();

        const cPct = parseFloat(form.companyPercentage) || 0;
        const pTotal = form.partners.reduce((sum, p) => sum + (parseFloat(p.percentage) || 0), 0);

        if (cPct + pTotal !== 100) {
            alert(`Total ownership must equal exactly 100%. Currently Company (${cPct}%) + Partners (${pTotal}%) = ${cPct + pTotal}%`);
            return;
        }

        try {
            await api.post('/projects', {
                ...form,
                totalValue: parseFloat(form.totalValue),
                companyPercentage: cPct,
                partners: form.partners.map(p => ({
                    userId: p.userId,
                    percentage: parseFloat(p.percentage),
                    role: 'contributor'
                }))
            });
            setShowForm(false);
            setForm({ name: '', clientName: '', clientEmail: '', totalValue: '', companyPercentage: 30, description: '', partners: [] });
            fetchProjects();
        } catch (err) {
            alert(err.response?.data?.message || 'Error creating project');
        }
    };

    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/projects/${editProject.id}`, {
                status: editProject.status,
                completionPct: parseInt(editProject.completionPct || 0)
            });
            setEditProject(null);
            fetchProjects();
        } catch (err) {
            alert(err.response?.data?.message || 'Error updating status');
        }
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/finance/projects/${paymentProject.id}/payments`, {
                amount: parseFloat(paymentForm.amount),
                method: paymentForm.method,
                note: paymentForm.note
            });
            setPaymentProject(null);
            setPaymentForm({ amount: '', method: 'BANK_TRANSFER', note: '' });
            fetchProjects();
        } catch (err) {
            alert(err.response?.data?.message || 'Error recording payment');
        }
    };

    const fmt = (v) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(v || 0);

    return (
        <div className="projects-page fade-in">
            <header className="page-header">
                <div className="header-left">
                    <h1 className="page-title">Projects</h1>
                    <p className="page-subtitle">Manage and track company projects portfolio.</p>
                </div>
                <div className="header-actions">
                    {isAdmin && (
                        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                            <Plus size={18} /> New Project
                        </button>
                    )}
                </div>
            </header>

            <div className="filter-bar">
                <div className="search-field">
                    <Search size={18} className="icon" />
                    <input
                        type="text"
                        placeholder="Search projects by name or client..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <Filter size={18} className="text-tertiary" />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">All Statuses</option>
                        {Object.keys(statusColors).map(s => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="loading-spinner">
                    <div className="spinner" />
                    <span>Syncing Projects...</span>
                </div>
            ) : (
                <div className="card">
                    <div className="card-body p-0">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Project Details</th>
                                    <th>Client</th>
                                    <th>Valuation</th>
                                    <th>Status</th>
                                    <th>Progress</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <div className="project-name-cell">
                                                <div className="project-avatar">{p.name.charAt(0)}</div>
                                                <div className="project-info-stack">
                                                    <span className="font-semibold">{p.name}</span>
                                                    <span className="text-xs text-tertiary">#INV-{p.id.substring(0, 6)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="client-info-stack">
                                                <span className="text-sm font-medium">{p.clientName}</span>
                                                {p.clientEmail && <span className="text-xs text-tertiary">{p.clientEmail}</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="value-info-stack">
                                                <span className="font-bold">{fmt(p.totalValue)}</span>
                                                <span className={`text-xs payment-status ${p.paymentStatus.toLowerCase()}`}>
                                                    {p.paymentStatus.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${statusColors[p.status]}`}>
                                                {p.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="progress-stack">
                                                <div className="progress-bar-container mini">
                                                    <div className="progress-bar" style={{ width: `${p.completionPct}%` }} />
                                                </div>
                                                <span className="text-xs font-medium">{p.completionPct}%</span>
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                {isAdmin && (
                                                    <>
                                                        <button
                                                            onClick={() => setPaymentProject(p)}
                                                            className="icon-btn-small"
                                                            title="Record Payment"
                                                        >
                                                            <DollarSign size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditProject(p)}
                                                            className="icon-btn-small"
                                                            title="Edit Details"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    className="icon-btn-small"
                                                    onClick={() => navigate(`/projects/${p.id}`)}
                                                    title="View Dashboard"
                                                >
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {projects.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-tertiary">
                                            No projects match your criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal for New Project */}
            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-card fade-in">
                        <div className="modal-header">
                            <h3 className="card-title">Initiate New Project</h3>
                            <button className="icon-btn" onClick={() => setShowForm(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Project Name</label>
                                        <div className="input-wrapper">
                                            <Briefcase size={16} className="input-icon" />
                                            <input
                                                className="form-input"
                                                required
                                                value={form.name}
                                                onChange={e => setForm({ ...form, name: e.target.value })}
                                                placeholder="e.g. Website Redesign"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Client Name</label>
                                        <div className="input-wrapper">
                                            <User size={16} className="input-icon" />
                                            <input
                                                className="form-input"
                                                required
                                                value={form.clientName}
                                                onChange={e => setForm({ ...form, clientName: e.target.value })}
                                                placeholder="e.g. Acme Corp"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Client Email</label>
                                        <div className="input-wrapper">
                                            <Mail size={16} className="input-icon" />
                                            <input
                                                className="form-input"
                                                type="email"
                                                value={form.clientEmail}
                                                onChange={e => setForm({ ...form, clientEmail: e.target.value })}
                                                placeholder="client@example.com"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-row-2">
                                        <div className="form-group">
                                            <label className="form-label">Total Value ($)</label>
                                            <div className="input-wrapper">
                                                <DollarSign size={16} className="input-icon" />
                                                <input
                                                    className="form-input"
                                                    type="number"
                                                    required
                                                    min="0"
                                                    step="0.01"
                                                    value={form.totalValue}
                                                    onChange={e => setForm({ ...form, totalValue: e.target.value })}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Company Share (%)</label>
                                            <div className="input-wrapper">
                                                <Percent size={16} className="input-icon" />
                                                <input
                                                    className="form-input"
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={form.companyPercentage}
                                                    onChange={e => setForm({ ...form, companyPercentage: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Description</label>
                                        <div className="input-wrapper align-top">
                                            <FileText size={16} className="input-icon mt-3" />
                                            <textarea
                                                className="form-input"
                                                value={form.description}
                                                onChange={e => setForm({ ...form, description: e.target.value })}
                                                rows={3}
                                                placeholder="Project scope and details..."
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                        <div className="flex-between mb-2">
                                            <label className="form-label mb-0">Team Breakdown (Rev Share)</label>
                                            <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => setForm({ ...form, partners: [...form.partners, { userId: '', percentage: 10 }] })}
                                            >
                                                <Plus size={14} /> Add Member
                                            </button>
                                        </div>
                                        {form.partners.length === 0 && (
                                            <p className="text-sm text-tertiary">No team members assigned yet. Will default to 100% company ownership if unspecified.</p>
                                        )}
                                        {form.partners.map((partner, index) => (
                                            <div key={index} className="flex gap-2 mb-2 items-center">
                                                <select
                                                    className="form-input"
                                                    value={partner.userId}
                                                    onChange={e => {
                                                        const p = [...form.partners];
                                                        p[index].userId = e.target.value;
                                                        setForm({ ...form, partners: p });
                                                    }}
                                                    required
                                                >
                                                    <option value="" disabled>Select Team Member</option>
                                                    {users.map(u => (
                                                        <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.roles.join(', ')})</option>
                                                    ))}
                                                </select>

                                                <div className="input-wrapper" style={{ width: '120px' }}>
                                                    <Percent size={14} className="input-icon" />
                                                    <input
                                                        className="form-input"
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        required
                                                        value={partner.percentage}
                                                        onChange={e => {
                                                            const p = [...form.partners];
                                                            p[index].percentage = e.target.value;
                                                            setForm({ ...form, partners: p });
                                                        }}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    className="icon-btn-small danger"
                                                    onClick={() => {
                                                        const p = [...form.partners];
                                                        p.splice(index, 1);
                                                        setForm({ ...form, partners: p });
                                                    }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create Project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal for Editing Project */}
            {editProject && (
                <div className="modal-overlay">
                    <div className="modal-card fade-in">
                        <div className="modal-header">
                            <h3 className="card-title">Update Project Status</h3>
                            <button className="icon-btn" onClick={() => setEditProject(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateStatus}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select
                                        className="form-input"
                                        value={editProject.status}
                                        onChange={e => setEditProject({ ...editProject, status: e.target.value })}
                                        required
                                    >
                                        {Object.keys(statusColors).map(s => (
                                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group pt-4">
                                    <label className="form-label">Completion Progress (%)</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={editProject.completionPct}
                                        onChange={e => setEditProject({ ...editProject, completionPct: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setEditProject(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal for Recording Payments */}
            {paymentProject && (
                <div className="modal-overlay">
                    <div className="modal-card fade-in">
                        <div className="modal-header">
                            <h3 className="card-title">Record Payment</h3>
                            <button className="icon-btn" onClick={() => setPaymentProject(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleRecordPayment}>
                            <div className="modal-body">
                                <p className="text-sm text-tertiary mb-4">
                                    Recording a payment will automatically trigger the revenue distribution to all partner wallets based on the predefined setup for <strong>{paymentProject.name}</strong>.
                                </p>
                                <div className="form-group">
                                    <label className="form-label">Amount ($)</label>
                                    <div className="input-wrapper">
                                        <DollarSign size={16} className="input-icon" />
                                        <input
                                            className="form-input"
                                            type="number"
                                            required
                                            min="0.01"
                                            step="0.01"
                                            value={paymentForm.amount}
                                            onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Payment Method</label>
                                    <select
                                        className="form-input"
                                        value={paymentForm.method}
                                        onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}
                                        required
                                    >
                                        <option value="BANK_TRANSFER">Bank Transfer</option>
                                        <option value="ONLINE">Online Payment</option>
                                        <option value="CASH">Cash</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Internal Note (Optional)</label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        value={paymentForm.note}
                                        onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })}
                                        placeholder="Invoice #1234, Deposit..."
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setPaymentProject(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Confirm & Distribute</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
