import { useState, useEffect } from 'react';
import { Plus, Search, BookOpen, Tag, User, X, Edit2, Trash2, ChevronRight } from 'lucide-react';
import api from '../../api/client';
import '../Shared.css';
import './KnowledgeBase.css';

export default function KnowledgeBase() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selected, setSelected] = useState(null);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({ title: '', content: '', category: 'general', tags: '' });

    useEffect(() => { fetchArticles(); }, []);

    const fetchArticles = async () => {
        try {
            const params = {};
            if (search) params.search = search;
            const { data } = await api.get('/knowledge', { params });
            setArticles(data.data || []);
        } catch (_) { }
        setLoading(false);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/knowledge', form);
            setShowForm(false);
            setForm({ title: '', content: '', category: 'general', tags: '' });
            fetchArticles();
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this article?')) return;
        try { await api.delete(`/knowledge/${id}`); fetchArticles(); setSelected(null); }
        catch (err) { alert('Error'); }
    };

    const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const viewArticle = async (id) => {
        try {
            const { data } = await api.get(`/knowledge/${id}`);
            setSelected(data.data);
        } catch (_) { }
    };

    return (
        <div className="kb-page fade-in">
            <header className="page-header">
                <div className="header-left">
                    <h1 className="page-title">Knowledge Base</h1>
                    <p className="page-subtitle">Central wiki for company documentation and resources.</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <Plus size={18} /> New Article
                    </button>
                </div>
            </header>

            <div className="filter-bar">
                <div className="search-field">
                    <Search size={18} className="icon" />
                    <input type="text" placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchArticles()} />
                </div>
            </div>

            {loading ? (
                <div className="loading-spinner"><div className="spinner" /><span>Loading...</span></div>
            ) : (
                <div className="kb-grid">
                    {articles.map(a => (
                        <div key={a.id} className="kb-card" onClick={() => viewArticle(a.id)}>
                            <div className="kb-card-header">
                                <BookOpen size={18} className="text-primary" />
                                <span className="status-badge blue">{a.category}</span>
                            </div>
                            <h3 className="kb-card-title">{a.title}</h3>
                            <p className="kb-card-excerpt">{a.content?.substring(0, 120)}...</p>
                            <div className="kb-card-footer">
                                <div className="partner-cell">
                                    <div className="avatar micro">{a.author?.firstName?.charAt(0)}</div>
                                    <span className="text-xs">{a.author?.firstName} {a.author?.lastName}</span>
                                </div>
                                <span className="text-xs text-tertiary">{fmtDate(a.updatedAt)}</span>
                            </div>
                        </div>
                    ))}
                    {articles.length === 0 && (
                        <div className="empty-state-block">
                            <BookOpen size={48} className="text-tertiary" />
                            <p>No articles found. Start building your wiki!</p>
                        </div>
                    )}
                </div>
            )}

            {/* Article Detail Modal */}
            {selected && (
                <div className="modal-overlay" onClick={() => setSelected(null)}>
                    <div className="modal-card fade-in wide" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="card-title">{selected.title}</h3>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="icon-btn text-danger" onClick={() => handleDelete(selected.id)}><Trash2 size={18} /></button>
                                <button className="icon-btn" onClick={() => setSelected(null)}><X size={20} /></button>
                            </div>
                        </div>
                        <div className="modal-body">
                            <div className="kb-meta">
                                <span className="status-badge blue">{selected.category}</span>
                                <span className="text-xs text-tertiary">by {selected.author?.firstName} {selected.author?.lastName}</span>
                                <span className="text-xs text-tertiary">Updated {fmtDate(selected.updatedAt)}</span>
                            </div>
                            <div className="kb-content">{selected.content}</div>
                            {selected.tags && (
                                <div className="kb-tags">
                                    {selected.tags.split(',').map((t, i) => <span key={i} className="tag-pill">{t.trim()}</span>)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-card fade-in wide">
                        <div className="modal-header">
                            <h3 className="card-title">Write New Article</h3>
                            <button className="icon-btn" onClick={() => setShowForm(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-group"><label className="form-label">Title</label>
                                    <input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Getting Started with..." />
                                </div>
                                <div className="form-row-2">
                                    <div className="form-group"><label className="form-label">Category</label>
                                        <input className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="general" />
                                    </div>
                                    <div className="form-group"><label className="form-label">Tags (comma separated)</label>
                                        <input className="form-input" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="react, guide, setup" />
                                    </div>
                                </div>
                                <div className="form-group"><label className="form-label">Content</label>
                                    <textarea className="form-input tall" required value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Write your article here..." />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Publish Article</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
