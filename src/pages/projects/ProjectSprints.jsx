import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, CheckSquare, Target, Clock, TrendingDown, DollarSign } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function ProjectSprints({ projectId }) {
    const navigate = useNavigate();
    const [sprints, setSprints] = useState([]);
    const [selectedSprint, setSelectedSprint] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

    const [showCreate, setShowCreate] = useState(false);
    const [newSprintName, setNewSprintName] = useState('');

    useEffect(() => {
        fetchSprints();
    }, [projectId]);

    useEffect(() => {
        if (selectedSprint) {
            fetchSprintMetrics(selectedSprint.id);
        }
    }, [selectedSprint]);

    const fetchSprints = async () => {
        try {
            const { data } = await api.get(`/projects/${projectId}/sprints`);
            setSprints(data.data);
            if (data.data.length > 0 && !selectedSprint) {
                setSelectedSprint(data.data[0]);
            }
        } catch (err) {
            toast.error('Failed to load sprints');
        } finally {
            setLoading(false);
        }
    };

    const fetchSprintMetrics = async (sprintId) => {
        try {
            const { data } = await api.get(`/projects/${projectId}/sprints/${sprintId}/metrics`);
            setMetrics(data.data);
        } catch (err) {
            toast.error('Failed to load sprint metrics');
        }
    };

    const handleCreateSprint = async () => {
        if (!newSprintName) return toast.error('Sprint name required');
        try {
            await api.post(`/projects/${projectId}/sprints`, {
                name: newSprintName,
                goal: 'Complete planned tasks',
                startDate: new Date(),
                endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // +14 days default
            });
            toast.success('Sprint Created');
            setNewSprintName('');
            setShowCreate(false);
            fetchSprints();
        } catch (err) {
            toast.error('Creation failed');
        }
    };

    const updateSprintStatus = async (sprintId, status) => {
        try {
            const endpointAction = status === 'ACTIVE' ? 'start' : 'complete';
            await api.patch(`/projects/${projectId}/sprints/${sprintId}/${endpointAction}`);
            toast.success(`Sprint ${status}`);
            fetchSprints();
            if (selectedSprint?.id === sprintId) {
                setSelectedSprint(prev => ({ ...prev, status }));
            }
        } catch (err) {
            toast.error('Status update failed');
        }
    };

    if (loading) return <div className="p-p-12 p-text-center"><div className="spinner" /></div>;

    // Mock burndown generation based on metrics total tasks, etc.
    const idealBurnLine = [];
    const actualBurnLine = [];
    if (metrics) {
        const totalPts = metrics.totalStoryPoints || 100;
        const remaining = totalPts - (metrics.completedStoryPoints || 0);
        for (let i = 0; i <= 14; i++) {
            idealBurnLine.push({ day: `Day ${i}`, points: Math.max(0, totalPts - (totalPts / 14) * i) });
            if (i <= 7) {
                // Mocking actual burn for passed days
                let burn = totalPts - ((totalPts - remaining) / 7) * i;
                actualBurnLine.push({ day: `Day ${i}`, ideal: Math.max(0, totalPts - (totalPts / 14) * i), actual: Math.max(0, burn) });
            } else {
                actualBurnLine.push({ day: `Day ${i}`, ideal: Math.max(0, totalPts - (totalPts / 14) * i) });
            }
        }
    }


    return (
        <div className="fade-in">
            <div className="p-flex p-justify-between p-items-center p-mb-6">
                <h3 className="m-0 p-text-xl p-font-bold p-text-primary">Sprint Workspace</h3>
                <button className="btn btn-primary p-flex p-items-center p-gap-2" onClick={() => setShowCreate(!showCreate)}>
                    <Plus size={18} /> New Sprint
                </button>
            </div>

            {showCreate && (
                <div className="card p-mb-6 fade-in">
                    <div className="card-body p-flex p-items-center p-gap-4">
                        <input
                            autoFocus
                            className="form-control"
                            style={{ maxWidth: '300px' }}
                            placeholder="Sprint Name (e.g., Sprint 1, MVP Phase)"
                            value={newSprintName}
                            onChange={e => setNewSprintName(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={handleCreateSprint}>Create</button>
                        <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                    </div>
                </div>
            )}

            <div className="card-grid p-gap-6">
                {sprints.map(s => (
                    <div
                        key={s.id}
                        className="card p-cursor-pointer p-hover-shadow p-transition-transform hover:p-scale-105"
                        onClick={() => navigate(`/projects/${projectId}/sprints/${s.id}`)}
                        style={{ borderTop: `4px solid ${s.status === 'ACTIVE' ? 'var(--primary)' : s.status === 'COMPLETED' ? 'var(--success)' : 'var(--text-tertiary)'}` }}
                    >
                        <div className="card-body p-flex-col p-gap-4">
                            <div className="p-flex p-justify-between p-items-center">
                                <h3 className="m-0 p-text-lg p-font-bold">{s.name}</h3>
                                <span className={`p-status-badge ${s.status === 'COMPLETED' ? 'p-status-completed' : s.status === 'ACTIVE' ? 'p-status-active' : 'p-status-pending'}`}>
                                    {s.status}
                                </span>
                            </div>
                            <div className="p-text-sm p-text-tertiary p-flex p-items-center p-gap-2">
                                <Target size={16} /> {s.goal || 'No goal set'}
                            </div>
                            <div className="p-text-sm p-text-tertiary p-flex p-items-center p-gap-2">
                                <Clock size={16} />
                                {s.startDate ? new Date(s.startDate).toLocaleDateString() : 'TBD'} - {s.endDate ? new Date(s.endDate).toLocaleDateString() : 'TBD'}
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
