import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, DollarSign, Users, FileText, Download, Briefcase, Calendar, LayoutDashboard } from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../store/useAuthStore';
import useBoardStore from '../../store/useBoardStore';
import { BoardColumn } from './AgileComponents';
import TaskModal from './TaskModal';
import ProjectSprints from './ProjectSprints';
import TeamManagementModal from './TeamManagementModal';
import '../Shared.css';
import './ProjectDetails.css';

export default function ProjectDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasRole } = useAuthStore();
    const isAdmin = hasRole('Admin');

    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState('overview'); // overview | board | metrics
    const [selectedTask, setSelectedTask] = useState(null); // null means closed, {} means new
    const [showTeamModal, setShowTeamModal] = useState(false);
    const boardStore = useBoardStore();
    const [searchParams, setSearchParams] = useSearchParams();

    const fetchProject = async () => {
        try {
            const { data } = await api.get(`/projects/${id}`);
            setProject(data.data || null);
        } catch (e) {
            console.error(e);
            alert('Error loading project details');
            navigate('/projects');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchProject();
        // Progressively load board data: only on deep link immediately
        if (searchParams.has('taskId')) {
            boardStore.fetchBoardData(id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Fetch board data when switching to sprints tab if not already loaded
    useEffect(() => {
        if (activeTab === 'sprints' && boardStore.tasks.length === 0 && !boardStore.loading) {
            boardStore.fetchBoardData(id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, id]);

    // Deep link: Handle ?taskId=... from URL
    useEffect(() => {
        const taskId = searchParams.get('taskId');
        if (taskId && boardStore.tasks.length > 0) {
            const task = boardStore.tasks.find(t => t.id === taskId);
            if (task) {
                setActiveTab('board');
                setSelectedTask(task);
                // Clear the param after opening to avoid re-opening on tab switch

                const newParams = new URLSearchParams(searchParams);
                newParams.delete('taskId');
                setSearchParams(newParams, { replace: true });
            }
        }
    }, [searchParams, boardStore.tasks, setSearchParams]);

    const handleDownload = async (docId, fileName) => {
        try {
            const res = await api.get(`/documents/${docId}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            alert('Download failed');
        }
    };

    const fmt = (v) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(v || 0);

    const fmtDate = (d) => {
        if (!d) return 'N/A';
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (loading) {
        return (
            <div className="p-flex p-items-center p-justify-center p-p-12 p-text-tertiary p-gap-3 fade-in">
                <div className="spinner"></div> Loading Project Dashboard...
            </div>
        );
    }

    if (!project) return null;

    // Financial calculations from backend
    const { totalExpenses = 0, totalPaid = 0, companyShare = 0, remainingBalance = 0 } = project.financials || {};

    // Deadline Math
    let daysRemainingText = "No Deadline Set";
    let isOverdue = false;
    if (project.deadline) {
        const diffTime = new Date(project.deadline).getTime() - new Date().getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
            isOverdue = true;
            daysRemainingText = `${Math.abs(diffDays)} Days Overdue`;
        } else if (diffDays === 0) {
            daysRemainingText = "Due Today";
        } else {
            daysRemainingText = `${diffDays} Days Remaining`;
        }
    }

    return (
        <div className="project-details-page fade-in" style={{ paddingBottom: '2rem' }}>
            {/* Minimal Sub Navigation */}
            <button className="btn btn-secondary p-mb-6" style={{ width: 'fit-content' }} onClick={() => navigate('/projects')}>
                <ArrowLeft size={16} /> Back to Projects
            </button>

            {/* Top Header Card */}
            <div className="card p-top-card">
                <div className="card-body">
                    <div className="p-flex p-justify-between p-items-start p-flex-wrap p-gap-4">
                        <div>
                            <div className="p-flex p-items-center p-gap-3 p-mb-2">
                                <div className="p-avatar">
                                    <Briefcase size={24} />
                                </div>
                                <div>
                                    <h1 className="p-text-2xl p-font-bold m-0">{project.name}</h1>
                                    <p className="p-text-sm p-text-tertiary">#INV-{project.id.split('-')[0].toUpperCase()} • {project.clientName}</p>
                                </div>
                            </div>
                            <div className="p-flex p-gap-4 p-mt-4">
                                <span className={`p-status-badge ${project.status === 'COMPLETED' ? 'p-status-completed' : 'p-status-active'}`}>
                                    {project.status.replace('_', ' ')}
                                </span>
                                <div className="p-flex p-items-center p-gap-2 p-text-sm p-text-tertiary">
                                    <Calendar size={14} /> Created: {fmtDate(project.createdAt)}
                                </div>
                            </div>
                        </div>

                        <div className="p-text-right">
                            <div className={`p-flex p-items-center p-gap-2 p-font-semibold p-text-lg p-justify-end ${isOverdue ? 'p-text-danger' : 'p-text-primary'}`}>
                                <Clock size={20} /> {daysRemainingText}
                            </div>
                            <div className="p-mt-2 p-text-sm p-text-tertiary">
                                Deadline: {fmtDate(project.deadline)}
                            </div>
                            <div className="p-mt-4 p-flex p-items-center p-gap-3 p-justify-end">
                                <div className="p-progress-container">
                                    <div className="p-progress-bar" style={{ width: `${project.completionPct}%` }} />
                                </div>
                                <span className="p-text-xs p-font-bold">{project.completionPct}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="p-flex p-border-b p-mb-6 p-gap-4">
                <button
                    className={`btn p-flex p-items-center p-gap-2 p-pb-3 ${activeTab === 'overview' ? 'p-text-primary p-border-b' : 'p-text-tertiary'}`}
                    style={{ borderRadius: 0, borderBottomWidth: activeTab === 'overview' ? '2px' : 0, borderBottomColor: 'var(--primary)', background: 'transparent' }}
                    onClick={() => setActiveTab('overview')}
                >
                    <LayoutDashboard size={18} /> Overview
                </button>
                <button
                    className={`btn p-flex p-items-center p-gap-2 p-pb-3 ${activeTab === 'sprints' ? 'p-text-primary p-border-b' : 'p-text-tertiary'}`}
                    style={{ borderRadius: 0, borderBottomWidth: activeTab === 'sprints' ? '2px' : 0, borderBottomColor: 'var(--primary)', background: 'transparent' }}
                    onClick={() => setActiveTab('sprints')}
                >
                    <Briefcase size={18} /> Sprints Workspace
                </button>
            </div>

            {activeTab === 'overview' && (
                <>
                    <div className="card-grid p-mb-6">
                        {/* Financials Overview */}
                        <div className="card">
                            <div className="card-header p-border-b p-flex p-items-center p-gap-2">
                                <DollarSign size={18} className="p-text-primary" />
                                <h3 className="card-title m-0">Financial Overview</h3>
                            </div>
                            <div className="card-body">
                                <div className="p-flex-col p-gap-4">
                                    <div className="p-flex p-justify-between p-items-center p-pb-3 p-border-b">
                                        <span className="p-text-sm p-text-tertiary">Total Value</span>
                                        <span className="p-font-bold p-text-lg">{fmt(project.totalValue)}</span>
                                    </div>
                                    <div className="p-flex p-justify-between p-items-center p-pb-3 p-border-b">
                                        <span className="p-text-sm p-text-tertiary">Amount Paid</span>
                                        <span className="p-font-semibold p-text-green">{fmt(totalPaid)}</span>
                                    </div>
                                    <div className="p-flex p-justify-between p-items-center p-pb-3 p-border-b">
                                        <span className="p-text-sm p-text-tertiary">Remaining Balance</span>
                                        <span className="p-font-semibold p-text-orange">{fmt(remainingBalance)}</span>
                                    </div>
                                    <div className="p-flex p-justify-between p-items-center p-pb-3 p-border-b">
                                        <span className="p-text-sm p-text-tertiary">Project Expenses</span>
                                        <span className="p-font-semibold p-text-danger">{fmt(totalExpenses)}</span>
                                    </div>
                                    {isAdmin && (
                                        <div className="p-flex p-justify-between p-items-center p-pt-2">
                                            <span className="p-text-sm p-font-medium">Company Revenue Share ({project.companyPercentage}%)</span>
                                            <span className="p-font-bold p-text-primary">{fmt(companyShare)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Team Members */}
                        <div className="card">
                            <div className="card-header p-border-b p-flex p-items-center p-justify-between">
                                <div className="p-flex p-items-center p-gap-2">
                                    <Users size={18} className="p-text-primary" />
                                    <h3 className="card-title m-0">Project Team & Split</h3>
                                </div>
                                {isAdmin && (
                                    <button 
                                        className="btn btn-secondary p-p-2 p-text-xs"
                                        onClick={() => setShowTeamModal(true)}
                                    >
                                        Manage Team
                                    </button>
                                )}
                            </div>
                            <div className="card-body overflow-y-auto" style={{ maxHeight: '300px' }}>
                                {project.partners?.length === 0 ? (
                                    <div className="p-text-center p-p-6 p-text-tertiary p-text-sm">No members assigned to this project.</div>
                                ) : (
                                    <div className="p-flex-col p-gap-3">
                                        {project.partners?.map(p => (
                                            <div key={p.id} className="p-flex p-items-center p-justify-between p-p-3 p-rounded-lg p-bg-light p-border">
                                                <div className="p-flex p-items-center p-gap-3">
                                                    <div className="p-avatar mini" style={{ overflow: 'hidden', padding: 0 }}>
                                                        {p.user?.profilePicture ? (
                                                            <img src={p.user.profilePicture} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            p.user?.firstName?.charAt(0)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="p-font-medium p-text-sm">{p.user?.firstName} {p.user?.lastName}</div>
                                                        <div className="p-text-xs p-text-tertiary p-uppercase">{p.role}</div>
                                                    </div>
                                                </div>
                                                <div className="p-text-right">
                                                    <div className="p-font-bold p-text-sm">{p.percentage}%</div>
                                                    <div className="p-text-xs p-text-tertiary">Profit Share</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Attached Documents */}
                    <div className="card">
                        <div className="card-header p-border-b p-flex p-items-center p-gap-2">
                            <FileText size={18} className="p-text-primary" />
                            <h3 className="card-title m-0">Project Documents & Assets</h3>
                        </div>
                        <div className="card-body p-p-0">
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th>File Name</th>
                                        <th>Size</th>
                                        <th>Uploaded By</th>
                                        <th>Date</th>
                                        <th className="p-text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {project.documents?.map(d => (
                                        <tr key={d.id}>
                                            <td>
                                                <div className="p-font-medium p-text-sm p-flex p-items-center p-gap-2">
                                                    <FileText size={16} className="p-text-tertiary" /> {d.fileName}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="p-text-xs p-text-tertiary">
                                                    {(d.fileSize / 1024 / 1024).toFixed(2)} MB
                                                </span>
                                            </td>
                                            <td>
                                                <div className="p-flex p-items-center p-gap-2">
                                                    <div className="p-avatar micro p-bg-light" style={{ overflow: 'hidden', padding: 0 }}>
                                                        {d.uploader?.profilePicture ? (
                                                            <img src={d.uploader.profilePicture} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            d.uploader?.firstName?.charAt(0)
                                                        )}
                                                    </div>
                                                    <span className="p-text-xs p-font-medium">{d.uploader?.firstName} {d.uploader?.lastName}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="p-text-xs p-text-tertiary">{fmtDate(d.createdAt)}</span>
                                            </td>
                                            <td className="p-text-right">
                                                <button
                                                    className="btn btn-secondary p-p-3 p-text-xs p-flex p-items-center p-gap-2 p-justify-center"
                                                    style={{ margin: '0 0 0 auto' }}
                                                    onClick={() => handleDownload(d.id, d.fileName)}
                                                >
                                                    <Download size={14} /> Download
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {project.documents?.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-text-center p-p-12 p-text-tertiary p-text-sm">
                                                No files or documents have been linked to this project yet. Upload them via the Document Center.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* --- SPRINTS WORKSPACE TAB --- */}
            {activeTab === 'sprints' && (
                <ProjectSprints projectId={project.id} />
            )}

            {/* Modals */}
            {selectedTask && (
                <TaskModal
                    task={Object.keys(selectedTask).length > 0 ? selectedTask : null}
                    projectId={project.id}
                    members={project.partners}
                    onClose={() => setSelectedTask(null)}
                />
            )}

            {showTeamModal && (
                <TeamManagementModal 
                    project={project} 
                    onClose={() => setShowTeamModal(false)} 
                    onUpdate={() => {
                        setShowTeamModal(false);
                        fetchProject();
                    }}
                />
            )}
        </div>
    );
}
