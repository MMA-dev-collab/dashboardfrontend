import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Paperclip, CornerDownLeft, FileText, Loader, X, PlusCircle, MessageSquare, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { Button } from "@/components/ui/button";
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from "@/components/ui/chat-bubble";
import { ChatInput } from "@/components/ui/chat-input";
import { ChatMessageList } from "@/components/ui/chat-message-list";

function formatMarkdown(text) {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
        let parsedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        if (parsedLine.trim().startsWith('- ') || parsedLine.trim().startsWith('• ')) {
            return <div key={i} className="pl-4 border-l-2 border-indigo-200" dangerouslySetInnerHTML={{ __html: '• ' + parsedLine.trim().substring(2) }} />;
        }
        if (parsedLine.trim().startsWith('### ')) {
            return <h5 key={i} className="font-semibold text-sm mt-2 mb-1" dangerouslySetInnerHTML={{ __html: parsedLine.trim().substring(4) }} />;
        }
        if (parsedLine.trim().startsWith('## ')) {
            return <h4 key={i} className="font-bold text-base mt-3 mb-2" dangerouslySetInnerHTML={{ __html: parsedLine.trim().substring(3) }} />;
        }
        if (parsedLine.trim() === '') return <br key={i} />;
        return <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: parsedLine }} />;
    });
}

