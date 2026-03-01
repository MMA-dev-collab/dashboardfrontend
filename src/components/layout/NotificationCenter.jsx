import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckSquare, Trash2, MessageSquare, Briefcase, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import useAuthStore from '../../store/useAuthStore';
import './NotificationCenter.css';

export default function NotificationCenter() {
    const { user, isAuthenticated } = useAuthStore();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Initial fetch
    useEffect(() => {
        const fetchUnread = async () => {
            try {
                const [listRes, countRes] = await Promise.all([
                    api.get('/notifications?limit=20'),
                    api.get('/notifications/count')
                ]);
                // Backend paginated() sends { data: [...], pagination: {...} }
                // Backend success() sends { data: { count: N } }
                setNotifications(Array.isArray(listRes.data.data) ? listRes.data.data : []);
                setUnreadCount(countRes.data.data?.count || 0);
            } catch (err) {
                console.error("Failed to fetch notifications", err);
            }
        };
        if (isAuthenticated) fetchUnread();
    }, [isAuthenticated]);

    // SSE Real-time Updates
    useEffect(() => {
        const tokenStr = sessionStorage.getItem('accessToken');
        if (!tokenStr) return;

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const sseUrl = `${apiUrl}/notifications/stream?token=${tokenStr}`;

        const eventSource = new EventSource(sseUrl);

        eventSource.onmessage = (event) => {
            try {
                const newNotification = JSON.parse(event.data);

                // Add to list and bump count if unread
                setNotifications(prev => [newNotification, ...prev]);
                if (!newNotification.isRead) {
                    setUnreadCount(prev => prev + 1);
                }
            } catch (err) { }
        };

        return () => eventSource.close();
    }, [isAuthenticated]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) { }
    };

    const markAllAsRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) { }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'chat': return <MessageSquare size={16} className="text-primary" />;
            case 'task': return <Briefcase size={16} className="text-warning" />;
            default: return <Bell size={16} className="text-info" />;
        }
    };

    const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    };

    return (
        <div className="notification-center" ref={dropdownRef}>
            <button className="icon-btn p-relative" onClick={() => setIsOpen(!isOpen)}>
                <Bell size={20} />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="notification-dropdown fade-in">
                    <div className="notification-header">
                        <h3 className="m-0 text-md font-bold">Notifications</h3>
                        {unreadCount > 0 && (
                            <button className="btn-text-primary text-xs flex items-center gap-1" onClick={markAllAsRead}>
                                <CheckSquare size={14} /> Mark all read
                            </button>
                        )}
                    </div>

                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div className="notification-empty">
                                <Bell size={32} className="text-tertiary mb-2" />
                                <p className="m-0 text-sm text-tertiary">You're all caught up!</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div key={n.id} className={`notification-item ${!n.isRead ? 'unread' : ''}`} onClick={() => !n.isRead && markAsRead(n.id)}>
                                    <div className="notification-icon-wrapper" style={{ overflow: 'hidden', padding: 0 }}>
                                        {n.actor?.profilePicture ? (
                                            <img src={n.actor.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            getIcon(n.type)
                                        )}
                                    </div>
                                    <div className="notification-content">
                                        <div className="notification-title">{n.title}</div>
                                        <div className="notification-message">{n.message}</div>
                                        <div className="notification-time">{timeAgo(n.createdAt)}</div>

                                        {n.link && (
                                            <Link to={n.link} className="notification-link" onClick={() => setIsOpen(false)}>
                                                View Details
                                            </Link>
                                        )}
                                    </div>
                                    {!n.isRead && <div className="notification-dot-indicator" />}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-3 border-t border-light text-center">
                        <Link
                            to="/notifications"
                            className="text-sm font-medium text-primary hover:underline"
                            onClick={() => setIsOpen(false)}
                        >
                            View All Notifications
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
