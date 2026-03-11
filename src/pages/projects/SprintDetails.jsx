import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Clock, DollarSign, TrendingDown, Kanban, LayoutDashboard } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState('board'); // board | overview

    const boardStore = useBoardStore();
    const [selectedTask, setSelectedTask] = useState(null);

    const [project, setProject] = useState(null);

    useEffect(() => {
        fetchSprintData();
        boardStore.fetchBoardData(projectId);
    }, [projectId, sprintId]);

    const fetchSprintData = async () => {
        try {
            // Fetch project details for members
            const projRes = await api.get(`/projects/${projectId}`);
            setProject(projRes.data.data);

            // Ensure sprint exists
            const sprintRes = await api.get(`/projects/${projectId}/sprints`);
            const currentSprint = sprintRes.data.data.find(s => s.id === sprintId);
            if (!currentSprint) {
                toast.error('Sprint not found');
                navigate(`/projects/${projectId}`);
                return;
            }
            setSprint(currentSprint);

            // Fetch metrics
            const metricsRes = await api.get(`/projects/${projectId}/sprints/${sprintId}/metrics`);
            setMetrics(metricsRes.data.data);
        } catch (err) {
            toast.error('Failed to load sprint details');
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over) return;

        const taskId = active.id;
        const toColumnId = over.id;
        const task = boardStore.tasks.find(t => t.id === taskId);

        if (task && task.columnId !== toColumnId) {
            boardStore.moveTask(projectId, taskId, toColumnId, task.version);
        }
    };

    if (loading || boardStore.loading) return <div className="p-p-12 p-text-center"><div className="spinner" /></div>;
    if (!sprint) return null;

    // Filter tasks for this sprint
    const sprintTasks = boardStore.tasks.filter(t => t.sprintId === sprintId);

    // Mock burndown generation based on metrics total tasks, etc.
    const idealBurnLine = [];
    const actualBurnLine = [];
    if (metrics) {
        const totalPts = metrics.totalStoryPoints || 100;
        const remaining = totalPts - (metrics.completedStoryPoints || 0);
        for (let i = 0; i <= 14; i++) {
            idealBurnLine.push({ day: `Day ${i}`, points: Math.max(0, totalPts - (totalPts / 14) * i) });
            if (i <= 7) {
                let burn = totalPts - ((totalPts - remaining) / 7) * i;
                actualBurnLine.push({ day: `Day ${i}`, ideal: Math.max(0, totalPts - (totalPts / 14) * i), actual: Math.max(0, burn) });
            } else {
                actualBurnLine.push({ day: `Day ${i}`, ideal: Math.max(0, totalPts - (totalPts / 14) * i) });
            }
        }
    }

    return (
        <div className="fade-in p-pb-10">
            <button className="btn btn-secondary p-mb-6 p-w-fit" onClick={() => navigate(`/projects/${projectId}`)}>
                <ArrowLeft size={16} /> Back to Project Workspace
            </button>

            <div className="card p-mb-6">
                <div className="card-body p-flex p-items-center p-justify-between p-flex-wrap p-gap-4">
                    <div>
                        <h1 className="p-text-2xl p-font-bold m-0 p-mb-2">{sprint.name}</h1>
                        <p className="p-text-tertiary m-0 p-flex p-items-center p-gap-2">
                            <Target size={16} /> {sprint.goal || 'No specific goal'}
                        </p>
                    </div>
                    <div className="p-text-right">
                        <span className={`p-status-badge ${sprint.status === 'COMPLETED' ? 'p-status-completed' : sprint.status === 'ACTIVE' ? 'p-status-active' : 'p-status-pending'}`}>
                            {sprint.status}
                        </span>
                        <div className="p-text-sm p-text-tertiary p-mt-2 p-flex p-items-center p-gap-2 p-justify-end">
                            <Clock size={16} />
                            {sprint.startDate ? new Date(sprint.startDate).toLocaleDateString() : 'TBD'} - {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : 'TBD'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="p-flex p-border-b p-mb-6 p-gap-4">
                <button
                    className={`btn p-flex p-items-center p-gap-2 p-pb-3 ${activeTab === 'board' ? 'p-text-primary p-border-b' : 'p-text-tertiary'}`}
                    style={{ borderRadius: 0, borderBottomWidth: activeTab === 'board' ? '2px' : 0, borderBottomColor: 'var(--primary)', background: 'transparent' }}
                    onClick={() => setActiveTab('board')}
                >
                    <Kanban size={18} /> Sprint Board
                </button>
                <button
                    className={`btn p-flex p-items-center p-gap-2 p-pb-3 ${activeTab === 'overview' ? 'p-text-primary p-border-b' : 'p-text-tertiary'}`}
                    style={{ borderRadius: 0, borderBottomWidth: activeTab === 'overview' ? '2px' : 0, borderBottomColor: 'var(--primary)', background: 'transparent' }}
                    onClick={() => setActiveTab('overview')}
                >
                    <LayoutDashboard size={18} /> Sprint Metrics
                </button>
            </div>

            {activeTab === 'board' && (
                <div className="fade-in p-flex p-flex-col" style={{ height: 'calc(100vh - 400px)' }}>
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
                                    <div className="p-text-2xl p-font-bold">{metrics?.completedTasks || 0} / {metrics?.totalTasks || 0}</div>
                                </div>
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-body p-flex p-items-center p-gap-4">
                                <div className="p-avatar p-bg-light p-text-warning"><Clock size={24} /></div>
                                <div>
                                    <div className="p-text-sm p-text-tertiary">Completed Story Points</div>
                                    <div className="p-text-2xl p-font-bold">{metrics?.completedStoryPoints || 0} <span className="p-text-sm p-text-tertiary">/ {metrics?.totalStoryPoints || 0}</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-body p-flex p-items-center p-gap-4">
                                <div className="p-avatar p-bg-light p-text-success"><DollarSign size={24} /></div>
                                <div>
                                    <div className="p-text-sm p-text-tertiary">Budget Tracked</div>
                                    <div className="p-text-2xl p-font-bold">${metrics?.budget?.actualCost || 0} <span className="p-text-sm p-text-tertiary">/ ${metrics?.budget?.amount || 0}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card fade-in p-mt-6">
                        <div className="card-header p-border-b p-flex p-items-center p-gap-2">
                            <TrendingDown size={18} className="p-text-primary" />
                            <h3 className="card-title m-0">Sprint Burndown Chart</h3>
                        </div>
                        <div className="card-body" style={{ height: '350px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={actualBurnLine} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis dataKey="day" stroke="var(--text-tertiary)" fontSize={12} tickMargin={10} />
                                    <YAxis stroke="var(--text-tertiary)" fontSize={12} tickMargin={10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                        itemStyle={{ fontSize: '14px', fontWeight: 500 }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="ideal" name="Ideal Burndown" stroke="#9ca3af" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                    <Line type="monotone" dataKey="actual" name="Actual Remaining Points" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
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
