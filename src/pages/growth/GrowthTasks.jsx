import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Flame, Zap, Clock, AlertTriangle, CheckCircle2,
  Circle, Play, Trash2, ChevronDown, ChevronUp, Loader2, Star, X
} from 'lucide-react';
import api from '../../api/client';
import { useGrowthTodayTasks, useCreateGrowthTask, useCompleteGrowthTask, useStartGrowthTask, useDeleteGrowthTask } from '../../hooks/queries/useGrowthTasks';
import useGrowthStore from '../../store/useGrowthStore';
import './GrowthTasks.css';

const PRIORITY_CONFIG = {
  HIGH: { label: 'High', color: '#ff4757', glow: '0 0 12px rgba(255,71,87,0.4)', icon: '🔴' },
  MEDIUM: { label: 'Med', color: '#ffa502', glow: '0 0 12px rgba(255,165,2,0.4)', icon: '🟡' },
  LOW: { label: 'Low', color: '#2ed573', glow: '0 0 12px rgba(46,213,115,0.4)', icon: '🟢' },
};

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', icon: Circle, color: 'var(--text-tertiary)' },
  ACTIVE: { label: 'Active', icon: Play, color: '#1e90ff' },
  COMPLETED: { label: 'Done', icon: CheckCircle2, color: '#2ed573' },
  OVERDUE: { label: 'Overdue', icon: AlertTriangle, color: '#ff4757' },
};

const emptyTask = { title: '', description: '', duration: 30, priority: 'MEDIUM', dueDate: '', taskType: 'FLEXIBLE', scheduledTime: '', scheduledEndTime: '' };

export default function GrowthTasks() {
  const { data, isLoading } = useGrowthTodayTasks();
  const createMutation = useCreateGrowthTask();
  const completeMutation = useCompleteGrowthTask();
  const startMutation = useStartGrowthTask();
  const deleteMutation = useDeleteGrowthTask();
  const { refreshProfile } = useGrowthStore();

  const [filter, setFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyTask);
  const [expandedId, setExpandedId] = useState(null);

  const tasks = data?.tasks || [];
  const carryOvers = data?.carryOvers || [];
  const stats = data?.stats || {};

  const filtered = useMemo(() => {
    const all = [...carryOvers, ...tasks];
    if (filter === 'ALL') return all;
    return all.filter(t => t.status === filter);
  }, [tasks, carryOvers, filter]);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    await createMutation.mutateAsync(form);
    setForm(emptyTask);
    setShowModal(false);
  };

  const handleComplete = async (id) => {
    await completeMutation.mutateAsync(id);
    refreshProfile();
  };

  const handleStart = async (id) => {
    await startMutation.mutateAsync(id);
  };

  const handleDelete = async (id) => {
    await deleteMutation.mutateAsync(id);
  };

  return (
    <div className="gt-page fade-in">
      <header className="gt-header">
        <div className="gt-header-left">
          <h1 className="gt-title">Growth Tasks</h1>
          <span className="gt-subtitle">Earn XP. Unlock gaming time. Level up.</span>
        </div>
        <button className="gt-btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> New Task
        </button>
      </header>

      <div className="gt-stats">
        {[
          { label: 'Total', value: stats.total || 0, color: '#c8d6e5' },
          { label: 'Pending', value: stats.pending || 0, color: '#ffa502' },
          { label: 'Active', value: stats.active || 0, color: '#1e90ff' },
          { label: 'Done', value: stats.completed || 0, color: '#2ed573' },
          { label: 'Overdue', value: stats.overdue || 0, color: '#ff4757' },
        ].map(s => (
          <div key={s.label} className="gt-stat-card">
            <span className="gt-stat-val" style={{ color: s.color }}>{s.value}</span>
            <span className="gt-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="gt-filters">
        {['ALL', 'PENDING', 'ACTIVE', 'COMPLETED', 'OVERDUE'].map(s => (
          <button key={s} className={`gt-filter-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {s === 'ALL' ? 'All' : STATUS_CONFIG[s]?.label || s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="gt-loading"><Loader2 size={28} className="spinning" /></div>
      ) : filtered.length === 0 ? (
        <div className="gt-empty">
          <Star size={48} />
          <h3>No tasks yet</h3>
          <p>Create your first task to start earning XP</p>
        </div>
      ) : (
        <div className="gt-list">
          {filtered.map(task => {
            const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
            const sta = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;
            const expanded = expandedId === task.id;
            return (
              <div key={task.id} className={`gt-task-card ${task.status.toLowerCase()} ${task.isCarryOver ? 'carry-over' : ''}`}
                style={{ borderLeftColor: pri.color }}>
                <div className="gt-task-main" onClick={() => setExpandedId(expanded ? null : task.id)}>
                  <div className="gt-task-left">
                    <span className="gt-priority-dot" style={{ background: pri.color, boxShadow: pri.glow }} />
                    <div className="gt-task-info">
                      <span className="gt-task-title">{task.title}</span>
                      <div className="gt-task-meta">
                        <span className="gt-meta-item"><Clock size={12} /> {task.duration}m</span>
                        <span className="gt-meta-item xp"><Zap size={12} /> {task.xpReward} XP</span>
                        {task.isCarryOver && <span className="gt-carry-badge"><AlertTriangle size={10} /> carried</span>}
                      </div>
                    </div>
                  </div>
                  <div className="gt-task-right">
                    <span className="gt-status-chip" style={{ color: sta.color }}>
                      <sta.icon size={14} /> {sta.label}
                    </span>
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
                {expanded && (
                  <div className="gt-task-expand">
                    {task.description && <p className="gt-task-desc">{task.description}</p>}
                    <div className="gt-task-actions">
                      {task.status === 'PENDING' && (
                        <button className="gt-action-btn start" onClick={() => handleStart(task.id)}>
                          <Play size={14} /> Start
                        </button>
                      )}
                      {(task.status === 'ACTIVE' || task.status === 'PENDING' || task.status === 'OVERDUE') && task.status !== 'COMPLETED' && (
                        <button className="gt-action-btn complete" onClick={() => handleComplete(task.id)}
                          disabled={completeMutation.isPending}>
                          <CheckCircle2 size={14} /> Complete
                        </button>
                      )}
                      <button className="gt-action-btn delete" onClick={() => handleDelete(task.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="gt-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="gt-modal" onClick={e => e.stopPropagation()}>
            <div className="gt-modal-header">
              <h2>New Growth Task</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div className="gt-modal-body">
              <label>Title</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="What do you need to do?" />
              <label>Duration (min)</label>
              <input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) || 0 })} min={5} max={480} />
              <label>Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
              <label>Description (optional)</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
              <label>Due Date (optional)</label>
              <input type="datetime-local" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
              <label>Schedule Time (optional)</label>
              <div className="gt-time-inputs" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="time" value={form.scheduledTime} onChange={e => setForm({ ...form, scheduledTime: e.target.value })} />
                <span style={{ color: 'var(--text-tertiary)' }}>to</span>
                <input type="time" value={form.scheduledEndTime} onChange={e => setForm({ ...form, scheduledEndTime: e.target.value })} />
              </div>
            </div>
            <div className="gt-modal-footer">
              <button className="gt-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="gt-btn-primary" onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 size={16} className="spinning" /> : <Plus size={16} />} Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
