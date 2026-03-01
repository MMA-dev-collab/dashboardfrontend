import { useState, useEffect } from 'react';
import { ArrowDownToLine, Check, X, User, DollarSign, FileText, Calendar, Clock, AlertCircle } from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../store/useAuthStore';
import '../Shared.css';
import './Withdrawals.css';

export default function Withdrawals() {
    const { user } = useAuthStore();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [showForm, setShowForm] = useState(false);
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'FINANCE';

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const { data } = await api.get('/withdrawals');
            setRequests(data.data || []);
        } catch (_) { }
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/withdrawals', { amount: parseFloat(amount), note });
            setAmount('');
            setNote('');
            setShowForm(false);
            fetchRequests();
        } catch (err) {
            alert(err.response?.data?.message || 'Error submitting request');
        }
    };

    const handleApprove = async (id) => {
        if (!confirm('Are you sure you want to approve this withdrawal? This will deduct funds from the partner wallet.')) return;
        try {
            await api.post(`/withdrawals/${id}/approve`);
            fetchRequests();
        } catch (err) {
            alert(err.response?.data?.message || 'Error approving request');
        }
    };

    const handleReject = async (id) => {
        const reason = prompt('Please provide a reason for rejection:');
        if (reason === null) return;
        try {
            await api.post(`/withdrawals/${id}/reject`, { reason });
            fetchRequests();
        } catch (err) {
            alert(err.response?.data?.message || 'Error rejecting request');
        }
    };

    const fmt = (v) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2
    }).format(v || 0);

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }) : '---';

    const statusColors = {
        PENDING: 'warning',
        APPROVED: 'success',
        REJECTED: 'danger'
    };

    return (
        <div className="withdrawals-page fade-in">
            <header className="page-header">
                <div className="header-left">
                    <h1 className="page-title">Payout Requests</h1>
                    <p className="page-subtitle">Submit or process withdrawal requests from partner wallets.</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <ArrowDownToLine size={18} /> Request Payout
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="loading-spinner">
                    <div className="spinner" />
                    <span>Verifying Requests...</span>
                </div>
            ) : (
                <div className="card">
                    <div className="card-body p-0">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    {isAdmin && <th>Requester</th>}
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Context / Note</th>
                                    <th>Requested</th>
                                    <th>Processed</th>
                                    {isAdmin && <th className="text-right">Action</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(r => (
                                    <tr key={r.id}>
                                        {isAdmin && (
                                            <td>
                                                <div className="partner-cell">
                                                    <div className="avatar micro">{r.user?.name?.charAt(0)}</div>
                                                    <span className="font-semibold">{r.user?.name}</span>
                                                </div>
                                            </td>
                                        )}
                                        <td className="font-bold text-lg">{fmt(r.amount)}</td>
                                        <td>
                                            <span className={`status-badge ${statusColors[r.status]}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="note-cell">
                                                <span className="text-sm">{r.note || 'No note provided'}</span>
                                                {r.status === 'REJECTED' && r.rejectionReason && (
                                                    <span className="text-xs text-danger italic">Reason: {r.rejectionReason}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="date-stack">
                                                <span className="text-xs font-medium">{fmtDate(r.createdAt)}</span>
                                                <span className="text-xxs text-tertiary">Time tracked</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="text-xs text-tertiary">{fmtDate(r.processedAt)}</span>
                                        </td>
                                        {isAdmin && (
                                            <td className="text-right">
                                                {r.status === 'PENDING' ? (
                                                    <div className="action-btns">
                                                        <button className="icon-btn-action approve" title="Approve" onClick={() => handleApprove(r.id)}>
                                                            <Check size={16} />
                                                        </button>
                                                        <button className="icon-btn-action reject" title="Reject" onClick={() => handleReject(r.id)}>
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-tertiary italic">Finalized</span>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {requests.length === 0 && (
                                    <tr>
                                        <td colSpan={isAdmin ? 7 : 5} className="text-center py-12">
                                            <div className="empty-state-payout">
                                                <AlertCircle size={40} className="text-tertiary mb-3" />
                                                <p className="text-tertiary">No payout requests found at this time.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal for Payout Request */}
            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-card fade-in">
                        <div className="modal-header">
                            <h3 className="card-title">Initiate Payout Request</h3>
                            <button className="icon-btn" onClick={() => setShowForm(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Amount to Withdraw ($)</label>
                                    <div className="input-wrapper large">
                                        <DollarSign size={20} className="input-icon" />
                                        <input
                                            className="form-input large"
                                            type="number"
                                            min="1"
                                            step="0.01"
                                            required
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            autoFocus
                                        />
                                    </div>
                                    <p className="form-help-text">Funds will be deducted from your Available Balance once approved.</p>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Note for Finance Team</label>
                                    <div className="input-wrapper align-top">
                                        <FileText size={18} className="input-icon mt-3" />
                                        <textarea
                                            className="form-input"
                                            value={note}
                                            onChange={e => setNote(e.target.value)}
                                            placeholder="Purpose of this withdrawal..."
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Submit Payout Request
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
