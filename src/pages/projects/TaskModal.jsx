import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Save, MessageSquare, Paperclip, Plus, CheckCircle, Circle, AlertCircle, Download, Loader, Trash2, Clock, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import useBoardStore from '../../store/useBoardStore';
import useAuthStore from '../../store/useAuthStore';
import api from '../../api/client';
import TagPicker from './TagPicker';
import '../Shared.css';

const typeIcons = {
    STORY: <CheckCircle size={14} className="p-text-green" />,
    BUG: <AlertCircle size={14} className="p-text-danger" />,
    TASK: <Circle size={14} className="p-text-info" />
};

const priorityColors = {
    LOW: '#22c55e',
    MEDIUM: '#f59e0b',
    HIGH: '#ef4444',
    CRITICAL: '#7c3aed',
};

function formatMinutes(mins) {
    if (!mins || mins === 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`;
}

export default function TaskModal({ task: initialTask, projectId, members = [], onClose }) {
    const isNew = !initialTask?.id;
    const boardStore = useBoardStore();
    const { user } = useAuthStore();
    const fileInputRef = useRef(null);

    const [localTask, setLocalTask] = useState(initialTask);
    const [loadingTask, setLoadingTask] = useState(!isNew);

    const [formData, setFormData] = useState({
        title: initialTask?.title || '',
        description: initialTask?.description || '',
        type: initialTask?.type || 'TASK',
        priority: initialTask?.priority || 'MEDIUM',
        storyPoints: initialTask?.storyPoints ?? '',
        estimatedTime: initialTask?.estimatedTime ?? '',
        columnId: initialTask?.columnId || boardStore.columns[0]?.id || '',
        assigneeId: initialTask?.assigneeId || '',
        dueDate: initialTask?.dueDate ? initialTask.dueDate.split('T')[0] : '',
        sprintId: initialTask?.sprintId || ''
    });

    const [submitting, setSubmitting] = useState(false);
    const [comment, setComment] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [attachLoading, setAttachLoading] = useState(false);
    const [showSubtaskForm, setShowSubtaskForm] = useState(false);
    const [subtaskForm, setSubtaskForm] = useState({ title: '', assigneeId: '' });
    const [subtaskLoading, setSubtaskLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Time tracking
    const [logMinutes, setLogMinutes] = useState('');
    const [logLoading, setLogLoading] = useState(false);
    const [showLogForm, setShowLogForm] = useState(false);

    const refreshTask = useCallback(async () => {
        if (isNew) return;
        try {
            const { data } = await api.get(`/projects/${projectId}/tasks/${initialTask.id}`);
            setLocalTask(data.data);
        } catch (err) {
            console.error('Failed to refresh task', err);
        }
    }, [isNew, projectId, initialTask?.id]);

    useEffect(() => {
        if (!isNew) {
            setLoadingTask(true);
            refreshTask().finally(() => setLoadingTask(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleChange = useCallback((e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        if (errors[e.target.name]) {
            setErrors(prev => ({ ...prev, [e.target.name]: null }));
        }
    }, [errors]);

    const validateForm = () => {
        const newErrors = {};
        if (!formData.title?.trim()) newErrors.title = 'Title is required';
        if (!formData.columnId) newErrors.columnId = 'Status is required';
        if (!formData.assigneeId) newErrors.assigneeId = 'Assignee is required';
        if (!formData.priority) newErrors.priority = 'Priority is required';
        if (!formData.type) newErrors.type = 'Issue Type is required';
        if (formData.storyPoints === '' || isNaN(parseInt(formData.storyPoints)) || parseInt(formData.storyPoints) < 0) {
            newErrors.storyPoints = 'Must be a valid number >= 0';
        }
        if (!formData.dueDate) newErrors.dueDate = 'Due Date is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = useCallback(async () => {
        if (!validateForm()) {
            toast.error('Please check the form for missing or invalid required fields.', { position: 'top-center' });
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                storyPoints: parseInt(formData.storyPoints) || 0,
                estimatedTime: parseInt(formData.estimatedTime) || 0,
                sprintId: formData.sprintId || null
            };
            if (isNew) {
                payload.reporterId = user.id;
                await boardStore.addTask(projectId, payload);
            } else {
                payload.version = localTask.version;
                payload.updatedById = user.id;
                await api.put(`/projects/${projectId}/tasks/${localTask.id}`, payload);
                boardStore.fetchBoardData(projectId);
            }
            onClose();
        } catch (error) {
            const msg = error.response?.data?.message || 'Error saving task';
            setErrors({ submit: msg });
            toast.error(msg, { position: 'top-center' });
        } finally {
            setSubmitting(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData, isNew, localTask, user, projectId, boardStore, onClose]);

    const handleAddComment = useCallback(async () => {
        if (!comment.trim()) {
            setErrors(prev => ({ ...prev, comment: 'Comment cannot be empty' }));
            return;
        }
        setErrors(prev => ({ ...prev, comment: null }));
        setCommentLoading(true);
        try {
            const words = comment.split(' ');
            const mentions = [];
            words.forEach(w => {
                if (w.startsWith('@')) {
                    const name = w.substring(1).toLowerCase();
                    const member = members.find(m => m.user.firstName.toLowerCase() === name || m.user.lastName.toLowerCase() === name);
                    if (member) mentions.push(member.userId);
                }
            });
            await api.post(`/projects/${projectId}/tasks/${localTask.id}/comments`, { body: comment, mentions });
            setComment('');
            await refreshTask();
        } catch {
            setErrors(prev => ({ ...prev, comment: 'Failed to post comment' }));
        } finally {
            setCommentLoading(false);
        }
    }, [comment, members, projectId, localTask?.id, refreshTask]);

    const handleAddSubtask = useCallback(async () => {
        if (!subtaskForm.title?.trim()) {
            setErrors(prev => ({ ...prev, subtask: 'Subtask title is required' }));
            return;
        }
        setErrors(prev => ({ ...prev, subtask: null }));
        setSubtaskLoading(true);
        try {
            await api.post(`/projects/${projectId}/tasks`, {
                title: subtaskForm.title,
                assigneeId: subtaskForm.assigneeId || null,
                parentId: localTask.id,
                columnId: boardStore.columns[0]?.id,
                projectId,
                reporterId: user.id,
                type: 'TASK',
                priority: 'MEDIUM',
                storyPoints: 0,
                description: ' '
            });
            setSubtaskForm({ title: '', assigneeId: '' });
            setShowSubtaskForm(false);
            await refreshTask();
        } catch (error) {
            toast.error('Failed to add subtask: ' + (error.response?.data?.message || error.message));
        } finally {
            setSubtaskLoading(false);
        }
    }, [subtaskForm, localTask?.id, boardStore.columns, projectId, user.id, refreshTask]);

    const handleLogTime = useCallback(async () => {
        const mins = parseInt(logMinutes);
        if (!mins || mins <= 0) return toast.error('Enter a valid number of minutes');
        setLogLoading(true);
        try {
            await api.patch(`/projects/${projectId}/tasks/${localTask.id}/log-time`, { minutes: mins });
            toast.success(`Logged ${formatMinutes(mins)}`);
            setLogMinutes('');
            setShowLogForm(false);
            await refreshTask();
        } catch {
            toast.error('Failed to log time');
        } finally {
            setLogLoading(false);
        }
    }, [logMinutes, projectId, localTask?.id, refreshTask]);

    const handleFileUpload = useCallback(async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (fileInputRef.current) fileInputRef.current.value = '';
        setAttachLoading(true);
        const formPayload = new FormData();
        formPayload.append('file', file);
        try {
            await api.post(`/projects/${projectId}/tasks/${localTask.id}/attachments`, formPayload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            await refreshTask();
        } catch (error) {
            toast.error('Failed to upload file: ' + (error.response?.data?.message || error.message));
        } finally {
            setAttachLoading(false);
        }
    }, [projectId, localTask?.id, refreshTask]);

    const handleDownload = useCallback(async (attachmentId, fileName) => {
        try {
            const res = await api.get(`/projects/${projectId}/tasks/${localTask.id}/attachments/${attachmentId}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            toast.error('Download failed');
        }
    }, [projectId, localTask?.id]);

    const handleDeleteTask = useCallback(async () => {
        if (!confirm('Permanently delete this task?')) return;
        setSubmitting(true);
        try {
            await api.delete(`/projects/${projectId}/tasks/${localTask.id}`);
            boardStore.fetchBoardData(projectId);
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting task');
            setSubmitting(false);
        }
    }, [projectId, localTask?.id, boardStore, onClose]);

    const isStory = formData.type === 'STORY';

    return (
        <div className="modal-overlay" style={{ backgroundColor: 'rgba(9, 30, 66, 0.54)', backdropFilter: 'blur(3px)', zIndex: 1000 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-card" style={{ width: '95vw', maxWidth: '1140px', height: '88vh', display: 'flex', flexDirection: 'column', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                {/* HEADER */}
                <div className="p-flex p-items-center p-justify-between p-px-6 p-py-4 p-border-b" style={{ minHeight: '64px', backgroundColor: 'var(--bg-card)' }}>
                    <div className="p-flex p-items-center p-gap-3">
                        <div className="p-flex p-items-center p-justify-center p-p-1 p-rounded-md p-bg-light">
                            {typeIcons[formData.type] || typeIcons.TASK}
                        </div>
                        <span className="p-text-sm p-font-bold p-text-tertiary p-uppercase" style={{ letterSpacing: '0.5px' }}>
                            {isNew ? 'Create New Issue' : `TKT-${localTask?.id?.split('-')[0].toUpperCase()}`}
                        </span>
                        {!isNew && localTask?.parent && (
                            <>
                                <span className="p-text-tertiary">/</span>
                                <span className="p-text-sm p-text-secondary">{localTask.parent.title}</span>
                            </>
                        )}
                    </div>
                    <div className="p-flex p-items-center p-gap-3">
                        {!isNew && (
                            <button className="btn btn-danger-outline p-flex p-items-center p-gap-2 p-text-sm" onClick={handleDeleteTask} disabled={submitting}>
                                <Trash2 size={15} /> Delete
                            </button>
                        )}
                        <button className="btn btn-primary p-flex p-items-center p-gap-2 p-text-sm" style={{ padding: '0.4rem 1rem' }} onClick={handleSave} disabled={submitting}>
                            {submitting ? <Loader size={15} className="spinning" /> : <Save size={15} />}
                            {submitting ? 'Saving...' : 'Save Changes'}
                        </button>
                        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)', margin: '0 4px' }} />
                        <button className="btn p-p-2 p-rounded-md hover:p-bg-light" style={{ color: 'var(--text-tertiary)' }} onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* BODY */}
                <div className="p-flex" style={{ flex: 1, overflow: 'hidden', backgroundColor: 'var(--bg-card)' }}>

                    {/* LEFT PANE - Main Content */}
                    <div className="p-flex-col p-gap-6 custom-scrollbar" style={{ flex: '1 1 auto', padding: '2rem 2.5rem', overflowY: 'auto', backgroundColor: 'var(--bg-card)', borderRight: '1px solid var(--border-light)' }}>
                        
                        {errors.submit && (
                            <div className="p-bg-danger p-text-white p-p-3 p-rounded-lg p-text-sm p-flex p-items-center p-gap-2">
                                <AlertCircle size={16} />
                                {errors.submit}
                            </div>
                        )}

                        {/* Title */}
                        <div>
                            <input
                                className="form-input"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="Summary..."
                                style={{ 
                                    border: 'none', 
                                    borderBottom: errors.title ? '2px solid var(--danger)' : '2px solid transparent', 
                                    padding: '0.5rem 0', 
                                    fontSize: '1.75rem', 
                                    fontWeight: 600, 
                                    borderRadius: '0', 
                                    marginBottom: '0',
                                    outline: 'none',
                                    boxShadow: 'none',
                                    backgroundColor: 'transparent',
                                    color: 'var(--text)'
                                }}
                            />
                            {errors.title && <div className="p-text-danger p-text-xs p-mt-1">{errors.title}</div>}
                        </div>

                        {/* Description */}
                        <div>
                            <h4 className="p-text-base p-font-bold p-mb-3 p-text-text">Description</h4>
                            <textarea
                                className="form-input"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                style={{ 
                                    minHeight: '180px', 
                                    lineHeight: '1.6', 
                                    width: '100%', 
                                    padding: '1rem', 
                                    borderRadius: '8px', 
                                    border: '1px solid var(--border)', 
                                    backgroundColor: 'var(--bg-main)',
                                    resize: 'vertical'
                                }}
                                placeholder="Add a detailed description here... Use markdown: **bold**, *italic*, - list items"
                            />
                        </div>

                        {/* Saved-task specific sections */}
                        {!isNew && (
                            <>
                                {loadingTask ? (
                                    <div className="p-flex p-items-center p-justify-center p-p-8 p-text-tertiary">
                                        <Loader size={24} className="spinning p-mr-2" /> Loading issue details...
                                    </div>
                                ) : (
                                    <div className="p-flex-col p-gap-8">
                                        {/* ATTACHMENTS */}
                                        <div className="p-bg-main p-rounded-xl p-p-5 p-border">
                                            <div className="p-flex p-justify-between p-items-center p-mb-4">
                                                <h4 className="p-text-sm p-font-bold p-text-text p-flex p-items-center p-gap-2">
                                                    <Paperclip size={16} className="p-text-tertiary" />
                                                    Attachments
                                                    <span className="p-bg-light p-text-xs p-px-2 p-py-0.5 p-rounded-full">{localTask?.attachments?.length || 0}</span>
                                                </h4>
                                                <button className="btn btn-outline p-text-xs p-flex p-items-center p-gap-1 p-py-1.5" onClick={() => fileInputRef.current?.click()} disabled={attachLoading}>
                                                    {attachLoading ? <Loader size={12} className="spinning" /> : <Plus size={14} />}
                                                    Add Attachment
                                                </button>
                                                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
                                            </div>
                                            
                                            {localTask?.attachments?.length > 0 ? (
                                                <div className="p-flex p-gap-3 p-flex-wrap">
                                                    {localTask.attachments.map(att => (
                                                        <div key={att.id} className="p-border p-rounded-lg p-p-3 p-flex p-items-center p-gap-3 p-transition-shadow hover:p-shadow-sm" style={{ width: '220px', backgroundColor: 'var(--bg-card)' }}>
                                                            <div className="p-bg-light p-p-2 p-rounded-md">
                                                                <Paperclip size={16} className="p-text-primary" />
                                                            </div>
                                                            <span className="p-text-xs p-font-semibold p-truncate" style={{ flex: 1 }} title={att.fileName}>{att.fileName}</span>
                                                            <button className="btn p-p-1.5 p-rounded-md hover:p-bg-light" onClick={() => handleDownload(att.id, att.fileName)}>
                                                                <Download size={14} className="p-text-tertiary" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-text-sm p-text-tertiary p-text-center p-py-6">No attachments added yet.</div>
                                            )}
                                        </div>

                                        {/* SUBTASKS (Child Issues) */}
                                        <div className="p-bg-main p-rounded-xl p-border p-p-5">
                                            <div className="p-flex p-justify-between p-items-center p-mb-4">
                                                <h4 className="p-text-sm p-font-bold p-text-text p-flex p-items-center p-gap-2">
                                                    <CheckCircle size={16} className="p-text-tertiary" />
                                                    Child Issues
                                                    <span className="p-bg-light p-text-xs p-px-2 p-py-0.5 p-rounded-full">{localTask?.subTasks?.length || 0}</span>
                                                </h4>
                                                {isStory ? (
                                                    <button className="btn btn-outline p-text-xs p-flex p-items-center p-gap-1 p-py-1.5" onClick={() => setShowSubtaskForm(!showSubtaskForm)}>
                                                        <Plus size={14} /> Add Child Issue
                                                    </button>
                                                ) : (
                                                    <span className="p-text-xs p-text-tertiary italic">Only available on Story tickets</span>
                                                )}
                                            </div>

                                            {!isStory && (
                                                <div className="p-text-sm p-text-tertiary p-text-center p-py-6">
                                                    Please change the Issue Type to <strong>Story</strong> to add child issues.
                                                </div>
                                            )}

                                            {isStory && (
                                                <div className="p-flex-col p-gap-2">
                                                    {localTask?.subTasks?.map(st => (
                                                        <div key={st.id} className="p-bg-white p-border p-rounded-lg p-p-3 p-flex p-items-center p-justify-between p-transition-shadow hover:p-shadow-sm">
                                                            <div className="p-flex p-items-center p-gap-3" style={{ flex: 1 }}>
                                                                {typeIcons[st.type] || typeIcons.TASK}
                                                                <span className="p-text-sm p-font-medium p-text-text" style={{ cursor: 'pointer' }} title={st.title}>{st.title}</span>
                                                            </div>
                                                            <div className="p-flex p-items-center p-gap-4">
                                                                <span className="p-text-xs p-bg-light p-px-2 p-py-1 p-rounded-md p-font-bold p-text-tertiary">{st.column?.name}</span>
                                                                <div className="p-flex p-items-center p-justify-center p-text-[10px] p-text-primary p-font-bold" style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', overflow: 'hidden', flexShrink: 0 }} title={`Assignee: ${st.assignee?.firstName || 'Unassigned'}`}>
                                                                    {st.assignee?.profilePicture ? <img src={st.assignee.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (st.assignee?.firstName?.[0] || '?')}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    
                                                    {showSubtaskForm && (
                                                        <div className="p-border p-border-primary p-rounded-lg p-p-3 p-mt-2 p-flex p-gap-3 p-items-center" style={{ backgroundColor: 'var(--bg-card)' }}>
                                                            <input
                                                                className={`form-input p-py-1.5 p-px-3 ${errors.subtask ? 'is-invalid' : ''}`}
                                                                style={{ flex: 1, border: 'none', backgroundColor: 'var(--bg-main)' }}
                                                                placeholder="What needs to be done?"
                                                                value={subtaskForm.title}
                                                                onChange={e => { setSubtaskForm(f => ({ ...f, title: e.target.value })); if (errors.subtask) setErrors(prev => ({ ...prev, subtask: null })); }}
                                                                onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
                                                                autoFocus
                                                            />
                                                            <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border)' }} />
                                                            <select className="form-input p-py-1.5 p-px-2 p-text-sm" style={{ width: '140px', border: 'none', backgroundColor: 'transparent' }} value={subtaskForm.assigneeId} onChange={e => setSubtaskForm(f => ({ ...f, assigneeId: e.target.value }))}>
                                                                <option value="">Unassigned</option>
                                                                {members.map(m => <option key={m.userId} value={m.userId}>{m.user?.firstName}</option>)}
                                                            </select>
                                                            <div className="p-flex p-gap-2">
                                                                <button className="btn btn-primary p-px-3 p-py-1.5 p-text-xs" onClick={handleAddSubtask} disabled={subtaskLoading}>
                                                                    {subtaskLoading ? <Loader size={12} className="spinning" /> : 'Save'}
                                                                </button>
                                                                <button className="btn btn-outline p-px-2 p-py-1.5" onClick={() => setShowSubtaskForm(false)} title="Cancel"><X size={14}/></button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* ACTIVITY & COMMENTS */}
                                        <div className="p-mt-2">
                                            <h4 className="p-text-base p-font-bold p-text-text p-mb-4 p-flex p-items-center p-gap-2">
                                                <MessageSquare size={16} className="p-text-tertiary" />
                                                Activity
                                            </h4>
                                            
                                            {/* Comment Input */}
                                            <div className="p-flex p-gap-4 p-mb-6 p-bg-main p-p-4 p-rounded-xl p-border">
                                                <div className="p-flex p-items-center p-justify-center p-text-sm p-font-bold p-text-primary p-shrink-0" style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', overflow: 'hidden', flexShrink: 0 }}>
                                                    {user?.profilePicture ? <img src={user.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user?.firstName?.[0] || 'U'}
                                                </div>
                                                <div className="p-flex-col p-gap-3" style={{ flex: 1 }}>
                                                    <textarea
                                                        className={`form-input ${errors.comment ? 'border-danger' : ''}`}
                                                        style={{ minHeight: '80px', resize: 'vertical', backgroundColor: 'var(--bg-card)', color: 'var(--text)', fontSize: '0.9rem' }}
                                                        value={comment}
                                                        onChange={e => { setComment(e.target.value); if (errors.comment) setErrors(prev => ({ ...prev, comment: null })); }}
                                                        placeholder="Add a comment... (use @firstname to mention peers)"
                                                    />
                                                    <div className="p-flex p-justify-end">
                                                        <button className="btn btn-primary p-px-4 p-py-1.5 p-text-sm" onClick={handleAddComment} disabled={commentLoading || !comment.trim()}>
                                                            {commentLoading ? <Loader size={14} className="spinning p-mr-2" /> : null}
                                                            {commentLoading ? 'Posting...' : 'Post Comment'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Activity Timeline */}
                                            <div className="p-flex-col p-gap-5">
                                                {(() => {
                                                    const combined = [
                                                        ...(localTask?.comments?.map(c => ({ ...c, activityType: 'comment', date: new Date(c.createdAt) })) || []),
                                                        ...(localTask?.history?.map(h => ({ ...h, activityType: 'history', date: new Date(h.movedAt) })) || [])
                                                    ].sort((a, b) => b.date - a.date);
                                                    
                                                    if (combined.length === 0) return (
                                                        <div className="p-text-sm p-text-tertiary p-text-center p-py-4">No activity on this issue yet.</div>
                                                    );

                                                    return combined.map((item, index) => (
                                                        <div key={`${item.activityType}-${item.id}`} className="p-flex p-gap-4" style={{ position: 'relative' }}>
                                                            {/* Vertical timeline line */}
                                                            {index !== combined.length - 1 && (
                                                                <div style={{ position: 'absolute', left: '16px', top: '32px', bottom: '-20px', width: '2px', backgroundColor: 'var(--bg-main)' }} />
                                                            )}
                                                            
                                                            <div className="p-flex p-items-center p-justify-center p-text-xs p-font-bold p-shrink-0 p-z-10" 
                                                                style={{ 
                                                                    width: '32px', height: '32px', borderRadius: '50%',
                                                                    backgroundColor: item.activityType === 'comment' ? 'var(--primary-light)' : 'var(--bg-main)', 
                                                                    color: item.activityType === 'comment' ? 'var(--primary)' : 'var(--text-tertiary)',
                                                                    overflow: 'hidden',
                                                                    flexShrink: 0,
                                                                    border: '2px solid var(--border)'
                                                                }}>
                                                                {(item.author?.profilePicture || item.user?.profilePicture) ? <img src={item.author?.profilePicture || item.user?.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (item.author?.firstName || item.user?.firstName || '?')[0]}
                                                            </div>
                                                            <div style={{ flex: 1, marginTop: '2px' }}>
                                                                <div className="p-text-xs p-mb-1.5 p-flex p-items-center p-gap-2">
                                                                    <strong className="p-text-sm p-text-text">{item.author?.firstName || item.user?.firstName} {item.author?.lastName || item.user?.lastName}</strong>
                                                                    <span className="p-text-tertiary">{item.date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                                </div>
                                                                {item.activityType === 'comment' ? (
                                                                    <div className="p-text-sm p-text-text p-bg-main p-p-3 p-rounded-lg p-rounded-tl-none p-border" style={{ lineHeight: 1.5, display: 'inline-block' }}>{item.body}</div>
                                                                ) : (
                                                                    <div className="p-text-sm p-text-secondary">
                                                                        Moved this issue to <strong className="p-text-text">{item.toStatus}</strong>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* RIGHT SIDEBAR - Details/Metadata Controls */}
                    <div className="p-flex-col p-gap-6 custom-scrollbar" style={{ flex: '0 0 340px', padding: '1.5rem', overflowY: 'auto', backgroundColor: 'var(--bg-main)' }}>
                        <div className="p-rounded-lg p-p-4 p-border p-shadow-sm" style={{ backgroundColor: 'var(--bg-card)' }}>
                            <label className="p-text-[10px] p-font-bold p-text-tertiary p-uppercase p-mb-2 p-block" style={{ letterSpacing: '0.05em' }}>Status</label>
                            <select 
                                className={`form-input p-font-bold p-text-sm ${errors.columnId ? 'is-invalid' : ''}`} 
                                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text)', cursor: 'pointer', border: '1px solid var(--border)', borderRadius: '6px' }} 
                                name="columnId" value={formData.columnId} onChange={handleChange}
                            >
                                <option value="" disabled>Select Status...</option>
                                {boardStore.columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        {/* Details Card */}
                        <div className="p-rounded-lg p-border p-shadow-sm p-flex-col" style={{ backgroundColor: 'var(--bg-card)', overflow: 'hidden' }}>
                            <div className="p-px-5 p-py-3 p-border-b" style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                                <h4 className="p-text-[10px] p-font-bold p-text-tertiary p-uppercase" style={{ letterSpacing: '0.05em', margin: 0 }}>Details</h4>
                            </div>
                            <div className="p-flex-col" style={{ padding: '8px 0' }}>
                                {/* Assignee */}
                                <div className="p-flex p-items-center p-px-5 p-py-1.5 hover:p-bg-light p-transition-colors">
                                    <span className="p-text-xs p-font-semibold p-text-tertiary p-w-24 p-shrink-0">Assignee</span>
                                    <select className="form-input p-text-sm p-p-1 p-flex-1" style={{ border: '1px solid transparent', backgroundColor: 'transparent', color: 'var(--text)', cursor: 'pointer', borderRadius: '4px' }} name="assigneeId" value={formData.assigneeId} onChange={handleChange}>
                                        <option value="">Unassigned</option>
                                        {members.map(m => <option key={m.userId} value={m.userId}>{m.user?.firstName} {m.user?.lastName}</option>)}
                                    </select>
                                </div>
                                {/* Priority */}
                                <div className="p-flex p-items-center p-px-5 p-py-1.5 hover:p-bg-light p-transition-colors">
                                    <span className="p-text-xs p-font-semibold p-text-tertiary p-w-24 p-shrink-0">Priority</span>
                                    <div className="p-flex-1 p-relative p-flex p-items-center">
                                        {formData.priority && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: priorityColors[formData.priority], marginRight: '8px', marginTop: '1px' }} />}
                                        <select className="form-input p-text-sm p-p-1 p-flex-1" style={{ border: '1px solid transparent', backgroundColor: 'transparent', color: 'var(--text)', cursor: 'pointer', borderRadius: '4px' }} name="priority" value={formData.priority} onChange={handleChange}>
                                            <option value="">None</option>
                                            <option value="LOW">Low</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HIGH">High</option>
                                            <option value="CRITICAL">Critical</option>
                                        </select>
                                    </div>
                                </div>
                                {/* Issue Type */}
                                <div className="p-flex p-items-center p-px-5 p-py-1.5 hover:p-bg-light p-transition-colors">
                                    <span className="p-text-xs p-font-semibold p-text-tertiary p-w-24 p-shrink-0">Type</span>
                                    <select className="form-input p-text-sm p-p-1 p-flex-1" style={{ border: '1px solid transparent', backgroundColor: 'transparent', color: 'var(--text)', cursor: 'pointer', borderRadius: '4px' }} name="type" value={formData.type} onChange={handleChange}>
                                        <option value="TASK">Task</option>
                                        <option value="STORY">Story</option>
                                        <option value="BUG">Bug</option>
                                        <option value="EPIC">Epic</option>
                                    </select>
                                </div>
                                {/* Due Date */}
                                <div className="p-flex p-items-center p-px-5 p-py-1.5 hover:p-bg-light p-transition-colors">
                                    <span className="p-text-xs p-font-semibold p-text-tertiary p-w-24 p-shrink-0">Due Date</span>
                                    <input type="date" className="form-input p-text-sm p-p-1 p-flex-1" style={{ border: '1px solid transparent', backgroundColor: 'transparent', color: 'var(--text)', borderRadius: '4px' }} name="dueDate" value={formData.dueDate} onChange={handleChange} />
                                </div>
                                {/* Story Points */}
                                <div className="p-flex p-items-center p-px-5 p-py-1.5 hover:p-bg-light p-transition-colors">
                                    <span className="p-text-xs p-font-semibold p-text-tertiary p-w-24 p-shrink-0">Points</span>
                                    <input type="number" className="form-input p-text-sm p-p-1 p-flex-1" style={{ border: '1px solid transparent', backgroundColor: 'transparent', color: 'var(--text)', borderRadius: '4px' }} name="storyPoints" value={formData.storyPoints} onChange={handleChange} placeholder="-" min="0" />
                                </div>
                            </div>
                        </div>

                        {!isNew && localTask && (
                        <div className="p-rounded-lg p-p-5 p-border p-shadow-sm p-flex-col p-gap-3" style={{ backgroundColor: 'var(--bg-card)' }}>
                            <h4 className="p-text-[10px] p-font-bold p-text-tertiary p-uppercase p-flex p-items-center p-gap-1" style={{ letterSpacing: '0.05em' }}>
                                <Tag size={12} /> Labels
                            </h4>
                            <TagPicker projectId={projectId} taskId={localTask.id} initialTags={localTask.taskTags || []} onChange={refreshTask} />
                        </div>
                        )}

                        <div className="p-rounded-lg p-p-0 p-border p-shadow-sm" style={{ backgroundColor: 'var(--bg-card)', overflow: 'hidden' }}>
                            <div className="p-px-5 p-py-3 p-border-b" style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                                <h4 className="p-text-[10px] p-font-bold p-text-tertiary p-uppercase p-flex p-items-center p-gap-2" style={{ letterSpacing: '0.05em' }}><Clock size={12} /> Time Tracking</h4>
                            </div>
                            <div className="p-p-5">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                    <div className="p-p-3 p-rounded-lg p-bg-main" style={{ border: '1px solid var(--border-light)' }}>
                                        <div className="p-text-[10px] p-text-tertiary p-uppercase p-mb-1 p-font-bold">Estimated</div>
                                        <div className="p-flex p-items-baseline p-gap-1">
                                            <input 
                                                type="number" 
                                                className="form-input p-p-0 p-text-sm p-font-bold" 
                                                style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--text)', width: '35px' }} 
                                                name="estimatedTime" value={formData.estimatedTime} onChange={handleChange} placeholder="0" min="0" 
                                            />
                                            <span className="p-text-xs p-text-tertiary">min</span>
                                        </div>
                                    </div>
                                    <div className="p-p-3 p-rounded-lg p-bg-main" style={{ border: '1px solid var(--border-light)' }}>
                                        <div className="p-text-[10px] p-text-tertiary p-uppercase p-mb-1 p-font-bold">Logged</div>
                                        <div className="p-text-sm p-font-bold p-text-primary p-mt-1">{formatMinutes(localTask?.loggedTime || 0)}</div>
                                    </div>
                                </div>
                                {formData.estimatedTime > 0 && (
                                <div className="p-mb-4">
                                    <div style={{ height: '6px', borderRadius: '4px', background: 'var(--border-light)', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${Math.min(100, ((localTask?.loggedTime || 0) / parseInt(formData.estimatedTime)) * 100)}%`, background: (localTask?.loggedTime || 0) > parseInt(formData.estimatedTime) ? 'var(--danger)' : 'var(--primary)', transition: 'width 0.4s ease' }} />
                                    </div>
                                    <div className="p-flex p-justify-between p-text-[10px] p-text-tertiary p-mt-1 p-font-semibold">
                                        <span>{formatMinutes(localTask?.loggedTime || 0)}</span>
                                        <span>{formatMinutes(Math.max(0, parseInt(formData.estimatedTime) - (localTask?.loggedTime || 0)))} left</span>
                                    </div>
                                </div>
                                )}
                                {!isNew && (
                                    showLogForm ? (
                                        <div className="p-flex p-gap-2 p-mt-2 p-bg-main p-p-2 p-rounded-lg p-border p-border-dashed p-border-primary">
                                            <input type="number" value={logMinutes} onChange={e => setLogMinutes(e.target.value)} placeholder="mins" min="1" className="form-input p-py-1 p-px-2 p-text-sm" style={{ width: '60px', backgroundColor: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }} onKeyDown={e => e.key === 'Enter' && handleLogTime()} />
                                            <button className="btn btn-primary p-px-3 p-py-1 p-text-xs p-flex-1" onClick={handleLogTime} disabled={logLoading}>{logLoading ? '...' : 'Log'}</button>
                                            <button className="btn p-px-1" onClick={() => setShowLogForm(false)}>✕</button>
                                        </div>
                                    ) : (
                                        <button className="btn btn-outline p-w-full p-text-xs p-py-1.5 hover:p-bg-light p-text-secondary" style={{ backgroundColor: 'var(--bg-card)' }} onClick={() => setShowLogForm(true)}>Log Work</button>
                                    )
                                )}
                            </div>
                        </div>

                        {!isNew && localTask && (
                        <div className="p-pt-2 p-border-t" style={{ borderColor: 'var(--border-light)' }}>
                            <div className="p-flex p-items-center p-justify-between p-mb-3">
                                <span className="p-text-[10px] p-font-bold p-text-tertiary p-uppercase">Reporter</span>
                                <div className="p-flex p-items-center p-gap-2">
                                    <div className="p-flex p-items-center p-justify-center p-overflow-hidden" style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--bg-light)', border: '1px solid var(--border)' }}>
                                        {localTask.reporter?.profilePicture ? <img src={localTask.reporter.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (localTask.reporter?.firstName || 'R')[0]}
                                    </div>
                                    <span className="p-text-xs p-font-semibold p-text-secondary">{localTask.reporter?.firstName} {localTask.reporter?.lastName}</span>
                                </div>
                            </div>
                            <div className="p-flex p-justify-between p-mb-2">
                                <span className="p-text-[10px] p-font-bold p-text-tertiary p-uppercase">Created</span>
                                <span className="p-text-xs p-text-tertiary">{new Date(localTask.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            </div>
                            <div className="p-flex p-justify-between">
                                <span className="p-text-[10px] p-font-bold p-text-tertiary p-uppercase">Updated</span>
                                <span className="p-text-xs p-text-tertiary">{new Date(localTask.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            </div>
                        </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
