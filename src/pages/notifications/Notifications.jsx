import React, { useState, useEffect } from 'react';
import { Bell, CheckSquare, MessageSquare, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import './Notifications.css';

export default function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            // Backend paginated() sends { data: [...], pagination: {...} }
            const res = await api.get('/notifications?limit=50&includeRead=true');
            setNotifications(Array.isArray(res.data.data) ? res.data.data : []);
        } catch (err) {
            console.error("Failed to fetch notifications page", err);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (err) { }
    };

    const markAllAsRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (err) { }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'chat': return <MessageSquare size={18} className="text-primary" />;
            case 'task': return <Briefcase size={18} className="text-warning" />;
            default: return <Bell size={18} className="text-info" />;
        }
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    if (loading) {
        return (
            <div className="notifications-page p-6">
                <div className="flex items-center gap-2 text-tertiary">
                    <div className="spinner" /> Loading notifications...
                </div>
            </div>
        );
    }

    return (
        <div className="notifications-page fade-in p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold m-0 flex items-center gap-2">
                        <Bell size={24} className="text-primary" />
                        Notifications Center
                    </h1>
                    <p className="text-tertiary mt-1 m-0">View all your recent alerts and mentions</p>
                </div>

                <button
                    className="btn btn-secondary flex items-center gap-2"
                    onClick={markAllAsRead}
                >
                    <CheckSquare size={16} />
                    Mark all as read
                </button>
            </div>

            <div className="notifications-container card">
                {notifications.length === 0 ? (
                    <div className="empty-state text-center py-10">
                        <Bell size={48} className="text-tertiary mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium m-0">No notifications yet</h3>
                        <p className="text-tertiary mt-2">When you get assigned tasks or tagged, they'll appear here.</p>
                    </div>
                ) : (
                    <div className="notifications-list-full">
                        {notifications.map(n => (
                            <div key={n.id} className={`notification-row ${!n.isRead ? 'unread' : ''}`}>
                                <div className="notification-row-icon">
                                    {getIcon(n.type)}
                                </div>
                                <div className="notification-row-content">
                                    <h4 className="m-0 text-md font-semibold">{n.title}</h4>
                                    <p className="m-0 text-secondary mt-1">{n.message}</p>
                                    <div className="flex items-center gap-4 mt-2">
                                        <span className="text-xs text-tertiary">{formatDate(n.createdAt)}</span>
                                        {n.link && (
                                            <Link to={n.link} className="text-xs font-medium text-primary hover:underline">
                                                View Details &rarr;
                                            </Link>
                                        )}
                                    </div>
                                </div>
                                {!n.isRead && (
                                    <div className="notification-row-actions">
                                        <button
                                            className="btn-text-primary text-xs"
                                            onClick={() => markAsRead(n.id)}
                                        >
                                            Mark read
                                        </button>
                                        <div className="unread-dot" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
