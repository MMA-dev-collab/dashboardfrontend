import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Paperclip, CornerDownLeft, FileText, Loader, X } from 'lucide-react';
import api from '../../api/client';
import { Button } from "@/components/ui/button";
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from "@/components/ui/chat-bubble";
import { ChatInput } from "@/components/ui/chat-input";
import { ExpandableChat, ExpandableChatHeader, ExpandableChatBody, ExpandableChatFooter } from "@/components/ui/expandable-chat";
import { ChatMessageList } from "@/components/ui/chat-message-list";

// --- Markdown Rendering Component (inline) ---
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

export default function AiChat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);

    // @document autocomplete state
    const [showDocSearch, setShowDocSearch] = useState(false);
    const [docQuery, setDocQuery] = useState('');
    const [docResults, setDocResults] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [docSearching, setDocSearching] = useState(false);

    const inputRef = useRef(null);

    // Load history once
    useEffect(() => {
        if (!historyLoaded) {
            loadHistory();
        }
    }, [historyLoaded]);

    const loadHistory = async () => {
        try {
            const { data } = await api.get('/ai/history');
            setMessages((data.data || []).map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                metadata: m.metadata ? JSON.parse(m.metadata) : null,
            })));
            setHistoryLoaded(true);
        } catch (err) {
            console.error('Failed to load AI history', err);
        }
    };

    // @document search
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

    // Handle input changes — detect @ trigger
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
            const payload = { message: text || `Analyze the attached document: ${selectedDoc?.name} ` };
            if (selectedDoc) payload.documentId = selectedDoc.id;

            const { data } = await api.post('/ai/chat', payload);
            const assistantMsg = {
                id: Date.now() + 1,
                role: 'assistant',
                content: data.data.message,
                metadata: { toolsUsed: data.data.toolsUsed },
            };
            setMessages(prev => [...prev, assistantMsg]);
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

    return (
        <ExpandableChat size="lg" position="bottom-right" icon={<Bot className="h-6 w-6" />}>
            <ExpandableChatHeader className="flex-col text-center justify-center bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-t-lg">
                <h1 className="text-xl font-semibold flex items-center justify-center gap-2">
                    <Bot size={22} /> EgyCodera AI ✨
                </h1>
                <p className="text-xs opacity-90">Ask me anything about your projects and tasks</p>
            </ExpandableChatHeader>

            <ExpandableChatBody>
                <ChatMessageList smooth>
                    {messages.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center text-center p-8 text-muted-foreground h-full">
                            <Bot className="h-12 w-12 text-indigo-400 opacity-50 mb-4" />
                            <p className="text-sm">Hi! How can I help you today?</p>
                            <div className="mt-4 flex flex-col gap-2 w-full max-w-xs">
                                {['What are my tasks?', 'Show my wallet balance'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => { setInput(s); inputRef.current?.focus(); }}
                                        className="text-xs bg-muted hover:bg-muted/80 py-2 px-3 rounded text-left transition-colors"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((message) => (
                        <ChatBubble key={message.id} variant={message.role === "user" ? "sent" : "received"}>
                            <ChatBubbleAvatar
                                className="h-8 w-8 shrink-0"
                                src={message.role === "user" ? undefined : undefined}
                                fallback={message.role === "user" ? "Me" : "AI"}
                            />
                            <ChatBubbleMessage variant={message.role === "user" ? "sent" : "received"}>
                                {message.doc && (
                                    <div className="flex items-center gap-2 text-[10px] bg-white/20 px-2 py-1 rounded w-fit mb-2">
                                        <FileText size={12} /> {message.doc.name}
                                    </div>
                                )}
                                <div className="text-sm">
                                    {formatMarkdown(message.content)}
                                </div>
                                {message.metadata?.toolsUsed?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {message.metadata.toolsUsed.map((t, i) => (
                                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">{t}</span>
                                        ))}
                                    </div>
                                )}
                            </ChatBubbleMessage>
                        </ChatBubble>
                    ))}

                    {loading && (
                        <ChatBubble variant="received">
                            <ChatBubbleAvatar className="h-8 w-8 shrink-0" fallback="AI" />
                            <ChatBubbleMessage isLoading />
                        </ChatBubble>
                    )}
                </ChatMessageList>
            </ExpandableChatBody>

            <ExpandableChatFooter>
                {selectedDoc && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-indigo-50/50 dark:bg-indigo-950/20 border rounded-md text-xs text-indigo-600 dark:text-indigo-400">
                        <FileText size={14} />
                        <span className="flex-1 truncate font-medium">{selectedDoc.name}</span>
                        <button onClick={() => setSelectedDoc(null)} className="hover:text-red-500"><X size={14} /></button>
                    </div>
                )}

                <form onSubmit={sendMessage} className="relative rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring p-1 shadow-sm">
                    {/* @Document Dropdown */}
                    {showDocSearch && (
                        <div className="absolute bottom-full mb-2 left-0 right-0 bg-background border shadow-lg rounded-md overflow-hidden z-10 max-h-48 overflow-y-auto">
                            <div className="sticky top-0 bg-muted px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Documents</div>
                            {docSearching ? (
                                <div className="p-3 text-xs text-center flex justify-center items-center gap-2"><Loader size={12} className="animate-spin" /> Searching...</div>
                            ) : docResults.length === 0 ? (
                                <div className="p-3 text-xs text-center text-muted-foreground">No documents found</div>
                            ) : (
                                <div className="flex flex-col">
                                    {docResults.map(d => (
                                        <button key={d.id} onClick={() => selectDocument(d)} className="flex items-center gap-3 p-2 text-left hover:bg-muted/50 transition-colors">
                                            <FileText size={14} className="text-indigo-400" />
                                            <div className="truncate flex-1">
                                                <div className="text-sm font-medium leading-none">{d.name}</div>
                                                <div className="text-[10px] text-muted-foreground mt-1">{d.project?.name}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <ChatInput
                        ref={inputRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message or type @ to attach a document..."
                        className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0"
                    />
                    <div className="flex items-center p-3 pt-0 justify-between">
                        <div className="flex">
                            <Button variant="ghost" size="icon" type="button" onClick={() => { setInput(prev => prev + '@'); inputRef.current?.focus(); }}>
                                <Paperclip className="size-4 opacity-70" />
                            </Button>
                        </div>
                        <Button type="submit" size="sm" className="ml-auto gap-1.5" disabled={loading || (!input.trim() && !selectedDoc)}>
                            Send
                            <CornerDownLeft className="size-3.5" />
                        </Button>
                    </div>
                </form>
            </ExpandableChatFooter>
        </ExpandableChat>
    );
}
