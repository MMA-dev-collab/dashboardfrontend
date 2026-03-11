import React, { useState, useEffect } from 'react';
import {
    Plus, Play, Square, Settings, Trash2, ArrowDown, Zap, CheckCircle2, X
} from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import './AutomationBuilder.css';

const TRIGGERS = [
    { value: 'PROJECT_CREATED', label: 'When a Project is Created' },
    { value: 'PAYMENT_RECEIVED', label: 'When a Payment is Received' },
    { value: 'SPRINT_COMPLETED', label: 'When a Sprint is Completed' },
    { value: 'LEAD_CREATED', label: 'When a new Lead arrives' }
];

const ACTIONS = [
    { value: 'AUTO_ASSIGN', label: 'Auto Assign Team Member' },
    { value: 'SEND_NOTIFICATION', label: 'Send System Notification' },
    { value: 'CREATE_TASK', label: 'Create a Task' }
];

export default function AutomationBuilder() {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isBuilding, setIsBuilding] = useState(false);
    const [newRule, setNewRule] = useState({
        name: '',
        description: '',
        triggerEvent: 'PROJECT_CREATED',
        actionType: 'SEND_NOTIFICATION',
        actionConfig: ''
    });

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            const { data } = await api.get('/automations');
            setRules(data.data);
        } catch (err) {
            toast.error('Failed to load automations');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await api.delete(`/automations/${id}`);
            toast.success('Rule deleted');
            fetchRules();
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    const handleSaveRule = async () => {
        try {
            if (!newRule.name) return toast.error('Name is required');

            const payload = {
                name: newRule.name,
                description: newRule.description,
                triggerEvent: newRule.triggerEvent,
                actions: [{ type: newRule.actionType, config: newRule.actionConfig }]
            };

            await api.post('/automations', payload);
            toast.success('Automation rule created!');
            setIsBuilding(false);
            setNewRule({ name: '', description: '', triggerEvent: 'PROJECT_CREATED', actionType: 'SEND_NOTIFICATION', actionConfig: '' });
            fetchRules();
        } catch (err) {
            toast.error('Failed to save rule');
        }
    };

    if (loading) return <div className="loading-spinner">Loading Automations...</div>;

    return (
        <div className="automation-page fade-in">
            <div className="automation-header">
                <div>
                    <h1 className="page-title">Workflow Automations</h1>
                    <p className="page-subtitle">Build smart triggers to automate your agency flows.</p>
                </div>
                {!isBuilding && (
                    <button className="btn btn-primary" onClick={() => setIsBuilding(true)}>
                        <Plus size={18} /> Create Automation
                    </button>
                )}
            </div>

            {isBuilding ? (
                <div className="builder-container fade-in">
                    <div className="flex justify-between items-center mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 className="text-xl font-semibold" style={{ fontSize: '1.25rem', fontWeight: 600 }}>New Automation Rule</h2>
                        <button className="btn btn-icon" onClick={() => setIsBuilding(false)}><X /></button>
                    </div>

                    <div className="form-group">
                        <label>Rule Name</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Notify Team on New Project"
                            value={newRule.name}
                            onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                        />
                    </div>

                    <div className="builder-flow">
                        <div className="flow-node trigger">
                            <div className="node-header trigger">
                                <Zap size={20} /> IF THIS HAPPENS (TRIGGER)
                            </div>
                            <div className="form-group">
                                <select
                                    className="form-control"
                                    value={newRule.triggerEvent}
                                    onChange={e => setNewRule({ ...newRule, triggerEvent: e.target.value })}
                                >
                                    {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flow-arrow">
                            <ArrowDown size={32} />
                        </div>

                        <div className="flow-node action">
                            <div className="node-header action">
                                <CheckCircle2 size={20} /> THEN DO THIS (ACTION)
                            </div>
                            <div className="form-group">
                                <select
                                    className="form-control"
                                    value={newRule.actionType}
                                    onChange={e => setNewRule({ ...newRule, actionType: e.target.value })}
                                >
                                    {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Action Configuration (JSON or Text)</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. Message to send, or UserId to assign"
                                    value={newRule.actionConfig}
                                    onChange={e => setNewRule({ ...newRule, actionConfig: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
                        <button className="btn btn-secondary" onClick={() => setIsBuilding(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSaveRule}>Save Automation Layer</button>
                    </div>
                </div>
            ) : (
                <div className="rules-list">
                    {rules.length === 0 ? (
                        <div className="empty-state">No automation rules defined yet. Create one to save time!</div>
                    ) : (
                        rules.map(rule => (
                            <div key={rule.id} className="rule-card">
                                <div className="rule-info">
                                    <h3>
                                        <Zap size={18} className="text-primary" /> {rule.name}
                                        <span className={`rule-status ${rule.isActive ? 'active' : 'inactive'}`}>
                                            {rule.isActive ? 'Active' : 'Paused'}
                                        </span>
                                    </h3>
                                    <p className="rule-desc">
                                        <strong>Trigger:</strong> {rule.triggerEvent} &rarr; <strong>Action:</strong> {rule.actions?.[0]?.type || 'Custom'}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <button className="btn btn-icon" title="Toggle Status">
                                        {rule.isActive ? <Square size={18} className="text-muted" /> : <Play size={18} className="text-primary" />}
                                    </button>
                                    <button className="btn btn-icon" title="Settings"><Settings size={18} /></button>
                                    <button className="btn btn-icon text-danger" onClick={() => handleDelete(rule.id)} style={{ color: '#ef4444' }}><Trash2 size={18} /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
