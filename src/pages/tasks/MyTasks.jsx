import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle, Circle, AlertCircle, Clock, Filter,
    Calendar, BarChart3, Loader2, Zap, Layers
} from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../store/useAuthStore';
import './MyTasks.css';

const statusOptions = [
    { value: 'ALL', label: 'All', icon: BarChart3 },
    { value: 'TODO', label: 'To Do', icon: Circle },
    { value: 'IN PROGRESS', label: 'In Progress', icon: Layers },
    { value: 'REVIEW', label: 'Review', icon: Clock },
    { value: 'DONE', label: 'Done', icon: CheckCircle },
];

const priorityColors = {
    CRITICAL: 'priority-critical',
    HIGH: 'priority-high',
    MEDIUM: 'priority-medium',
    LOW: 'priority-low',
};

const typeIcons = {
    STORY: <CheckCircle size={14} className="type-icon story" />,
    BUG: <AlertCircle size={14} className="type-icon bug" />,
    TASK: <Circle size={14} className="type-icon task" />,
    EPIC: <Layers size={14} className="type-icon epic" />,
};

function formatDate(d) {
    if (!d) return 'No date';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function MyTasks() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [status, setStatus] = useState('ALL');
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTasks();
    }, [status]);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/tasks/my-tasks`, {
                params: status !== 'ALL' ? { status } : {},
            });
            setTasks(data.data || []);
        } catch (err) {
            console.error('Failed to fetch my tasks', err);
        } finally {
            setLoading(false);
        }
    };

    const handleTaskClick = (task) => {
        navigate(`/projects/${task.project.id}?taskId=${task.id}`);
    };

    const stats = useMemo(() => {
        const overdue = tasks.filter(t => t.isOverdue).length;
        const done = tasks.filter(t => t.column.name === 'DONE' || t.column.name === 'Done' || t.column.name === 'Completed').length;
        const inProgress = tasks.filter(t => t.column.name === 'IN PROGRESS' || t.column.name === 'In Progress').length;
        const todo = tasks.filter(t => t.column.name === 'TODO' || t.column.name === 'To Do').length;
        return { total: tasks.length, todo, inProgress, done, overdue };
    }, [tasks]);

    return (
        <div className="my-tasks-page fade-in">
            <header className="page-header">
                <div className="header-left">
                    <h1 className="page-title">My Tasks</h1>
                    <p className="page-subtitle">All tasks assigned to you across projects.</p>
                </div>
            </header>

            {/* Stats Bar */}
            <div className="my-tasks-stats">
                <div className="stat-pill">
                    <span className="stat-number">{stats.total}</span>
                    <span className="stat-label">Total</span>
                </div>
                <div className="stat-pill">
                    <span className="stat-number text-blue">{stats.todo}</span>
                    <span className="stat-label">To Do</span>
                </div>
                <div className="stat-pill">
                    <span className="stat-number text-amber">{stats.inProgress}</span>
                    <span className="stat-label">In Progress</span>
                </div>
                <div className="stat-pill">
                    <span className="stat-number text-green">{stats.done}</span>
                    <span className="stat-label">Done</span>
                </div>
                <div className="stat-pill">
                    <span className={`stat-number ${stats.overdue > 0 ? 'text-red' : ''}`}>{stats.overdue}</span>
                    <span className="stat-label">Overdue</span>
                </div>
            </div>

            {/* Status Filter */}
            <div className="status-filter">
                {statusOptions.map(opt => (
                    <button
                        key={opt.value}
                        className={`filter-btn ${status === opt.value ? 'active' : ''}`}
                        onClick={() => setStatus(opt.value)}
                    >
                        <opt.icon size={16} />
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Task List */}
            {loading ? (
                <div className="task-list-loading">
                    <Loader2 size={24} className="spinning" />
                    <span>Loading your tasks...</span>
                </div>
            ) : tasks.length === 0 ? (
                <div className="empty-state">
                    <CheckCircle size={48} className="empty-icon" />
                    <h3>No tasks found</h3>
                    <p>
                        {status !== 'ALL'
                            ? `No tasks with status "${status}". Try a different filter.`
                            : "You don't have any tasks assigned yet."}
                    </p>
                </div>
            ) : (
                <div className="task-list">
                    {tasks.map(task => (
                        <div
                            key={task.id}
                            className="task-row"
                            onClick={() => handleTaskClick(task)}
                        >
                            <div className="task-row-left">
                                <span className="task-type">{typeIcons[task.type] || typeIcons.TASK}</span>
                                <span className="task-title">{task.title}</span>
                                {task.isOverdue && (
                                    <span className="overdue-badge">Overdue</span>
                                )}
                            </div>
                            <div className="task-row-mid">
                                <span className="task-project">{task.project.name}</span>
                                <span className={`priority-dot ${priorityColors[task.priority]}`} />
                            </div>
                            <div className="task-row-right">
                                <span className="task-status-badge">{task.column.name}</span>
                                {task.dueDate && (
                                    <span className={`task-due-date ${task.isOverdue ? 'overdue' : ''}`}>
                                        <Calendar size={12} /> {formatDate(task.dueDate)}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
