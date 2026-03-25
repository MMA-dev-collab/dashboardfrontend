import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Target, Clock, Play, CheckSquare } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function ProjectSprints({ projectId }) {
    const navigate = useNavigate();
    const [sprints, setSprints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(null);

    const [newSprint, setNewSprint] = useState({
        name: '',
        goal: '',
        totalPoints: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => { 
        fetchSprints(); 
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const fetchSprints = async () => {
        try {
            const { data } = await api.get(`/projects/${projectId}/sprints`);
            setSprints(data.data);
        } catch {
            toast.error('Failed to load sprints');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSprint = async () => {
        if (!newSprint.name.trim()) return toast.error('Sprint name is required');
        try {
            const payload = {
                name: newSprint.name.trim(),
                goal: newSprint.goal.trim() || 'Complete planned tasks',
                totalPoints: newSprint.totalPoints ? Number(newSprint.totalPoints) : 0,
                startDate: newSprint.startDate || new Date().toISOString(),
                endDate: newSprint.endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
            };
            await api.post(`/projects/${projectId}/sprints`, payload);
            toast.success('Sprint created');
            setNewSprint({ name: '', goal: '', totalPoints: '', startDate: '', endDate: '' });
            setShowCreate(false);
            fetchSprints();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Creation failed');
        }
    };

    const updateSprintStatus = async (e, sprintId, action) => {
        e.stopPropagation();
        setStatusUpdating(sprintId);
        try {
            await api.patch(`/projects/${projectId}/sprints/${sprintId}/${action}`);
            toast.success(`Sprint ${action === 'start' ? 'started' : 'completed'}`);
            fetchSprints();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Status update failed');
        } finally {
            setStatusUpdating(null);
        }
    };

    if (loading) return <div className="p-p-12 p-text-center"><div className="spinner" /></div>;

    return (
        <div className="fade-in p-p-2">
            <div className="p-flex p-justify-between p-items-center p-mb-8">
                <div>
                    <h3 className="m-0 p-text-2xl p-font-bold p-text-primary">Sprint Workspace</h3>
                    <p className="p-text-sm p-text-tertiary p-mt-1">Manage development phases, goals, and roadmaps.</p>
                </div>
                <button className="btn btn-primary p-flex p-items-center p-gap-2 p-shadow-sm p-px-6" onClick={() => setShowCreate(!showCreate)}>
                    <Plus size={18} /> New Sprint
                </button>
            </div>

            {/* Create Sprint Form */}
            {showCreate && (
                <div className="card p-mb-6 fade-in">
                    <div className="card-body p-flex-col p-gap-4">
                        <h4 className="m-0 p-font-bold p-text-primary">New Sprint</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="p-text-xs p-font-bold p-text-tertiary" style={{ textTransform: 'uppercase' }}>Sprint Name *</label>
                                <input
                                    autoFocus
                                    className="form-control p-mt-1"
                                    placeholder="e.g. Sprint 1, MVP Phase"
                                    value={newSprint.name}
                                    onChange={e => setNewSprint(s => ({ ...s, name: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="p-text-xs p-font-bold p-text-tertiary" style={{ textTransform: 'uppercase' }}>Goal</label>
                                <input
                                    className="form-control p-mt-1"
                                    placeholder="Sprint goal..."
                                    value={newSprint.goal}
                                    onChange={e => setNewSprint(s => ({ ...s, goal: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="p-text-xs p-font-bold p-text-tertiary" style={{ textTransform: 'uppercase' }}>Start Date</label>
                                <input
                                    type="date"
                                    className="form-control p-mt-1"
                                    value={newSprint.startDate}
                                    onChange={e => setNewSprint(s => ({ ...s, startDate: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="p-text-xs p-font-bold p-text-tertiary" style={{ textTransform: 'uppercase' }}>End Date</label>
                                <input
                                    type="date"
                                    className="form-control p-mt-1"
                                    value={newSprint.endDate}
                                    onChange={e => setNewSprint(s => ({ ...s, endDate: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="p-text-xs p-font-bold p-text-tertiary" style={{ textTransform: 'uppercase' }}>Total Points</label>
                                <input
                                    type="number"
                                    className="form-control p-mt-1"
                                    placeholder="e.g. 50"
                                    value={newSprint.totalPoints}
                                    onChange={e => setNewSprint(s => ({ ...s, totalPoints: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="p-text-xs p-font-bold p-text-tertiary" style={{ textTransform: 'uppercase' }}>Initial Tasks</label>
                                <input
                                    className="form-control p-mt-1"
                                    value="0 tasks initially"
                                    disabled
                                    style={{ opacity: 0.6 }}
                                />
                            </div>
                        </div>
                        <div className="p-flex p-gap-3">
                            <button className="btn btn-primary" onClick={handleCreateSprint}>Create Sprint</button>
                            <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sprint Cards */}
            <div className="card-grid p-gap-6">
                {sprints.map(s => (
                    <div
                        key={s.id}
                        className="card p-cursor-pointer p-transition-all p-hover-shadow-lg p-bg-white p-rounded-xl p-overflow-hidden p-border-0 p-shadow-sm"
                        onClick={() => navigate(`/projects/${projectId}/sprints/${s.id}`)}
                    >
                        {/* Status Accent Bar */}
                        <div style={{
                            height: '6px',
                            background: s.status === 'ACTIVE' ? 'linear-gradient(90deg, var(--primary), #6366f1)' :
                                s.status === 'COMPLETED' ? 'linear-gradient(90deg, var(--success), #10b981)' :
                                    'var(--border-light)'
                        }} />
                        <div className="card-body p-p-6 p-flex-col p-gap-4">
                            <div className="p-flex p-justify-between p-items-start p-gap-2">
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h3 className="m-0 p-text-lg p-font-bold p-truncate">{s.name}</h3>
                                    <div className="p-text-xs p-text-tertiary p-flex p-items-center p-gap-2 p-font-medium p-mt-1">
                                        <Target size={12} className="p-text-primary-light" />
                                        <span className="p-truncate">{s.goal || 'No goal set'}</span>
                                    </div>
                                </div>
                                <span className={`p-status-badge p-shrink-0 ${s.status === 'COMPLETED' ? 'p-status-completed' : s.status === 'ACTIVE' ? 'p-status-active' : 'p-status-pending'}`}>
                                    {s.status}
                                </span>
                            </div>

                            <div className="p-text-xs p-text-tertiary p-flex p-items-center p-gap-2 p-font-medium">
                                <Clock size={12} className="p-text-primary-light" />
                                {s.startDate ? new Date(s.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBD'} —{' '}
                                {s.endDate ? new Date(s.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}
                            </div>

                            <div className="p-text-xs p-text-tertiary">
                                <strong>{s._count?.tasks || 0}</strong> tasks
                            </div>

                            {/* Quick Action Buttons */}
                            <div className="p-flex p-gap-2" onClick={e => e.stopPropagation()}>
                                {s.status === 'PLANNED' && (
                                    <button
                                        className="btn btn-primary p-text-xs p-flex p-items-center p-gap-1"
                                        style={{ padding: '4px 10px' }}
                                        disabled={statusUpdating === s.id}
                                        onClick={e => updateSprintStatus(e, s.id, 'start')}
                                    >
                                        <Play size={12} /> {statusUpdating === s.id ? '...' : 'Start'}
                                    </button>
                                )}
                                {s.status === 'ACTIVE' && (
                                    <button
                                        className="btn p-text-xs p-flex p-items-center p-gap-1"
                                        style={{ padding: '4px 10px', background: 'var(--success)', color: 'white' }}
                                        disabled={statusUpdating === s.id}
                                        onClick={e => updateSprintStatus(e, s.id, 'complete')}
                                    >
                                        <CheckSquare size={12} /> {statusUpdating === s.id ? '...' : 'Complete'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {sprints.length === 0 && !showCreate && (
                <div className="card card-body p-p-12 p-text-center p-text-tertiary">
                    <Target size={48} className="p-opacity-50 p-mb-4 p-mx-auto" />
                    <p className="p-text-lg">No sprints initialized yet.</p>
                    <p>Create a sprint to start organizing tasks into distinct phases.</p>
                </div>
            )}
        </div>
    );
}
