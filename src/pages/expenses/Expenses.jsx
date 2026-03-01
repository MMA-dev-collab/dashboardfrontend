import { useState, useEffect } from 'react';
import { Plus, Search, Receipt, CreditCard, Tag, User, Briefcase, Calendar, X, Filter, DollarSign, FileText } from 'lucide-react';
import api from '../../api/client';
import '../Shared.css';
import './Expenses.css';

const categories = ['SOFTWARE', 'HARDWARE', 'HOSTING', 'MARKETING', 'SALARY', 'OFFICE', 'TRAVEL', 'OTHER'];
const catColors = {
    SOFTWARE: 'blue',
    HARDWARE: 'purple',
    HOSTING: 'green',
    MARKETING: 'orange',
    SALARY: 'danger',
    OFFICE: 'indigo',
    TRAVEL: 'warning',
    OTHER: 'text-tertiary'
};

export default function Expenses() {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [form, setForm] = useState({ description: '', amount: '', category: 'OTHER' });

    useEffect(() => {
        fetchExpenses();
    }, [search, categoryFilter]);

    const fetchExpenses = async () => {
        try {
            const { data } = await api.get('/expenses');
            let filtered = data.data || [];
            if (search) {
                filtered = filtered.filter(e => e.description.toLowerCase().includes(search.toLowerCase()));
            }
            if (categoryFilter) {
                filtered = filtered.filter(e => e.category === categoryFilter);
            }
            setExpenses(filtered);
        } catch (_) { }
        setLoading(false);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/expenses', { ...form, amount: parseFloat(form.amount) });
            setShowForm(false);
            setForm({ description: '', amount: '', category: 'OTHER' });
            fetchExpenses();
        } catch (err) {
            alert(err.response?.data?.message || 'Error recording expense');
        }
    };

    const handleDeleteExpense = async (id) => {
        if (!confirm('Permanently delete this expense record?')) return;
        try {
            await api.delete(`/expenses/${id}`);
            fetchExpenses();
        } catch (err) {
            alert(err.response?.data?.message || 'Error deleting expense');
        }
    };

    const fmt = (v) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2
    }).format(v || 0);

    const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <div className="expenses-page fade-in">
            <header className="page-header">
                <div className="header-left">
                    <h1 className="page-title">Expense Management</h1>
                    <p className="page-subtitle">Track operational costs and project-specific expenditures.</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <Plus size={18} /> New Expense
                    </button>
                </div>
            </header>

            <div className="filter-bar">
                <div className="search-field">
                    <Search size={18} className="icon" />
                    <input
                        type="text"
                        placeholder="Search by description..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <Filter size={18} className="text-tertiary" />
                    <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="loading-spinner">
                    <div className="spinner" />
                    <span>Auditing Expenses...</span>
                </div>
            ) : (
                <div className="card">
                    <div className="card-body p-0">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Category</th>
                                    <th>Amount</th>
                                    <th>Project / Ref</th>
                                    <th>Reported By</th>
                                    <th>Date</th>
                                    <th className="text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map(e => (
                                    <tr key={e.id}>
                                        <td>
                                            <div className="expense-desc-cell">
                                                <div className="expense-icon-box">
                                                    <Receipt size={16} />
                                                </div>
                                                <span className="font-semibold">{e.description}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${catColors[e.category]}`}>
                                                {e.category}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="font-bold text-lg">{fmt(e.amount)}</span>
                                        </td>
                                        <td>
                                            <div className="project-link-cell">
                                                <Briefcase size={14} className="text-tertiary" />
                                                <span className="text-sm">{e.project?.name || 'Company Overhead'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="partner-cell">
                                                <div className="avatar micro">{e.user?.firstName?.charAt(0)}</div>
                                                <span className="text-xs">{e.user?.firstName} {e.user?.lastName}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="text-xs text-tertiary">{fmtDate(e.date)}</span>
                                        </td>
                                        <td className="text-right">
                                            <button className="mini-btn text-danger" onClick={() => handleDeleteExpense(e.id)}>
                                                <X size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {expenses.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-tertiary">
                                            No expense records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal for New Expense */}
            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-card fade-in">
                        <div className="modal-header">
                            <h3 className="card-title">Record New Expense</h3>
                            <button className="icon-btn" onClick={() => setShowForm(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <div className="input-wrapper">
                                        <FileText size={16} className="input-icon" />
                                        <input
                                            className="form-input"
                                            required
                                            value={form.description}
                                            onChange={e => setForm({ ...form, description: e.target.value })}
                                            placeholder="e.g. AWS Monthly Bill"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="form-row-2">
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
                                                value={form.amount}
                                                onChange={e => setForm({ ...form, amount: e.target.value })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Category</label>
                                        <div className="input-wrapper">
                                            <Tag size={16} className="input-icon" />
                                            <select
                                                className="form-input"
                                                value={form.category}
                                                onChange={e => setForm({ ...form, category: e.target.value })}
                                            >
                                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Record Expense
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
