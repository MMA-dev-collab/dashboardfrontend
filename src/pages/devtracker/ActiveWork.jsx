import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity, GitBranch, Clock, CheckCircle2,
  XCircle, Zap, AlertTriangle, History, RefreshCw,
  Pause, Play, Trash2
} from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../store/useAuthStore';
import ErrorBoundary from '../../components/ui/ErrorBoundary';
import './ActiveWork.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BRANCH_RE = /^[a-zA-Z0-9/_.-]+$/;

// ─── Elapsed timer helper ──────────────────────────────────────────────
// Handles paused sessions by subtracting totalPausedMs and current pause duration
function useElapsed(startedAt, pausedAt, totalPausedMs = 0) {
  const calc = () => {
    if (!startedAt) return 0;
    const now = Date.now();
    const start = new Date(startedAt).getTime();
    const baseElapsed = now - start;
    const currentPauseDuration = pausedAt ? (now - new Date(pausedAt).getTime()) : 0;
    return Math.max(0, baseElapsed - totalPausedMs - currentPauseDuration);
  };
  const [elapsed, setElapsed] = useState(calc);
  useEffect(() => {
    setElapsed(calc());
    const t = setInterval(() => setElapsed(calc()), 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, pausedAt, totalPausedMs]);

  const m = Math.floor(elapsed / 60000);
  const s = Math.floor((elapsed % 60000) / 1000);
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

// ─── Session Card ──────────────────────────────────────────────────────
function SessionCard({
  session,
  currentUserId,
  isAdmin,
  onFinish,
  onForceEnd,
  onPause,
  onResume,
  onCancel
}) {
  const isMine = session.userId === currentUserId;
  const isPaused = !!session.pausedAt;
  const elapsed = useElapsed(session.activeStartedAt, session.pausedAt, session.totalPausedMs || 0);
  const initials = `${session.user.firstName[0]}${session.user.lastName[0]}`.toUpperCase();

  return (
    <div className={`aw-card ${isMine ? 'is-mine' : ''} ${isPaused ? 'is-paused' : ''}`}>
      <div className="aw-card-glow" />
      <div className="aw-card-top">
        <div className={`aw-status-dot ${isPaused ? 'paused' : 'active'}`} />
        <div className="aw-avatar">
          {session.user.profilePicture
            ? <img src={session.user.profilePicture} alt={initials} />
            : initials}
        </div>
        <div className="aw-card-name-wrap">
          <div className="aw-card-name">
            {session.user.firstName} {session.user.lastName}
            {isMine && <span className="aw-mine-badge" style={{ marginLeft: '0.5rem' }}>You</span>}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
            {session.project.name}
          </div>
        </div>
        {isPaused && (
          <div className="aw-paused-badge">
            <Pause size={12} /> PAUSED
          </div>
        )}
      </div>

      <div className="aw-card-body">
        {session.task && (
          <div className="aw-info-row">
            <CheckCircle2 size={14} />
            <span className="aw-info-label">Task:</span>
            <span>{session.task.title}</span>
          </div>
        )}
        {session.workingOnBranch && (
          <div className="aw-info-row">
            <GitBranch size={14} />
            <span className="aw-branch-tag">{session.workingOnBranch}</span>
          </div>
        )}
        {session.currentTask && (
          <div className="aw-info-row">
            <Zap size={14} />
            <span>{session.currentTask}</span>
          </div>
        )}
        <div className="aw-info-row">
          <Clock size={14} />
          <span className={`aw-timer ${isPaused ? 'paused' : ''}`}>{elapsed}</span>
          {isPaused && <span className="aw-paused-label"> (timer stopped)</span>}
        </div>
      </div>

      <div className="aw-card-footer">
        {isMine && (
          <>
            {isPaused ? (
              <button className="aw-btn aw-btn-resume" onClick={() => onResume(session)}>
                <Play size={14} /> Resume
              </button>
            ) : (
              <button className="aw-btn aw-btn-pause" onClick={() => onPause(session)}>
                <Pause size={14} /> Pause
              </button>
            )}
            <button className="aw-btn aw-btn-finish" onClick={() => onFinish(session)}>
              <CheckCircle2 size={14} /> Finish
            </button>
            <button className="aw-btn aw-btn-cancel" onClick={() => onCancel(session)}>
              <Trash2 size={14} />
            </button>
          </>
        )}
        {isAdmin && !isMine && (
          <button className="aw-btn aw-btn-force" onClick={() => onForceEnd(session)}>
            <XCircle size={14} /> Force End
          </button>
        )}
        {!isMine && !isAdmin && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', width:'100%', textAlign:'right' }}>
            {isPaused ? 'Paused session' : 'Active session'} — you cannot modify it
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Start Work Modal ──────────────────────────────────────────────────
function StartModal({ projects, onClose, onSuccess }) {
  const [projectId, setProjectId] = useState('');
  const [tasks, setTasks]         = useState([]);
  const [taskId, setTaskId]       = useState('');
  const [branch, setBranch]       = useState('');
  const [currentTask, setCurrentTask] = useState('');
  const [conflictMsg, setConflictMsg] = useState('');
  const [branchErr, setBranchErr]     = useState('');
  const [loading, setLoading]         = useState(false);

  // Load tasks for selected project
  useEffect(() => {
    if (!projectId) { setTasks([]); setTaskId(''); return; }
    api.get(`/projects/${projectId}/tasks`).then(r => {
      const all = r.data?.data?.tasks || r.data?.data || [];
      setTasks(all.filter(t => !t.isArchived));
    }).catch(() => setTasks([]));
  }, [projectId]);

  const handleBranchChange = (e) => {
    const v = e.target.value;
    setBranch(v);
    if (v && !BRANCH_RE.test(v)) setBranchErr('Invalid characters — only letters, numbers, /, _, -, . allowed');
    else setBranchErr('');
  };

  const handleSubmit = async () => {
    if (branch && !BRANCH_RE.test(branch)) return;
    setLoading(true);
    setConflictMsg('');
    try {
      await api.post('/devtracker/start', { projectId, taskId: taskId || undefined, workingOnBranch: branch || undefined, currentTask: currentTask || undefined });
      onSuccess();
    } catch (err) {
      if (err.response?.status === 409) {
        setConflictMsg(`⚠ ${err.response.data?.message || 'Someone is already working on this project.'}`);
      } else {
        setConflictMsg(err.response?.data?.message || 'Failed to start session');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aw-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="aw-modal">
        <h2><Activity size={20} /> Start Work Session</h2>

        {conflictMsg && <div className="aw-conflict-msg">{conflictMsg}</div>}

        <div className="aw-modal-field">
          <label>Project *</label>
          <select value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">Select a project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="aw-modal-field">
          <label>Linked Task (optional)</label>
          <select value={taskId} onChange={e => setTaskId(e.target.value)} disabled={!projectId}>
            <option value="">None</option>
            {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>

        <div className="aw-modal-field">
          <label>Branch name (optional)</label>
          <input
            type="text"
            value={branch}
            onChange={handleBranchChange}
            placeholder="feature/my-branch"
          />
          {branchErr && <div className="aw-field-error">{branchErr}</div>}
        </div>

        <div className="aw-modal-field">
          <label>What are you working on? (optional)</label>
          <input
            type="text"
            value={currentTask}
            onChange={e => setCurrentTask(e.target.value)}
            placeholder="e.g. Fixing login bug…"
          />
        </div>

        <div className="aw-modal-footer">
          <button className="aw-btn aw-btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="aw-btn aw-btn-primary"
            onClick={handleSubmit}
            disabled={!projectId || loading || !!branchErr}
          >
            {loading ? 'Starting…' : '🚀 Start'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Finish Work Modal ─────────────────────────────────────────────────
function FinishModal({ session, onClose, onSuccess }) {
  const [pushedCode, setPushedCode]         = useState(false);
  const [requiresPull, setRequiresPull]     = useState(false);
  const [changesDesc, setChangesDesc]       = useState('');
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');

  const handleSubmit = async () => {
    if (pushedCode && !changesDesc.trim()) { setError('Please describe your changes.'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post(`/devtracker/finish/${session.id}`, {
        pushedCode, changesDescription: changesDesc || undefined, requiresPull
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to finish session');
      setLoading(false);
    }
  };

  return (
    <div className="aw-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="aw-modal">
        <h2><CheckCircle2 size={20} /> Finish Work Session</h2>

        {error && <div className="aw-conflict-msg">{error}</div>}

        <div className="aw-modal-field">
          <div className="aw-toggle-row">
            <span>Did you push code?</span>
            <label className="aw-toggle">
              <input type="checkbox" checked={pushedCode} onChange={e => setPushedCode(e.target.checked)} />
              <span className="aw-toggle-slider" />
            </label>
          </div>
        </div>

        {pushedCode && (
          <div className="aw-modal-field">
            <label>Describe your changes *</label>
            <textarea
              rows={3}
              value={changesDesc}
              onChange={e => setChangesDesc(e.target.value)}
              placeholder="What did you change / add / fix?"
              style={{ resize: 'vertical' }}
            />
          </div>
        )}

        <div className="aw-modal-field">
          <div className="aw-toggle-row">
            <span>Others need to pull before working?</span>
            <label className="aw-toggle">
              <input type="checkbox" checked={requiresPull} onChange={e => setRequiresPull(e.target.checked)} />
              <span className="aw-toggle-slider" />
            </label>
          </div>
        </div>

        <div className="aw-modal-footer">
          <button className="aw-btn aw-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="aw-btn aw-btn-finish" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Finishing…' : '✓ Finish'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── History Row Duration ──────────────────────────────────────────────
function dur(startedAt, endedAt) {
  const ms = new Date(endedAt) - new Date(startedAt);
  const m = Math.floor(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

// ─── Main Page ─────────────────────────────────────────────────────────
export default function ActiveWork() {
  const { user, hasRole } = useAuthStore();
  const isAdmin = hasRole('Admin');

  const [sessions, setSessions]     = useState([]);
  const [projects, setProjects]     = useState([]);
  const [history, setHistory]       = useState({ logs: [], total: 0, page: 1, limit: 15 });
  const [histPage, setHistPage]     = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [toast, setToast]           = useState('');

  const [showStart, setShowStart]   = useState(false);
  const [finishSession, setFinishSession] = useState(null);

  const heartbeatRef = useRef(null);

  // ── Helpers ──
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const mySession = sessions.find(s => s.userId === user?.id);

  // ── Fetch initial snapshot ──
  const fetchSessions = useCallback(async () => {
    try {
      const { data } = await api.get('/devtracker/active');
      setSessions(data.data || []);
    } catch (e) { console.error('[DevTracker] fetchSessions:', e); }
  }, []);

  const fetchHistory = useCallback(async (page = 1) => {
    setLoadingHistory(true);
    try {
      const { data } = await api.get('/devtracker/history', { params: { page, limit: 15 } });
      setHistory(data.data || { logs: [], total: 0, page, limit: 15 });
    } catch (e) {
      console.error('[DevTracker] fetchHistory:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const { data } = await api.get('/projects');
      setProjects(data.data?.projects || data.data || []);
    } catch (e) { console.error('[DevTracker] fetchProjects:', e); }
  }, []);

  // ── SSE connection ──
  useEffect(() => {
    const token = sessionStorage.getItem('accessToken');
    fetchSessions();
    fetchHistory(1);
    fetchProjects();

    const es = new EventSource(`${API}/devtracker/stream?token=${token}`);
    es.onmessage = (e) => {
      const payload = JSON.parse(e.data);
      if (['SESSION_STARTED', 'SESSION_ENDED', 'SESSION_CANCELLED'].includes(payload.type)) {
        fetchSessions();
        fetchHistory(1);
      } else if (['SESSION_PAUSED', 'SESSION_RESUMED'].includes(payload.type)) {
        fetchSessions();
      }
    };
    es.onerror = () => {
      // fall back to polling every 15s
      const pollId = setInterval(fetchSessions, 15000);
      es.close();
      return () => clearInterval(pollId);
    };

    return () => es.close();
  }, [fetchSessions, fetchHistory, fetchProjects]);

  // ── Heartbeat for own session ──
  const mySessionId = mySession?.id;
  useEffect(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (mySessionId) {
      heartbeatRef.current = setInterval(() => {
        api.post(`/devtracker/heartbeat/${mySessionId}`).catch(() => {});
      }, 5 * 60 * 1000); // every 5 min
    }
    return () => clearInterval(heartbeatRef.current);
  }, [mySessionId]);

  // ── beforeunload beacon ──
  useEffect(() => {
    const handler = () => {
      if (mySessionId) navigator.sendBeacon(`${API}/devtracker/heartbeat/${mySessionId}`);
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [mySessionId]);

  // ── Force end (admin) ──
  const handleForceEnd = async (session) => {
    if (!window.confirm(`Force-end ${session.user.firstName}'s session?`)) return;
    try {
      await api.post(`/devtracker/force-end/${session.id}`);
      showToast('Session force-ended.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Error');
    }
  };

  // ── Pause / Resume / Cancel ──
  const handlePause = async (session) => {
    try {
      await api.post(`/devtracker/pause/${session.id}`);
      showToast('⏸️ Session paused');
      fetchSessions();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error pausing session');
    }
  };

  const handleResume = async (session) => {
    try {
      await api.post(`/devtracker/resume/${session.id}`);
      showToast('▶️ Session resumed');
      fetchSessions();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error resuming session');
    }
  };

  const handleCancel = async (session) => {
    if (!window.confirm('Cancel this session? This will remove it permanently without recording history.')) return;
    try {
      await api.post(`/devtracker/cancel/${session.id}`);
      showToast('🗑️ Session cancelled');
      fetchSessions();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error cancelling session');
    }
  };

  const onStartSuccess = () => {
    setShowStart(false);
    fetchSessions();
    showToast('✅ Session started!');
  };

  const onFinishSuccess = () => {
    setFinishSession(null);
    fetchSessions();
    fetchHistory(1);
    showToast('✅ Session finished!');
  };

  return (
    <ErrorBoundary>
      <div className="aw-container">
        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 9999,
            background: 'var(--accent, #6c63ff)', color: '#fff',
            padding: '0.65rem 1.2rem', borderRadius: '10px', fontWeight: 600,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontSize: '0.875rem',
            animation: 'aw-fade-in 0.2s ease'
          }}>{toast}</div>
        )}

        {/* Header */}
        <div className="aw-header">
          <div className="aw-title">
            <div className="aw-live-dot" />
            <h1>Active Work</h1>
          </div>
          <button
            className="aw-start-btn"
            onClick={() => setShowStart(true)}
            disabled={!!mySession}
            title={mySession ? 'You already have an active session' : 'Start a new work session'}
          >
            <Activity size={16} /> Start Work
          </button>
        </div>

        {/* Active Sessions */}
        <div className="aw-section-label">
          <span>🟢 Active Now ({sessions.length})</span>
        </div>

        {sessions.length === 0 ? (
          <div className="aw-empty">
            <div className="aw-empty-icon">💤</div>
            <p>No active sessions — the team is idle.</p>
          </div>
        ) : (
          <div className="aw-grid">
            {sessions.map(s => (
              <SessionCard
                key={s.id}
                session={s}
                currentUserId={user?.id}
                isAdmin={isAdmin}
                onFinish={setFinishSession}
                onForceEnd={handleForceEnd}
                onPause={handlePause}
                onResume={handleResume}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}

        {/* History */}
        <div className="aw-section-label" style={{ marginTop: '2rem' }}>
          <History size={14} />
          <span>Session History</span>
          <button
            onClick={() => fetchHistory(histPage)}
            style={{ background:'none', border:'none', color:'var(--accent)', cursor:'pointer', padding:'0 0.25rem' }}
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {loadingHistory ? (
          <div style={{ textAlign:'center', color:'var(--text-tertiary)', padding:'2rem' }}>Loading history…</div>
        ) : history.logs.length === 0 ? (
          <div className="aw-empty">
            <div className="aw-empty-icon">📋</div>
            <p>No session history yet.</p>
          </div>
        ) : (
          <>
            <div className="aw-history-wrap">
              <table className="aw-history-table">
                <thead>
                  <tr>
                    <th>Developer</th>
                    <th>Project</th>
                    <th>Branch</th>
                    <th>Duration</th>
                    <th>Pushed</th>
                    <th>Pull Req.</th>
                    <th>Ended By</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.logs.map(log => (
                    <tr key={log.id}>
                      <td>{log.user.firstName} {log.user.lastName}</td>
                      <td>{log.project.name}</td>
                      <td>
                        {log.branch
                          ? <span className="aw-branch-tag">{log.branch}</span>
                          : <span style={{ color:'var(--text-tertiary)' }}>—</span>}
                      </td>
                      <td>{dur(log.startedAt, log.endedAt)}</td>
                      <td>
                        <span className={`aw-pill ${log.pushedCode ? 'yes' : 'no'}`}>
                          {log.pushedCode ? '✓ Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        {log.requiresPull
                          ? <span className="aw-pill warn"><AlertTriangle size={11} /> Yes</span>
                          : <span className="aw-pill no">No</span>}
                      </td>
                      <td>
                        {log.forceEndedBy
                          ? <span className="aw-pill danger">
                              {log.forceEnder
                                ? `${log.forceEnder.firstName} (admin)`
                                : 'Auto-timeout'}
                            </span>
                          : <span style={{ color:'var(--text-tertiary)' }}>Self</span>}
                      </td>
                      <td style={{ whiteSpace:'nowrap', color:'var(--text-tertiary)' }}>
                        {new Date(log.endedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="aw-pagination">
              <span>{history.total} total</span>
              <button
                className="aw-page-btn"
                disabled={histPage <= 1}
                onClick={() => { setHistPage(p => p - 1); fetchHistory(histPage - 1); }}
              >← Prev</button>
              <span>Page {histPage} / {Math.max(1, Math.ceil(history.total / 15))}</span>
              <button
                className="aw-page-btn"
                disabled={histPage >= Math.ceil(history.total / 15)}
                onClick={() => { setHistPage(p => p + 1); fetchHistory(histPage + 1); }}
              >Next →</button>
            </div>
          </>
        )}

        {/* Modals */}
        {showStart && (
          <StartModal
            projects={projects}
            onClose={() => setShowStart(false)}
            onSuccess={onStartSuccess}
          />
        )}
        {finishSession && (
          <FinishModal
            session={finishSession}
            onClose={() => setFinishSession(null)}
            onSuccess={onFinishSuccess}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
