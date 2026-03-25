import { useState, useEffect } from 'react';
import { X, Users, Percent, Trash2, Plus } from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../store/useAuthStore';

export default function TeamManagementModal({ project, onClose, onUpdate }) {
    const { hasRole } = useAuthStore();
    const isAdmin = hasRole('Admin');
    
    // Create local copies of team state
    const [companyPercentage, setCompanyPercentage] = useState(project.companyPercentage || 30);
    const [partners, setPartners] = useState(project.partners?.map(p => ({
        userId: p.userId,
        percentage: p.percentage,
        role: p.role
    })) || []);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);



    useEffect(() => {
        let isMounted = true;
        const loadUsers = async () => {
             try {
                 const { data } = await api.get('/users', { params: { limit: 100 } });
                 if (isMounted) {
                     setUsers(data.data || []);
                     setLoading(false);
                 }
             } catch (e) {
                 console.error(e);
                 if (isMounted) setLoading(false);
             }
        };
        loadUsers();
        return () => { isMounted = false; };
    }, []);
    const handleSave = async (e) => {
        e.preventDefault();
        
        const cPct = parseFloat(companyPercentage) || 0;
        const pTotal = partners.reduce((sum, p) => sum + (parseFloat(p.percentage) || 0), 0);

        if (cPct + pTotal !== 100) {
            alert(`Total ownership must equal exactly 100%. Currently Company (${cPct}%) + Partners (${pTotal}%) = ${cPct + pTotal}%`);
            return;
        }

        setSaving(true);
        try {
            // First update the company percentage on the project
            await api.put(`/projects/${project.id}`, {
                companyPercentage: cPct
            });
            
            // Then update the partners array
            await api.patch(`/projects/${project.id}/partners`, {
                partners: partners.map(p => ({
                    userId: p.userId,
                    percentage: parseFloat(p.percentage),
                    role: 'contributor'
                }))
            });
            
            onUpdate();
        } catch (err) {
            alert(err.response?.data?.message || 'Error updating team');
        }
        setSaving(false);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-card fade-in" style={{ maxWidth: '650px' }}>
                <div className="modal-header p-border-b p-pb-4 p-mb-4">
                    <h3 className="card-title p-flex p-items-center p-gap-2 m-0 p-text-lg">
                        <Users size={20} className="p-text-primary" /> Manage Project Team
                    </h3>
                    <button className="icon-btn p-bg-light hover-bg-gray" onClick={onClose} disabled={saving} style={{ borderRadius: '50%' }}>
                        <X size={18} />
                    </button>
                </div>
                
                {loading ? (
                    <div className="modal-body p-flex p-justify-center p-items-center" style={{ minHeight: '200px' }}>
                        <div className="spinner"></div>
                    </div>
                ) : (
                    <form onSubmit={handleSave}>
                        <div className="modal-body p-px-4">
                            <div className="form-group p-bg-light p-p-5 p-rounded-xl p-mb-6 p-border" style={{ borderColor: 'var(--border-color)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                                <div className="p-flex p-justify-between p-items-center p-mb-2">
                                    <label className="form-label p-mb-0 p-font-bold">Company Revenue Share</label>
                                    <span className="p-badge p-bg-primary p-text-white p-text-xs p-px-2 p-py-1 p-rounded">Core</span>
                                </div>
                                <div className="input-wrapper" style={{ maxWidth: '200px' }}>
                                    <Percent size={16} className="input-icon p-text-tertiary" />
                                    <input
                                        className="form-input p-font-bold p-text-primary"
                                        type="number"
                                        min="0"
                                        max="100"
                                        required
                                        disabled={!isAdmin}
                                        value={companyPercentage}
                                        onChange={e => setCompanyPercentage(e.target.value)}
                                        style={{ backgroundColor: 'white', fontSize: '1.1rem' }}
                                    />
                                </div>
                                <p className="p-text-xs p-text-tertiary p-mt-3 leading-relaxed">
                                    This dictates the percentage of net profit the company retains before any partner distribution occurs. Adjust carefully.
                                </p>
                            </div>

                            <div className="p-flex p-justify-between p-items-center p-mb-4">
                                <div>
                                    <label className="form-label p-mb-1 p-font-bold">Team Members & Equity</label>
                                    <p className="p-text-xs p-text-tertiary m-0">Assign users and their profit split.</p>
                                </div>
                                {isAdmin && (
                                    <button
                                        type="button"
                                        className="btn btn-secondary p-py-1 p-px-3 p-text-sm p-flex p-items-center p-gap-1 p-rounded-md"
                                        onClick={() => setPartners([...partners, { userId: '', percentage: 10 }])}
                                    >
                                        <Plus size={14} /> Add Member
                                    </button>
                                )}
                            </div>

                            {partners.length === 0 ? (
                                <div className="p-text-center p-py-8 p-px-4 p-bg-light p-rounded-xl p-border p-text-tertiary p-flex-col p-items-center p-gap-2">
                                    <Users size={32} style={{ opacity: 0.5 }} />
                                    <span className="p-text-sm">No team members assigned to this project yet.</span>
                                </div>
                            ) : (
                                <div className="p-flex-col p-gap-3">
                                    {partners.map((partner, index) => (
                                        <div key={index} className="p-flex p-gap-3 p-items-center p-p-3 p-rounded-lg p-bg-white p-border align-items-center shadow-sm">
                                            <div className="p-flex-1">
                                                <select
                                                    className="form-input font-medium"
                                                    value={partner.userId}
                                                    disabled={!isAdmin}
                                                    onChange={e => {
                                                        const p = [...partners];
                                                        p[index].userId = e.target.value;
                                                        setPartners(p);
                                                    }}
                                                    required
                                                >
                                                    <option value="" disabled>Search & Select User...</option>
                                                    {users.map(u => (
                                                        <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="input-wrapper" style={{ width: '130px' }}>
                                                <Percent size={14} className="input-icon p-text-tertiary" />
                                                <input
                                                    className="form-input font-bold text-center"
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    required
                                                    disabled={!isAdmin}
                                                    value={partner.percentage}
                                                    onChange={e => {
                                                        const p = [...partners];
                                                        p[index].percentage = e.target.value;
                                                        setPartners(p);
                                                    }}
                                                />
                                            </div>
                                            
                                            {isAdmin && (
                                                <button
                                                    type="button"
                                                    className="icon-btn-small danger p-p-2 hover-bg-danger-light p-rounded"
                                                    onClick={() => {
                                                        const p = [...partners];
                                                        p.splice(index, 1);
                                                        setPartners(p);
                                                    }}
                                                    title="Remove Member"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer p-mt-6 p-pt-4 p-border-t p-flex p-justify-end p-gap-3">
                            <button type="button" className="btn btn-secondary p-px-5" onClick={onClose} disabled={saving}>
                                Cancel
                            </button>
                            {isAdmin && (
                                <button type="submit" className="btn btn-primary p-px-6 p-font-medium shadow-sm" disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            )}
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
