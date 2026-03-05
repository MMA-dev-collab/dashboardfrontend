import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    User, Briefcase, Wallet, Bell, Edit, CheckCircle, Clock, AlertCircle,
    Mail, Calendar, Shield, ListTodo, CreditCard
} from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../store/useAuthStore';
import './Profile.css';

export default function Profile() {
    const { id } = useParams();
    const { user: currentUser, updateUser } = useAuthStore();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({ firstName: '', lastName: '', jobTitle: '', paymentUsername: '' });

    const isOwnProfile = currentUser?.id === id;

    useEffect(() => {
        fetchProfile();
    }, [id]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/users/${id}/profile`);
            setProfile(data.data);
            setEditForm({
                firstName: data.data.firstName || '',
                lastName: data.data.lastName || '',
                jobTitle: data.data.jobTitle || '',
                paymentUsername: data.data.paymentUsername || '',
            });
        } catch (err) {
            console.error('Failed to load profile', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const { data } = await api.patch('/users/me/profile', editForm);
            setEditing(false);
            fetchProfile();
            if (isOwnProfile && data.data) {
                updateUser({
                    firstName: data.data.firstName,
                    lastName: data.data.lastName,
                    profilePicture: data.data.profilePicture,
                    jobTitle: data.data.jobTitle,
                    paymentUsername: data.data.paymentUsername
                });
            }
        } catch (err) {
            console.error('Failed to update profile', err);
        }
    };

    const getInitials = (first, last) => `${(first || 'U').charAt(0)}${(last || '').charAt(0)}`.toUpperCase();

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'active': case 'in_progress': return 'var(--success, #10b981)';
            case 'completed': case 'done': return 'var(--primary, #3b82f6)';
            case 'on_hold': case 'cancelled': return 'var(--warning, #f59e0b)';
            default: return 'var(--text-tertiary, #9ca3af)';
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                alert("File is too large! Please upload an image under 2MB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditForm(p => ({ ...p, profilePicture: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
    const fmtMoney = (val) => `$${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    if (loading) {
        return (
            <div className="profile-page p-6">
                <div className="flex items-center gap-2 text-tertiary">
                    <div className="spinner" /> Loading profile...
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="profile-page p-6">
                <div className="text-center py-10">
                    <User size={48} className="text-tertiary mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium m-0">User not found</h3>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-page fade-in p-6">
            {/* Profile Header Card */}
            <div className="profile-header-card card">
                <div className="profile-header-content">
                    <div className="profile-avatar-large" style={{ cursor: editing ? 'pointer' : 'default' }}>
                        <label htmlFor="profilePhotoUpload" style={{ cursor: editing ? 'pointer' : 'default', width: '100%', height: '100%', display: 'block' }}>
                            {editForm.profilePicture || profile.profilePicture ? (
                                <img src={editForm.profilePicture || profile.profilePicture} alt="avatar" className="profile-avatar-img" />
                            ) : (
                                <div className="profile-avatar-placeholder">
                                    {getInitials(profile.firstName, profile.lastName)}
                                </div>
                            )}
                            {editing && (
                                <div className="profile-avatar-overlay p-flex p-items-center p-justify-center">
                                    <Edit size={24} color="white" />
                                </div>
                            )}
                        </label>
                        {editing && (
                            <input
                                type="file"
                                id="profilePhotoUpload"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleImageChange}
                            />
                        )}
                        <div className={`profile-status-indicator ${profile.isActive ? 'online' : 'offline'}`} />
                    </div>

                    <div className="profile-info">
                        {editing ? (
                            <div className="profile-edit-form">
                                <div className="flex gap-3 mb-3">
                                    <input
                                        className="form-input"
                                        placeholder="First Name"
                                        value={editForm.firstName}
                                        onChange={e => setEditForm(p => ({ ...p, firstName: e.target.value }))}
                                    />
                                    <input
                                        className="form-input"
                                        placeholder="Last Name"
                                        value={editForm.lastName}
                                        onChange={e => setEditForm(p => ({ ...p, lastName: e.target.value }))}
                                    />
                                </div>
                                <input
                                    className="form-input mb-3"
                                    placeholder="Job Title"
                                    value={editForm.jobTitle}
                                    onChange={e => setEditForm(p => ({ ...p, jobTitle: e.target.value }))}
                                />
                                <input
                                    className="form-input mb-1"
                                    placeholder="Payment App Username (e.g. InstaPay handle)"
                                    value={editForm.paymentUsername}
                                    onChange={e => setEditForm(p => ({ ...p, paymentUsername: e.target.value }))}
                                />
                                <p className="form-help-text mb-3" style={{ margin: '0 0 12px 0', fontSize: '11px' }}>Used for receipt verification when processing withdrawals</p>
                                <div className="flex gap-2">
                                    <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h1 className="profile-name m-0">{profile.firstName} {profile.lastName}</h1>
                                <p className="profile-title m-0 mt-1">{profile.jobTitle || 'Team Member'}</p>
                                <div className="profile-meta mt-3">
                                    <span className="profile-meta-item"><Mail size={14} /> {profile.email}</span>
                                    <span className="profile-meta-item"><Calendar size={14} /> Joined {fmtDate(profile.createdAt)}</span>
                                    <span className="profile-meta-item"><Shield size={14} /> {profile.roles?.join(', ') || 'Member'}</span>
                                    {profile.paymentUsername && (
                                        <span className="profile-meta-item"><CreditCard size={14} /> {profile.paymentUsername}</span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {isOwnProfile && !editing && (
                        <button className="btn btn-secondary btn-sm profile-edit-btn" onClick={() => setEditing(true)}>
                            <Edit size={14} /> Edit Profile
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Row */}
            <div className="profile-stats-row">
                <div className="profile-stat-card card">
                    <ListTodo size={20} className="text-primary" />
                    <div className="profile-stat-value">{profile.assignedTasks?.length || 0}</div>
                    <div className="profile-stat-label">Active Tasks</div>
                </div>
                <div className="profile-stat-card card">
                    <Briefcase size={20} className="text-success" />
                    <div className="profile-stat-value">{profile.projects?.length || 0}</div>
                    <div className="profile-stat-label">Projects</div>
                </div>
                <div className="profile-stat-card card">
                    <Wallet size={20} className="text-warning" />
                    <div className="profile-stat-value">{fmtMoney(profile.wallet?.availableBalance)}</div>
                    <div className="profile-stat-label">Available Balance</div>
                </div>
                <div className="profile-stat-card card">
                    <Bell size={20} className="text-info" />
                    <div className="profile-stat-value">{profile.recentNotifications?.filter(n => !n.isRead).length || 0}</div>
                    <div className="profile-stat-label">Unread Alerts</div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="profile-content-grid">
                {/* Tasks Column */}
                <div className="profile-section card">
                    <div className="profile-section-header">
                        <h3 className="m-0 flex items-center gap-2"><ListTodo size={18} className="text-primary" /> Assigned Tasks</h3>
                    </div>
                    <div className="profile-section-body">
                        {(!profile.assignedTasks || profile.assignedTasks.length === 0) ? (
                            <p className="text-sm text-tertiary text-center py-6 m-0">No tasks assigned yet.</p>
                        ) : (
                            profile.assignedTasks.map(task => (
                                <Link
                                    key={task.id}
                                    to={`/projects/${task.project?.id}?taskId=${task.id}`}
                                    className="profile-task-item"
                                    style={{ textDecoration: 'none' }}
                                >
                                    <div className="profile-task-info">
                                        <span className="profile-task-title">{task.title}</span>
                                        <span className="profile-task-project text-xs text-tertiary">
                                            {task.project?.name || 'No Project'}
                                        </span>
                                    </div>
                                    <span
                                        className="profile-task-status"
                                        style={{ background: `${getStatusColor(task.column?.name)}20`, color: getStatusColor(task.column?.name) }}
                                    >
                                        {task.column?.name || 'Backlog'}
                                    </span>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* Projects Column */}
                <div className="profile-section card">
                    <div className="profile-section-header">
                        <h3 className="m-0 flex items-center gap-2"><Briefcase size={18} className="text-success" /> Projects</h3>
                    </div>
                    <div className="profile-section-body">
                        {(!profile.projects || profile.projects.length === 0) ? (
                            <p className="text-sm text-tertiary text-center py-6 m-0">Not part of any projects.</p>
                        ) : (
                            profile.projects.map(project => (
                                <Link key={project.id} to={`/projects/${project.id}`} className="profile-project-item">
                                    <div className="profile-project-info">
                                        <span className="profile-project-name">{project.name}</span>
                                        <span className="text-xs text-tertiary">{fmtMoney(project.totalValue)} value</span>
                                    </div>
                                    <span
                                        className="profile-task-status"
                                        style={{ background: `${getStatusColor(project.status)}20`, color: getStatusColor(project.status) }}
                                    >
                                        {project.status || 'Active'}
                                    </span>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* Wallet Card */}
                <div className="profile-section card">
                    <div className="profile-section-header">
                        <h3 className="m-0 flex items-center gap-2"><Wallet size={18} className="text-warning" /> Wallet</h3>
                    </div>
                    <div className="profile-section-body">
                        <div className="profile-wallet-grid">
                            <div className="profile-wallet-item">
                                <span className="profile-wallet-label">Total Earned</span>
                                <span className="profile-wallet-value text-success">{fmtMoney(profile.wallet?.totalEarned)}</span>
                            </div>
                            <div className="profile-wallet-item">
                                <span className="profile-wallet-label">Withdrawn</span>
                                <span className="profile-wallet-value text-danger">{fmtMoney(profile.wallet?.totalWithdrawn)}</span>
                            </div>
                            <div className="profile-wallet-item">
                                <span className="profile-wallet-label">Available</span>
                                <span className="profile-wallet-value text-primary">{fmtMoney(profile.wallet?.availableBalance)}</span>
                            </div>
                            <div className="profile-wallet-item">
                                <span className="profile-wallet-label">Pending</span>
                                <span className="profile-wallet-value text-warning">{fmtMoney(profile.wallet?.pendingBalance)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Notifications */}
                <div className="profile-section card">
                    <div className="profile-section-header">
                        <h3 className="m-0 flex items-center gap-2"><Bell size={18} className="text-info" /> Recent Activity</h3>
                    </div>
                    <div className="profile-section-body">
                        {(!profile.recentNotifications || profile.recentNotifications.length === 0) ? (
                            <p className="text-sm text-tertiary text-center py-6 m-0">No recent activity.</p>
                        ) : (
                            profile.recentNotifications.map(n => (
                                <div key={n.id} className={`profile-notification-item ${!n.isRead ? 'unread' : ''}`}>
                                    <div className="profile-notification-dot" style={{ background: !n.isRead ? 'var(--primary)' : 'var(--border)' }} />
                                    <div className="profile-notification-content">
                                        <span className="profile-notification-title">{n.title}</span>
                                        <span className="profile-notification-msg">{n.message}</span>
                                        <span className="profile-notification-time">{fmtDate(n.createdAt)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
