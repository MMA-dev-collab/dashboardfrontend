import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Hash, MessageSquare, Users, User } from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../store/useAuthStore';
import '../Shared.css';
import './InternalChat.css';

export default function InternalChat() {
    const { user, token } = useAuthStore();
    const [searchParams] = useSearchParams();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');

    // Room states: 'global', { type: 'project', id: '...' }, { type: 'dm', id: '...' }
    // Initialize from URL params so deep links work without race conditions
    const getInitialRoom = () => {
        const type = searchParams.get('type');
        const id = searchParams.get('id');
        if (type && id) return { type, id };
        return { type: 'global', id: 'global' };
    };
    const [currentRoom, setCurrentRoom] = useState(getInitialRoom);

    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);

    // Mentions state
    const [showMentions, setShowMentions] = useState(false);
    const [mentionFilter, setMentionFilter] = useState('');

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // If URL params change while already on the page (e.g. clicking another notification)
    useEffect(() => {
        const type = searchParams.get('type');
        const id = searchParams.get('id');
        if (type && id) {
            setCurrentRoom(prev => {
                if (prev.type === type && prev.id === id) return prev;
                return { type, id };
            });
        }
    }, [searchParams]);

    // Initial Data Fetch
    useEffect(() => {
        Promise.all([
            api.get('/projects').catch(() => ({ data: { data: [] } })),
            // Fetch users list for DM list
            api.get('/users').catch(() => ({ data: { data: [] } }))
        ]).then(([projRes, usersRes]) => {
            setProjects(projRes.data.data || []);
            // Exclude current user from DM list
            setUsers((usersRes.data.data || []).filter(u => u.id !== user?.id));
        });
    }, [user?.id]);

    // Connect to SSE for realtime messages
    useEffect(() => {
        const tokenStr = sessionStorage.getItem('accessToken');
        if (!tokenStr) return;

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const sseUrl = `${apiUrl}/chat/stream?token=${tokenStr}`;

        const eventSource = new EventSource(sseUrl);

        eventSource.onopen = () => console.log('⚡ Chat SSE stream connected');

        eventSource.onmessage = (event) => {
            try {
                const newMsg = JSON.parse(event.data);

                setMessages(prev => {
                    const isGlobalMsg = !newMsg.projectId && !newMsg.receiverId;
                    const isProjectMsg = newMsg.projectId === currentRoom.id && currentRoom.type === 'project';
                    // DM: The message is between the current room's target user and us
                    const isDMMsg = currentRoom.type === 'dm' &&
                        ((newMsg.userId === user?.id && newMsg.receiverId === currentRoom.id) ||
                            (newMsg.userId === currentRoom.id && newMsg.receiverId === user?.id));

                    if ((currentRoom.type === 'global' && isGlobalMsg) || isProjectMsg || isDMMsg) {
                        if (prev.find(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    }
                    return prev;
                });
            } catch (err) {
                console.error('Error parsing SSE message', err);
            }
        };

        return () => eventSource.close();
    }, [token, currentRoom, user?.id]);

    // Fetch history when room changes
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const params = {};
                if (currentRoom.type === 'project') params.projectId = currentRoom.id;
                if (currentRoom.type === 'dm') params.receiverId = currentRoom.id;

                const { data } = await api.get('/chat/messages', { params });
                setMessages(data.data || []);
            } catch (_) { }
        };
        fetchHistory();
    }, [currentRoom]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle Mention detection while typing
    const handleInputChange = (e) => {
        const val = e.target.value;
        setInput(val);

        // Find if we are currently typing a mention
        const cursorPosition = e.target.selectionStart;
        const textBeforeCursor = val.substring(0, cursorPosition);
        const match = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);

        if (match) {
            setShowMentions(true);
            setMentionFilter(match[1].toLowerCase());
        } else {
            setShowMentions(false);
        }
    };

    const insertMention = (userToMention) => {
        const cursorPosition = inputRef.current.selectionStart;
        const textBeforeCursor = input.substring(0, cursorPosition);
        const textAfterCursor = input.substring(cursorPosition);

        // Replace the partial @name with the full mention
        const newTextBefore = textBeforeCursor.replace(/@([a-zA-Z0-9_]*)$/, `@${userToMention.firstName} `);

        setInput(newTextBefore + textAfterCursor);
        setShowMentions(false);
        inputRef.current.focus();
    };

    const sendMessage = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!input.trim()) return;

        const content = input.trim();
        setInput('');
        setShowMentions(false);

        // Basic Mention extraction
        const words = content.split(' ');
        const mentions = [];
        words.forEach(w => {
            if (w.startsWith('@')) {
                const name = w.substring(1).toLowerCase();
                const matchedUser = [...users, user].find(u => u.firstName?.toLowerCase() === name || u.lastName?.toLowerCase() === name);
                if (matchedUser) mentions.push(matchedUser.id);
            }
        });

        const payload = { content, mentions };
        if (currentRoom.type === 'project') payload.projectId = currentRoom.id;
        if (currentRoom.type === 'dm') payload.receiverId = currentRoom.id;

        try {
            await api.post('/chat/messages', payload);
        } catch (err) {
            console.error('Failed to send message', err);
            setInput(content);
        }
    };

    const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const getRoomTitle = () => {
        if (currentRoom.type === 'global') return 'General';
        if (currentRoom.type === 'project') return projects.find(p => p.id === currentRoom.id)?.name || 'Project Channel';
        if (currentRoom.type === 'dm') {
            const u = users.find(u => u.id === currentRoom.id);
            return u ? `${u.firstName} ${u.lastName}` : 'Direct Message';
        }
        return 'Channel';
    };

    const filteredMentionUsers = [...users, user].filter(u =>
        u?.firstName?.toLowerCase().includes(mentionFilter) ||
        u?.lastName?.toLowerCase().includes(mentionFilter)
    );

    return (
        <div className="chat-page fade-in">
            <div className="chat-layout p-border p-rounded-lg p-bg-white p-shadow-sm" style={{ height: 'calc(100vh - 140px)', display: 'flex' }}>

                {/* Sidebar */}
                <aside className="chat-sidebar p-border-r p-bg-light" style={{ width: '280px', display: 'flex', flexDirection: 'column' }}>
                    <div className="p-p-4 p-border-b p-font-bold p-flex p-items-center p-gap-2">
                        <MessageSquare size={18} className="p-text-primary" />
                        Chat & DMs
                    </div>

                    <div className="p-flex-col p-overflow-y-auto" style={{ flex: 1 }}>
                        <div className="p-p-3">
                            <h4 className="p-text-xs p-text-tertiary p-font-bold p-uppercase p-mb-2 p-px-2">Channels</h4>
                            <button
                                className={`btn p-w-full p-text-left p-flex p-items-center p-gap-2 p-p-2 p-rounded-lg ${currentRoom.type === 'global' ? 'p-bg-primary-light p-text-primary p-font-bold' : 'p-text-text'}`}
                                onClick={() => setCurrentRoom({ type: 'global', id: 'global' })}
                                style={{ border: 'none' }}
                            >
                                <Hash size={16} /> General
                            </button>
                            {projects.map(p => (
                                <button
                                    key={p.id}
                                    className={`btn p-w-full p-text-left p-flex p-items-center p-gap-2 p-p-2 p-rounded-lg p-mt-1 ${currentRoom.type === 'project' && currentRoom.id === p.id ? 'p-bg-primary-light p-text-primary p-font-bold' : 'p-text-text'}`}
                                    onClick={() => setCurrentRoom({ type: 'project', id: p.id })}
                                    style={{ border: 'none' }}
                                >
                                    <Hash size={16} /> <span className="p-truncate">{p.name}</span>
                                </button>
                            ))}
                        </div>

                        <div className="p-p-3 p-border-t">
                            <h4 className="p-text-xs p-text-tertiary p-font-bold p-uppercase p-mb-2 p-px-2 p-flex p-justify-between">
                                Direct Messages
                                <span className="p-bg-card p-rounded-lg p-px-1" style={{ fontSize: '10px' }}>{users.length}</span>
                            </h4>
                            {users.map(u => (
                                <button
                                    key={u.id}
                                    className={`btn p-w-full p-text-left p-flex p-items-center p-gap-2 p-p-2 p-rounded-lg p-mt-1 ${currentRoom.type === 'dm' && currentRoom.id === u.id ? 'p-bg-primary-light p-text-primary p-font-bold' : 'p-text-text'}`}
                                    onClick={() => setCurrentRoom({ type: 'dm', id: u.id })}
                                    style={{ border: 'none' }}
                                >
                                    <div className="p-w-6 p-h-6 p-rounded-full p-bg-secondary p-text-white p-flex p-items-center p-justify-center p-text-xs p-shrink-0" style={{ overflow: 'hidden' }}>
                                        {u.profilePicture ? (
                                            <img src={u.profilePicture} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            u.firstName?.charAt(0) || '?'
                                        )}
                                    </div>
                                    <span className="p-truncate">{u.firstName} {u.lastName}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Main Chat Area */}
                <main className="chat-main p-flex-col" style={{ flex: 1, position: 'relative' }}>

                    {/* Header */}
                    <div className="p-p-4 p-border-b p-font-bold p-flex p-items-center p-gap-2">
                        {currentRoom.type === 'dm' ? <User size={18} className="p-text-primary" /> : <Hash size={18} className="p-text-primary" />}
                        {getRoomTitle()}
                    </div>

                    {/* Messages Feed */}
                    <div className="chat-messages p-p-4 p-overflow-y-auto" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', background: '#fafafa' }}>
                        {messages.map((msg, i) => {
                            const isOwn = msg.user?.id === user?.id || msg.userId === user?.id;

                            // Basic logic to highlight @mentions
                            const renderContent = () => {
                                const parts = msg.content.split(/(@[a-zA-Z0-9_-]+)/g);
                                return parts.map((part, index) => {
                                    if (part.startsWith('@')) {
                                        return <strong key={index} style={{ color: isOwn ? '#bfdbfe' : 'var(--primary)', cursor: 'pointer' }}>{part}</strong>;
                                    }
                                    return part;
                                });
                            };

                            return (
                                <div key={msg.id || i} className={`p-flex p-gap-3 ${isOwn ? 'p-flex-row-reverse' : ''}`} style={{ maxWidth: '85%', alignSelf: isOwn ? 'flex-end' : 'flex-start' }}>
                                    {!isOwn && (
                                        <div className="p-w-8 p-h-8 p-rounded-full p-bg-primary p-text-white p-flex p-items-center p-justify-center p-text-sm p-font-bold p-shrink-0" style={{ overflow: 'hidden' }}>
                                            {msg.user?.profilePicture ? (
                                                <img src={msg.user.profilePicture} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                msg.user?.firstName?.charAt(0) || '?'
                                            )}
                                        </div>
                                    )}
                                    <div className={`p-flex-col ${isOwn ? 'p-items-end' : 'p-items-start'}`}>
                                        {!isOwn && <span className="p-text-xs p-text-tertiary p-mb-1 p-ml-1 p-font-medium">{msg.user?.firstName} {msg.user?.lastName}</span>}
                                        <div className={`p-p-3 p-rounded-lg p-text-sm ${isOwn ? 'p-bg-primary p-text-white' : 'p-bg-white p-border'}`} style={{ borderBottomRightRadius: isOwn ? 0 : '0.5rem', borderBottomLeftRadius: !isOwn ? 0 : '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                            <p className="m-0" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>
                                                {renderContent()}
                                            </p>
                                        </div>
                                        <span className={`p-text-xs p-text-tertiary p-mt-1 ${isOwn ? 'p-mr-1' : 'p-ml-1'}`}>{fmtTime(msg.createdAt)}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {messages.length === 0 && (
                            <div className="p-flex-col p-items-center p-justify-center p-text-tertiary" style={{ height: '100%' }}>
                                <MessageSquare size={48} className="p-mb-4 p-opacity-50" />
                                <p>No messages yet. Start the conversation!</p>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-p-4 p-border-t p-bg-white" style={{ position: 'relative' }}>

                        {/* Mentions Autocomplete Popup */}
                        {showMentions && filteredMentionUsers.length > 0 && (
                            <div className="p-absolute p-bg-white p-border p-shadow-lg p-rounded-lg p-overflow-y-auto"
                                style={{ bottom: 'calc(100% + 10px)', left: '1rem', width: '250px', maxHeight: '200px', zIndex: 10 }}>
                                <div className="p-text-xs p-text-tertiary p-font-bold p-p-2 p-border-b p-bg-light">Mentions</div>
                                {filteredMentionUsers.map(u => (
                                    <button
                                        key={u.id}
                                        className="btn p-w-full p-text-left p-p-2 p-flex p-items-center p-gap-3 p-hover-bg-light"
                                        style={{ border: 'none', borderRadius: 0, borderBottom: '1px solid var(--border-light)' }}
                                        onClick={() => insertMention(u)}
                                        type="button"
                                    >
                                        <div className="p-w-6 p-h-6 p-bg-primary p-text-white p-text-xs p-flex p-items-center p-justify-center p-rounded-full p-shrink-0">
                                            {u.firstName?.charAt(0) || '?'}
                                        </div>
                                        <span className="p-text-sm">{u.firstName} {u.lastName}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <form className="p-flex p-gap-2 p-items-end" onSubmit={sendMessage}>
                            <textarea
                                ref={inputRef}
                                className="form-input"
                                value={input}
                                onChange={handleInputChange}
                                placeholder={currentRoom.type === 'dm' ? "Type a direct message... (use @name to mention users)" : "Type a message... (use @name to mention users)"}
                                style={{ flex: 1, minHeight: '44px', maxHeight: '120px', resize: 'none', paddingTop: '10px' }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage(e);
                                    }
                                }}
                            />
                            <button type="submit" className="btn btn-primary p-flex p-items-center p-justify-center" style={{ width: '44px', height: '44px', padding: 0 }} disabled={!input.trim()}>
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}
