import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Clock, DollarSign, TrendingDown, Kanban, LayoutDashboard, Play, CheckSquare, Users, Edit2, Check, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DndContext, closestCorners } from '@dnd-kit/core';
import api from '../../api/client';
import useBoardStore from '../../store/useBoardStore';
import { BoardColumn } from './AgileComponents';
import TaskModal from './TaskModal';
import toast from 'react-hot-toast';

export default function SprintDetails() {
    const { id: projectId, sprintId } = useParams();
    const navigate = useNavigate();

    const [sprint, setSprint] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('board');
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [confirm, setConfirm] = useState(null); // 'start' | 'complete'

    // Date editing state
    const [editingDates, setEditingDates] = useState(false);
    const [dateForm, setDateForm] = useState({ startDate: '', endDate: '' });
    const [dateSaving, setDateSaving] = useState(false);

    // Points editing state
    const [editingPoints, setEditingPoints] = useState(false);
    const [pointsForm, setPointsForm] = useState({ totalPoints: 0 });
    const [pointsSaving, setPointsSaving] = useState(false);

    // Budget editing state
    const [editingBudget, setEditingBudget] = useState(false);
    const [budgetForm, setBudgetForm] = useState({ plannedBudget: 0, actualCost: 0 });
    const [budgetSaving, setBudgetSaving] = useState(false);

    // Sprint team state
    const [showTeam, setShowTeam] = useState(false);
    const [project, setProject] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [teamSaving, setTeamSaving] = useState(false);

    const boardStore = useBoardStore();
    const [selectedTask, setSelectedTask] = useState(null);

    useEffect(() => {
        fetchSprintData();
        boardStore.fetchBoardData(projectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, sprintId]);

    const fetchSprintData = async () => {
        try {
            const projRes = await api.get(`/projects/${projectId}`);
            setProject(projRes.data.data);

            const sprintRes = await api.get(`/projects/${projectId}/sprints`);
            const currentSprint = sprintRes.data.data.find(s => s.id === sprintId);
            if (!currentSprint) {
                toast.error('Sprint not found');
                navigate(`/projects/${projectId}`);
                return;
            }
            setSprint(currentSprint);
            setDateForm({
                startDate: currentSprint.startDate ? currentSprint.startDate.split('T')[0] : '',
                endDate: currentSprint.endDate ? currentSprint.endDate.split('T')[0] : ''
            });
            setPointsForm({ totalPoints: currentSprint.totalPoints || 0 });

            const metricsRes = await api.get(`/projects/${projectId}/sprints/${sprintId}/metrics`);
            setMetrics(metricsRes.data.data);
            setTeamMembers((metricsRes.data.data.members || []).map(m => m.userId));
            setBudgetForm({
                plannedBudget: metricsRes.data.data.budget?.plannedBudget || 0,
                actualCost: metricsRes.data.data.budget?.actualCost || 0
            });
        } catch {
            toast.error('Failed to load sprint details');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (action) => {
        setStatusUpdating(true);
        try {
            await api.patch(`/projects/${projectId}/sprints/${sprintId}/${action}`);
            toast.success(`Sprint ${action === 'start' ? 'started' : action === 'reopen' ? 'reopened' : 'completed'}!`);
            setConfirm(null);
            await fetchSprintData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Status update failed');
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleSaveDates = async () => {
        setDateSaving(true);
        try {
            await api.patch(`/projects/${projectId}/sprints/${sprintId}`, dateForm);
            toast.success('Sprint dates updated');
            setEditingDates(false);
            await fetchSprintData();
        } catch {
            toast.error('Failed to update dates');
        } finally {
            setDateSaving(false);
        }
    };

    const handleSavePoints = async () => {
        setPointsSaving(true);
        try {
            await api.patch(`/projects/${projectId}/sprints/${sprintId}`, { totalPoints: Number(pointsForm.totalPoints) });
            toast.success('Sprint points updated');
            setEditingPoints(false);
            await fetchSprintData();
        } catch {
            toast.error('Failed to update points');
        } finally {
            setPointsSaving(false);
        }
    };

    const handleSaveBudget = async () => {
        setBudgetSaving(true);
        try {
            await api.patch(`/projects/${projectId}/sprints/${sprintId}`, { 
                budget: {
                    plannedBudget: Number(budgetForm.plannedBudget),
                    actualCost: Number(budgetForm.actualCost)
                }
            });
            toast.success('Sprint budget updated');
            setEditingBudget(false);
            await fetchSprintData();
        } catch {
            toast.error('Failed to update budget');
        } finally {
            setBudgetSaving(false);
        }
    };

    const handleSaveTeam = async () => {
        setTeamSaving(true);
        try {
            const validMembers = teamMembers.filter(Boolean).map(userId => ({ userId }));
            await api.patch(`/projects/${projectId}/sprints/${sprintId}/members`, {
                members: validMembers
            });
            toast.success('Sprint team updated');
            setShowTeam(false);
            await fetchSprintData();
        } catch {
            toast.error('Failed to update sprint team');
        } finally {
            setTeamSaving(false);
        }
    };

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (!over) return;
        const taskId = active.id;
        const toColumnId = over.id;
        const task = boardStore.tasks.find(t => t.id === taskId);
        if (task && task.columnId !== toColumnId) {
            boardStore.moveTask(projectId, taskId, toColumnId, task.version);
        }
    }, [projectId, boardStore]);

    // Memoized sprint task filtering
    const sprintTasks = useMemo(
        () => boardStore.tasks.filter(t => t.sprintId === sprintId),
        [boardStore.tasks, sprintId]
    );

    if (loading || boardStore.loading) return <div className="p-p-12 p-text-center"><div className="spinner" /></div>;
    if (!sprint) return null;

    // Real-time calculations derived from board store
    const doneColumn = boardStore.columns.find(c => c.name.toUpperCase() === 'DONE' || c.name.toUpperCase() === 'COMPLETED');
    const rtTotalTasks = sprintTasks.length;
    const rtCompletedTasks = doneColumn ? sprintTasks.filter(t => t.columnId === doneColumn.id).length : 0;
    
    // Derived points from tasks, fallback to sprint.totalPoints if set > 0
    const derivedTotalStoryPoints = sprintTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
    const rtCompletedPoints = doneColumn ? sprintTasks.filter(t => t.columnId === doneColumn.id).reduce((acc, t) => acc + (t.storyPoints || 0), 0) : 0;
    const rtTotalPoints = sprint.totalPoints > 0 ? sprint.totalPoints : derivedTotalStoryPoints;

    const progressPct = rtTotalPoints > 0 
        ? Math.round((rtCompletedPoints / rtTotalPoints) * 100) 
        : (rtTotalTasks > 0 ? Math.round((rtCompletedTasks / rtTotalTasks) * 100) : 0);

    // Burndown data
    const burndownData = [];
    if (metrics) {
        const totalPts = rtTotalPoints || 100;
        const remaining = totalPts - rtCompletedPoints;
        for (let i = 0; i <= 14; i++) {
            const ideal = Math.max(0, totalPts - (totalPts / 14) * i);
            if (i <= 7) {
                const burn = totalPts - ((totalPts - remaining) / 7) * i;
                burndownData.push({ day: `Day ${i}`, ideal: +ideal.toFixed(1), actual: +Math.max(0, burn).toFixed(1) });
            } else {
                burndownData.push({ day: `Day ${i}`, ideal: +ideal.toFixed(1) });
            }
        }
    }



    return (
        <div className="fade-in p-pb-10">
            <button className="btn btn-secondary p-mb-6 p-w-fit" onClick={() => navigate(`/projects/${projectId}`)}>
                <ArrowLeft size={16} /> Back to Project Workspace
            </button>

            {/* Sprint Header Card */}
            <div className="card p-bg-white p-rounded-2xl p-shadow-sm p-border-0 p-mb-8">
                <div className="card-body p-p-8 p-flex p-items-start p-justify-between p-flex-wrap p-gap-6">
                    <div className="p-flex p-items-center p-gap-6">
                        <div className="p-w-16 p-h-16 p-bg-primary-light p-text-primary p-rounded-2xl p-flex p-items-center p-justify-center p-shadow-inner">
                            <Target size={32} />
                        </div>
                        <div>
                            <h1 className="p-text-3xl p-font-black m-0 p-mb-1 p-text-primary">{sprint.name}</h1>
                            <p className="p-text-sm p-text-tertiary m-0 p-flex p-items-center p-gap-2 p-font-medium">
                                <span className="p-bg-light p-px-2 p-py-0.5 p-rounded-md">Sprint Goal</span>
                                {sprint.goal || 'Achieve project excellence'}
                            </p>
                        </div>
                    </div>
                    <div className="p-flex p-flex-col p-items-end p-gap-3">
                        {/* Status Badge */}
                        <span className={`p-status-badge p-px-4 p-py-1.5 p-text-xs p-font-bold ${sprint.status === 'COMPLETED' ? 'p-status-completed' : sprint.status === 'ACTIVE' ? 'p-status-active' : 'p-status-pending'}`}>
                            {sprint.status}
                        </span>

                              {/* Progress bar */}
                            <div className="p-mt-5 p-bg-light p-rounded-xl p-p-4 p-border">
                                <div className="p-flex p-justify-between p-items-center p-mb-2">
                                    <span className="p-text-sm p-font-bold">Sprint Progress</span>
                                    <span className="p-text-sm p-font-bold p-text-primary">{progressPct}%</span>
                                </div>
                                <div className="progress-bar-bg" style={{ height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div className="progress-bar-fill p-bg-primary" style={{ width: `${progressPct}%`, height: '100%', transition: 'width 0.5s ease' }} />
                                </div>
                                <div className="p-flex p-justify-between p-mt-2 p-text-xs p-text-tertiary">
                                    <span>{rtCompletedPoints} pts done</span>
                                    <span>{rtTotalPoints} pts total</span>
                                </div>
                            </div>

                        <div className="p-flex p-gap-2">
                            {sprint.status === 'PLANNED' && (
                                <button
                                    className="btn btn-primary p-flex p-items-center p-gap-2 p-text-sm"
                                    onClick={() => setConfirm('start')}
                                    disabled={statusUpdating}
                                >
                                    <Play size={14} /> Start Sprint
                                </button>
                            )}
                            {sprint.status === 'ACTIVE' && (
                                <button
                                    className="btn p-text-sm p-flex p-items-center p-gap-2"
                                    style={{ background: 'var(--success)', color: 'white' }}
                                    onClick={() => setConfirm('complete')}
                                    disabled={statusUpdating}
                                >
                                    <CheckSquare size={14} /> Complete Sprint
                                </button>
                            )}
                            {sprint.status === 'COMPLETED' && (
                                <button
                                    className="btn btn-secondary p-text-sm p-flex p-items-center p-gap-2"
                                    onClick={() => setConfirm('reopen')}
                                    disabled={statusUpdating}
                                >
                                    <Clock size={14} /> Reopen Sprint
                                </button>
                            )}
                            <button
                                className="btn btn-secondary p-flex p-items-center p-gap-2 p-text-sm"
                                onClick={() => setShowTeam(t => !t)}
                            >
                                <Users size={14} /> Sprint Team
                            </button>
                        </div>

                        {/* Date Range — Editable */}
                        <div className="p-text-xs p-text-tertiary p-flex p-items-center p-gap-2 p-font-bold p-uppercase p-tracking-wider">
                            <Clock size={14} className="p-text-primary" />
                            {editingDates ? (
                                <>
                                    <input type="date" value={dateForm.startDate} onChange={e => setDateForm(f => ({ ...f, startDate: e.target.value }))}
                                        style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '2px 6px', fontSize: '11px' }} />
                                    <span>—</span>
                                    <input type="date" value={dateForm.endDate} onChange={e => setDateForm(f => ({ ...f, endDate: e.target.value }))}
                                        style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '2px 6px', fontSize: '11px' }} />
                                    <button className="btn p-p-1 p-text-success" onClick={handleSaveDates} disabled={dateSaving}><Check size={14} /></button>
                                    <button className="btn p-p-1" onClick={() => setEditingDates(false)}><X size={14} /></button>
                                </>
                            ) : (
                                <>
                                    {sprint.startDate ? new Date(sprint.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}
                                    <span className="p-mx-1 opacity-40">—</span>
                                    {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}
                                    <button className="btn p-p-1" style={{ fontSize: '10px' }} onClick={() => setEditingDates(true)}>
                                        <Edit2 size={12} />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Total Points — Editable */}
                        <div className="p-text-xs p-text-tertiary p-flex p-items-center p-gap-2 p-font-bold p-uppercase p-tracking-wider p-mt-2">
                            <Target size={14} className="p-text-primary" />
                            {editingPoints ? (
                                <>
                                    <input type="number" value={pointsForm.totalPoints} onChange={e => setPointsForm(f => ({ ...f, totalPoints: e.target.value }))}
                                        style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '2px 6px', fontSize: '11px', width: '60px' }} />
                                    <span>pts</span>
                                    <button className="btn p-p-1 p-text-success" onClick={handleSavePoints} disabled={pointsSaving}><Check size={14} /></button>
                                    <button className="btn p-p-1" onClick={() => setEditingPoints(false)}><X size={14} /></button>
                                </>
                            ) : (
                                <>
                                    {sprint.totalPoints ? `${sprint.totalPoints} PTS` : 'AUTO PTS'}
                                    <button className="btn p-p-1" style={{ fontSize: '10px' }} onClick={() => setEditingPoints(true)}>
                                        <Edit2 size={12} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            {confirm && (
                <div className="modal-overlay" onClick={() => setConfirm(null)}>
                    <div className="modal-card" style={{ maxWidth: '420px', padding: '2rem' }} onClick={e => e.stopPropagation()}>
                        <h3 className="m-0 p-mb-3">{confirm === 'start' ? '▶ Start Sprint?' : confirm === 'complete' ? '✅ Complete Sprint?' : '🔄 Reopen Sprint?'}</h3>
                        <p className="p-text-tertiary p-text-sm p-mb-6">
                            {confirm === 'start'
                                ? 'This will set the sprint to ACTIVE. All planned tasks will be visible on the board.'
                                : confirm === 'complete'
                                ? 'This will close the sprint and mark all remaining tasks as incomplete.'
                                : 'This will reopen the sprint so you can continue working on it.'}
                        </p>
                        <div className="p-flex p-gap-3">
                            <button className="btn btn-primary" onClick={() => handleStatusUpdate(confirm)} disabled={statusUpdating}>
                                {statusUpdating ? 'Processing...' : confirm === 'start' ? 'Start Sprint' : confirm === 'complete' ? 'Complete Sprint' : 'Reopen Sprint'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sprint Team Panel */}
            {showTeam && (
                <div className="card p-mb-6 fade-in">
                    <div className="card-body">
                        <div className="p-flex p-justify-between p-items-center p-mb-4">
                            <h3 className="m-0 p-text-lg p-font-bold p-flex p-items-center p-gap-2">
                                <Users size={18} className="p-text-primary" /> Sprint Team
                            </h3>
                            <div className="p-flex p-gap-2">
                                <button className="btn btn-primary p-text-sm" onClick={handleSaveTeam} disabled={teamSaving}>
                                    {teamSaving ? 'Saving...' : 'Save Team'}
                                </button>
                                <button className="btn btn-secondary p-text-sm" onClick={() => setShowTeam(false)}>Cancel</button>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                            {(project?.partners || []).map(p => {
                                const userId = p.user?.id;
                                if (!userId) return null;
                                const selected = teamMembers.includes(userId);
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => setTeamMembers(prev =>
                                            selected ? prev.filter(id => id !== userId) : [...prev, userId]
                                        )}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                                            border: `2px solid ${selected ? 'var(--primary)' : 'var(--border-light)'}`,
                                            background: selected ? 'var(--primary-light, #eef2ff)' : 'var(--bg-card)',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', flexShrink: 0, overflow: 'hidden' }}>
                                            {p.user?.profilePicture
                                                ? <img src={p.user.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : (p.user?.firstName?.[0] || '?')}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {p.user?.firstName} {p.user?.lastName}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{p.role}</div>
                                        </div>
                                        {selected && <Check size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="p-flex p-gap-8 p-mb-8 p-border-b p-border-light">
                {['board', 'overview'].map(tab => (
                    <button
                        key={tab}
                        className={`btn p-flex p-items-center p-gap-3 p-pb-4 p-px-2 p-transition-all ${activeTab === tab ? 'p-text-primary p-font-bold' : 'p-text-tertiary'}`}
                        style={{ borderRadius: 0, borderBottom: activeTab === tab ? '3px solid var(--primary)' : '3px solid transparent', background: 'transparent', fontSize: '0.9rem', marginBottom: '-1.5px' }}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'board' ? <><Kanban size={20} /> Sprint Board</> : <><LayoutDashboard size={20} /> Sprint Metrics</>}
                    </button>
                ))}
            </div>

            {activeTab === 'board' && (
                <div className="fade-in p-flex p-flex-col" style={{ height: 'calc(100vh - 420px)' }}>
                    {/* Progress Bar */}
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sprint Progress</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                                {rtCompletedTasks}/{rtTotalTasks} tasks · {progressPct}%
                            </span>
                        </div>
                        <div style={{ height: '8px', borderRadius: '99px', background: 'var(--border-light)', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', borderRadius: '99px',
                                width: `${progressPct}%`,
                                background: progressPct === 100 ? 'linear-gradient(90deg, var(--success), #10b981)' : 'linear-gradient(90deg, var(--primary), #6366f1)',
                                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                            }} />
                        </div>
                    </div>

                    <div className="p-flex p-justify-between p-items-center p-mb-4">
                        <h3 className="m-0 p-text-lg">Kanban Board</h3>
                        <button className="btn btn-primary" onClick={() => setSelectedTask({ sprintId: sprint.id })}>+ Create Ticket</button>
                    </div>
                    <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                        <div className="p-flex p-gap-4 p-overflow-x-auto" style={{ flex: 1, paddingBottom: '1rem' }}>
                            {boardStore.columns.map(col => (
                                <BoardColumn
                                    key={col.id}
                                    column={col}
                                    tasks={sprintTasks.filter(t => t.columnId === col.id)}
                                    onTaskClick={(task) => setSelectedTask(task)}
                                />
                            ))}
                        </div>
                    </DndContext>
                </div>
            )}

            {activeTab === 'overview' && (
                <div className="fade-in p-flex-col p-gap-6">
                    <div className="card-grid">
                        <div className="card">
                            <div className="card-body p-flex p-items-center p-gap-4">
                                <div className="p-avatar p-bg-light p-text-primary"><Target size={24} /></div>
                                <div>
                                    <div className="p-text-sm p-text-tertiary">Tasks Completed</div>
                                    <div className="p-text-2xl p-font-bold">{rtCompletedTasks} / {rtTotalTasks}</div>
                                </div>
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-body p-flex p-items-center p-gap-4">
                                <div className="p-avatar p-bg-light p-text-warning"><Clock size={24} /></div>
                                <div>
                                    <div className="p-text-sm p-text-tertiary">Completed Story Points</div>
                                    <div className="p-text-2xl p-font-bold">{rtCompletedPoints} <span className="p-text-sm p-text-tertiary">/ {rtTotalPoints}</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-body p-flex p-items-center p-justify-between">
                                <div className="p-flex p-items-center p-gap-4">
                                    <div className="p-avatar p-bg-light p-text-success"><DollarSign size={24} /></div>
                                    <div>
                                        <div className="p-text-sm p-text-tertiary p-flex p-items-center p-gap-2">
                                            Budget Tracked
                                            {!editingBudget && (
                                                <button className="btn p-p-1" style={{ fontSize: '10px' }} onClick={() => setEditingBudget(true)}>
                                                    <Edit2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                        {editingBudget ? (
                                            <div className="p-flex p-items-center p-gap-2 p-mt-1">
                                                <input type="number" placeholder="Cost" value={budgetForm.actualCost} onChange={e => setBudgetForm(f => ({ ...f, actualCost: e.target.value }))} style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', fontSize: '13px', width: '80px' }} />
                                                <span className="p-text-tertiary">/</span>
                                                <input type="number" placeholder="Budget" value={budgetForm.plannedBudget} onChange={e => setBudgetForm(f => ({ ...f, plannedBudget: e.target.value }))} style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', fontSize: '13px', width: '80px' }} />
                                                <button className="btn p-p-1 p-text-success" onClick={handleSaveBudget} disabled={budgetSaving}><Check size={16} /></button>
                                                <button className="btn p-p-1" onClick={() => setEditingBudget(false)}><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="p-text-2xl p-font-bold">
                                                ${metrics?.budget?.actualCost || 0} <span className="p-text-sm p-text-tertiary">/ ${metrics?.budget?.plannedBudget || 0}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-body p-flex p-items-center p-gap-4">
                                <div className="p-avatar p-bg-light p-text-primary"><Clock size={24} /></div>
                                <div>
                                    <div className="p-text-sm p-text-tertiary">Time Tracked (Hours)</div>
                                    <div className="p-text-2xl p-font-bold">
                                        {(metrics?.totalLoggedTime / 60 || 0).toFixed(1)} <span className="p-text-sm p-text-tertiary">/ {(metrics?.totalEstimatedTime / 60 || 0).toFixed(1)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sprint Team Summary */}
                    {metrics?.members?.length > 0 && (
                        <div className="card fade-in">
                            <div className="card-header p-border-b p-flex p-items-center p-gap-2">
                                <Users size={18} className="p-text-primary" />
                                <h3 className="card-title m-0">Sprint Team ({metrics.members.length})</h3>
                            </div>
                            <div className="card-body p-flex p-gap-4 p-flex-wrap">
                                {metrics.members.map(m => (
                                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', overflow: 'hidden' }}>
                                            {m.user?.profilePicture
                                                ? <img src={m.user.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : m.user?.firstName?.[0]}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 600 }}>{m.user?.firstName} {m.user?.lastName}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{m.role}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="card fade-in p-mt-6">
                        <div className="card-header p-border-b p-flex p-items-center p-gap-2">
                            <TrendingDown size={18} className="p-text-primary" />
                            <h3 className="card-title m-0">Sprint Burndown Chart</h3>
                        </div>
                        <div className="card-body" style={{ height: '350px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={burndownData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis dataKey="day" stroke="var(--text-tertiary)" fontSize={12} tickMargin={10} />
                                    <YAxis stroke="var(--text-tertiary)" fontSize={12} tickMargin={10} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} itemStyle={{ fontSize: '14px', fontWeight: 500 }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="ideal" name="Ideal Burndown" stroke="#9ca3af" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                    <Line type="monotone" dataKey="actual" name="Actual Remaining Points" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {selectedTask && (
                <TaskModal
                    task={Object.keys(selectedTask).length > 2 ? selectedTask : { sprintId: sprint.id }}
                    projectId={projectId}
                    members={project?.partners || []}
                    onClose={() => setSelectedTask(null)}
                />
            )}
        </div>
    );
}
