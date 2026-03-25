import { useState, useEffect, useRef } from 'react';
import { Tag, Plus, X, Check, Loader } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

const PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316'
];

export default function TagPicker({ projectId, taskId, initialTags = [], onChange }) {
  const [projectTags, setProjectTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState(initialTags.map(t => t.tag?.id || t.id));
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchTags = async () => {
    try {
      const { data } = await api.get(`/projects/${projectId}/tags`);
      setProjectTags(data.data || []);
    } catch { /* ignore */ }
  };

  const toggleTag = async (tagId) => {
    const isSelected = selectedTagIds.includes(tagId);
    setLoading(true);
    try {
      if (isSelected) {
        await api.delete(`/projects/${projectId}/tasks/${taskId}/tags/${tagId}`);
        const next = selectedTagIds.filter(id => id !== tagId);
        setSelectedTagIds(next);
        onChange?.(next.map(id => projectTags.find(t => t.id === id)).filter(Boolean));
      } else {
        await api.post(`/projects/${projectId}/tasks/${taskId}/tags`, { tagId });
        const next = [...selectedTagIds, tagId];
        setSelectedTagIds(next);
        onChange?.(next.map(id => projectTags.find(t => t.id === id)).filter(Boolean));
      }
    } catch {
      toast.error('Failed to update tag');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/tags`, { name: newName.trim(), color: newColor });
      setProjectTags(prev => [...prev, data.data]);
      setNewName('');
      setCreating(false);
      toast.success(`Tag "${data.data.name}" created`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create tag');
    } finally {
      setLoading(false);
    }
  };

  const selectedTags = projectTags.filter(t => selectedTagIds.includes(t.id));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Selected chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
        {selectedTags.map(tag => (
          <span
            key={tag.id}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: tag.color + '22', color: tag.color,
              border: `1px solid ${tag.color}55`,
              borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: 600
            }}
          >
            {tag.name}
            {taskId && (
              <button onClick={() => toggleTag(tag.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: tag.color, display: 'flex' }}>
                <X size={10} />
              </button>
            )}
          </span>
        ))}
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            background: 'var(--bg-main)', border: '1px dashed var(--border)',
            borderRadius: '12px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer',
            color: 'var(--text-tertiary)'
          }}
        >
          <Tag size={10} /> {selectedTags.length === 0 ? 'Add Labels' : 'Edit'}
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', zIndex: 100, left: 0, top: '100%',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          minWidth: '220px', padding: '8px'
        }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', padding: '4px 8px 6px' }}>Labels</div>
          {projectTags.length === 0 && !creating && (
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '8px', textAlign: 'center' }}>No labels yet</div>
          )}
          {projectTags.map(tag => {
            const selected = selectedTagIds.includes(tag.id);
            return (
              <div
                key={tag.id}
                onClick={() => taskId && toggleTag(tag.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 8px', borderRadius: '6px', cursor: taskId ? 'pointer' : 'default',
                  background: selected ? tag.color + '18' : 'transparent',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => !selected && (e.currentTarget.style.background = 'var(--bg-main)')}
                onMouseLeave={e => !selected && (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: tag.color, flexShrink: 0 }} />
                <span style={{ fontSize: '12px', flex: 1, fontWeight: 500 }}>{tag.name}</span>
                {selected && <Check size={12} style={{ color: tag.color }} />}
                {loading && selected && <Loader size={10} className="spinning" />}
              </div>
            );
          })}

          <div style={{ borderTop: '1px solid var(--border-light)', marginTop: '6px', paddingTop: '6px' }}>
            {creating ? (
              <div style={{ padding: '4px' }}>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="Label name..."
                  style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px', marginBottom: '6px', outline: 'none', background: 'var(--bg-main)' }}
                />
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  {PRESET_COLORS.map(c => (
                    <div
                      key={c}
                      onClick={() => setNewColor(c)}
                      style={{
                        width: '18px', height: '18px', borderRadius: '50%', background: c, cursor: 'pointer',
                        outline: newColor === c ? `2px solid ${c}` : 'none', outlineOffset: '2px'
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={handleCreate} disabled={loading} style={{ flex: 1, padding: '4px', borderRadius: '6px', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
                    {loading ? <Loader size={10} className="spinning" /> : 'Create'}
                  </button>
                  <button onClick={() => setCreating(false)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'none', cursor: 'pointer', fontSize: '11px' }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', padding: '6px 8px', borderRadius: '6px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}
              >
                <Plus size={12} /> Create new label
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
