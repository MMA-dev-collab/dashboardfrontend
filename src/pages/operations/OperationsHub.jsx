import { useState, useEffect } from 'react';
import { Plus, AlertTriangle, CheckCircle, Milestone, Shield, X, Briefcase, Filter, ChevronDown } from 'lucide-react';
import api from '../../api/client';
import '../Shared.css';
import './OperationsHub.css';

const severityColors = { LOW: 'blue', MEDIUM: 'warning', HIGH: 'orange', CRITICAL: 'danger' };
const riskTypes = ['LATE_PAYMENT', 'SCOPE_CREEP', 'BUDGET_OVERRUN', 'RESOURCE_ISSUE', 'TECHNICAL_DEBT', 'CLIENT_ISSUE', 'OTHER'];

export default function OperationsHub() {
    const [tab, setTab] = useState('decisions');
    const [decisions, setDecisions] = useState([]);
    const [risks, setRisks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [decForm, setDecForm] = useState({ title: '', description: '', context: '', outcome: '' });
    const [riskForm, setRiskForm] = useState({ title: '', description: '', type: 'OTHER', severity: 'MEDIUM', projectId: '' });

    useEffect(() => { fetchData(); }, [tab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (tab === 'decisions') {
                const { data } = await api.get('/operations/decisions');
                setDecisions(data.data || []);
            } else {
                const { data } = await api.get('/operations/risks');
                setRisks(data.data || []);
            }
        } catch (_) { }
        setLoading(false);
    };

    const createDecision = async (e) => {
        e.preventDefault();
        try { await api.post('/operations/decisions', decForm); setShowForm(false); setDecForm({ title: '', description: '', context: '', outcome: '' }); fetchData(); }
        catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    const createRisk = async (e) => {
        e.preventDefault();
        try { await api.post('/operations/risks', riskForm); setShowForm(false); setRiskForm({ title: '', description: '', type: 'OTHER', severity: 'MEDIUM', projectId: '' }); fetchData(); }
        catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    const resolveRisk = async (id) => {
        try { await api.patch(`/operations/risks/${id}/resolve`); fetchData(); }
        catch (err) { alert('Error'); }
    };

    const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <div className="ops-page fade-in">
            <header className="page-header">
                <div className="header-left">
                    <h1 className="page-title">Operations Hub</h1>
                    <p className="page-subtitle">Track decisions, escalate risks, and maintain operational clarity.</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <Plus size={18} /> {tab === 'decisions' ? 'Log Decision' : 'Raise Flag'}
                    </button>
                </div>
            </header>

            <div className="tab-bar">
                <button className={`tab-btn ${tab === 'decisions' ? 'active' : ''}`} onClick={() => setTab('decisions')}>
                    <Milestone size={16} /> Decision Log
                </button>
                <button className={`tab-btn ${tab === 'risks' ? 'active' : ''}`} onClick={() => setTab('risks')}>
                    <AlertTriangle size={16} /> Risk Flags
                </button>
            </div>

            {loading ? (
                <div className="loading-spinner"><div className="spinner" /><span>Loading...</span></div>
            ) : tab === 'decisions' ? (
                <div className="card">
                    <div className="card-body p-0">
                        <table className="modern-table">
                            <thead><tr><th>Decision</th><th>Context</th><th>Outcome</th><th>Author</th><th>Date</th></tr></thead>
                            <tbody>
                                {decisions.map(d => (
                                    <tr key={d.id}>
                                        <td><span className="font-semibold">{d.title}</span><div className="text-xs text-tertiary" style={{ maxWidth: 300 }}>{d.description?.substring(0, 80)}</div></td>
                                        <td><span className="text-sm">{d.context?.substring(0, 60) || '---'}</span></td>
                                        <td><span className="text-sm">{d.outcome?.substring(0, 60) || 'Pending'}</span></td>
                                        <td><div className="partner-cell"><div className="avatar micro">{d.author?.firstName?.charAt(0)}</div><span className="text-xs">{d.author?.firstName}</span></div></td>
                                        <td><span className="text-xs text-tertiary">{fmtDate(d.createdAt)}</span></td>
                                    </tr>
                                ))}
                                {decisions.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-tertiary">No decisions logged yet.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div className="card-body p-0">
                        <table className="modern-table">
                            <thead><tr><th>Risk</th><th>Type</th><th>Severity</th><th>Project</th><th>Status</th><th className="text-right">Action</th></tr></thead>
                            <tbody>
                                {risks.map(r => (
                                    <tr key={r.id}>
                                        <td><span className="font-semibold">{r.title}</span></td>
                                        <td><span className="text-xs">{r.type.replace(/_/g, ' ')}</span></td>
                                        <td><span className={`status-badge ${severityColors[r.severity]}`}>{r.severity}</span></td>
                                        <td><span className="text-sm">{r.project?.name || 'General'}</span></td>
                                        <td>{r.isResolved ? <span className="status-badge success">Resolved</span> : <span className="status-badge warning">Active</span>}</td>
                                        <td className="text-right">
                                            {!r.isResolved && <button className="mini-btn accent" onClick={() => resolveRisk(r.id)}><CheckCircle size={14} /></button>}
                                        </td>
                                    </tr>
                                ))}
                                {risks.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-tertiary">No risk flags raised.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create Modals */}
            {showForm && tab === 'decisions' && (
                <div className="modal-overlay">
                    <div className="modal-card fade-in">
                        <div className="modal-header"><h3 className="card-title">Log a Decision</h3><button className="icon-btn" onClick={() => setShowForm(false)}><X size={20} /></button></div>
                        <form onSubmit={createDecision}>
                            <div className="modal-body">
                                <div className="form-group"><label className="form-label">Decision Title</label><input className="form-input" required value={decForm.title} onChange={e => setDecForm({ ...decForm, title: e.target.value })} placeholder="What was decided?" /></div>
                                <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" required rows={3} value={decForm.description} onChange={e => setDecForm({ ...decForm, description: e.target.value })} placeholder="Details..." /></div>
                                <div className="form-row-2">
                                    <div className="form-group"><label className="form-label">Context</label><textarea className="form-input" rows={2} value={decForm.context} onChange={e => setDecForm({ ...decForm, context: e.target.value })} placeholder="Why was this decided?" /></div>
                                    <div className="form-group"><label className="form-label">Outcome</label><textarea className="form-input" rows={2} value={decForm.outcome} onChange={e => setDecForm({ ...decForm, outcome: e.target.value })} placeholder="Result..." /></div>
                                </div>
                            </div>
                            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="btn btn-primary">Log Decision</button></div>
                        </form>
                    </div>
                </div>
            )}

            {showForm && tab === 'risks' && (
                <div className="modal-overlay">
                    <div className="modal-card fade-in">
                        <div className="modal-header"><h3 className="card-title">Raise Risk Flag</h3><button className="icon-btn" onClick={() => setShowForm(false)}><X size={20} /></button></div>
                        <form onSubmit={createRisk}>
                            <div className="modal-body">
                                <div className="form-group"><label className="form-label">Title</label><input className="form-input" required value={riskForm.title} onChange={e => setRiskForm({ ...riskForm, title: e.target.value })} placeholder="e.g. Client late on payment" /></div>
                                <div className="form-row-2">
                                    <div className="form-group"><label className="form-label">Type</label>
                                        <select className="form-input" value={riskForm.type} onChange={e => setRiskForm({ ...riskForm, type: e.target.value })}>
                                            {riskTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group"><label className="form-label">Severity</label>
                                        <select className="form-input" value={riskForm.severity} onChange={e => setRiskForm({ ...riskForm, severity: e.target.value })}>
                                            {Object.keys(severityColors).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={3} value={riskForm.description} onChange={e => setRiskForm({ ...riskForm, description: e.target.value })} placeholder="Details and impact..." /></div>
                            </div>
                            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="btn btn-primary">Raise Flag</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
