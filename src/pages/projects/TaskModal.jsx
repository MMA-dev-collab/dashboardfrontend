import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Save, MessageSquare, Paperclip, Plus, CheckCircle, Circle, AlertCircle, Download, Loader } from 'lucide-react';
import useBoardStore from '../../store/useBoardStore';
import useAuthStore from '../../store/useAuthStore';
import api from '../../api/client';
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

export default function TaskModal({ task: initialTask, projectId, members = [], onClose }) {
    const isNew = !initialTask?.id;
    const boardStore = useBoardStore();
    const { user } = useAuthStore();
    const fileInputRef = useRef(null);

    // Local copy of the full task — gets refreshed after every action
    const [localTask, setLocalTask] = useState(initialTask);
    const [loadingTask, setLoadingTask] = useState(!isNew);

    const [formData, setFormData] = useState({
        title: initialTask?.title || '',
        description: initialTask?.description || '',
        type: initialTask?.type || 'TASK',
        priority: initialTask?.priority || 'MEDIUM',
        storyPoints: initialTask?.storyPoints || '',
        columnId: initialTask?.columnId || boardStore.columns[0]?.id || '',
        assigneeId: initialTask?.assigneeId || '',
        dueDate: initialTask?.dueDate ? initialTask.dueDate.split('T')[0] : ''
    });

    const [submitting, setSubmitting] = useState(false);
    const [comment, setComment] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [attachLoading, setAttachLoading] = useState(false);
    const [showSubtaskForm, setShowSubtaskForm] = useState(false);
    const [subtaskForm, setSubtaskForm] = useState({ title: '', assigneeId: '' });
    const [subtaskLoading, setSubtaskLoading] = useState(false);

    const [errors, setErrors] = useState({});

    // Fetch full task details (with comments, attachments, subtasks) on mount
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
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // Clear error when user starts typing
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: null });
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.title?.trim()) newErrors.title = 'Title is required';
        if (!formData.description?.trim()) newErrors.description = 'Description is required';

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

    const handleSave = async () => {
        if (!validateForm()) return;

        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                storyPoints: parseInt(formData.storyPoints) || 0,
            };
            if (isNew) {
                payload.reporterId = user.id;
                await boardStore.addTask(projectId, payload);
            } else {
                payload.version = localTask.version;
                await api.put(`/projects/${projectId}/tasks/${localTask.id}`, payload);
                boardStore.fetchBoardData(projectId);
            }
            onClose();
        } catch (error) {
            setErrors({ submit: error.response?.data?.message || 'Error saving task' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddComment = async () => {
        if (!comment.trim()) {
            setErrors({ ...errors, comment: 'Comment cannot be empty' });
            return;
        }
        setErrors({ ...errors, comment: null });
        setCommentLoading(true);
        try {
            // Simple mention parsing: find @words and match to member names
            const words = comment.split(' ');
            const mentions = [];
            words.forEach(w => {
                if (w.startsWith('@')) {
                    const name = w.substring(1).toLowerCase();
                    const member = members.find(
                        m => m.user.firstName.toLowerCase() === name || m.user.lastName.toLowerCase() === name
                    );
                    if (member) mentions.push(member.userId);
                }
            });

            await api.post(`/projects/${projectId}/tasks/${localTask.id}/comments`, { body: comment, mentions });
            setComment('');
            // Re-fetch task to get updated comments with author info
            await refreshTask();
        } catch (error) {
            setErrors({ ...errors, comment: 'Failed to post comment' });
        } finally {
            setCommentLoading(false);
        }
    };

    const handleAddSubtask = async () => {
        if (!subtaskForm.title?.trim()) {
            setErrors({ ...errors, subtask: 'Subtask title is required' });
            return;
        }
        setErrors({ ...errors, subtask: null });
        setSubtaskLoading(true);
        try {
            await api.post(`/projects/${projectId}/tasks`, {
                title: subtaskForm.title,
                assigneeId: subtaskForm.assigneeId || null,
                parentId: localTask.id,   // Link to parent
                columnId: boardStore.columns[0]?.id,
                projectId,
                reporterId: user.id,
                type: 'TASK',
                priority: 'MEDIUM',
                storyPoints: 0,
            });
            setSubtaskForm({ title: '', assigneeId: '' });
            setShowSubtaskForm(false);
            // Re-fetch task so we can see the new subtask under this task
            await refreshTask();
            // Don't add to boardStore (subtasks don't appear as top-level board tasks)
        } catch (error) {
            alert('Failed to add subtask: ' + (error.response?.data?.message || error.message));
        } finally {
            setSubtaskLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
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
            // Re-fetch task to show the uploaded attachment
            await refreshTask();
        } catch (error) {
            alert('Failed to upload file: ' + (error.response?.data?.message || error.message));
        } finally {
            setAttachLoading(false);
        }
    };

    const handleDownload = async (attachmentId, fileName) => {
        try {
            const res = await api.get(
                `/projects/${projectId}/tasks/${localTask.id}/attachments/${attachmentId}/download`,
                { responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Download failed');
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div
                className="modal-card"
                style={{ width: '90vw', maxWidth: '1100px', height: '85vh', display: 'flex', flexDirection: 'column' }}
            >
                {/* HEADER */}
                <div className="modal-header p-border-b">
                    <div className="p-flex p-items-center p-gap-2">
                        {typeIcons[formData.type] || typeIcons.TASK}
                        <span className="p-text-sm p-font-semibold p-text-tertiary">
                            {isNew ? 'New Ticket' : `${localTask?.id?.split('-')[0].toUpperCase()}`}
                        </span>
                    </div>
                    <div className="p-flex p-gap-2">
                        <button className="btn btn-primary p-flex p-items-center p-gap-2" onClick={handleSave} disabled={submitting}>
                            {submitting ? <Loader size={14} className="spinning" /> : <Save size={16} />}
                            {submitting ? 'Saving...' : 'Save'}
                        </button>
                        <button className="btn" onClick={onClose}><X size={20} /></button>
                    </div>
                </div>

                {/* BODY */}
                <div className="modal-body p-flex" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>

                    {/* LEFT PANE */}
                    <div style={{ flex: 2, padding: '1.5rem', overflowY: 'auto', borderRight: '1px solid var(--border-light)' }} className="p-flex-col p-gap-6">

                        {errors.submit && (
                            <div className="p-bg-danger p-text-white p-p-3 p-rounded-lg p-mb-4 p-text-sm">
                                {errors.submit}
                            </div>
                        )}

                        {/* Title */}
                        <div>
                            <h4 className="p-text-sm p-font-bold p-mb-2">Title <span className="p-text-danger">*</span></h4>
                            <input
                                className={`form-input p-text-xl p-font-bold ${errors.title ? 'is-invalid' : ''}`}
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="What needs to be done?"
                                style={{ border: errors.title ? '1px solid var(--danger)' : 'none', padding: '0.5rem 0', background: 'transparent', fontSize: '1.1rem', fontWeight: 600 }}
                            />
                            {errors.title && <div className="p-text-danger p-text-xs p-mt-1">{errors.title}</div>}
                        </div>

                        {/* Description */}
                        <div>
                            <h4 className="p-text-sm p-font-bold p-mb-2">Description <span className="p-text-danger">*</span></h4>
                            <textarea
                                className={`form-input ${errors.description ? 'is-invalid' : ''}`}
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={5}
                                placeholder="Add detailed criteria here..."
                            />
                            {errors.description && <div className="p-text-danger p-text-xs p-mt-1">{errors.description}</div>}
                        </div>

                        {/* Content only visible for saved tasks */}
                        {!isNew && (
                            <>
                                {/* Loading state */}
                                {loadingTask ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-tertiary)' }}>
                                        <Loader size={16} className="spinning" /> Loading details...
                                    </div>
                                ) : (
                                    <>
                                        {/* ATTACHMENTS */}
                                        <div>
                                            <div className="p-flex p-justify-between p-items-center p-mb-2">
                                                <h4 className="p-text-sm p-font-bold">
                                                    Attachments
                                                    {localTask?.attachments?.length > 0 && (
                                                        <span className="p-text-tertiary p-font-normal"> ({localTask.attachments.length})</span>
                                                    )}
                                                </h4>
                                                <button
                                                    className="btn p-text-xs p-flex p-items-center p-gap-1"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={attachLoading}
                                                >
                                                    {attachLoading ? <Loader size={12} className="spinning" /> : <Plus size={14} />}
                                                    {attachLoading ? 'Uploading...' : 'Attach File'}
                                                </button>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    style={{ display: 'none' }}
                                                    onChange={handleFileUpload}
                                                />
                                            </div>
                                            {localTask?.attachments?.length > 0 ? (
                                                <div className="p-flex p-gap-2 p-flex-wrap">
                                                    {localTask.attachments.map(att => (
                                                        <div key={att.id} className="p-bg-light p-p-2 p-rounded-lg p-flex p-items-center p-gap-2 p-text-xs p-border" style={{ borderRadius: '8px' }}>
                                                            <Paperclip size={14} className="p-text-tertiary" />
                                                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--bg-card)', overflow: 'hidden', display: 'flex' }}>
                                                                {att.uploader?.profilePicture ? (
                                                                    <img src={att.uploader.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                ) : (
                                                                    <span style={{ fontSize: '9px', margin: 'auto' }}>{(att.uploader?.firstName || 'U')[0]}</span>
                                                                )}
                                                            </div>
                                                            <span className="p-truncate" style={{ maxWidth: '120px' }}>{att.fileName}</span>
                                                            <button className="btn p-p-1" onClick={() => handleDownload(att.id, att.fileName)}>
                                                                <Download size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-text-xs p-text-tertiary p-p-4 p-bg-light p-rounded-lg p-text-center p-border p-border-dashed">
                                                    No attachments yet. Click "Attach File" to add one.
                                                </div>
                                            )}
                                        </div>

                                        {/* SUBTASKS (Child Issues) */}
                                        <div>
                                            <div className="p-flex p-justify-between p-items-center p-mb-2">
                                                <h4 className="p-text-sm p-font-bold">
                                                    Child Issues
                                                    {localTask?.subTasks?.length > 0 && (
                                                        <span className="p-text-tertiary p-font-normal"> ({localTask.subTasks.length})</span>
                                                    )}
                                                </h4>
                                                <button className="btn p-text-xs p-flex p-items-center p-gap-1" onClick={() => setShowSubtaskForm(!showSubtaskForm)}>
                                                    <Plus size={14} /> Add child issue
                                                </button>
                                            </div>
                                            <div className="p-flex-col p-gap-2">
                                                {localTask?.subTasks?.length > 0 && localTask.subTasks.map(st => (
                                                    <div key={st.id} className="p-bg-white p-border p-rounded-lg p-p-2 p-flex p-justify-between p-items-center" style={{ borderRadius: '8px' }}>
                                                        <div className="p-flex p-items-center p-gap-2">
                                                            {typeIcons[st.type] || typeIcons.TASK}
                                                            <span className="p-text-sm">{st.title}</span>
                                                        </div>
                                                        <div className="p-flex p-items-center p-gap-3">
                                                            <span className="p-text-xs p-bg-light p-p-1 p-rounded">{st.column?.name}</span>
                                                            <div className="p-text-white p-text-xs p-flex p-items-center p-justify-center p-rounded-full"
                                                                style={{ width: '24px', height: '24px', background: 'var(--primary)', borderRadius: '50%', fontSize: '11px', overflow: 'hidden' }}>
                                                                {st.assignee?.profilePicture ? (
                                                                    <img src={st.assignee.profilePicture} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                ) : (
                                                                    st.assignee?.firstName?.[0] || '?'
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {localTask?.subTasks?.length === 0 && !showSubtaskForm && (
                                                    <div className="p-text-xs p-text-tertiary p-p-4 p-bg-light p-rounded-lg p-text-center p-border p-border-dashed">
                                                        No child issues yet.
                                                    </div>
                                                )}
                                                {showSubtaskForm && (
                                                    <>
                                                        <div className="p-bg-light p-border p-rounded-lg p-p-2 p-flex p-gap-2" style={{ borderRadius: '8px' }}>
                                                            <input
                                                                className={`form-input ${errors.subtask ? 'is-invalid' : ''}`}
                                                                style={{ flex: 1, padding: '0.35rem 0.5rem' }}
                                                                placeholder="Child issue title..."
                                                                value={subtaskForm.title}
                                                                onChange={e => {
                                                                    setSubtaskForm({ ...subtaskForm, title: e.target.value })
                                                                    if (errors.subtask) setErrors({ ...errors, subtask: null })
                                                                }}
                                                                onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
                                                            />
                                                            <select
                                                                className="form-input"
                                                                style={{ width: '150px', padding: '0.35rem' }}
                                                                value={subtaskForm.assigneeId}
                                                                onChange={e => setSubtaskForm({ ...subtaskForm, assigneeId: e.target.value })}
                                                            >
                                                                <option value="">Unassigned</option>
                                                                {members.map(m => <option key={m.userId} value={m.userId}>{m.user?.firstName}</option>)}
                                                            </select>
                                                            <button
                                                                className="btn btn-primary p-text-xs"
                                                                onClick={handleAddSubtask}
                                                                disabled={subtaskLoading}
                                                            >
                                                                {subtaskLoading ? <Loader size={12} className="spinning" /> : 'Add'}
                                                            </button>
                                                            <button className="btn p-text-xs" onClick={() => setShowSubtaskForm(false)}>Cancel</button>
                                                        </div>
                                                        {errors.subtask && <div className="p-text-danger p-text-xs p-mt-1">{errors.subtask}</div>}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* COMMENTS (Activity) */}
                                        <div className="p-mt-4">
                                            <h4 className="p-text-sm p-font-bold p-mb-3">
                                                <MessageSquare size={14} style={{ display: 'inline', marginRight: '6px' }} />
                                                Activity
                                            </h4>

                                            {/* Comment Input */}
                                            <div className="p-flex p-gap-3 p-mb-4">
                                                <div
                                                    style={{ width: '32px', height: '32px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', flexShrink: 0, overflow: 'hidden' }}
                                                >
                                                    {user?.profilePicture ? (
                                                        <img src={user.profilePicture} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        user?.firstName?.[0] || 'U'
                                                    )}
                                                </div>
                                                <div className="p-flex-col p-gap-2" style={{ flex: 1 }}>
                                                    <input
                                                        className={`form-input ${errors.comment ? 'is-invalid' : ''}`}
                                                        value={comment}
                                                        onChange={e => {
                                                            setComment(e.target.value)
                                                            if (errors.comment) setErrors({ ...errors, comment: null })
                                                        }}
                                                        onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                                                        placeholder="Add a comment... (use @firstname to mention)"
                                                    />
                                                    {errors.comment && <div className="p-text-danger p-text-xs">{errors.comment}</div>}
                                                    <div className="p-flex p-justify-end">
                                                        <button
                                                            className="btn btn-primary p-text-xs p-flex p-items-center p-gap-1"
                                                            onClick={handleAddComment}
                                                            disabled={commentLoading || !comment.trim()}
                                                        >
                                                            {commentLoading ? <Loader size={12} className="spinning" /> : null}
                                                            {commentLoading ? 'Saving...' : 'Save Comment'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Activity List (Comments + History) */}
                                            <div className="p-flex-col p-gap-4">
                                                {(() => {
                                                    const combined = [
                                                        ...(localTask?.comments?.map(c => ({ ...c, activityType: 'comment', date: new Date(c.createdAt) })) || []),
                                                        ...(localTask?.history?.map(h => ({ ...h, activityType: 'history', date: new Date(h.movedAt) })) || [])
                                                    ].sort((a, b) => b.date - a.date);

                                                    if (combined.length === 0) {
                                                        return (
                                                            <div className="p-text-xs p-text-tertiary p-text-center p-p-4 p-bg-light p-rounded-lg p-border p-border-dashed">
                                                                No activity yet.
                                                            </div>
                                                        );
                                                    }

                                                    return combined.map(item => (
                                                        <div key={`${item.activityType}-${item.id}`} className="p-flex p-gap-3">
                                                            <div style={{ width: '32px', height: '32px', background: item.activityType === 'comment' ? 'var(--secondary, #6366f1)' : 'var(--bg-main, #e2e8f0)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.activityType === 'comment' ? 'white' : 'var(--text-tertiary)', fontSize: '13px', flexShrink: 0, overflow: 'hidden' }}>
                                                                {(item.author?.profilePicture || item.user?.profilePicture) ? (
                                                                    <img src={item.author?.profilePicture || item.user?.profilePicture} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                ) : (
                                                                    (item.author?.firstName || item.user?.firstName || '?')[0]
                                                                )}
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <div className="p-text-xs p-text-tertiary p-mb-1">
                                                                    <strong className="p-text-text">{item.author?.firstName || item.user?.firstName} {item.author?.lastName || item.user?.lastName}</strong>
                                                                    <span style={{ marginLeft: '8px' }}>{item.date.toLocaleString()}</span>
                                                                </div>

                                                                {item.activityType === 'comment' ? (
                                                                    <>
                                                                        <div className="p-text-sm" style={{ lineHeight: 1.5 }}>{item.body}</div>
                                                                        {item.mentions?.length > 0 && (
                                                                            <div className="p-text-xs p-mt-1" style={{ color: 'var(--primary)' }}>
                                                                                @ {item.mentions.map(m => m.user.firstName).join(', ')}
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <div className="p-text-xs p-text-secondary italic">
                                                                        moved this task from <strong>{item.fromStatus || 'Backlog'}</strong> to <strong>{item.toStatus}</strong>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>

                    {/* RIGHT PANE: SIDEBAR DETAILS */}
                    <div style={{ flex: '0 0 260px', padding: '1.5rem', overflowY: 'auto', backgroundColor: 'var(--bg-main, #f8fafc)' }} className="p-flex-col p-gap-5">

                        <div>
                            <label className="p-text-xs p-font-bold p-text-tertiary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status <span className="p-text-danger">*</span></label>
                            <select className={`form-input p-mt-1 ${errors.columnId ? 'is-invalid' : ''}`} name="columnId" value={formData.columnId} onChange={handleChange}>
                                <option value="">Select Status...</option>
                                {boardStore.columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            {errors.columnId && <div className="p-text-danger p-text-xs p-mt-1">{errors.columnId}</div>}
                        </div>

                        <div>
                            <label className="p-text-xs p-font-bold p-text-tertiary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assignee <span className="p-text-danger">*</span></label>
                            <select className={`form-input p-mt-1 ${errors.assigneeId ? 'is-invalid' : ''}`} name="assigneeId" value={formData.assigneeId} onChange={handleChange}>
                                <option value="">Select Assignee...</option>
                                {members.map(m => (
                                    <option key={m.userId} value={m.userId}>{m.user?.firstName} {m.user?.lastName}</option>
                                ))}
                            </select>
                            {errors.assigneeId && <div className="p-text-danger p-text-xs p-mt-1">{errors.assigneeId}</div>}
                        </div>

                        <div>
                            <label className="p-text-xs p-font-bold p-text-tertiary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priority <span className="p-text-danger">*</span></label>
                            <select className={`form-input p-mt-1 ${errors.priority ? 'is-invalid' : ''}`} name="priority" value={formData.priority} onChange={handleChange}>
                                <option value="">Select Priority...</option>
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="CRITICAL">Critical</option>
                            </select>
                            {errors.priority && <div className="p-text-danger p-text-xs p-mt-1">{errors.priority}</div>}
                            {formData.priority && !errors.priority && (
                                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: priorityColors[formData.priority] }} />
                                    <span className="p-text-xs p-text-tertiary">{formData.priority}</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="p-text-xs p-font-bold p-text-tertiary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Issue Type <span className="p-text-danger">*</span></label>
                            <select className={`form-input p-mt-1 ${errors.type ? 'is-invalid' : ''}`} name="type" value={formData.type} onChange={handleChange}>
                                <option value="">Select Type...</option>
                                <option value="TASK">Task</option>
                                <option value="STORY">Story</option>
                                <option value="BUG">Bug</option>
                                <option value="EPIC">Epic</option>
                            </select>
                            {errors.type && <div className="p-text-danger p-text-xs p-mt-1">{errors.type}</div>}
                        </div>

                        <div>
                            <label className="p-text-xs p-font-bold p-text-tertiary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Story Points <span className="p-text-danger">*</span></label>
                            <input type="number" className={`form-input p-mt-1 ${errors.storyPoints ? 'is-invalid' : ''}`} name="storyPoints" value={formData.storyPoints} onChange={handleChange} placeholder="e.g. 5" min="0" />
                            {errors.storyPoints && <div className="p-text-danger p-text-xs p-mt-1">{errors.storyPoints}</div>}
                        </div>

                        <div>
                            <label className="p-text-xs p-font-bold p-text-tertiary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Due Date <span className="p-text-danger">*</span></label>
                            <input type="date" className={`form-input p-mt-1 ${errors.dueDate ? 'is-invalid' : ''}`} name="dueDate" value={formData.dueDate} onChange={handleChange} />
                            {errors.dueDate && <div className="p-text-danger p-text-xs p-mt-1">{errors.dueDate}</div>}
                        </div>

                        {!isNew && localTask && (
                            <div className="p-text-xs p-text-tertiary p-mt-4" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                                <div className="p-mb-1 p-flex p-items-center p-gap-2">
                                    Reporter:
                                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'var(--bg-card)', overflow: 'hidden', display: 'inline-flex' }}>
                                        {localTask.reporter?.profilePicture ? (
                                            <img src={localTask.reporter.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: '10px', margin: 'auto' }}>{(localTask.reporter?.firstName || 'R')[0]}</span>
                                        )}
                                    </div>
                                    <strong>{localTask.reporter?.firstName} {localTask.reporter?.lastName}</strong>
                                </div>
                                <div className="p-mb-1">Created: {new Date(localTask.createdAt).toLocaleDateString()}</div>
                                <div>Updated: {new Date(localTask.updatedAt).toLocaleDateString()}</div>
                                {localTask.parent && (
                                    <div className="p-mt-2" style={{ color: 'var(--primary)' }}>
                                        Parent: {localTask.parent.title}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
