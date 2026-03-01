import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Calendar, dayjsLocalizer } from 'react-big-calendar';
import dayjs from 'dayjs';
import {
    Plus, X, Save, CalendarDays, Clock, MapPin, Users, Briefcase,
    Loader, ChevronLeft, ChevronRight, Trash2
} from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../store/useAuthStore';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarPage.css';

const localizer = dayjsLocalizer(dayjs);

const EVENT_TYPES = [
    { value: 'meeting', label: 'Meeting', color: '#8b5cf6' },
    { value: 'deadline', label: 'Deadline', color: '#ef4444' },
    { value: 'milestone', label: 'Milestone', color: '#f59e0b' },
];

export default function CalendarPage() {
    const { user } = useAuthStore();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('month');
    const [date, setDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [projects, setProjects] = useState([]);
    const [allUsers, setAllUsers] = useState([]);

    // Fetch calendar data
    const fetchCalendar = useCallback(async (refDate) => {
        try {
            const d = refDate || date;
            const start = dayjs(d).startOf('month').subtract(7, 'day').toISOString();
            const end = dayjs(d).endOf('month').add(7, 'day').toISOString();
            const { data } = await api.get(`/calendar/me?start=${start}&end=${end}`);
            setItems(data.data.map(item => ({
                ...item,
                start: new Date(item.start),
                end: new Date(item.end),
            })));
        } catch (err) {
            console.error('Failed to fetch calendar', err);
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

    // Fetch projects & users for the create modal
    useEffect(() => {
        const loadSelectors = async () => {
            try {
                const [projRes, userRes] = await Promise.all([
                    api.get('/projects'),
                    api.get('/users/me/profile').then(() => api.get('/projects')).catch(() => ({ data: { data: [] } }))
                ]);
                setProjects(projRes.data.data || []);
            } catch { /* silent */ }
        };
        loadSelectors();
    }, []);

    // Custom event styling
    const eventPropGetter = useCallback((event) => ({
        style: {
            backgroundColor: event.color || '#3b82f6',
            borderRadius: '6px',
            border: 'none',
            color: '#fff',
            fontSize: '12px',
            padding: '2px 6px',
        }
    }), []);

    // Navigate handlers
    const handleNavigate = useCallback((newDate) => {
        setDate(newDate);
        fetchCalendar(newDate);
    }, [fetchCalendar]);

    const handleSelectEvent = useCallback((event) => {
        setSelectedEvent(event);
    }, []);

    const handleSelectSlot = useCallback(({ start, end }) => {
        setShowCreateModal(true);
    }, []);

    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm('Delete this event?')) return;
        try {
            await api.delete(`/calendar/events/${eventId}`);
            setSelectedEvent(null);
            fetchCalendar();
        } catch (err) {
            alert('Failed to delete event');
        }
    };

    // Custom toolbar
    const CustomToolbar = ({ label, onNavigate, onView, view: currentView }) => (
        <div className="cal-toolbar">
            <div className="cal-toolbar-left">
                <button className="btn cal-nav-btn" onClick={() => onNavigate('PREV')}>
                    <ChevronLeft size={18} />
                </button>
                <button className="btn cal-nav-btn" onClick={() => onNavigate('TODAY')}>Today</button>
                <button className="btn cal-nav-btn" onClick={() => onNavigate('NEXT')}>
                    <ChevronRight size={18} />
                </button>
                <h2 className="cal-title">{label}</h2>
            </div>
            <div className="cal-toolbar-right">
                <div className="cal-view-switcher">
                    {['month', 'week', 'day', 'agenda'].map(v => (
                        <button
                            key={v}
                            className={`cal-view-btn ${currentView === v ? 'active' : ''}`}
                            onClick={() => onView(v)}
                        >
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                        </button>
                    ))}
                </div>
                <button className="btn btn-primary cal-create-btn" onClick={() => setShowCreateModal(true)}>
                    <Plus size={16} /> New Event
                </button>
            </div>
        </div>
    );

    const components = useMemo(() => ({ toolbar: CustomToolbar }), []);

    return (
        <div className="calendar-page fade-in">
            <header className="page-header">
                <div className="header-left">
                    <h1 className="page-title"><CalendarDays size={28} style={{ marginRight: '10px' }} /> Calendar</h1>
                    <p className="page-subtitle">Your tasks, projects, and events in one view.</p>
                </div>
            </header>

            {/* Legend */}
            <div className="cal-legend">
                <span className="cal-legend-item"><span className="cal-dot" style={{ background: '#3b82f6' }}></span> Tasks</span>
                <span className="cal-legend-item"><span className="cal-dot" style={{ background: '#10b981' }}></span> Projects</span>
                <span className="cal-legend-item"><span className="cal-dot" style={{ background: '#8b5cf6' }}></span> Events</span>
            </div>

            {loading ? (
                <div className="loading-spinner">Loading Calendar...</div>
            ) : (
                <div className="cal-wrapper card">
                    <Calendar
                        localizer={localizer}
                        events={items}
                        startAccessor="start"
                        endAccessor="end"
                        titleAccessor="title"
                        view={view}
                        onView={setView}
                        date={date}
                        onNavigate={handleNavigate}
                        onSelectEvent={handleSelectEvent}
                        selectable
                        onSelectSlot={handleSelectSlot}
                        eventPropGetter={eventPropGetter}
                        components={components}
                        style={{ minHeight: 650 }}
                        popup
                    />
                </div>
            )}

            {/* Event Detail Popup */}
            {selectedEvent && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedEvent(null); }}>
                    <div className="modal-card cal-detail-card">
                        <div className="modal-header">
                            <div className="p-flex p-items-center p-gap-2">
                                <div className="cal-detail-dot" style={{ background: selectedEvent.color }}></div>
                                <h3>{selectedEvent.title}</h3>
                            </div>
                            <div className="p-flex p-gap-2">
                                {selectedEvent.type === 'event' && (
                                    <button className="btn btn-danger p-text-xs" onClick={() => handleDeleteEvent(selectedEvent.sourceId)}>
                                        <Trash2 size={14} /> Delete
                                    </button>
                                )}
                                <button className="btn" onClick={() => setSelectedEvent(null)}><X size={20} /></button>
                            </div>
                        </div>
                        <div className="modal-body">
                            <div className="cal-detail-grid">
                                <div className="cal-detail-row">
                                    <Clock size={16} />
                                    <span>
                                        {dayjs(selectedEvent.start).format('MMM D, YYYY h:mm A')}
                                        {selectedEvent.start.getTime() !== selectedEvent.end.getTime() &&
                                            ` → ${dayjs(selectedEvent.end).format('MMM D, YYYY h:mm A')}`
                                        }
                                    </span>
                                </div>
                                <div className="cal-detail-row">
                                    <CalendarDays size={16} />
                                    <span className={`status-badge ${selectedEvent.type}`}>{selectedEvent.type}</span>
                                </div>
                                {selectedEvent.meta?.project && (
                                    <div className="cal-detail-row">
                                        <Briefcase size={16} />
                                        <span>{selectedEvent.meta.project.name}</span>
                                    </div>
                                )}
                                {selectedEvent.meta?.description && (
                                    <div className="cal-detail-section">
                                        <p>{selectedEvent.meta.description}</p>
                                    </div>
                                )}
                                {selectedEvent.meta?.attendees?.length > 0 && (
                                    <div className="cal-detail-section">
                                        <strong className="p-text-xs p-text-tertiary"><Users size={14} style={{ display: 'inline' }} /> Attendees</strong>
                                        <div className="cal-attendees">
                                            {selectedEvent.meta.attendees.map(a => (
                                                <div key={a.id} className="cal-attendee-chip">
                                                    <div className="cal-attendee-avatar">
                                                        {a.profilePicture ? (
                                                            <img src={a.profilePicture} alt="" />
                                                        ) : (
                                                            a.firstName?.[0] || '?'
                                                        )}
                                                    </div>
                                                    <span>{a.firstName} {a.lastName}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {selectedEvent.meta?.priority && (
                                    <div className="cal-detail-row">
                                        <span className={`status-badge ${selectedEvent.meta.priority.toLowerCase()}`}>
                                            Priority: {selectedEvent.meta.priority}
                                        </span>
                                    </div>
                                )}
                                {selectedEvent.meta?.column && (
                                    <div className="cal-detail-row">
                                        <span className="p-text-tertiary">Status: {selectedEvent.meta.column}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Event Modal */}
            {showCreateModal && (
                <CreateEventModal
                    projects={projects}
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => { setShowCreateModal(false); fetchCalendar(); }}
                />
            )}
        </div>
    );
}

// ─── Create Event Modal ──────────────────────────────
function CreateEventModal({ projects, onClose, onCreated }) {
    const [form, setForm] = useState({
        title: '',
        description: '',
        startDate: dayjs().format('YYYY-MM-DDTHH:mm'),
        endDate: dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
        allDay: false,
        type: 'meeting',
        color: '#8b5cf6',
        projectId: '',
        attendeeIds: []
    });
    const [members, setMembers] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // When a project is selected, load its members
    useEffect(() => {
        if (!form.projectId) { setMembers([]); return; }
        const loadMembers = async () => {
            try {
                const { data } = await api.get(`/projects/${form.projectId}`);
                setMembers((data.data?.partners || []).map(p => p.user));
            } catch { /* silent */ }
        };
        loadMembers();
    }, [form.projectId]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const toggleAttendee = (userId) => {
        setForm(prev => ({
            ...prev,
            attendeeIds: prev.attendeeIds.includes(userId)
                ? prev.attendeeIds.filter(id => id !== userId)
                : [...prev.attendeeIds, userId]
        }));
    };

    const handleSubmit = async () => {
        if (!form.title.trim()) { setError('Title is required'); return; }
        if (!form.startDate || !form.endDate) { setError('Start and end dates are required'); return; }
        setSaving(true);
        setError('');
        try {
            await api.post('/calendar/events', {
                ...form,
                projectId: form.projectId || null
            });
            onCreated();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create event');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-card" style={{ maxWidth: '550px' }}>
                <div className="modal-header">
                    <h3><CalendarDays size={20} style={{ marginRight: '8px' }} /> New Event</h3>
                    <button className="btn" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="modal-body p-flex-col p-gap-4">
                    {error && <div className="p-text-danger p-text-sm">{error}</div>}

                    <div>
                        <label className="form-label">Title <span className="p-text-danger">*</span></label>
                        <input className="form-input" name="title" value={form.title} onChange={handleChange} placeholder="Event title" />
                    </div>

                    <div>
                        <label className="form-label">Description</label>
                        <textarea className="form-input" name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Optional description" />
                    </div>

                    <div className="p-flex p-gap-3">
                        <div style={{ flex: 1 }}>
                            <label className="form-label">Start</label>
                            <input className="form-input" type="datetime-local" name="startDate" value={form.startDate} onChange={handleChange} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="form-label">End</label>
                            <input className="form-input" type="datetime-local" name="endDate" value={form.endDate} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="p-flex p-gap-3 p-items-center">
                        <label className="p-flex p-items-center p-gap-2 p-text-sm">
                            <input type="checkbox" name="allDay" checked={form.allDay} onChange={handleChange} /> All Day
                        </label>
                    </div>

                    <div className="p-flex p-gap-3">
                        <div style={{ flex: 1 }}>
                            <label className="form-label">Type</label>
                            <select className="form-input" name="type" value={form.type} onChange={(e) => {
                                const t = EVENT_TYPES.find(et => et.value === e.target.value);
                                setForm(prev => ({ ...prev, type: e.target.value, color: t?.color || prev.color }));
                            }}>
                                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="form-label">Color</label>
                            <div className="p-flex p-items-center p-gap-2">
                                <input type="color" name="color" value={form.color} onChange={handleChange} style={{ width: '40px', height: '36px', border: 'none', cursor: 'pointer' }} />
                                <span className="p-text-xs p-text-tertiary">{form.color}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Project (Optional)</label>
                        <select className="form-input" name="projectId" value={form.projectId} onChange={handleChange}>
                            <option value="">None</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    {members.length > 0 && (
                        <div>
                            <label className="form-label">Invite Attendees</label>
                            <div className="cal-member-grid">
                                {members.map(m => (
                                    <label key={m.id} className={`cal-member-chip ${form.attendeeIds.includes(m.id) ? 'selected' : ''}`}>
                                        <input type="checkbox" checked={form.attendeeIds.includes(m.id)} onChange={() => toggleAttendee(m.id)} style={{ display: 'none' }} />
                                        <div className="cal-attendee-avatar">
                                            {m.profilePicture ? <img src={m.profilePicture} alt="" /> : (m.firstName?.[0] || '?')}
                                        </div>
                                        <span className="p-text-xs">{m.firstName}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary p-flex p-items-center p-gap-2" onClick={handleSubmit} disabled={saving}>
                        {saving ? <Loader size={14} className="spinning" /> : <Save size={16} />}
                        {saving ? 'Creating...' : 'Create Event'}
                    </button>
                </div>
            </div>
        </div>
    );
}
