import { useState, useEffect, useRef } from 'react';
import { Upload, Search, Filter, Download, Trash2, FileText, Image, FileSpreadsheet, File, X } from 'lucide-react';
import api from '../../api/client';
import '../Shared.css';
import './DocumentCenter.css';

const iconMap = {
    'application/pdf': <FileText size={20} className="text-danger" />,
    'image/png': <Image size={20} className="text-blue" />,
    'image/jpeg': <Image size={20} className="text-blue" />,
    'text/csv': <FileSpreadsheet size={20} className="text-green" />,
};

const getIcon = (mime) => iconMap[mime] || <File size={20} className="text-tertiary" />;

const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export default function DocumentCenter() {
    const [docs, setDocs] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('');
    const [selectedProject, setSelectedProject] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const fileRef = useRef(null);

    useEffect(() => {
        fetchDocs();
        fetchProjects();
    }, []);

    const fetchDocs = async () => {
        try {
            const params = {};
            if (catFilter) params.category = catFilter;
            const { data } = await api.get('/documents', { params });
            setDocs(data.data || []);
        } catch (_) { }
        setLoading(false);
    };

    const fetchProjects = async () => {
        try {
            const { data } = await api.get('/projects');
            setProjects(data.data || []);
        } catch (_) { }
    };

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', 'general');
            if (selectedProject) formData.append('projectId', selectedProject);

            await api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            fetchDocs();
            setSelectedProject(''); // Reset after upload
            setShowUploadModal(false); // Close modal
        } catch (err) { alert(err.response?.data?.message || 'Upload failed'); }
        setUploading(false);
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleDownload = async (id, name) => {
        try {
            const res = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a'); a.href = url; a.download = name; a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) { alert('Download failed'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this document permanently?')) return;
        try { await api.delete(`/documents/${id}`); fetchDocs(); }
        catch (err) { alert('Delete failed'); }
    };

    const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const filtered = docs.filter(d => !search || d.fileName.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="documents-page fade-in">
            <header className="page-header">
                <div className="header-left">
                    <h1 className="page-title">Document Center</h1>
                    <p className="page-subtitle">Secure file storage with versioning and project linking.</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => setShowUploadModal(true)} disabled={uploading}>
                        <Upload size={18} /> {uploading ? 'Uploading...' : 'Upload File'}
                    </button>
                    {/* Hidden input moved to modal interactions */}
                    <input type="file" ref={fileRef} onChange={handleUpload} hidden />
                </div>
            </header>

            <div className="filter-bar">
                <div className="search-field">
                    <Search size={18} className="icon" />
                    <input type="text" placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {loading ? (
                <div className="loading-spinner"><div className="spinner" /><span>Loading...</span></div>
            ) : (
                <div className="card">
                    <div className="card-body p-0">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>File Name</th>
                                    <th>Size</th>
                                    <th>Project</th>
                                    <th>Uploaded By</th>
                                    <th>Date</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(d => (
                                    <tr key={d.id}>
                                        <td>
                                            <div className="file-cell">
                                                {getIcon(d.mimeType)}
                                                <span className="font-semibold">{d.fileName}</span>
                                            </div>
                                        </td>
                                        <td><span className="text-xs">{formatSize(d.fileSize)}</span></td>
                                        <td><span className="text-sm">{d.project?.name || 'General'}</span></td>
                                        <td>
                                            <div className="partner-cell">
                                                <div className="avatar micro">{d.uploader?.firstName?.charAt(0)}</div>
                                                <span className="text-xs">{d.uploader?.firstName} {d.uploader?.lastName}</span>
                                            </div>
                                        </td>
                                        <td><span className="text-xs text-tertiary">{fmtDate(d.createdAt)}</span></td>
                                        <td className="text-right">
                                            <div className="action-btns">
                                                <button className="mini-btn" title="Download" onClick={() => handleDownload(d.id, d.fileName)}><Download size={14} /></button>
                                                <button className="mini-btn text-danger" title="Delete" onClick={() => handleDelete(d.id)}><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-tertiary">No documents uploaded yet.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="modal-overlay">
                    <div className="modal-card fade-in">
                        <div className="modal-header">
                            <h3 className="card-title">Upload New Document</h3>
                            <button className="icon-btn" onClick={() => setShowUploadModal(false)} disabled={uploading}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p className="text-sm text-tertiary mb-4">
                                Select a project to link this document, or leave it blank to upload to the General knowledge base.
                            </p>
                            <div className="form-group mb-4">
                                <label className="form-label">Link to Project (Optional)</label>
                                <select
                                    className="form-input"
                                    value={selectedProject}
                                    onChange={(e) => setSelectedProject(e.target.value)}
                                    disabled={uploading}
                                >
                                    <option value="">No Project (General)</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer flex justify-between">
                            <button className="btn btn-secondary" onClick={() => setShowUploadModal(false)} disabled={uploading}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => fileRef.current?.click()}
                                disabled={uploading}
                            >
                                <Upload size={18} /> {uploading ? 'Uploading...' : 'Select File from PC'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