export default function AiChatPage() {
    // Thread state
    const [threads, setThreads] = useState([]);
    const [activeThreadId, setActiveThreadId] = useState(null);
    const [threadsLoaded, setThreadsLoaded] = useState(false);

    // Chat state
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [messagesLoading, setMessagesLoading] = useState(false);

    // @document autocomplete state
    const [showDocSearch, setShowDocSearch] = useState(false);
    const [docQuery, setDocQuery] = useState('');
    const [docResults, setDocResults] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [docSearching, setDocSearching] = useState(false);

    const inputRef = useRef(null);

    // ─── Load threads on mount ───────────────
    useEffect(() => {
        loadThreads();
    }, []);

    const loadThreads = async () => {
        try {
            const { data } = await api.get('/ai/threads');
            setThreads(data.data || []);
            setThreadsLoaded(true);
        } catch (err) {
            console.error('Failed to load threads', err);
            setThreadsLoaded(true);
        }
    };

    // ─── Load messages when active thread changes ───
    useEffect(() => {
        if (activeThreadId) {
            loadThreadMessages(activeThreadId);
        } else {
            setMessages([]);
        }
    }, [activeThreadId]);

    const loadThreadMessages = async (threadId) => {
        setMessagesLoading(true);
        try {
            const { data } = await api.get(`/ai/threads/${threadId}/messages`);
            setMessages((data.data || []).map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                metadata: m.metadata ? JSON.parse(m.metadata) : null,
                createdAt: m.createdAt,
            })));
        } catch (err) {
            console.error('Failed to load thread messages', err);
            setMessages([]);
        } finally {
            setMessagesLoading(false);
        }
    };

    // ─── Create new thread ───────────────────
    const createNewThread = async () => {
        try {
            const { data } = await api.post('/ai/threads', { title: 'New Chat' });
            const newThread = data.data;
            setThreads(prev => [newThread, ...prev]);
            setActiveThreadId(newThread.id);
            setMessages([]);
            setInput('');
            setSelectedDoc(null);
            setShowDocSearch(false);
            inputRef.current?.focus();
        } catch (err) {
            console.error('Failed to create thread', err);
        }
    };

    // ─── Delete thread ───────────────────────
    const deleteThread = async (threadId, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this conversation? This cannot be undone.')) return;
        try {
            await api.delete(`/ai/threads/${threadId}`);
            setThreads(prev => prev.filter(t => t.id !== threadId));
            if (activeThreadId === threadId) {
                setActiveThreadId(null);
                setMessages([]);
            }
        } catch (err) {
            console.error('Failed to delete thread', err);
        }
    };

    // ─── Switch thread ───────────────────────
    const switchThread = (threadId) => {
        if (threadId === activeThreadId) return;
        setActiveThreadId(threadId);
        setInput('');
        setSelectedDoc(null);
        setShowDocSearch(false);
    };

    // ─── Document search ─────────────────────
    const searchDocs = useCallback(async (q) => {
        setDocSearching(true);
        try {
            const { data } = await api.get(`/ai/documents/search?q=${encodeURIComponent(q)}`);
            setDocResults(data.data || []);
        } catch {
            setDocResults([]);
        } finally {
            setDocSearching(false);
        }
    }, []);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setInput(value);

        const atIndex = value.lastIndexOf('@');
        if (atIndex !== -1 && atIndex === value.length - 1) {
            setShowDocSearch(true);
            setDocQuery('');
            searchDocs('');
        } else if (showDocSearch) {
            const afterAt = value.substring(value.lastIndexOf('@') + 1);
            if (afterAt.includes(' ') || value.lastIndexOf('@') === -1) {
                setShowDocSearch(false);
            } else {
                setDocQuery(afterAt);
                searchDocs(afterAt);
            }
        }
    };

    const selectDocument = (doc) => {
        setSelectedDoc(doc);
        setShowDocSearch(false);
        const atIndex = input.lastIndexOf('@');
        setInput(input.substring(0, atIndex).trim());
        inputRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(e);
        }
    };

    // ─── Send message ────────────────────────
    const sendMessage = async (e) => {
        e?.preventDefault();
        const text = input.trim();
        if (!text && !selectedDoc) return;
        if (loading) return;

        const userMsg = { id: Date.now(), role: 'user', content: text, doc: selectedDoc };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const payload: Record<string, any> = {
                message: text || `Analyze the attached document: ${selectedDoc?.name}`,
            };
            if (selectedDoc) payload.documentId = selectedDoc.id;
            if (activeThreadId) payload.threadId = activeThreadId;

            const { data } = await api.post('/ai/chat', payload);
            const assistantMsg = {
                id: Date.now() + 1,
                role: 'assistant',
                content: data.data.message,
                metadata: { toolsUsed: data.data.toolsUsed },
            };
            setMessages(prev => [...prev, assistantMsg]);

            // If a new thread was auto-created by the backend
            const returnedThreadId = data.data.threadId;
            if (!activeThreadId && returnedThreadId) {
                setActiveThreadId(returnedThreadId);
                // Refresh thread list to show the new thread
                loadThreads();
            } else if (returnedThreadId) {
                // Update thread list to reflect new updatedAt
                setThreads(prev =>
                    prev.map(t =>
                        t.id === returnedThreadId
                            ? { ...t, updatedAt: new Date().toISOString() }
                            : t
                    ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                );
            }
        } catch (err) {
            const errorMsg = {
                id: Date.now() + 1,
                role: 'assistant',
                content: `⚠️ Sorry, I encountered an error. ${err.response?.data?.message || 'Please try again.'}`,
                isError: true,
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
            setSelectedDoc(null);
        }
    };

    // ─── Render ──────────────────────────────
    return (
        <div className="flex h-[calc(100vh-160px)] w-full bg-background overflow-hidden border rounded-xl shadow-sm">
            {/* Sidebar */}
            <div className="w-72 border-r bg-muted/10 hidden md:flex flex-col">
                <div className="p-4">
                    <Button onClick={createNewThread} variant="outline" className="w-full justify-start gap-2 bg-background border-dashed hover:bg-indigo-500/5 hover:border-indigo-500/30 hover:text-indigo-600 transition-all">
                        <PlusCircle size={16} />
                        New Chat
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-2">
                    <h3 className="text-[10px] font-bold text-muted-foreground px-3 mb-2 uppercase tracking-widest opacity-60">Conversations</h3>
                    {!threadsLoaded ? (
                        <div className="flex items-center justify-center p-6">
                            <Loader size={16} className="animate-spin text-muted-foreground" />
                        </div>
                    ) : threads.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-3 italic">No conversations yet</p>
                    ) : (
                        <div className="space-y-1">
                            {threads.map(thread => (
                                <div
                                    key={thread.id}
                                    onClick={() => switchThread(thread.id)}
                                    className={`w-full text-left px-3 py-2.5 text-sm rounded-lg flex items-center gap-2 cursor-pointer transition-all group ${thread.id === activeThreadId
                                            ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/15'
                                            : 'hover:bg-muted/60 text-foreground/80'
                                        }`}
                                >
                                    <MessageSquare size={14} className={`shrink-0 ${thread.id === activeThreadId ? 'text-indigo-500' : 'opacity-40 group-hover:opacity-70'}`} />
                                    <span className="truncate flex-1 font-medium">{thread.title}</span>
                                    <button
                                        onClick={(e) => deleteThread(thread.id, e)}
                                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-red-500 p-1 rounded-md transition-all shrink-0"
                                        title="Delete conversation"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-border">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                            <Bot size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <div className="text-sm font-bold">EgyCodera AI</div>
                            <div className="text-[10px] text-muted-foreground font-medium">{threads.length} conversation{threads.length !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col relative bg-background min-h-0">
                <ChatMessageList smooth className="flex-1 px-4 py-6">
                    {/* Empty state: no active thread or no messages */}
                    {!activeThreadId && !loading && messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-center p-8 text-muted-foreground h-full">
                            <div className="h-20 w-20 rounded-2xl bg-indigo-500/5 flex items-center justify-center mb-6">
                                <Bot className="h-10 w-10 text-indigo-500/50" />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground mb-3">Welcome to EgyCodera AI</h2>
                            <p className="text-sm max-w-sm leading-relaxed mb-10">Start a new conversation or select one from the sidebar. I can analyze projects, manage tasks, and summarize documents.</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                                {[
                                    'What are my highest priority tasks?',
                                    'Summarize active projects status',
                                    'Check my wallet balance & income',
                                    'What is on my calendar for today?'
                                ].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => { setInput(s); inputRef.current?.focus(); }}
                                        className="text-sm bg-muted/30 hover:bg-muted/60 border border-border/50 py-5 px-6 rounded-2xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <div className="font-semibold text-foreground/80">{s}</div>
                                        <div className="text-[10px] text-muted-foreground mt-1">Dashboard Insight</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Loading messages for thread */}
                    {messagesLoading && (
                        <div className="flex items-center justify-center h-full">
                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                <Loader size={24} className="animate-spin text-indigo-500" />
                                <span className="text-sm">Loading conversation...</span>
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    {!messagesLoading && (
                        <div className="max-w-4xl mx-auto w-full space-y-6">
                            {messages.map((message) => (
                                <ChatBubble key={message.id} variant={message.role === "user" ? "sent" : "received"}>
                                    <ChatBubbleAvatar
                                        className="h-9 w-9 shrink-0 shadow-sm"
                                        fallback={message.role === "user" ? "ME" : "AI"}
                                    />
                                    <ChatBubbleMessage variant={message.role === "user" ? "sent" : "received"} className="max-w-3xl rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-sm">
                                        {message.doc && (
                                            <div className="flex items-center gap-2 text-[11px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-3 py-2 rounded-xl w-fit mb-4 font-bold text-indigo-600 dark:text-indigo-400">
                                                <FileText size={14} /> Attachment: {message.doc.name}
                                            </div>
                                        )}
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            {formatMarkdown(message.content)}
                                        </div>
                                        {message.metadata?.toolsUsed?.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-black/5 dark:border-white/5">
                                                {message.metadata.toolsUsed.map((t, i) => (
                                                    <span key={i} className="text-[9px] uppercase tracking-tighter px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 font-bold">✓ {t}</span>
                                                ))}
                                            </div>
                                        )}
                                    </ChatBubbleMessage>
                                </ChatBubble>
                            ))}

                            {loading && (
                                <ChatBubble variant="received">
                                    <ChatBubbleAvatar className="h-9 w-9 shrink-0 shadow-sm" fallback="AI" />
                                    <ChatBubbleMessage isLoading className="rounded-2xl px-5 py-4 shadow-sm" />
                                </ChatBubble>
                            )}
                        </div>
                    )}
                </ChatMessageList>

                {/* Input Area */}
                <div className="p-6 bg-background/50 backdrop-blur-md border-t border-border/30">
                    <div className="max-w-4xl mx-auto w-full relative">
                        {selectedDoc && (
                            <div className="flex items-center gap-3 mb-3 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl text-[13px] text-indigo-600 dark:text-indigo-400">
                                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                    <FileText size={18} />
                                </div>
                                <span className="flex-1 truncate font-bold">Document Attached: {selectedDoc.name}</span>
                                <button onClick={() => setSelectedDoc(null)} className="hover:bg-red-500/10 hover:text-red-500 p-2 rounded-xl transition-colors"><X size={16} /></button>
                            </div>
                        )}

                        {/* @Document Dropdown */}
                        {showDocSearch && (
                            <div className="absolute bottom-full mb-3 left-0 w-80 bg-background border shadow-2xl rounded-2xl overflow-hidden z-20 max-h-72 ring-1 ring-black/5">
                                <div className="sticky top-0 bg-muted/90 backdrop-blur px-5 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50">Documents</div>
                                {docSearching ? (
                                    <div className="p-6 text-sm text-center flex flex-col items-center gap-2 italic text-muted-foreground"><Loader size={20} className="animate-spin text-indigo-500" /> Searching...</div>
                                ) : docResults.length === 0 ? (
                                    <div className="p-6 text-sm text-center text-muted-foreground italic">No documents found</div>
                                ) : (
                                    <div className="flex flex-col py-2">
                                        {docResults.map(d => (
                                            <button key={d.id} onClick={() => selectDocument(d)} className="flex items-center gap-4 px-5 py-3.5 text-left hover:bg-muted/80 transition-all border-b border-border/20 last:border-0 group">
                                                <div className="h-9 w-9 rounded-xl bg-indigo-500/5 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                                    <FileText size={18} />
                                                </div>
                                                <div className="truncate flex-1">
                                                    <div className="text-[13px] font-bold text-foreground/90 group-hover:text-foreground">{d.name}</div>
                                                    <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{d.project?.name || 'Shared'}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <form onSubmit={sendMessage} className="relative rounded-3xl border border-border/60 bg-background shadow-xl ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 transition-all duration-300 overflow-hidden">
                            <ChatInput
                                ref={inputRef}
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder={activeThreadId ? "Type a message... (@ for docs)" : "Start a new conversation..."}
                                className="min-h-[70px] max-h-[220px] resize-none border-0 px-6 py-5 shadow-none focus-visible:ring-0 text-base font-medium placeholder:text-muted-foreground/50"
                            />
                            <div className="flex items-center px-6 pb-4 justify-between bg-background">
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" type="button" onClick={() => { setInput(prev => prev + '@'); inputRef.current?.focus(); }} className="h-10 w-10 rounded-xl hover:bg-indigo-500/5 hover:text-indigo-600 transition-colors" title="Attach Document">
                                        <Paperclip className="size-5" />
                                    </Button>
                                </div>
                                <Button type="submit" size="sm" className="rounded-xl px-6 h-10 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95" disabled={loading || (!input.trim() && !selectedDoc)}>
                                    Send
                                    <CornerDownLeft className="size-4 ml-2 opacity-80" />
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
